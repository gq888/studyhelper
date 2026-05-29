// 火山方舟（Volcengine Ark）客户端 - doubao-seed-2.0-pro
import { env } from '../env.js'

export type ArkMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ArkChatOptions {
  messages: ArkMessage[]
  temperature?: number
  topP?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json_object'
  model?: string
}

/**
 * 非流式调用。返回完整文本。
 */
export async function arkChat(opts: ArkChatOptions): Promise<string> {
  const body: any = {
    model: opts.model ?? env.ARK_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    top_p: opts.topP ?? 0.9,
    max_tokens: opts.maxTokens ?? 4096,
  }
  if (opts.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${env.ARK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Ark API ${res.status}: ${txt}`)
  }
  const json = (await res.json()) as any
  return json?.choices?.[0]?.message?.content ?? ''
}

/**
 * 流式调用，逐块产出文本增量。
 */
export async function* arkChatStream(opts: ArkChatOptions): AsyncGenerator<string, void, void> {
  const body: any = {
    model: opts.model ?? env.ARK_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    top_p: opts.topP ?? 0.9,
    max_tokens: opts.maxTokens ?? 4096,
    stream: true,
  }

  const res = await fetch(`${env.ARK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Ark stream ${res.status}: ${txt}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    // SSE 行处理
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const obj = JSON.parse(payload)
        const delta: string | undefined = obj?.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // ignore bad lines
      }
    }
  }
}

/**
 * 强制 JSON 输出，并尝试解析。失败重试一次。
 */
export async function arkJson<T = any>(opts: ArkChatOptions): Promise<T> {
  const messages = [...opts.messages]
  // 兜底：在系统提示中强调 JSON 格式
  if (!messages.some((m) => m.role === 'system')) {
    messages.unshift({ role: 'system', content: '你必须输出严格 JSON。' })
  }
  let last = ''
  for (let i = 0; i < 2; i++) {
    const out = await arkChat({ ...opts, messages, responseFormat: 'json_object' })
    last = out
    const trimmed = out.trim().replace(/^```json|^```|```$/g, '').trim()
    try {
      return JSON.parse(trimmed) as T
    } catch {
      messages.push({ role: 'assistant', content: out })
      messages.push({
        role: 'user',
        content: '上一次回复不是合法 JSON，请只输出 JSON，不要任何额外文本或代码块标记。',
      })
    }
  }
  throw new Error(`Ark JSON parse failed: ${last.slice(0, 200)}`)
}
