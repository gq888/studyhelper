import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronLeft, History, Paperclip, Plus, Send, Sparkles, X } from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { PomoTimer } from '@/components/Timer'
import { ChatSessionsDrawer } from '@/components/ChatSessionsDrawer'
import { CoursePicker } from '@/components/CoursePicker'
import { PlanPicker } from '@/components/PlanPicker'
import { PlanProposalCard } from '@/components/PlanProposalCard'
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
  messageCount?: number
}

/** 从首条用户消息生成会话标题：去除多余空白，截到 24 字 */
function titleFromMessage(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return (cleaned.length > 24 ? cleaned.slice(0, 24) + '…' : cleaned) || '新对话'
}

const SUGGESTIONS = [
  '开始学习，并帮我开个 25 分钟番茄钟',
  '我没听懂上一段，能换个比喻吗？',
  '给我一个本节课的练习题',
  '休息 5 分钟，提醒我回来',
]

function parseKV(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const piece of raw.split('|')) {
    const idx = piece.indexOf('=')
    if (idx < 0) continue
    out[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim()
  }
  return out
}

const TOMORROW_ISO = () => new Date(Date.now() + 86400_000).toISOString().slice(0, 10)

/** AI 回复里识别到的所有特殊标记。同一类型可以并存（如两个番茄钟） */
type AssistantTag =
  | { kind: 'timer'; key: string; mins: number; label?: string }
  | {
      kind: 'plan'
      key: string
      goal: string
      weeks: number
      hours: number
      courseIds: string[]
    }
  | { kind: 'task_done'; key: string; itemId: string }
  | {
      kind: 'task_review'
      key: string
      title: string
      minutes: number
      date: string
      courseId?: string
    }

