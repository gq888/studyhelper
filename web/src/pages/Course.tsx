import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { toPng } from 'html-to-image'
import {
  BookOpen,
  CalendarCheck2,
  CalendarPlus,
  ChevronLeft,
  Clock3,
  Download,
  Heart,
  Lightbulb,
  Loader,
  MessageCircle,
  Share2,
  SlidersHorizontal,
  Star,
} from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { Stars } from '@/components/Stars'
import { AddToPlanSheet } from '@/components/AddToPlanSheet'
import { api } from '@/api/client'

interface OutlineItem {
  title: string
  duration: string
  points: string[]
  tips?: string[]
}
interface Resource {
  type: string
  title: string
  url?: string
}
interface Course {
  id: string
  title: string
  subtitle?: string
  category: string
  difficulty: number
  estimatedHours: number
  tags: string[]
  objectives: string[]
  prerequisites: string[]
  outline: OutlineItem[]
  resources: Resource[]
  ratingAvg?: number
  ratingCount?: number
  ratings?: any[]
}

export default function CoursePage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const qc = useQueryClient()
  const cardRef = useRef<HTMLDivElement>(null)
  const [portion, setPortion] = useState(1)
  const [portionOpen, setPortionOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [planSheetOpen, setPlanSheetOpen] = useState(false)

  const { data: c, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => api<Course>(`/courses/${id}`),
    enabled: !!id,
  })

  const fav = useMutation({
    mutationFn: () => api(`/favorites`, { method: 'POST', json: { courseId: id } }),
    onSuccess: () => toast.success('已收藏 ❤'),
  })
  const checkin = useMutation({
    mutationFn: () => api(`/checkins`, { method: 'POST', json: { courseId: id, minutes: 25 } }),
    onSuccess: () => {
      toast.success('打卡成功 🎉')
      qc.invalidateQueries({ queryKey: ['heatmap'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e: any) => {
      if (String(e?.message).includes('already_checked_in')) toast('今天已经打过卡啦 ✨')
      else toast.error('打卡失败')
    },
  })

  if (isLoading || !c)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Mascot size={100} mood="thinking" bobbing />
        <Loader className="animate-spin text-brand-500" />
      </div>
    )

  async function saveShareImage() {
    if (!cardRef.current || !c) return
    setShareBusy(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#fffdf8' })
      const link = document.createElement('a')
      link.download = `${c.title}.png`
      link.href = dataUrl
      link.click()
      toast.success('卡片已保存')
    } catch {
      toast.error('生成失败')
    } finally {
      setShareBusy(false)
    }
  }

  const scaledHours = (c.estimatedHours * portion).toFixed(1)

  return (
    <div className="container-app pb-32 pt-[max(env(safe-area-inset-top),8px)]">
      <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-paper/90 px-4 py-3 backdrop-blur">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-ink-700">课程详情</div>
        <button onClick={() => fav.mutate()} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <Heart size={18} className="text-brand-500" />
        </button>
      </header>

      {/* 课程卡头部（用于截图分享） */}
      <div ref={cardRef} className="card overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600">
          <div className="absolute -right-6 -top-6 opacity-20">
            <Mascot size={160} mood="reading" />
          </div>
          <div className="absolute bottom-3 left-4 right-24 text-white">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-medium uppercase">
              {c.category} · 学海小书院 AI 整理
            </div>
            <h1 className="line-clamp-2 text-lg font-extrabold leading-tight">{c.title}</h1>
          </div>
        </div>
        <div className="space-y-4 p-4">
          {c.subtitle && <p className="text-sm text-ink-600">{c.subtitle}</p>}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">
              <Star size={12} className="fill-brand-500 text-brand-500" />
              难度 {'★'.repeat(c.difficulty)}
              <span className="text-brand-300">{'★'.repeat(5 - c.difficulty)}</span>
            </span>
            <span className="chip">
              <Clock3 size={12} /> 预计 {scaledHours}h
            </span>
            {c.tags?.slice(0, 3).map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>

          {c.objectives?.length > 0 && (
            <section>
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-brand-700">
                <BookOpen size={15} /> 学习目标
              </div>
              <ul className="space-y-1 rounded-2xl bg-brand-50/60 p-3 text-sm text-ink-700">
                {c.objectives.map((o, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-brand-500">✓</span> <span>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.prerequisites?.length > 0 && (
            <section>
              <div className="mb-1.5 text-sm font-bold text-brand-700">前置知识</div>
              <div className="flex flex-wrap gap-1.5">
                {c.prerequisites.map((p, i) => (
                  <span key={i} className="rounded-full bg-white px-3 py-1 text-xs text-ink-700 shadow-card">
                    {p}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-sm font-bold text-brand-700">学习章节</div>
              <button
                onClick={() => setPortionOpen(true)}
                className="flex items-center gap-1 text-xs text-ink-500"
              >
                <SlidersHorizontal size={13} /> 调整学时 ×{portion}
              </button>
            </div>
            <ol className="space-y-3">
              {c.outline.map((item, i) => (
                <li key={i} className="rounded-2xl bg-white p-3 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-[12px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-[15px] font-bold">{item.title}</span>
                    </div>
                    <span className="text-[11px] text-ink-500">{item.duration}</span>
                  </div>
                  {item.points?.length > 0 && (
                    <ul className="mt-2 ml-7 space-y-0.5 text-sm text-ink-700">
                      {item.points.map((p, j) => (
                        <li key={j}>· {p}</li>
                      ))}
                    </ul>
                  )}
                  {item.tips && item.tips.length > 0 && (
                    <div className="mt-2 ml-7 rounded-xl bg-brand-50/70 p-2 text-xs text-brand-700">
                      <div className="mb-0.5 flex items-center gap-1 font-semibold">
                        <Lightbulb size={11} /> 学习 tips
                      </div>
                      {item.tips.map((t, k) => (
                        <div key={k}>· {t}</div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {c.resources?.length > 0 && (
            <section>
              <div className="mb-1.5 text-sm font-bold text-brand-700">推荐资料</div>
              <div className="space-y-1.5">
                {c.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl bg-white p-3 text-sm shadow-card hover:bg-brand-50/50"
                  >
                    <span className="mr-2 text-[11px] uppercase text-brand-600">{r.type}</span>
                    {r.title}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-100/70 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 backdrop-blur md:bottom-auto md:top-auto md:relative md:mt-4 md:rounded-3xl md:border md:p-4 md:shadow-card">
        <div className="container-app flex gap-2">
          <button onClick={() => setShareOpen(true)} className="btn-ghost flex-1">
            <Share2 size={16} /> 分享
          </button>
          <button onClick={() => setPlanSheetOpen(true)} className="btn-ghost flex-1">
            <CalendarPlus size={16} /> 加入计划
          </button>
          <button onClick={() => checkin.mutate()} className="btn-ghost flex-1">
            <CalendarCheck2 size={16} /> 打卡
          </button>
          <button onClick={() => nav(`/chat?courseId=${c.id}`)} className="btn-primary flex-1">
            <MessageCircle size={16} /> 陪学
          </button>
        </div>
        <div className="mt-2 text-center text-[11px] text-ink-500 md:hidden">
          学完了？
          <button className="text-brand-600" onClick={() => nav(`/rate/${c.id}`)}>
            去打分 →
          </button>
        </div>
      </div>

      {/* 分量弹窗 */}
      {portionOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center" onClick={() => setPortionOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-bold">调整学时 / 学习强度</div>
            <p className="mt-1 text-xs text-ink-500">×1 表示按推荐学时学习，×2 表示加倍练习。</p>
            <div className="mt-5 flex items-center justify-center gap-6">
              <button
                className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"
                onClick={() => setPortion(Math.max(1, portion - 1))}
              >
                −
              </button>
              <div className="text-3xl font-extrabold">×{portion}</div>
              <button
                className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"
                onClick={() => setPortion(Math.min(5, portion + 1))}
              >
                +
              </button>
            </div>
            <div className="mt-2 text-center text-xs text-ink-500">
              预计累计 {(c.estimatedHours * portion).toFixed(1)} 小时
            </div>
            <button className="btn-primary mt-5 w-full" onClick={() => setPortionOpen(false)}>
              保存
            </button>
          </div>
        </div>
      )}

      {/* 加入计划弹窗（可复用） */}
      <AddToPlanSheet
        open={planSheetOpen}
        onClose={() => setPlanSheetOpen(false)}
        draft={{
          title: `学习《${c.title}》`,
          minutes: Math.max(15, Math.round(c.estimatedHours * 60 / Math.max(1, c.outline.length))),
          courseId: c.id,
          note: c.subtitle ?? undefined,
        }}
      />

      {/* 分享弹窗 */}
      {shareOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setShareOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold">分享给亲朋好友</div>
            <p className="mt-1 text-xs text-ink-500">生成一张学习卡片图片，可保存或分享到任意 App。</p>
            <button className="btn-primary mt-4 w-full" onClick={saveShareImage} disabled={shareBusy}>
              {shareBusy ? '生成中…' : (
                <>
                  <Download size={16} /> 保存图片
                </>
              )}
            </button>
            <button
              className="mt-2 w-full py-2 text-sm text-ink-500"
              onClick={() => {
                navigator.clipboard?.writeText(`【${c.title}】 来自学海小书院的 AI 学习大纲，一起学吗？`)
                toast.success('分享文案已复制 ✨')
                setShareOpen(false)
              }}
            >
              复制邀请文案
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
