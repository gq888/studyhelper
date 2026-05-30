import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Brain, ChevronLeft, ChevronRight, Loader2, Trash2, Video } from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { api } from '@/api/client'

interface KbItem {
  id: string
  title: string
  description: string | null
  status: 'building' | 'ready' | 'failed' | string
  totalChars: number
  chunkCount: number
  sourceUrl: string | null
  errorMsg: string | null
  createdAt: string
  updatedAt: string
  course: { id: string; title: string; category: string; sourceUrl: string | null } | null
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  building: { label: '🔨 构建中', color: 'bg-amber-50 text-amber-700' },
  ready: { label: '✅ 可检索', color: 'bg-emerald-50 text-emerald-700' },
  failed: { label: '⚠️ 失败', color: 'bg-red-50 text-red-700' },
}

export default function KbList() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['kb-list'],
    queryFn: () => api<KbItem[]>('/kb'),
    refetchInterval: (q) => {
      const list = q.state.data as KbItem[] | undefined
      return list?.some((i) => i.status === 'building') ? 4000 : false
    },
  })
  const del = useMutation({
    mutationFn: (id: string) => api(`/kb/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kb-list'] })
      toast.success('已删除')
    },
  })

  return (
    <div className="container-app pb-24">
      <div className="pt-[max(env(safe-area-inset-top),12px)]" />
      <header className="flex items-center justify-between py-2">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">我的知识库</div>
        <div className="w-9" />
      </header>

      <div className="card mt-2 flex items-start gap-2 p-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Brain size={18} />
        </div>
        <p className="text-[12px] leading-relaxed text-ink-600">
          解析较长视频时，字幕会被自动切成检索片段。
          AI 陪学引用对应课程后，每次回答都会先从知识库里查相关原文。
        </p>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-brand-50/60" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center">
          <Mascot size={120} mood="reading" bobbing />
          <div className="mt-3 text-sm font-semibold">还没有知识库</div>
          <div className="mt-1 text-xs text-ink-500">解析一段较长的视频，字幕会自动入库 ✨</div>
          <button className="btn-primary mt-4" onClick={() => nav('/extract')}>
            去解析视频
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((k) => {
            const status = STATUS_LABEL[k.status] ?? STATUS_LABEL.building
            return (
              <div key={k.id} className="card overflow-hidden">
                <button onClick={() => nav(`/kb/${k.id}`)} className="block w-full p-4 text-left">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${status.color}`}>
                      {k.status === 'building' && <Loader2 size={10} className="mr-1 inline animate-spin" />}
                      {status.label}
                    </span>
                    {k.course?.category && <span className="uppercase text-ink-500">{k.course.category}</span>}
                    <span className="ml-auto text-ink-500">
                      {k.chunkCount} 片段 · {Math.round(k.totalChars / 100) / 10}k 字
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[15px] font-bold leading-tight">{k.title}</div>
                  {k.description && (
                    <div className="mt-1 line-clamp-2 text-xs text-ink-600">{k.description}</div>
                  )}
                  {k.errorMsg && <div className="mt-1 text-xs text-red-500">{k.errorMsg}</div>}
                </button>
                <div className="flex justify-end gap-3 border-t border-brand-50 px-3 py-1.5 text-xs">
                  {k.course && (
                    <button onClick={() => nav(`/course/${k.course!.id}`)} className="inline-flex items-center gap-1 text-brand-600">
                      <Video size={12} /> 来源课程
                    </button>
                  )}
                  <button
                    onClick={() => confirm(`删除「${k.title}」的知识库？`) && del.mutate(k.id)}
                    className="text-red-500"
                  >
                    <Trash2 size={12} className="inline" /> 删除
                  </button>
                  <button onClick={() => nav(`/kb/${k.id}`)} className="text-brand-600">
                    查看 <ChevronRight size={12} className="inline" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
