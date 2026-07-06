// .eml ファイルのパース。postal-mime に文字コード判定・MIMEデコード（Base64/Quoted-Printable/
// ISO-2022-JP等の日本語エンコーディング含む）・encoded-word件名デコードを一任する。
// このファイルでは自作のMIMEデコードを一切行わない。

import PostalMime, { type Address, type Email } from 'postal-mime'
import type { IncomingMail } from './index'
import type { MailSource } from '../types'

/** HTML本文からタグを除去してプレーンテキスト化する（textパートが無い場合のフォールバック） */
function htmlToPlainText(html: string): string {
  const withoutScripts = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '')
  return withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** postal-mime の Address を「表示名 <addr>」形式に整形する */
function formatAddress(address: Address | undefined): string | undefined {
  if (address === undefined) return undefined
  if (address.group !== undefined) {
    const members = address.group.map((m) => m.address).join(', ')
    return members === '' ? address.name : `${address.name} <${members}>`
  }
  const name = address.name.trim()
  const addr = address.address?.trim()
  if (name !== '' && addr !== undefined && addr !== '') return `${name} <${addr}>`
  if (addr !== undefined && addr !== '') return addr
  return name === '' ? undefined : name
}

/** ISO8601として解釈できる日付文字列ならそのまま返す。それ以外はundefined */
function toIsoDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

/** パース済みEmailから本文テキストを取り出す。textパート優先、無ければhtmlから抽出 */
function extractBodyText(email: Email): string {
  if (email.text !== undefined && email.text.trim() !== '') {
    return email.text.trim()
  }
  if (email.html !== undefined && email.html.trim() !== '') {
    return htmlToPlainText(email.html)
  }
  return ''
}

/**
 * postal-mime のパース済み Email を IncomingMail に変換する共通処理。
 * .eml ファイルと Gmail API（format=raw）で同じ変換経路を共有するために export する。
 * 挙動を変えないこと（既存の eml.test.ts が正）。
 * @param fallbackSubject 件名が空のときに使う代替（拡張子除去済みのファイル名など）
 */
export function toIncomingMail(
  email: Email,
  source: MailSource,
  fallbackSubject = '',
): IncomingMail {
  return {
    source,
    subject: email.subject?.trim() || fallbackSubject,
    from: formatAddress(email.from),
    receivedAt: toIsoDate(email.date),
    bodyText: extractBodyText(email),
  }
}

/**
 * .eml ファイル（ArrayBuffer）を IncomingMail に変換する。
 * 文字コード判定・デコードは postal-mime に委譲する。
 */
export async function parseEmlFile(buffer: ArrayBuffer, fileName: string): Promise<IncomingMail> {
  const email = await PostalMime.parse(buffer)
  return toIncomingMail(email, 'file', fileName.replace(/\.eml$/i, ''))
}
