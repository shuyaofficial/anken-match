// メール取込の共通インターフェース。
// 取込元（貼り付け / .eml・.txtファイル / Gmail API）はすべて IncomingMail に正規化してから
// Project 化する。新しい取込元を足すときは IncomingMail を返す関数を1つ追加するだけでよい。

import type { MailSource, Project } from '../types'

export interface IncomingMail {
  source: MailSource
  subject?: string
  from?: string
  /** ISO8601。不明なら省略（toProjectで現在時刻に落ちる） */
  receivedAt?: string
  bodyText: string
}

/** 貼り付けテキストを IncomingMail にする */
export function fromPastedText(text: string): IncomingMail {
  return { source: 'paste', bodyText: text.trim() }
}

/** .txt ファイルの内容を IncomingMail にする */
export function fromTextFile(fileName: string, text: string): IncomingMail {
  return { source: 'file', subject: fileName.replace(/\.txt$/i, ''), bodyText: text.trim() }
}

/** IncomingMail から未抽出状態の Project レコードを作る */
export function toProject(mail: IncomingMail, now: Date = new Date()): Project {
  const iso = now.toISOString()
  return {
    id: crypto.randomUUID(),
    receivedAt: mail.receivedAt ?? iso,
    source: mail.source,
    subject: mail.subject,
    from: mail.from,
    rawText: mail.bodyText,
    status: 'new',
    createdAt: iso,
    updatedAt: iso,
  }
}
