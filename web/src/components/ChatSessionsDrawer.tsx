import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MessageSquarePlus, Trash2, X } from 'lucide-react'
import { api } from '@/api/client'

interface Session {
  id: string
  title: string
  courseId?: string | null
  updatedAt: string
}

interface Props {
  open: boolean
  onClose: () => void
  currentId?: string
  onSelect: (id: string) => void
  onNew: () => void
}

export function ChatSessionsDrawer({ open, onClose, currentId, onSelect, onNew }: Props) {
  const qc = useQueryClient()
  const { data: sessions = [] } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api<Session[]>('/chat/sessions'),
    enabled: open,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/chat/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] })
      toast.success('已删除')
    },
  })
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-[80%] max-w-xs overflow-y-auto bg-white p-4 pt-[max(env(safe-area-inset-top),14px)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-bold">历史会话</div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-500">
            <X size={16} />
          </button>
        </div>
        <button
          onClick={() => { onNew(); onClose() }}
          className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700"
        >
          <MessageSquarePlus size={16} /> 开启新对话
        </button>
        <div className="space-y-1.5">
          {sessions.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-brand-100 p-4 text-center text-xs text-ink-500">
              暂无会话
            </div>
          )}
          {sessions.map((s) => {
            const active = s.id === currentId
            return (
              <div key={s.id} className={`group flex items-center gap-1 rounded-2xl px-2 py-2 transition ${active ? 'bg-brand-100/80' : 'hover:bg-brand-50'}`}>
                <button onClick={() => { onSelect(s.id); onClose() }} className="flex-1 text-left">
                  <div className={`line-clamp-1 text-sm font-medium ${active ? 'text-brand-700' : 'text-ink-900'}`}>
                    {s.title}
                  </div>
                  <div className="mt-0.5 text-[10px] text-ink-500">
                    {new Date(s.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('删除会话？')) remove.mutate(s.id) }}
                  className="opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
