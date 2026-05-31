import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, X } from 'lucide-react'
import { api } from '@/api/client'

interface PlanLite {
  id: string
  title: string
  color: string
  startDate: string
  endDate: string
  status: string
  progress: { done: number; total: number; percent: number }
}

interface Props {
  open: boolean
  onClose: () => void
  selectedId?: string
  onChange: (id: string | undefined) => void
}

/** 单选引用学习计划。最多同时引用 1 个，与 CoursePicker 区分开 */
export function PlanPicker({ open, onClose, selectedId, onChange }: Props) {
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api<PlanLite[]>('/plans'),
    enabled: open,
  })
  if (!open) return null
  const active = plans.filter((p) => p.status === 'active')
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-bold">📋 引用学习计划</div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-500">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-ink-500">
          最多同时引用 1 个计划。书院鸮会拿到完整任务清单作为答疑上下文。
        </p>

        {selectedId && (
          <button
            onClick={() => {
              onChange(undefined)
              onClose()
            }}
            className="mt-3 w-full rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
          >
            清除引用
          </button>
        )}

        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
          {active.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-brand-100 p-5 text-center text-xs text-ink-500">
              暂无进行中的计划
            </div>
          )}
          {active.map((p) => {
            const sel = selectedId === p.id
            return (
              <button
                key={p.id}
                onClick={() => {
                  onChange(sel ? undefined : p.id)
                  onClose()
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                  sel ? 'bg-brand-100' : 'bg-brand-50/60 hover:bg-brand-50'
                }`}
              >
                {sel ? <CheckCircle2 size={18} className="shrink-0 text-brand-600" /> : <Circle size={18} className="shrink-0 text-brand-300" />}
                <div className="flex-1">
                  <div className="line-clamp-1 text-sm font-semibold">{p.title}</div>
                  <div className="text-[10px] text-ink-500">
                    {p.startDate} → {p.endDate} · {p.progress.done}/{p.progress.total} · {p.progress.percent}%
                  </div>
                </div>
                <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
