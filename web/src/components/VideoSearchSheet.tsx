import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Circle, Loader2, Search, Sparkles, Video, X } from 'lucide-react'
import { api } from '@/api/client'
import { startVideoExtractsBatched } from '@/store/bgTasks'

export interface VideoCandidate {
  id: string
  title: string
  url: string
  cover: string
  author: string
  durationSec: number
  platform: 'bilibili' | 'douyin' | 'youtube' | 'other'
  views?: number
  mock?: boolean
}

interface SearchResp {
  items: VideoCandidate[]
  query: string
  source: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** 打开时预填的关键词，例如 AI 答疑识别出的知识点 */
  initialQuery?: string
  /** 提交成功（已分发到后台）后回调 */
  onSubmitted?: (ids: string[]) => void
}

const BATCH_CONCURRENCY = 3

function fmtDuration(sec: number) {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtViews(n?: number) {
  if (!n) return ''
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}

const PLATFORM_BADGE: Record<VideoCandidate['platform'], string> = {
  bilibili: 'B 站',
  douyin: '抖音',
  youtube: 'YouTube',
  other: '其他',
}

export function VideoSearchSheet({ open, onClose, initialQuery, onSubmitted }: Props) {
  const [keyword, setKeyword] = useState(initialQuery ?? '')
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // 打开时按预填关键词刷新
  useEffect(() => {
    if (open) {
      setKeyword(initialQuery ?? '')
      setSubmittedQuery(initialQuery ?? '')
      setSelected(new Set())
    }
  }, [open, initialQuery])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['video-search', submittedQuery],
    enabled: open,
    queryFn: () =>
      api<SearchResp>(
        `/search/videos?limit=12${
          submittedQuery ? `&q=${encodeURIComponent(submittedQuery)}` : ''
        }`,
      ),
    staleTime: 30_000,
  })

  const items = data?.items ?? []
  const allSelected = useMemo(
    () => items.length > 0 && items.every((i) => selected.has(i.id)),
    [items, selected],
  )

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
  }

  const submit = () => {
    const picks = items.filter((i) => selected.has(i.id))
    if (picks.length === 0) {
      toast('请至少勾选一个视频')
      return
    }
    const { ids } = startVideoExtractsBatched(
      picks.map((p) => ({ url: p.url, title: `🎙 ${p.title.slice(0, 24)}` })),
      BATCH_CONCURRENCY,
      false,
    )
    toast.success(
      `已加入后台，${picks.length} 个任务排队解析（同时最多 ${BATCH_CONCURRENCY} 个并发）`,
    )
    onSubmitted?.(ids)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setSubmittedQuery(keyword.trim())
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            key="sheet"
            className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white md:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center gap-2 border-b border-brand-50 px-5 py-3">
              <Video size={18} className="text-brand-600" />
              <div className="text-base font-bold">搜索学习视频</div>
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {data?.source?.includes('mock') ? 'B 站排行榜 · 真实链接' : '搜索'}
              </span>
              <button
                onClick={onClose}
                className="ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-ink-50"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            {/* 搜索框 */}
            <div className="px-5 pt-3">
              <div className="flex items-center gap-2 rounded-2xl bg-brand-50/60 px-3 py-2">
                <Search size={15} className="text-ink-500" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="关键词，如「反向传播 直观解释」"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={onKeyDown}
                  autoFocus
                />
                <button
                  onClick={() => setSubmittedQuery(keyword.trim())}
                  className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white active:scale-95"
                >
                  搜索
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-500">
                勾选感兴趣的视频，AI 会自动提取字幕、生成课程并加入你的知识库；在 AI 陪学里发起时还会自动引用到当前对话。
              </p>
            </div>

            {/* 列表 */}
            <div className="mt-2 flex-1 overflow-y-auto px-5 pb-2">
              {isLoading || isFetching ? (
                <div className="flex h-40 items-center justify-center text-ink-500">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center text-ink-500">
                  <Video size={28} className="mb-2 opacity-40" />
                  <div className="text-sm">没有候选视频</div>
                  <button onClick={() => refetch()} className="mt-2 text-xs text-brand-600">
                    重试
                  </button>
                </div>
              ) : (
                <ul className="space-y-2 py-1">
                  {items.map((it) => {
                    const checked = selected.has(it.id)
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => toggle(it.id)}
                          className={`flex w-full items-start gap-3 rounded-2xl border p-2 text-left transition active:scale-[0.99] ${
                            checked
                              ? 'border-brand-400 bg-brand-50/60'
                              : 'border-brand-50 bg-white'
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img
                              src={it.cover}
                              alt=""
                              className="h-16 w-24 rounded-xl object-cover"
                              loading="lazy"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.opacity = '0.2'
                              }}
                            />
                            {it.durationSec > 0 && (
                              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
                                {fmtDuration(it.durationSec)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-[13px] font-semibold leading-tight">
                              {it.title}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-500">
                              <span className="rounded bg-brand-50 px-1 text-brand-700">
                                {PLATFORM_BADGE[it.platform]}
                              </span>
                              <span className="truncate">{it.author}</span>
                              {it.views ? <span>· 👁 {fmtViews(it.views)}</span> : null}
                            </div>
                          </div>
                          <div className="self-center text-brand-600">
                            {checked ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <Circle size={18} className="text-ink-300" />
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center gap-2 border-t border-brand-50 px-5 py-3">
              <button
                onClick={toggleAll}
                disabled={items.length === 0}
                className="text-xs text-ink-600 underline disabled:opacity-30"
              >
                {allSelected ? '取消全选' : '全选'}
              </button>
              <span className="text-xs text-ink-500">已选 {selected.size} / {items.length}</span>
              <button
                onClick={submit}
                disabled={selected.size === 0}
                className="ml-auto inline-flex items-center gap-1 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-4 py-2 text-sm font-bold text-white shadow-card transition active:scale-95 disabled:opacity-40"
              >
                <Sparkles size={14} /> 批量解析（并发 {BATCH_CONCURRENCY}）
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
