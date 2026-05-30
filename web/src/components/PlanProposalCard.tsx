import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Bell, BellOff, CalendarRange, Clock3, Layers, Sparkles, Target } from 'lucide-react'
import { ensureNotificationPermission, startPlanGenerate, useBgTasks } from '@/store/bgTasks'

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
  const [taskId, setTaskId] = useState<string | null>(null)
  // 订阅本卡片对应的后台任务
  const task = useBgTasks((s) => s.tasks.find((t) => t.id === taskId) ?? null)
  const setNotify = useBgTasks((s) => s.setNotify)
  const setBackground = useBgTasks((s) => s.setBackground)

  // 任务完成时回调父组件（让 Chat 自动引用新计划）
  useEffect(() => {
    if (!task || !onCreated) return
    if (task.stage === 'done' && task.result?.id) {
      onCreated({ id: task.result.id, title: task.result.title })
    }
  }, [task, onCreated])

  const runGenerate = () => {
    const { id } = startPlanGenerate({
      goal: proposal.goal,
      weeks: proposal.weeks,
      weeklyHours: proposal.hours,
      courseIds: proposal.courseIds,
    })
    setTaskId(id)
  }

  const moveToBackground = async () => {
    if (!task) return
    if (!task.notifyOnComplete) {
      const ok = await ensureNotificationPermission()
      if (ok) setNotify(task.id, true)
      else {
        toast('已转后台。浏览器无法保证后台通知，建议安装 App 获得稳定提醒')
        nav('/download')
        return
      }
    }
    setBackground(task.id, true)
    toast.success('已转后台，完成时会通知你 🔔')
    setTaskId(null)
  }

  const toggleNotify = async () => {
    if (!task) return
    if (!task.notifyOnComplete) {
      const ok = await ensureNotificationPermission()
      if (!ok) {
        toast.error('通知权限不可用，去装 App 获得稳定提醒')
        nav('/download')
        return
      }
    }
    setNotify(task.id, !task.notifyOnComplete)
  }

  const busy = !!task && task.stage === 'plan-generating'
  const done = task?.stage === 'done'
  const createdPlan = done && task?.result ? { id: task.result.id as string, title: task.result.title as string } : null
  const progress = task?.progress ?? 0
  const stageLabel = task?.stageLabel ?? STEPS[0]

  if (busy && !done) {
    return (
      <div className="space-y-2 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-3 shadow-card">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-700">
          <Sparkles size={15} className="animate-pulse" />
          书院熊正在排期…
        </div>
        <div className="h-[18px] text-[11px] text-ink-500">{stageLabel}</div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-ink-500">
          <span>doubao-seed-2.0-pro</span>
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={moveToBackground}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand-500 px-2 py-1.5 text-[11px] font-semibold text-white shadow-card active:scale-[0.98]"
          >
            <Layers size={11} /> 转后台 + 通知
          </button>
          <button
            onClick={toggleNotify}
            className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition ${
              task?.notifyOnComplete
                ? 'bg-amber-500 text-white shadow-card'
                : 'bg-white text-ink-700 shadow-card'
            }`}
          >
            {task?.notifyOnComplete ? <Bell size={11} /> : <BellOff size={11} />}
            {task?.notifyOnComplete ? '完成时通知' : '完成时也通知'}
          </button>
        </div>
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
