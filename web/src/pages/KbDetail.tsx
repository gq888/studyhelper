import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Brain, ChevronLeft, MessageCircle, Search, Video } from 'lucide-react'
import { api } from '@/api/client'
import { Mascot } from '@/components/Mascot'

interface Chunk {
  id: string
  ord: number
  text: string
  keywords: string
  charCount: number
}

interface KbDetail {
  id: string
  title: string
  description: string | null
  status: string
  totalChars: number
  chunkCount: number
  sourceUrl: string | null
  course: { id: string; title: string; category: string; sourceUrl: string | null } | null
  chunks: Chunk[]
}

export default function KbDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { data: kb, isLoading } = useQuery({
    queryKey: ['kb', id],
    queryFn: () => api<KbDetail>(`/kb/${id}`),
    enabled: !!id,
  })

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Chunk[] | null>(null)
  const [searching, setSearching] = useState(false)

  const doSearch = async () => {
    const q = query.trim()
    if (!q || !id) return
    setSearching(true)
    try {
      const data = await api<{ hits: Chunk[] }>(`/kb/${id}/search`, {
        method: 'POST',
        json: { query: q, k: 5 },
      })
      setHits(data.hits)
      if (data.hits.length === 0) toast('没有相关片段')
    } catch {
      toast.error('搜索失败')
    } finally {
      setSearching(false)
    }
  }

  if (isLoading || !kb) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Mascot size={100} mood="thinking" bobbing />
      </div>
    )
  }

  const visible = hits ?? kb.chunks

  return (
    <div className="container-app pb-10">
      <div className="pt-[max(env(safe-area-inset-top),8px)]" />
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold">知识库</div>
        <div className="w-9" />
      </header>

      <div className="card overflow-hidden">
        <div className="space-y-2 bg-gradient-to-br from-brand-400 to-brand-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <Brain size={18} />
            <span className="text-[11px] uppercase opacity-80">Knowledge Base</span>
          </div>
          <h1 className="text-lg font-extrabold leading-snug">{kb.title}</h1>
          {kb.description && <p className="text-xs opacity-90">{kb.description}</p>}
        </div>
        <div className="grid grid-cols-3 divide-x divide-brand-100 px-2 py-3 text-center">
          <div>
            <div className="text-lg font-extrabold text-brand-700">{kb.chunkCount}</div>
            <div className="text-[11px] text-ink-500">片段</div>
          </div>
          <div>
            <div className="text-lg font-extrabold text-brand-700">{Math.round(kb.totalChars / 100) / 10}k</div>
            <div className="text-[11px] text-ink-500">总字数</div>
          </div>
          <div>
            <div className="text-lg font-extrabold text-brand-700">{kb.status === 'ready' ? '可用' : kb.status}</div>
            <div className="text-[11px] text-ink-500">状态</div>
          </div>
        </div>
      </div>

      {kb.course && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => nav(`/course/${kb.course!.id}`)}
            className="inline-flex flex-1 items-center gap-2 rounded-2xl bg-white p-3 shadow-card transition active:scale-[0.99]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Video size={16} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[11px] text-ink-500">来源课程</div>
              <div className="line-clamp-1 text-sm font-bold">{kb.course.title}</div>
            </div>
          </button>
          <button
            onClick={() => nav(`/chat?courseId=${kb.course!.id}`)}
            className="inline-flex items-center gap-1 rounded-2xl bg-brand-500 px-3 py-3 text-xs font-semibold text-white shadow-card"
          >
            <MessageCircle size={14} /> 引用此 KB 陪学
          </button>
        </div>
      )}

      {/* 搜索框 */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-card">
        <Search size={16} className="text-ink-500" />
        <input
          className="flex-1 bg-transparent text-sm outline-none"
          placeholder="输入问题搜知识库片段..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') doSearch()
          }}
        />
        {hits !== null && (
          <button
            onClick={() => {
              setHits(null)
              setQuery('')
            }}
            className="text-[11px] text-ink-500"
          >
            清除
          </button>
        )}
        <button
          onClick={doSearch}
          disabled={!query.trim() || searching}
          className="rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-card disabled:opacity-40"
        >
          {searching ? '...' : '搜索'}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-bold text-ink-700">
          {hits !== null ? `🎯 命中 ${hits.length} 条` : `📚 全部片段（${kb.chunks.length}）`}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-brand-100 p-8 text-center text-sm text-ink-500">
          {kb.status === 'building' ? '🔨 正在构建中，稍后再来…' : '暂无片段'}
        </div>
      ) : (
        <div className="mt-2 space-y-2.5">
          {visible.map((c) => (
            <div key={c.id} className="card space-y-2 p-3">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700">#{c.ord}</span>
                <span className="text-ink-500">{c.charCount ?? c.text.length} 字</span>
              </div>
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-900">{c.text}</div>
              {c.keywords && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {c.keywords.split(/\s+/).filter(Boolean).slice(0, 12).map((k, i) => (
                    <span key={i} className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-700">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
