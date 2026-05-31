import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { api } from '@/api/client'

interface Course {
  id: string
  title: string
  category: string
  estimatedHours: number
}

interface Props {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function CoursePicker({ open, onClose, selectedIds, onChange }: Props) {
  const { data: courses = [] } = useQuery({
    queryKey: ['my-courses-picker'],
    queryFn: () => api<Course[]>('/courses?ownerOnly=true&take=50'),
    enabled: open,
  })
  if (!open) return null
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id))
    else onChange([...selectedIds, id])
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-bold">📎 引用我的课程</div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-500">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-ink-500">把课程大纲附加到本次对话，书院鸮回答会更精准。</p>
        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
          {courses.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-brand-100 p-5 text-center text-xs text-ink-500">
              还没有解析过课程
            </div>
          )}
          {courses.map((c) => {
            const sel = selectedIds.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${sel ? 'bg-brand-100' : 'bg-brand-50/60 hover:bg-brand-50'}`}
              >
                <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${sel ? 'border-brand-500 bg-brand-500 text-white' : 'border-brand-300'}`}>
                  {sel && <Check size={14} />}
                </div>
                <div className="flex-1">
                  <div className="line-clamp-1 text-sm font-semibold">{c.title}</div>
                  <div className="text-[10px] text-ink-500">{c.category} · {c.estimatedHours.toFixed(1)}h</div>
                </div>
              </button>
            )
          })}
        </div>
        <button onClick={onClose} className="btn-primary mt-4 w-full">
          完成（已选 {selectedIds.length} 项）
        </button>
      </div>
    </div>
  )
}
