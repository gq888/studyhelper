import { useState } from 'react'
import { CalendarPlus, X, Sparkles, Plus } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'
import { useNavigate } from 'react-router-dom'

interface AddToPlanSheetProps {
  open: boolean
  onClose: () => void
  /** 要加入的任务草稿 */
  draft: { title: string; minutes?: number; courseId?: string; note?: string }
}

/**
 * 通用「加入学习计划」浮层，被 Home / Course / Chat 共用
 * 用户：① 选择一个已有计划追加 ② 创建新计划
 */
export function AddToPlanSheet({ open, onClose, draft }: AddToPlanSheetProps) {
  const nav = useNavigate()
  const { plans, addToPlan } = usePlan()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  if (!open) return null

  const submit = (planId: string) => {
    addToPlan({
      planId,
      item: {
        date,
        title: draft.title,
        courseId: draft.courseId,
        minutes: draft.minutes ?? 45,
        note: draft.note,
        order: 0,
      },
    })
    onClose()
  }

  const active = plans.filter((p) => p.status === 'active')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold">
            <CalendarPlus size={18} className="text-brand-600" /> 加入学习计划
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-500">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-500">把「{draft.title}」加入哪个计划？</p>

        {draft.courseId && (
          <button
            onClick={() => {
              onClose()
              nav(`/plans?ai=1&courseId=${draft.courseId}`)
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-3 text-left shadow-card transition active:scale-[0.99]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 text-white">
              <div className="text-[11px] opacity-85">推荐</div>
              <div className="text-sm font-bold leading-tight">基于本课程让 AI 生成一份完整计划</div>
            </div>
          </button>
        )}

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-brand-50 p-3 text-sm">
          <span className="text-ink-500">安排到</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 bg-transparent outline-none"
          />
        </div>

        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {active.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-brand-200 p-5 text-center text-xs text-ink-500">
              你还没有进行中的计划
            </div>
          ) : (
            active.map((p) => (
              <button
                key={p.id}
                onClick={() => submit(p.id)}
                className="flex w-full items-center justify-between rounded-2xl bg-brand-50/60 px-4 py-3 text-left transition active:scale-[0.99] hover:bg-brand-50"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color }} />
                  <div>
                    <div className="text-sm font-bold leading-tight">{p.title}</div>
                    <div className="text-[11px] text-ink-500">
                      {p.startDate} ~ {p.endDate} · {p.progress.done}/{p.progress.total}
                    </div>
                  </div>
                </div>
                <Plus size={16} className="text-brand-600" />
              </button>
            ))
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => { onClose(); nav('/plans?new=1') }} className="btn-ghost">
            <Plus size={14} /> 新建空计划
          </button>
          <button
            onClick={() => {
              onClose()
              nav(`/plans?ai=1${draft.courseId ? `&courseId=${draft.courseId}` : ''}`)
            }}
            className="btn-ghost"
          >
            <Sparkles size={14} /> AI 自由排期
          </button>
        </div>
      </div>
    </div>
  )
}
