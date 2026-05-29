import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronLeft, Clock3, Link2, Search, Trash2 } from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { api } from '@/api/client'

interface Course {
  id: string
  title: string
  subtitle?: string
  category: string
  difficulty: number
  estimatedHours: number
  tags: string[]
  sourceUrl?: string | null
  createdAt: string
}

const CATEGORIES = [
  { code: 'all', name: '全部', emoji: '📚' },
  { code: 'cs', name: '编程', emoji: '💻' },
  { code: 'english', name: '英语', emoji: '🔤' },
  { code: 'math', name: '数理', emoji: '🧮' },
  { code: 'lang', name: '语言', emoji: '🗣' },
  { code: 'humanities', name: '人文', emoji: '📜' },
  { code: 'exam', name: '考试', emoji: '🎯' },
  { code: 'skill', name: '技能', emoji: '🛠️' },
]

export default function Library() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['my-courses', cat],
    queryFn: () => api<Course[]>(`/courses?ownerOnly=true${cat !== 'all' ? `&category=${cat}` : ''}`),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api(`/courses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-courses'] })
      toast.success('已删除')
    },
  })

  const filtered = courses.filter((c) => !search.trim() || c.title.includes(search.trim()))

  return (
    <div className="container-app pt-[max(env(safe-area-inset-top),12px)] pb-24">
      <header className="flex items-center justify-between py-2">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">我的视频解析</div>
        <button onClick={() => nav('/extract')} className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Link2 size={16} />
        </button>
      </header>

      {/* 搜索 */}
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-card">
        <Search size={16} className="text-ink-500" />
        <input
          className="flex-1 bg-transparent text-sm outline-none"
          placeholder="搜索我的课程..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 分类 */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.code}
            onClick={() => setCat(c.code)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
              cat === c.code ? 'bg-ink-900 text-white' : 'bg-white text-ink-700 shadow-card'
            }`}
          >
            <span className="mr-1">{c.emoji}</span>{c.name}
          </button>
        ))}
      </div>

      <div className="mt-3 text-xs text-ink-500">共 {filtered.length} 门解析的课程</div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-brand-50/60" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <Mascot size={120} mood="thinking" />
          <div className="mt-3 text-sm font-semibold">{search ? '没有匹配的课程' : '还没有解析过课程'}</div>
          {!search && (
            <>
              <div className="mt-1 text-xs text-ink-500">去粘贴一条视频链接试试 →</div>
              <button onClick={() => nav('/extract')} className="btn-primary mt-4">
                <Link2 size={14} /> 立即解析
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <button onClick={() => nav(`/course/${c.id}`)} className="block w-full p-4 text-left">
                <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  <span className="uppercase">{c.category}</span>
                  <span>·</span>
                  <Clock3 size={11} /> {c.estimatedHours.toFixed(1)}h
                  <span className="ml-auto">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-[15px] font-bold leading-tight">{c.title}</div>
                {c.subtitle && <div className="mt-1 line-clamp-1 text-xs text-ink-600">{c.subtitle}</div>}
                {c.sourceUrl && (
                  <div className="mt-1 line-clamp-1 text-[10px] text-brand-600">🔗 {c.sourceUrl}</div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.tags?.slice(0, 4).map((t) => (
                    <span key={t} className="chip">#{t}</span>
                  ))}
                </div>
              </button>
              <div className="flex justify-end gap-3 border-t border-brand-50 px-3 py-1.5 text-xs">
                <button onClick={() => nav(`/chat?courseId=${c.id}`)} className="text-brand-600">💬 进入陪学</button>
                <button
                  onClick={() => confirm(`删除「${c.title}」？`) && remove.mutate(c.id)}
                  className="text-red-500"
                >
                  <Trash2 size={12} className="inline" /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
