import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Lock, Sparkles, X } from 'lucide-react'

export interface AchievementDef {
  code: string
  title: string
  icon: string
  desc: string
}

export interface AchievementProgress {
  current: number
  target: number
  /** 显示单位（默认无） */
  unit?: string
  /** 当前后端还没有可靠数据时标记为不可统计 */
  unknown?: boolean
}

interface Props {
  /** null / undefined 表示关闭 */
  item: AchievementDef | null
  progress?: AchievementProgress
  onClose: () => void
}

/** 把进度抽象成百分比 + 状态文案 */
function summarize(p?: AchievementProgress) {
  if (!p) return { pct: 0, status: 'idle' as const, label: '—' }
  if (p.unknown) return { pct: 0, status: 'idle' as const, label: '暂未统计' }
  const pct = p.target > 0 ? Math.min(100, Math.round((p.current / p.target) * 100)) : 0
  if (p.current >= p.target) return { pct: 100, status: 'unlocked' as const, label: '已解锁' }
  if (p.current > 0) return { pct, status: 'progress' as const, label: '进行中' }
  return { pct: 0, status: 'idle' as const, label: '待开启' }
}

export function AchievementSheet({ item, progress, onClose }: Props) {
  const open = !!item
  const sum = summarize(progress)

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
            className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl ${
                  sum.status === 'unlocked'
                    ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-card'
                    : 'bg-brand-50'
                }`}
              >
                {item?.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold">{item?.title}</h3>
                  <StatusChip status={sum.status} label={sum.label} />
                </div>
                <p className="mt-1 text-xs text-ink-600">{item?.desc}</p>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-ink-50"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            {/* 进度条 */}
            <div className="mt-5">
              <div className="mb-1 flex items-end justify-between text-[11px] text-ink-500">
                <span>进度</span>
                <span className="tabular-nums">
                  {progress?.unknown
                    ? '—'
                    : `${progress?.current ?? 0} / ${progress?.target ?? 0}${progress?.unit ?? ''}`}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-100">
                <motion.div
                  className={`h-full rounded-full ${
                    sum.status === 'unlocked'
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                      : 'bg-gradient-to-r from-brand-400 to-brand-600'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${sum.pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-2 text-[11px] text-ink-500">
                {progress?.unknown
                  ? '该成就的统计口径尚在路上，敬请期待 ✨'
                  : sum.status === 'unlocked'
                  ? '🎉 恭喜达成，继续保持！'
                  : `还差 ${Math.max(0, (progress?.target ?? 0) - (progress?.current ?? 0))}${
                      progress?.unit ?? ''
                    } 即可解锁`}
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn-primary mt-5 w-full"
            >
              <Sparkles size={16} /> 我知道了
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StatusChip({
  status,
  label,
}: {
  status: 'unlocked' | 'progress' | 'idle'
  label: string
}) {
  if (status === 'unlocked')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2 size={11} /> {label}
      </span>
    )
  if (status === 'progress')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Sparkles size={11} /> {label}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
      <Lock size={11} /> {label}
    </span>
  )
}
