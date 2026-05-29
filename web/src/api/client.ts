import { useAuth } from '@/store/auth'

const BASE = '/api'

class ApiError extends Error {
  status: number
  data: any
  constructor(status: number, message: string, data?: any) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api<T = any>(
  path: string,
  init: RequestInit & { json?: any } = {},
): Promise<T> {
  const token = useAuth.getState().token
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as any),
  }
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(init.json)
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(BASE + path, { ...init, headers })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const msg = (typeof data === 'object' && data?.error) || (typeof data === 'string' ? data : 'request_failed')
    throw new ApiError(res.status, String(msg), data)
  }
  return data as T
}

export async function aiStream(
  path: string,
  body: any,
  onDelta: (chunk: string) => void,
  onDone?: () => void,
  onError?: (err: string) => void,
) {
  const token = useAuth.getState().token
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    onError?.(`HTTP ${res.status}`)
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      try {
        const obj = JSON.parse(line.slice(5).trim())
        if (obj.delta) onDelta(obj.delta)
        else if (obj.done) onDone?.()
        else if (obj.error) onError?.(obj.error)
      } catch {}
    }
  }
}
