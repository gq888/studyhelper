import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, CheckCircle2, ChevronRight, Loader2, X, XCircle } from 'lucide-react'
import { ensureNotificationPermission, useBgTasks, type BgTask } from '@/store/bgTasks'
import { confirmInstallApp } from '@/components/InstallAppConfirm'

/**
 * 全局浮动指示器：右下角圆形按钮显示进行中任务数量；点击展开抽屉
 */
export function BackgroundTaskFloater() {
  const { tasks, setNotify, cancel, remove, clearDone } = useBgTasks()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  // 没有任何任务 → 完全不渲染
  if (tasks.length === 0) return null

  const running = tasks.filter((t) => t.stage !== 'done' && t.stage !== 'error' && t.stage !== 'cancelled')
  const justDone = tasks.filter((t) => t.stage === 'done' && Date.now() - (t.endedAt ?? 0) < 60_000)

  return (
    <>
      {/* 圆形浮动按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[max(env(safe-area-inset-bottom),16px)] right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/40 transition active:scale-95 md:bottom-6 md:right-6 md:h-14 md:w-14"
        style={{ marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }} // 让位底部 nav
      >
        {running.length > 0 ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={22} />}
        {tasks.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow">
            {tasks.length}
          </span>
        )}
      </button>

      {/* 抽屉 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 md:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 22 }}
              className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-base font-bold">
                  后台任务 <span className="text-xs font-normal text-ink-500">（{running.length} 进行中）</span>
                </div>
                <div className="flex items-center gap-2">
                  {(justDone.length > 0 || tasks.some((t) => t.stage === 'error')) && (
                    <button onClick={() => clearDone()} className="text-[11px] text-ink-500 underline">
                      清理已完成
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-ink-500">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggleNotify={async () => {
                      // 打开通知前确保有权限
                      if (!t.notifyOnComplete) {
                        const ok = await ensureNotificationPermission()
                        if (!ok) {
                          setOpen(false)
                          await confirmInstallApp({
                            title: '通知权限不可用',
                            body: '当前浏览器或系统拒绝了通知权限，无法在任务完成后第一时间提醒你。是否下载 App 获得稳定的本地提醒？',
                          })
                          return
                        }
                      }
                      setNotify(t.id, !t.notifyOnComplete)
                    }}
                    onCancel={() => cancel(t.id)}
                    onRemove={() => remove(t.id)}
                    onOpenResult={() => {
                      setOpen(false)
                      if (t.resultPath) nav(t.resultPath)
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function TaskRow({
  task,
  onToggleNotify,
  onCancel,
  onRemove,
  onOpenResult,
}: {
  task: BgTask
  onToggleNotify: () => void
  onCancel: () => void
  onRemove: () => void
  onOpenResult: () => void
}) {
  const running = task.stage !== 'done' && task.stage !== 'error' && task.stage !== 'cancelled'
  const stateColor =
    task.stage === 'done'
      ? 'bg-emerald-50 border-emerald-200'
      : task.stage === 'error'
        ? 'bg-red-50 border-red-200'
        : task.stage === 'cancelled'
          ? 'bg-ink-100 border-ink-200'
          : 'bg-brand-50/60 border-brand-100'

  return (
    <div className={`space-y-2 rounded-2xl border p-3 ${stateColor}`}>
      <div className="flex items-start gap-2">
        <div className="text-lg">{task.emoji}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="line-clamp-1 text-sm font-bold">{task.title}</div>
          <div className="mt-0.5 text-[11px] text-ink-500">
            {task.stage === 'done'
              ? '✅ 已完成'
              : task.stage === 'error'
                ? `⚠️ ${task.error}`
                : task.stage === 'cancelled'
                  ? '已取消'
                  : task.stageLabel}
          </div>
        </div>
        {running ? (
          <button onClick={onCancel} className="text-ink-400 hover:text-red-500" title="取消">
            <XCircle size={16} />
          </button>
        ) : (
          <button onClick={onRemove} className="text-ink-400 hover:text-ink-700" title="移除">
            <X size={16} />
          </button>
        )}
      </div>

      {running && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
            animate={{ width: `${task.progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px]">
        {running ? (
          <button
            onClick={onToggleNotify}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition ${
              task.notifyOnComplete
                ? 'bg-amber-500 text-white'
                : 'bg-white text-ink-700 shadow-card'
            }`}
          >
            {task.notifyOnComplete ? <Bell size={11} /> : <BellOff size={11} />}
            {task.notifyOnComplete ? '完成时通知我' : '完成时不通知'}
          </button>
        ) : task.stage === 'done' && task.resultPath ? (
          <button
            onClick={onOpenResult}
            className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 font-semibold text-white"
          >
            {task.resultLabel || '查看结果'} <ChevronRight size={11} />
          </button>
        ) : null}
        <span className="ml-auto tabular-nums text-ink-500">
          {Math.round(task.progress)}% · {fmtDur(task.startedAt, task.endedAt)}
        </span>
      </div>
    </div>
  )
}

function fmtDur(from: number, to?: number) {
  const sec = Math.max(0, Math.floor(((to ?? Date.now()) - from) / 1000))
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
