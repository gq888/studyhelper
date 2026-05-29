import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronLeft, Plus, Send, Sparkles } from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { PomoTimer } from '@/components/Timer'
import { api, aiStream } from '@/api/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: any
}

interface Session {
  id: string
  title: string
  updatedAt: string
}

const SUGGESTIONS = [
  '开始学习，并帮我开个 25 分钟番茄钟',
  '我没听懂上一段，能换个比喻吗？',
  '给我一个本节课的练习题',
  '休息 5 分钟，提醒我回来',
]

function extractTimer(content: string): { mins: number; label?: string; clean: string } | null {
  const m = content.match(/<<TIMER:(\d+)(?::([^>]+))?>>/)
  if (!m) return null
  return { mins: Number(m[1]), label: m[2], clean: content.replace(m[0], '').trim() }
}

export default function Chat() {
  const { sessionId: paramId } = useParams<{ sessionId: string }>()
  const { search } = useLocation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const courseId = new URLSearchParams(search).get('courseId') || undefined

  const [sessionId, setSessionId] = useState<string | undefined>(paramId)
  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: sessions = [] } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api<Session[]>('/chat/sessions'),
  })

  // 初次进入：若无 sessionId，则创建一个
  useEffect(() => {
    (async () => {
      if (sessionId) return
      const s = await api<Session>('/chat/sessions', {
        method: 'POST',
        json: { courseId, title: courseId ? '课程陪学' : '日常陪学' },
      })
      setSessionId(s.id)
      qc.invalidateQueries({ queryKey: ['chat-sessions'] })
    })().catch(() => toast.error('无法创建会话'))
  }, [sessionId, courseId, qc])

  // 拉取历史消息
  useEffect(() => {
    if (!sessionId) return
    api<{ messages: Message[] }>(`/chat/sessions/${sessionId}`).then((s) => setMessages(s.messages || [])).catch(() => null)
  }, [sessionId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streamingText])

  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!sessionId) throw new Error('no session')
      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
      setMessages((m) => [...m, userMsg])
      const aId = `a-${Date.now()}`
      setStreamingId(aId)
      setStreamingText('')

      await aiStream(
        '/ai/chat',
        { sessionId, message: text, courseId },
        (delta) => setStreamingText((t) => t + delta),
        () => {
          setMessages((m) => [...m, { id: aId, role: 'assistant', content: '' }])
          setStreamingId(null)
        },
        (err) => {
          setStreamingId(null)
          if (err.includes('ModelNotOpen') || err.includes('does not exist'))
            toast.error('请先在火山方舟控制台开通 doubao-seed 模型服务')
          else toast.error('AI 服务暂时不可用')
        },
      )
    },
  })

  // streamingText -> 注入对应 message
  useEffect(() => {
    if (!streamingId) return
    setMessages((m) => {
      const idx = m.findIndex((x) => x.id === streamingId)
      if (idx < 0) return m
      const copy = [...m]
      copy[idx] = { ...copy[idx], content: streamingText }
      return copy
    })
  }, [streamingText, streamingId])

  useEffect(() => {
    if (!streamingId && streamingText) {
      // 将最后一条 assistant 写入持久 messages
      setMessages((m) => {
        if (m.length === 0) return m
        const last = m[m.length - 1]
        if (last.role === 'assistant' && !last.content) {
          const copy = [...m]
          copy[copy.length - 1] = { ...last, content: streamingText }
          return copy
        }
        return m
      })
      setStreamingText('')
    }
  }, [streamingId, streamingText])

  const handleSend = (t?: string) => {
    const text = (t ?? input).trim()
    if (!text || !sessionId || send.isPending || streamingId) return
    setInput('')
    send.mutate(text)
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between border-b border-brand-100/60 bg-white/95 px-4 py-3 backdrop-blur">
        <button onClick={() => nav('/')} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50">
            <Mascot size={28} mood="happy" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">书院熊 · 学习陪伴</div>
            <div className="text-[10px] text-ink-500">doubao-seed-2.0-pro 实时生成</div>
          </div>
        </div>
        <button
          onClick={async () => {
            const s = await api<Session>('/chat/sessions', { method: 'POST', json: { courseId } })
            setSessionId(s.id)
            setMessages([])
            qc.invalidateQueries({ queryKey: ['chat-sessions'] })
          }}
          className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card"
          aria-label="新对话"
        >
          <Plus size={18} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-paper">
        <div className="container-app py-3">
          {messages.length === 0 && !streamingId && (
            <div className="flex flex-col items-center py-10 text-center">
              <Mascot size={120} mood="reading" bobbing />
              <div className="mt-3 text-sm font-semibold">嗨～我是书院熊 🐼</div>
              <div className="mt-1 text-xs text-ink-500">告诉我你在学什么，我陪你一步步推进。</div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user'
            const timer = !isUser ? extractTimer(m.content) : null
            const text = timer ? timer.clean : m.content
            return (
              <div key={m.id} className={`mb-3 flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                {!isUser && (
                  <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-card">
                    <Mascot size={30} mood="happy" />
                  </div>
                )}
                <div className={`max-w-[78%] space-y-2 ${isUser ? 'items-end' : ''}`}>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-card ${
                      isUser ? 'bg-brand-500 text-white' : 'bg-white text-ink-900'
                    }`}
                  >
                    {text || (m.id === streamingId ? '...' : '')}
                  </div>
                  {timer && <PomoTimer minutes={timer.mins} label={timer.label} />}
                </div>
              </div>
            )
          })}

          {streamingId && (
            <div className="mb-3 ml-11 inline-flex items-center gap-1 rounded-2xl bg-white px-3 py-2 text-xs text-ink-500 shadow-card">
              <Sparkles size={12} className="animate-pulse text-brand-500" /> 书院熊正在思考…
            </div>
          )}
        </div>
      </div>

      {/* 输入区 */}
      <div className="border-t border-brand-100/60 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 backdrop-blur">
        <div className="container-app">
          {messages.length === 0 && (
            <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="whitespace-nowrap rounded-full bg-brand-50 px-3 py-1.5 text-xs text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              className="input min-h-[44px] max-h-32 flex-1 resize-none py-2.5"
              placeholder="请输入你的消息～"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || send.isPending || !!streamingId}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-white shadow-card disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