/** 一次性提取消息里所有标记，并返回剥离所有标记后的纯文本 */
function extractAllTags(content: string): { tags: AssistantTag[]; clean: string } {
  const tags: AssistantTag[] = []
  let clean = content

  let idx = 0
  for (const m of content.matchAll(/<<TIMER:(\d+)(?::([^>]+))?>>/g)) {
    tags.push({ kind: 'timer', key: `t-${idx++}`, mins: Number(m[1]), label: m[2] })
  }

  for (const m of content.matchAll(/<<PLAN:([^>]+)>>/g)) {
    const p = parseKV(m[1])
    tags.push({
      kind: 'plan',
      key: `p-${idx++}`,
      goal: p.goal || '我的学习计划',
      weeks: Math.max(1, Math.min(26, parseInt(p.weeks || '4', 10) || 4)),
      hours: Math.max(1, Math.min(40, parseInt(p.hours || '6', 10) || 6)),
      courseIds: (p.courseIds || '').split(',').map((s) => s.trim()).filter(Boolean),
    })
  }

  for (const m of content.matchAll(/<<TASK_DONE:([^>]+)>>/g)) {
    tags.push({ kind: 'task_done', key: `d-${idx++}`, itemId: m[1].trim() })
  }

  for (const m of content.matchAll(/<<TASK_REVIEW:([^>]+)>>/g)) {
    const p = parseKV(m[1])
    tags.push({
      kind: 'task_review',
      key: `r-${idx++}`,
      title: p.title || '复习任务',
      minutes: Math.max(5, Math.min(180, parseInt(p.minutes || '25', 10) || 25)),
      date: p.date || TOMORROW_ISO(),
      courseId: p.courseId || undefined,
    })
  }

  // 一次性剥离所有标记
  clean = clean
    .replace(/<<TIMER:[^>]+>>/g, '')
    .replace(/<<PLAN:[^>]+>>/g, '')
    .replace(/<<TASK_DONE:[^>]+>>/g, '')
    .replace(/<<TASK_REVIEW:[^>]+>>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { tags, clean }
}

export default function Chat() {
  const { sessionId: paramId } = useParams<{ sessionId: string }>()
  const { search } = useLocation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const initialCourseId = new URLSearchParams(search).get('courseId') || undefined
  // 计划答疑场景：plan 引用的课程通过 courseIds=a,b 传过来
  const initialCourseIds = (new URLSearchParams(search).get('courseIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const initialPlanId = new URLSearchParams(search).get('planId') || undefined
  const initialAutoSend = new URLSearchParams(search).get('autoSend') || undefined

  const [sessionId, setSessionId] = useState<string | undefined>(paramId)
  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [planPickerOpen, setPlanPickerOpen] = useState(false)
  const [citedCourseIds, setCitedCourseIds] = useState<string[]>(() => {
    const acc = new Set<string>()
    if (initialCourseId) acc.add(initialCourseId)
    for (const id of initialCourseIds) acc.add(id)
    return Array.from(acc)
  })
  // 引用计划 - 最多一个
  const [citedPlanId, setCitedPlanId] = useState<string | undefined>(initialPlanId)
  const streamTextRef = useRef('')
  const processedMessageIds = useRef<Set<string>>(new Set())
  /** 从服务端 /chat/sessions/:id 拉来的历史消息 id 集合：里面的番茄钟不自动开始、计划草稿仅作快照展示 */
  const historicalIdsRef = useRef<Set<string>>(new Set())
  const autoSentRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 引用课程标签
  const { data: citedCourses = [] } = useQuery({
    queryKey: ['cited-courses', citedCourseIds.join(',')],
    queryFn: async () => {
      if (citedCourseIds.length === 0) return []
      const all = await Promise.all(
        citedCourseIds.map((id) => api<any>(`/courses/${id}`).catch(() => null)),
      )
      return all.filter(Boolean).map((c) => ({ id: c.id, title: c.title }))
    },
  })

  // 引用计划信息
  const { data: citedPlan } = useQuery({
    queryKey: ['cited-plan', citedPlanId],
    queryFn: () => api<any>(`/plans/${citedPlanId}`),
    enabled: !!citedPlanId,
  })

  // 拉取历史消息（仅当切换到已有 sessionId 时）
  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      historicalIdsRef.current = new Set()
      return
    }
    api<{ messages: Message[] }>(`/chat/sessions/${sessionId}`)
      .then((s) => {
        const msgs = s.messages || []
        historicalIdsRef.current = new Set(msgs.map((m) => m.id))
        setMessages(msgs)
      })
      .catch(() => null)
  }, [sessionId])

  // 从课程详情页或学习计划答疑跳过来时自动引用对应课程
  useEffect(() => {
    const incoming = [initialCourseId, ...initialCourseIds].filter(Boolean) as string[]
    if (incoming.length === 0) return
    setCitedCourseIds((ids) => {
      const next = new Set(ids)
      for (const id of incoming) next.add(id)
      return next.size === ids.length ? ids : Array.from(next)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourseId, initialCourseIds.join(',')])

  // 从计划详情页跳过来时自动引用对应计划
  useEffect(() => {
    if (initialPlanId) setCitedPlanId(initialPlanId)
  }, [initialPlanId])

  // 历史会话数量（用于按钮徽标）
  const { data: sessionsForBadge = [] } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api<Session[]>('/chat/sessions'),
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streamingText])

  /** 处理 AI 输出末尾的所有特殊标记并落库（同一条消息内可含多个 TASK_REVIEW 等） */
  const processAssistantTags = async (mid: string, content: string) => {
    if (processedMessageIds.current.has(mid)) return
    if (historicalIdsRef.current.has(mid)) return // 历史消息不重新触发副作用
    processedMessageIds.current.add(mid)
    if (!citedPlanId) return

    const { tags } = extractAllTags(content)
    const doneIds = tags.filter((t) => t.kind === 'task_done').map((t) => (t as any).itemId as string)
    const reviews = tags.filter((t) => t.kind === 'task_review') as Extract<AssistantTag, { kind: 'task_review' }>[]

    let touched = false
    for (const itemId of doneIds) {
      try {
        await api(`/plans/${citedPlanId}/items/${itemId}`, {
          method: 'PATCH',
          json: { done: true },
        })
        touched = true
      } catch {}
    }
    for (const r of reviews) {
      try {
        await api(`/plans/${citedPlanId}/items`, {
          method: 'POST',
          json: {
            date: r.date,
            title: r.title,
            minutes: r.minutes,
            courseId: r.courseId,
            note: '由书院熊根据考核结果添加的复习任务',
          },
        })
        touched = true
      } catch {}
    }

    if (touched) {
      if (doneIds.length) toast.success(`已掌握 ${doneIds.length} 个任务 ✓`)
      if (reviews.length) toast.success(`已加入 ${reviews.length} 个复习任务 📝`)
      qc.invalidateQueries({ queryKey: ['plan', citedPlanId] })
      qc.invalidateQueries({ queryKey: ['cited-plan', citedPlanId] })
      qc.invalidateQueries({ queryKey: ['plans'] })
      qc.invalidateQueries({ queryKey: ['heatmap'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    }
  }

  const send = useMutation({
    mutationFn: async (text: string) => {
      // 懒创建：直到用户真正发出消息才在后端创建会话；标题用首条用户消息生成
      let sid = sessionId
      if (!sid) {
        const created = await api<Session>('/chat/sessions', {
          method: 'POST',
          json: { courseId: initialCourseId, title: titleFromMessage(text) },
        })
        sid = created.id
        setSessionId(sid)
      }

      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
      setMessages((m) => [...m, userMsg])
      const aId = `a-${Date.now()}`
      setStreamingId(aId)
      setStreamingText('')
      streamTextRef.current = ''

      await aiStream(
        '/ai/chat',
        { sessionId: sid, message: text, courseIds: citedCourseIds, planId: citedPlanId },
        (delta) => {
          streamTextRef.current += delta
          setStreamingText((t) => t + delta)
        },
        () => {
          setMessages((m) => [...m, { id: aId, role: 'assistant', content: '' }])
          setStreamingId(null)
          qc.invalidateQueries({ queryKey: ['chat-sessions'] })
          // 流结束后扫描标记并落库
          processAssistantTags(aId, streamTextRef.current)
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
    // sessionId 由 send mutation 在首条消息时懒创建，这里不再阻塞
    if (!text || send.isPending || streamingId) return
    setInput('')
    send.mutate(text)
  }

  // URL 上带 autoSend 参数时自动发首条（如「开始学习」从 PlanDetail 跳来）
  // 注意：autoSentRef 的写入必须放到 setTimeout 回调里，否则 React StrictMode
  // 双跑时 cleanup 会取消 timer 而 ref 已被锁住，导致一次都没发出
  useEffect(() => {
    if (!initialAutoSend || autoSentRef.current) return
    if (sessionId || messages.length > 0) return
    const t = setTimeout(() => {
      if (autoSentRef.current) return
      autoSentRef.current = true
      handleSend(initialAutoSend)
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAutoSend])

  /** 新对话：仅清空本地状态，等用户发第一句话再在后端建会话 */
  const newSession = () => {
    setSessionId(undefined)
    setMessages([])
    setCitedCourseIds(initialCourseId ? [initialCourseId] : [])
    setCitedPlanId(initialPlanId)
    processedMessageIds.current.clear()
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-brand-100/60 bg-white/95 px-3 py-3 backdrop-blur">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="历史会话"
          className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-card transition active:scale-[0.97] hover:bg-brand-600"
        >
          <History size={15} strokeWidth={2.4} />
          <span>历史</span>
          {sessionsForBadge.length > 0 && (
            <span className="ml-0.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold leading-none">
              {sessionsForBadge.length}
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50">
            <Mascot size={28} mood="happy" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="line-clamp-1 text-sm font-bold">书院熊 · 学习陪伴</div>
            <div className="text-[10px] text-ink-500">doubao-seed-2.0-pro 实时生成</div>
          </div>
        </div>
        <button
          onClick={newSession}
          aria-label="新对话"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink-700 shadow-card"
        >
          <Plus size={18} />
        </button>
      </header>

      {/* 引用 chip 栏：计划（最多 1）+ 课程（多个） */}
      {(citedPlan || citedCourses.length > 0) && (
        <div className="border-b border-brand-50 bg-brand-50/40 px-3 py-1.5">
          <div className="container-app flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-[11px] font-medium text-ink-500">引用：</span>
            {citedPlan && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] shadow-card"
                style={{ background: citedPlan.color ?? '#fb7c2d', color: 'white' }}
              >
                <span>📋</span>
                <span className="line-clamp-1 max-w-[140px] font-semibold">{citedPlan.title}</span>
                <button onClick={() => setCitedPlanId(undefined)} aria-label="取消引用计划">
                  <X size={10} />
                </button>
              </span>
            )}
            {citedCourses.map((c) => (
              <span key={c.id} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] shadow-card">
                <span>📎</span>
                <span className="line-clamp-1 max-w-[120px] text-ink-700">{c.title}</span>
                <button onClick={() => setCitedCourseIds((ids) => ids.filter((x) => x !== c.id))}>
                  <X size={10} className="text-ink-500" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
            const { tags, clean } = !isUser
              ? extractAllTags(m.content)
              : { tags: [] as AssistantTag[], clean: m.content }
            const isHistorical = historicalIdsRef.current.has(m.id)
            return (
              <div key={m.id} className={`mb-3 flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                {!isUser && (
                  <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-card">
                    <Mascot size={30} mood="happy" />
                  </div>
                )}
                <div className={`max-w-[78%] space-y-2 ${isUser ? 'items-end' : ''}`}>
                  {clean && (
                    <div className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-card ${isUser ? 'bg-brand-500 text-white' : 'bg-white text-ink-900'}`}>
                      {clean}
                    </div>
                  )}
                  {!clean && m.id === streamingId && (
                    <div className="rounded-2xl bg-white px-3.5 py-2.5 text-sm shadow-card">...</div>
                  )}
                  {tags.map((tag) => {
                    if (tag.kind === 'timer') {
                      return (
                        <PomoTimer
                          key={tag.key}
                          minutes={tag.mins}
                          label={tag.label}
                          autoStart={!isHistorical}
                        />
                      )
                    }
                    if (tag.kind === 'plan') {
                      return (
                        <PlanProposalCard
                          key={tag.key}
                          proposal={{
                            goal: tag.goal,
                            weeks: tag.weeks,
                            hours: tag.hours,
                            courseIds: tag.courseIds,
                            clean,
                          }}
                          onCreated={(p) => setCitedPlanId(p.id)}
                          historical={isHistorical}
                        />
                      )
                    }
                    if (tag.kind === 'task_done') {
                      return (
                        <div
                          key={tag.key}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-card"
                        >
                          ✅ 已掌握{isHistorical ? '（历史记录）' : '，自动标记完成'}
                        </div>
                      )
                    }
                    if (tag.kind === 'task_review') {
                      return (
                        <div
                          key={tag.key}
                          className="space-y-1 rounded-2xl bg-purple-50 px-3 py-2 text-xs text-purple-700 shadow-card"
                        >
                          <div className="font-semibold">📝 已加复习任务{isHistorical ? '（历史记录）' : ''}</div>
                          <div className="text-ink-700">{tag.title}</div>
                          <div className="text-[10px] text-ink-500">
                            {tag.date} · {tag.minutes} 分钟
                          </div>
                        </div>
                      )
                    }
                    return null
                  })}
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
            <button
              onClick={() => setPlanPickerOpen(true)}
              className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm transition ${
                citedPlanId ? 'bg-brand-500 text-white shadow-card' : 'bg-brand-50 text-brand-700'
              }`}
              aria-label="引用学习计划"
              title="引用学习计划（单选）"
            >
              📋
              {citedPlanId && (
                <span className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                  1
                </span>
              )}
            </button>
            <button
              onClick={() => setPickerOpen(true)}
              className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ${
                citedCourseIds.length > 0 ? 'bg-brand-500 text-white shadow-card' : 'bg-brand-50 text-brand-700'
              }`}
              aria-label="引用课程"
              title="引用课程（可多选）"
            >
              <Paperclip size={18} />
              {citedCourseIds.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                  {citedCourseIds.length}
                </span>
              )}
            </button>
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

      <ChatSessionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentId={sessionId}
        onSelect={(id) => setSessionId(id)}
        onNew={newSession}
      />
      <CoursePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedIds={citedCourseIds}
        onChange={setCitedCourseIds}
      />
      <PlanPicker
        open={planPickerOpen}
        onClose={() => setPlanPickerOpen(false)}
        selectedId={citedPlanId}
        onChange={setCitedPlanId}
      />
    </div>
  )
}
