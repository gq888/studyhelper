import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'
import { Mascot } from '@/components/Mascot'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

interface MyCourse {
  id: string
  title: string
  category: string
  estimatedHours: number
}

export default function Plans() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { plans, loadingPlans, createPlan, creating, generateWithAI, generating, removePlan } = usePlan()
  const [showNew, setShowNew] = useState(params.get('new') === '1')
  const [showAI, setShowAI] = useState(params.get('ai') === '1')
  const initialCourseId = params.get('courseId') ?? undefined

  useEffect(() => {
    if (params.get('new') === '1') setShowNew(true)
    if (params.get('ai') === '1') setShowAI(true)
  }, [params])

  const closeAll = () => {
    setShowNew(false)
    setShowAI(false)
    if (params.get('new') || params.get('ai') || params.get('courseId')) {
      params.delete('new')
      params.delete('ai')
      params.delete('courseId')
      setParams(params, { replace: true })
    }
  }

  return (
    <div className="container-app pt-[max(env(safe-area-inset-top),12px)] pb-24">
      <header className="flex items-center justify-between py-2">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">学习计划</div>
        <button onClick={() => setShowAI(true)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <Sparkles size={18} className="text-brand-600" />
        </button>
      </header>

      {/* 顶部双 CTA */}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowAI(true)}
          className="flex items-center gap-2 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 p-3 text-white shadow-card active:scale-[0.99]"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">
            <Sparkles size={18} />
          </div>
          <div className="text-left">
            <div className="text-[11px] opacity-85">推荐</div>
            <div className="text-sm font-bold">AI 一键生成</div>
          </div>
        </button>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-3xl bg-white p-3 shadow-card active:scale-[0.99]">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Plus size={18} />
          </div>
          <div className="text-left">
            <div className="text-[11px] text-ink-500">手动</div>
            <div className="text-sm font-bold">新建空计划</div>
          </div>
        </button>
      </div>

      <div className="mt-4">
        {loadingPlans ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-brand-50/60" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-10 flex flex-col items-center">
            <Mascot size={120} mood="reading" bobbing />
            <div className="mt-3 text-sm font-semibold">还没有学习计划</div>
            <div className="mt-1 text-xs text-ink-500">让 AI 帮你 30 秒生成一份吧 ✨</div>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.id} className="card overflow-hidden">
                <button onClick={() => nav(`/plans/${p.id}`)} className="block w-full p-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                    <div className="line-clamp-1 flex-1 text-[15px] font-bold">{p.title}</div>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                      {p.status === 'active' ? '进行中' : p.status === 'done' ? '已完成' : '已归档'}
                    </span>
                  </div>
                  {p.goal && <div className="mt-1 line-clamp-1 text-xs text-ink-600">🎯 {p.goal}</div>}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-500">
                    <span>{p.startDate}</span>
                    <span>→</span>
                    <span>{p.endDate}</span>
                    <span className="ml-auto font-medium text-brand-700">
                      {p.progress.done}/{p.progress.total} · {p.progress.percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-50">
                    <div className="h-full bg-brand-500" style={{ width: `${p.progress.percent}%` }} />
                  </div>
                </button>
                <div className="flex justify-end gap-2 border-t border-brand-50 px-3 py-1.5">
                  <button
                    onClick={() => confirm(`删除计划「${p.title}」？`) && removePlan(p.id)}
                    className="text-xs text-red-500"
                  >
                    <Trash2 size={12} className="inline" /> 删除
                  </button>
                  <button onClick={() => nav(`/plans/${p.id}`)} className="text-xs text-brand-600">
                    查看 <ChevronRight size={12} className="inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAI && (
        <AIGenerateSheet
          onClose={closeAll}
          initialCourseId={initialCourseId}
          onGenerate={(p) =>
            generateWithAI(p, {
              onSuccess: (created: any) => {
                closeAll()
                if (created?.id) nav(`/plans/${created.id}`)
              },
              onError: () => toast.error('生成失败，请稍后重试'),
            })
          }
          generating={generating}
        />
      )}
      {showNew && <ManualCreateSheet onClose={closeAll} onCreate={(p) => { createPlan(p); closeAll() }} creating={creating} />}
    </div>
  )
}

const GENERATE_STEPS = [
  '🔍 解析你的学习目标…',
  '📚 检索引用的课程大纲…',
  '🧠 规划每周节奏与重点…',
  '📅 把任务排进日历…',
  '✨ 整理输出 JSON…',
]

