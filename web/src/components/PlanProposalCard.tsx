import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CalendarRange, Clock3, Sparkles, Target } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'

/**
 * 从 AI 回复中提取 PLAN 标记：
 *   <<PLAN:goal=...|weeks=2|hours=6|courseIds=id1,id2>>
 */
export interface PlanProposal {
  goal: string
  weeks: number
  hours: number
  courseIds: string[]
  clean: string
}

export function extractPlanProposal(content: string): PlanProposal | null {
  const m = content.match(/<<PLAN:([^>]+)>>/)
  if (!m) return null
  const params: Record<string, string> = {}
  for (const piece of m[1].split('|')) {
    const idx = piece.indexOf('=')
    if (idx < 0) continue
    params[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim()
  }
  const goal = params.goal || '我的学习计划'
  const weeks = Math.max(1, Math.min(26, parseInt(params.weeks || '4', 10) || 4))
  const hours = Math.max(1, Math.min(40, parseInt(params.hours || '6', 10) || 6))
  const courseIds = (params.courseIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return { goal, weeks, hours, courseIds, clean: content.replace(m[0], '').trim() }
}

interface Props {
  proposal: PlanProposal
  /** 生成成功后回调（默认仅 setCitedPlanId 用，不再自动跳转） */
  onCreated?: (plan: { id: string; title: string }) => void
  /** 历史会话渲染时为 true，不暴露「一键生成」按钮避免重复生成 */
  historical?: boolean
}

const STEPS = [
  '🔍 解析你的学习目标…',
  '📚 检索引用的课程大纲…',
  '🧠 规划每周节奏与重点…',
  '📅 把任务排进日历…',
  '✨ 整理输出 JSON…',
]

export function PlanProposalCard({ proposal, onCreated, historical = false }: Props) {
  const nav = useNavigate()
  const { generateWithAI, generating } = usePlan()
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [createdPlan, setCreatedPlan] = useState<{ id: string; title: string } | null>(null)

  // 缓动进度条
  if (generating && !busy) setBusy(true)

  const runGenerate = () => {
    setBusy(true)
    setProgress(6)
    setStep(0)
    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + Math.max(0.6, (92 - p) * 0.07), 92))
    }, 280)
    const rot = setInterval(() => setStep((i) => (i + 1) % STEPS.length), 1800)
    generateWithAI(
      {
        goal: proposal.goal,
        weeks: proposal.weeks,
        weeklyHours: proposal.hours,
        courseIds: proposal.courseIds,
      },
      {
        onSuccess: (p: any) => {
          clearInterval(tick)
          clearInterval(rot)
          setProgress(100)
          setDone(true)
          if (p?.id) {
            const created = { id: p.id, title: p.title ?? proposal.goal }
            setCreatedPlan(created)
            onCreated?.(created)
          }
        },
        onError: () => {
          clearInterval(tick)
          clearInterval(rot)
          setBusy(false)
          toast.error('生成失败，请稍后重试')
        },
      },
    )
  }

  if (busy && !done) {
    return (
      <div className="space-y-2 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-3 shadow-card">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-700">
          <Sparkles size={15} className="animate-pulse" />
          书院熊正在排期…
        </div>
        <div className="h-[18px] text-[11px] text-ink-500">{STEPS[step]}</div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="text-right text-[10px] tabular-nums text-ink-500">{Math.round(progress)}%</div>
      </div>
    )
  }

  // 生成完成后的状态：自动引用 + 提供「查看详情」入口
  if (done && createdPlan) {
    return (
      <div className="space-y-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-card">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
          ✅ 计划已生成并自动引用
        </div>
        <div className="line-clamp-2 text-xs text-ink-700">《{createdPlan.title}》</div>
        <p className="text-[11px] text-ink-500">
          接下来问书院熊关于这个计划的任何问题，它都拿得到完整任务清单。
        </p>
        <button
          onClick={() => nav(`/plans/${createdPlan.id}`)}
          className="w-full rounded-2xl bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-card"
        >
          查看计划详情 →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-3 shadow-card">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-white">
          <CalendarRange size={16} />
        </div>
        <div className="flex-1 leading-tight">
          <div className="text-[11px] text-brand-700">书院熊建议</div>
          <div className="text-sm font-bold text-ink-900">AI 学习计划草稿</div>
        </div>
      </div>

      <div className="space-y-1.5 rounded-xl bg-white/70 p-2.5">
        <div className="flex items-start gap-1.5 text-xs text-ink-700">
          <Target size={12} className="mt-0.5 shrink-0 text-brand-600" />
          <span className="line-clamp-2">{proposal.goal}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-600">
          <span className="inline-flex items-center gap-1">
            <CalendarRange size={11} className="text-brand-600" /> {proposal.weeks} 周
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={11} className="text-brand-600" /> 每周 {proposal.hours} 小时
          </span>
          {proposal.courseIds.length > 0 && (
            <span className="text-ink-500">· 引用 {proposal.courseIds.length} 门课</span>
          )}
        </div>
      </div>

      {historical ? (
        <div className="rounded-2xl bg-white/60 px-3 py-1.5 text-center text-[11px] text-ink-500">
          这是历史会话中的草稿建议，如需重新生成请回到「学习计划」页
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => nav(`/plans?ai=1${proposal.courseIds[0] ? `&courseId=${proposal.courseIds[0]}` : ''}`)}
            className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-card active:scale-[0.98]"
          >
            调整参数
          </button>
          <button
            onClick={runGenerate}
            className="inline-flex items-center justify-center gap-1 rounded-2xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white shadow-card active:scale-[0.98] hover:bg-brand-600"
          >
            <Sparkles size={12} /> 一键生成
          </button>
        </div>
      )}
    </div>
  )
}
