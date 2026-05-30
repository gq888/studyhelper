import { create } from 'zustand'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { Mascot } from '@/components/Mascot'

interface Args {
  title?: string
  body: string
  /** 用户确认下载时跳到的路径，默认 /download */
  toPath?: string
}

interface ConfirmState {
  open: boolean
  args: Args
  resolver: ((ok: boolean) => void) | null
  ask: (args: Args) => Promise<boolean>
  close: (ok: boolean) => void
}

export const useInstallConfirm = create<ConfirmState>((set, get) => ({
  open: false,
  args: { body: '' },
  resolver: null,
  ask: (args) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, args, resolver: resolve })
    }),
  close: (ok) => {
    const r = get().resolver
    set({ open: false, resolver: null })
    if (r) r(ok)
  },
}))

/**
 * 简洁的全局函数：不在 React 上下文里也能调。
 *   const ok = await confirmInstallApp({ body: '想要离线提醒？装 App 吧' })
 *   if (ok) navigate('/download')   // 调用方决定跳哪
 */
export function confirmInstallApp(args: Args): Promise<boolean> {
  return useInstallConfirm.getState().ask(args)
}

/** 全局挂载的弹层组件（放在 App 根部一次即可） */
export function InstallAppConfirm() {
  const nav = useNavigate()
  const { open, args, close } = useInstallConfirm()
  if (!open) return null
  const toPath = args.toPath ?? '/download'
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
        onClick={() => close(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 22 }}
          className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => close(false)}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
            aria-label="关闭"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col items-center bg-gradient-to-b from-brand-50 to-white px-6 py-6 text-center">
            <Mascot size={88} mood="reading" />
            <div className="mt-3 text-lg font-extrabold text-ink-900">
              {args.title ?? '下载 App 获得稳定通知'}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{args.body}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4">
            <button
              onClick={() => close(false)}
              className="rounded-2xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-ink-700 transition active:scale-[0.98] hover:bg-brand-100"
            >
              稍后再说
            </button>
            <button
              onClick={() => {
                close(true)
                nav(toPath)
              }}
              className="inline-flex items-center justify-center gap-1 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition active:scale-[0.98] hover:bg-brand-600"
            >
              <Download size={14} /> 立即下载
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