function AIGenerateSheet({
  onClose,
  onGenerate,
  generating,
  initialCourseId,
}: {
  onClose: () => void
  onGenerate: (p: { goal: string; weeks: number; weeklyHours: number; courseIds: string[] }) => void
  generating: boolean
  initialCourseId?: string
}) {
  const [goal, setGoal] = useState('')
  const [weeks, setWeeks] = useState(2)
  const [weeklyHours, setWeeklyHours] = useState(6)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialCourseId ? [initialCourseId] : []),
  )
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const { data: mine = [] } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api<MyCourse[]>('/courses?ownerOnly=true'),
  })
  // 如果 initialCourseId 变化，自动补选
  useEffect(() => {
    if (initialCourseId) {
      setSelected((s) => (s.has(initialCourseId) ? s : new Set([...s, initialCourseId])))
    }
  }, [initialCourseId])
  // 单独拉初始课程信息（即使不属于当前用户，也能在顶部显示「围绕这门课排期」）
  const { data: initialCourse } = useQuery({
    queryKey: ['course-min', initialCourseId],
    queryFn: () => api<{ id: string; title: string; estimatedHours: number }>(`/courses/${initialCourseId}`),
    enabled: !!initialCourseId,
  })

  // 等待动画：generating 时推进进度（缓动到 92%，完成后由父组件 close 关闭）
  useEffect(() => {
    if (!generating) {
      setProgress(0)
      setStepIdx(0)
      return
    }
    setProgress(6)
    const tick = setInterval(() => {
      setProgress((p) => {
        const delta = Math.max(0.6, (92 - p) * 0.07)
        return Math.min(p + delta, 92)
      })
    }, 250)
    const stepRot = setInterval(() => {
      setStepIdx((i) => (i + 1) % GENERATE_STEPS.length)
    }, 1800)
    return () => {
      clearInterval(tick)
      clearInterval(stepRot)
    }
  }, [generating])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      onClick={generating ? undefined : onClose}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {generating ? (
          <div className="flex flex-col items-center py-2">
            <Mascot size={108} mood="reading" bobbing />
            <div className="mt-3 text-base font-bold">书院熊正在为你排期…</div>
            <div className="mt-1 h-5 text-xs text-ink-500">
              {GENERATE_STEPS[stepIdx]}
            </div>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-brand-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-2 flex w-full items-center justify-between text-[11px] text-ink-500">
              <span>doubao-seed-2.0-pro 实时生成</span>
              <span className="tabular-nums">{Math.round(progress)}%</span>
            </div>
            <p className="mt-4 text-center text-[11px] text-ink-500">
              此过程约 10-20 秒，完成后会自动打开计划详情。
            </p>
          </div>
        ) : (
          <>
            <div className="text-base font-bold">✨ AI 生成学习计划</div>
            <p className="mt-1 text-xs text-ink-500">告诉书院熊你的目标，它会安排好每一天。</p>

            {initialCourse && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-brand-50 p-2.5 text-xs">
                <Sparkles size={14} className="shrink-0 text-brand-600" />
                <span className="line-clamp-1 text-ink-700">
                  将围绕课程
                  <span className="font-semibold text-brand-700"> 《{initialCourse.title}》 </span>
                  排期
                </span>
              </div>
            )}

            <label className="mt-4 block text-sm font-semibold">学习目标</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={
                initialCourse
                  ? `例：${weeks} 周内完成《${initialCourse.title.slice(0, 16)}》`
                  : '例：两周内入门 Python 并完成一个小项目'
              }
              className="input mt-1 h-20 resize-none"
            />

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-ink-500">持续周数</span>
                <select className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                  {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n} 周</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-ink-500">每周可用学时</span>
                <select className="input" value={weeklyHours} onChange={(e) => setWeeklyHours(Number(e.target.value))}>
                  {[3, 5, 6, 8, 10, 14, 20].map((n) => <option key={n} value={n}>{n} 小时</option>)}
                </select>
              </label>
            </div>

            {mine.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-sm font-semibold">引用我的课程（可选）</div>
                <div className="no-scrollbar flex max-h-32 flex-col gap-1.5 overflow-y-auto">
                  {mine.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        selected.has(c.id) ? 'bg-brand-100 text-brand-700' : 'bg-brand-50/60 text-ink-700'
                      }`}
                    >
                      <span className="text-xs">{selected.has(c.id) ? '☑' : '☐'}</span>
                      <span className="line-clamp-1 flex-1">{c.title}</span>
                      <span className="text-[10px] text-ink-500">{c.estimatedHours.toFixed(1)}h</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={!goal.trim()}
              onClick={() =>
                onGenerate({ goal: goal.trim(), weeks, weeklyHours, courseIds: Array.from(selected) })
              }
              className="btn-primary mt-5 w-full"
            >
              <Sparkles size={16} /> 让 AI 排好
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ManualCreateSheet({
  onClose,
  onCreate,
  creating,
}: {
  onClose: () => void
  onCreate: (p: { title: string; goal?: string; startDate: string; endDate: string }) => void
  creating: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const in14d = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10)
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(in14d)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-bold">新建学习计划</div>
        <p className="mt-1 text-xs text-ink-500">空计划，稍后逐条添加任务。</p>
        <label className="mt-4 block text-sm font-semibold">名称</label>
        <input className="input mt-1" placeholder="例：暑假英语攻坚" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="mt-3 block text-sm font-semibold">目标（可选）</label>
        <textarea className="input mt-1 h-16 resize-none" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-ink-500">开始</span>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-ink-500">结束</span>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <button
          disabled={!title.trim() || creating}
          onClick={() => onCreate({ title: title.trim(), goal: goal.trim() || undefined, startDate, endDate })}
          className="btn-primary mt-5 w-full"
        >
          {creating ? '创建中…' : '创建计划'}
        </button>
      </div>
    </div>
  )
}
