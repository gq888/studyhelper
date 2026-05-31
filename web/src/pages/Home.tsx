import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarRange, Library as LibraryIcon, Link2, Search, ShoppingBag, Sparkles, Trophy, Video } from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { VideoSearchSheet } from '@/components/VideoSearchSheet'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'

interface Course {
  id: string
  title: string
  subtitle?: string
  category: string
  difficulty: number
  estimatedHours: number
  tags: string[]
  outline: any[]
}

const CATEGORIES = [
  { code: 'all', name: '全部', emoji: '🎒' },
  { code: 'cs', name: '编程', emoji: '💻' },
  { code: 'english', name: '英语', emoji: '🔤' },
  { code: 'math', name: '数理', emoji: '🧮' },
  { code: 'humanities', name: '人文', emoji: '📜' },
  { code: 'exam', name: '考试', emoji: '🎯' },
  { code: 'skill', name: '技能', emoji: '🛠️' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cat, setCat] = ((): [string, (s: string) => void] => {
    const u = new URL(window.location.href)
    return [u.searchParams.get('cat') || 'all', () => {}]
  })()
  // 视频搜索 sheet：非空字符串 = 打开
  const [videoSearchKeyword, setVideoSearchKeyword] = useState<string | null>(null)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', cat],
    queryFn: () => api<Course[]>(`/courses${cat !== 'all' ? `?category=${cat}` : ''}`),
  })

  return (
    <div className="container-app pb-24">
      <div className="pt-[max(env(safe-area-inset-top),12px)]" />
      <header className="flex items-center justify-between pt-2">
        <div>
          <div className="text-xs text-ink-500">嗨，{user?.nickname ?? '同学'} ✨</div>
          <div className="mt-0.5 text-xl font-extrabold">今天想学点什么？</div>
        </div>
        <button
          className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700"
          onClick={() => navigate('/mall')}
          aria-label="商城"
        >
          <ShoppingBag size={20} />
        </button>
      </header>

      {/* 粘贴链接入口 */}
      <button
        onClick={() => navigate('/extract')}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 p-4 text-left shadow-card"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-white">
            <Link2 size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/85">粘贴一条视频/课程链接</div>
            <div className="text-base font-extrabold text-white">AI 立刻提取学习大纲</div>
          </div>
        </div>
        <ArrowRight className="text-white" />
      </button>

      {/* 搜索视频入口 —— 没有现成链接时的兜底 */}
      <button
        onClick={() => setVideoSearchKeyword('')}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-left shadow-card transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-white">
            <Video size={22} />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-amber-600 shadow">
              <Search size={11} strokeWidth={3} />
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white/85">没有现成链接？</div>
            <div className="text-base font-extrabold text-white">搜索想学的视频 · 一键批量解析</div>
          </div>
        </div>
        <ArrowRight className="text-white" />
      </button>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/plans')} className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-card">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarRange size={18} />
          </div>
          <div className="text-left">
            <div className="text-xs text-ink-500">学习计划</div>
            <div className="text-sm font-bold">AI 一键排期</div>
          </div>
        </button>
        <button onClick={() => navigate('/library')} className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-card">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <LibraryIcon size={18} />
          </div>
          <div className="text-left">
            <div className="text-xs text-ink-500">我的视频解析</div>
            <div className="text-sm font-bold">查看历史课程</div>
          </div>
        </button>
        <button onClick={() => navigate('/chat')} className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-card">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Sparkles size={18} />
          </div>
          <div className="text-left">
            <div className="text-xs text-ink-500">AI 陪学</div>
            <div className="text-sm font-bold">和书院鸮聊聊</div>
          </div>
        </button>
        <button onClick={() => navigate('/me')} className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-card">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Trophy size={18} />
          </div>
          <div className="text-left">
            <div className="text-xs text-ink-500">我的学习</div>
            <div className="text-sm font-bold">查看打卡进度</div>
          </div>
        </button>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <a
            key={c.code}
            href={`?cat=${c.code}`}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
              cat === c.code ? 'bg-ink-900 text-white' : 'bg-white text-ink-700 shadow-card'
            }`}
          >
            <span className="mr-1">{c.emoji}</span>
            {c.name}
          </a>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <h2 className="text-base font-bold">热门课程</h2>
        <button className="text-xs text-ink-500" onClick={() => navigate('/mall')}>
          逛书院商城 →
        </button>
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-brand-50/60" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <Mascot size={120} mood="thinking" />
          <p className="mt-3 text-sm text-ink-500">还没有课程，粘贴一条视频试试吧～</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/course/${c.id}`)}
              className="text-left card p-4 transition active:scale-[0.99]"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <BookOpen size={14} className="text-brand-600" />
                <span className="text-[11px] uppercase text-ink-500">{c.category}</span>
                <span className="ml-auto text-[11px] text-ink-500">{c.estimatedHours.toFixed(1)}h</span>
              </div>
              <div className="line-clamp-2 text-[15px] font-bold leading-tight">{c.title}</div>
              {c.subtitle && (
                <div className="mt-1 line-clamp-2 text-xs text-ink-600">{c.subtitle}</div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.tags?.slice(0, 3).map((t) => (
                  <span key={t} className="chip">
                    #{t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <VideoSearchSheet
        open={videoSearchKeyword !== null}
        onClose={() => setVideoSearchKeyword(null)}
        initialQuery={videoSearchKeyword ?? ''}
      />
    </div>
  )
}
