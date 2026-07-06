import type AnthropicType from '@anthropic-ai/sdk'

// BYOK: ユーザー自身のAPIキーでブラウザから直接 Anthropic API を呼ぶ。
// dangerouslyAllowBrowser はこの構成（キーは本人の端末にのみ存在）を前提に許可する。
// SDKはバンドルが大きいため、呼び出し時に初めて動的読み込みする。

type SdkModule = typeof import('@anthropic-ai/sdk')
let sdkPromise: Promise<SdkModule> | null = null

function loadSdk(): Promise<SdkModule> {
  if (!sdkPromise) {
    sdkPromise = import('@anthropic-ai/sdk')
  }
  return sdkPromise
}

function friendlyMessage(Anthropic: SdkModule['default'], error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return 'APIキーが無効です。設定画面でAPIキーを確認してください。'
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'レート制限に達しました。少し待ってから再送信してください。'
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Anthropic APIに接続できませんでした。ネットワーク接続を確認してください。'
  }
  if (error instanceof Anthropic.APIError) {
    return `APIエラー（${String(error.status)}）: ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return '不明なエラーが発生しました。'
}

export interface CallClaudeOptions {
  apiKey: string
  model: string
  system?: string
  userText: string
  maxTokens?: number
}

const DEFAULT_MAX_TOKENS = 4096

/** BYOK APIクライアント最小関数。単発のテキスト応答を返す。 */
export async function callClaude(options: CallClaudeOptions): Promise<string> {
  const { default: Anthropic } = await loadSdk()
  const client = new Anthropic({
    apiKey: options.apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
  })

  try {
    const response = await client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(options.system ? { system: options.system } : {}),
      messages: [{ role: 'user', content: options.userText }],
    })

    return response.content
      .filter((block): block is AnthropicType.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
  } catch (error) {
    throw new Error(friendlyMessage(Anthropic, error), { cause: error })
  }
}

export function toUserErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '不明なエラーが発生しました。'
}
