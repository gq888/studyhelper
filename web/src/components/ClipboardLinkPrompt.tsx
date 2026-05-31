import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardCheck, Link2, Sparkles, X } from 'lucide-react'
import type { ClipboardHit } from '@/hooks/useClipboardLink'

interface Props {
  hit: ClipboardHit | null
  onClose: () => void
  /** 用户点「立即解析」时触发，由父组件实际调起 bgTasks */
  onParse: (hit: ClipboardHit) => void
}

const PLATFORM_BADGE: Record<ClipboardHit['platform'], { label: string; bg: string; tip: string }> = {
  douyin: {
    label: '抖音',
    bg: 'bg-pink-100 text-pink-700',
    tip: '已支持解析抖音分享口令 ✓',
  },
  bilibili: {
    label: 'B 站',
    bg: 'bg-sky-100 text-sky-700',
    tip: 'B 站视频可直接提取字幕 ✓',
  },
  youtube: {
    label: 'YouTube',
    bg: 'bg-red-100 text-red-700',
    tip: 'YouTube 链接需要网络可达 YT',
  },
  generic: {
    label: '网页',
    bg: 'bg-ink-100 text-ink-700',
    tip: '如果是 mp4 直链，可以直接解析',
  },
}

export function ClipboardLinkPrompt({ hit, onClose, onParse }: Props) {
  const open = !!hit

  return (
    <AnimatePresence>
      {open && hit && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 md:items-center"
          style={{ paddingBottom: 'var(--bottom-nav-h)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            key="sheet"
            className="w-full max-w-md rounded-3xl bg-white p-5 md:max-w-md"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <ClipboardCheck size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-extrabold">检测到剪贴板有链接</h3>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${PLATFORM_BADGE[hit.platform].bg}`}
                  >
                    {PLATFORM_BADGE[hit.platform].label}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {PLATFORM_BADGE[hit.platform].tip}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-ink-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* URL 预览框 */}
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/40 px-3 py-2.5">
              <Link2 size={14} className="mt-0.5 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 break-all text-[12px] text-ink-700">{hit.url}</div>
                {hit.rawText !== hit.url && (
                  <div className="mt-1 line-clamp-2 text-[10px] text-ink-500">
                    剪贴板原文：{hit.rawText.slice(0, 60)}
                    {hit.rawText.length > 60 ? '…' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-ink-50 px-4 py-2.5 text-sm font-semibold text-ink-700 active:scale-[0.98]"
              >
                忽略
              </button>
              <button
                onClick={() => onParse(hit)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-card active:scale-[0.98]"
              >
                <Sparkles size={14} /> 立即解析
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] text-ink-500">
              复制别的内容后会自动重新检测；忽略过的链接 24h 内不再提示
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
