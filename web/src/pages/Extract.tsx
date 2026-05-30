import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardPaste,
  Edit3,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { api } from '@/api/client'
import { ensureNotificationPermission, startVideoExtract, useBgTasks } from '@/store/bgTasks'

const SUBTITLE_SOFT_TIMEOUT_SEC = 240

export default function Extract() {
  const nav = useNavigate()
  const [url, setUrl] = useState('')
  const [hint, setHint] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [manualContent, setManualContent] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /** 当前页面正在追踪的后台任务 id（页面挂载期间持有） */
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  // 取出该任务的实时状态（订阅 store）
  const task = useBgTasks((s) => s.tasks.find((t) => t.id === activeTaskId) ?? null)
  const setNotify = useBgTasks((s) => s.setNotify)
  const setBackground = useBgTasks((s) => s.setBackground)
  const cancel = useBgTasks((s) => s.cancel)

  // 进入页面时若已有一个进行中的 video-extract 任务，自动接续显示
  useEffect(() => {
    if (activeTaskId) return
    const running = useBgTasks
      .getState()
      .tasks.find((t) => t.kind === 'video-extract' && (t.stage === 'subtitle' || t.stage === 'outline' || t.stage === 'submitting'))
    if (running) setActiveTaskId(running.id)
  }, [activeTaskId])

  // 任务完成后跳转到结果页
  const navigatedRef = useRef(false)
  useEffect(() => {
    if (!task || navigatedRef.current) return
    if (task.stage === 'done' && task.resultPath) {
      navigatedRef.current = true
      toast.success('课程已生成 🎉')
      nav(task.resultPath, { replace: true })
    }
    if (task.stage === 'error') {
      setErrorMsg(task.error ?? '解析失败，请重试')
      setActiveTaskId(null)
      setAdvanced(true)
    }
    if (task.stage === 'cancelled') {
      setActiveTaskId(null)
      setErrorMsg('已终止，请改用手动粘贴文案')
      setAdvanced(true)
    }
  }, [task, nav])

  async function tryPaste(setter: (v: string) => void) {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return toast('剪贴板是空的')
      setter(text.trim())
      toast.success('已粘贴 ✨')
    } catch {
      toast.error('需要允许访问剪贴板')
    }
  }

  function runFromUrl() {
    if (!url.trim()) return toast('请粘贴视频链接')
    setErrorMsg(null)
    const { id } = startVideoExtract({ url: url.trim(), hint: hint.trim() || undefined })
    setActiveTaskId(id)
  }

  async function runFromManual() {
    if (!manualContent.trim()) return toast('请粘贴视频文案 / 字幕')
    setErrorMsg(null)
    try {
      const data = await api<{ id?: string; title?: string }>('/ai/extract-course', {
        method: 'POST',
        json: { sourceUrl: url || undefined, content: manualContent.trim(), hint: hint || undefined },
      })
      if (data?.id) {
        toast.success('课程已生成 🎉')
        nav(`/course/${data.id}`, { replace: true })
      } else {
        toast.error('生成失败')
      }
    } catch {
      toast.error('AI 大纲生成失败')
    }
  }

  // 运行中视图
  const busy = task && (task.stage === 'submitting' || task.stage === 'subtitle' || task.stage === 'outline')
  const elapsedSec = task ? Math.floor((Date.now() - task.startedAt) / 1000) : 0
  const softTimeout = task?.stage === 'subtitle' && elapsedSec >= SUBTITLE_SOFT_TIMEOUT_SEC
  // 每秒重渲，让 elapsedSec 动起来
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  return (
    <div className="container-app pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card" aria-label="返回">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">视频解析</div>
        <div className="w-9" />
      </header>

      {busy && task ? (
        <BusyView
          task={task}
          softTimeout={softTimeout}
          elapsedSec={elapsedSec}
          onCancel={() => cancel(task.id)}
          onMoveToBackground={async () => {
            // 转后台时默认顺手帮用户开通知（如果浏览器/系统允许）
            if (!task.notifyOnComplete) {
              const ok = await ensureNotificationPermission()
              if (ok) setNotify(task.id, true)
              else {
                toast('已转后台。浏览器无法保证后台通知，建议安装 App 获得稳定提醒')
                nav('/download')
                return
              }
            }
            setBackground(task.id, true)
            toast.success('已转后台，完成时会通知你 🔔')
            setActiveTaskId(null)
            nav(-1)
          }}
          onToggleNotify={async () => {
            if (!task.notifyOnComplete) {
              const ok = await ensureNotificationPermission()
              if (!ok) {
                toast.error('通知权限不可用，去装 App 获得稳定提醒')
                nav('/download')
                return
              }
            }
            setNotify(task.id, !task.notifyOnComplete)
          }}
        />
      ) : (
        <>
          <div className="card mt-2 p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">视频链接</label>
              <button className="chip" onClick={() => tryPaste(setUrl)}>
                <ClipboardPaste size={12} />
                粘贴
              </button>
            </div>
            <input
              className="input mt-2"
              placeholder="bilibili / mp4 直链，或抖音分享口令"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoCapitalize="none"
            />
            <p className="mt-2 text-[11px] text-ink-500">
              支持 B 站、mp4 直链；抖音可直接整段粘贴「复制打开抖音…」的分享口令。
              无声视频请走「高级 → 手动粘贴文案」。
            </p>
          </div>

          <div className="card mt-3 p-4">
            <label className="text-sm font-semibold">学习偏好（可选）</label>
            <input
              className="input mt-2"
              placeholder="例：希望偏向考试题型 / 我是零基础 / 想用一周学完"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>

          <button onClick={runFromUrl} className="btn-primary mt-5 w-full" disabled={!url.trim()}>
            <Sparkles size={18} /> 一键解析并生成学习大纲
          </button>
          <p className="mt-3 text-center text-[11px] text-ink-500">
            字幕由 Coze 工作流提取 · 大纲由 doubao-seed-2.0-pro 实时生成
          </p>

          {errorMsg && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            onClick={() => setAdvanced((v) => !v)}
            className="mt-5 flex w-full items-center justify-center gap-1 text-xs text-ink-500"
          >
            <Edit3 size={12} /> 高级：手动粘贴文案
            {advanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {advanced && (
            <div className="card mt-3 p-4">
              <label className="text-sm font-semibold">视频文案 / 简介 / 字幕</label>
              <p className="mt-1 text-[11px] text-ink-500">
                如果视频无声或链接不支持解析，可以手动复制视频文案到这里。
              </p>
              <textarea
                className="input mt-2 h-40 resize-none"
                placeholder="例：本视频讲解了机器学习中的反向传播算法…"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
              />
              <button onClick={runFromManual} className="btn-ghost mt-3 w-full" disabled={!manualContent.trim()}>
                <Sparkles size={16} /> 仅用文案生成大纲
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BusyView({
  task,
  softTimeout,
  elapsedSec,
  onCancel,
  onMoveToBackground,
  onToggleNotify,
}: {
  task: { stage: string; progress: number; stageLabel: string; notifyOnComplete: boolean }
  softTimeout: boolean
  elapsedSec: number
  onCancel: () => void
  onMoveToBackground: () => void
  onToggleNotify: () => void
}) {
  const isSubtitle = task.stage === 'subtitle' || task.stage === 'submitting'
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0')
  const ss = String(elapsedSec % 60).padStart(2, '0')
  return (
    <div className="flex flex-col items-center py-8">
      <Mascot size={140} mood={isSubtitle ? 'thinking' : 'reading'} bobbing />
      <div className="mt-4 text-base font-bold">
        {isSubtitle ? '正在提取视频字幕…' : '书院熊正在整理学习大纲…'}
      </div>
      <div className="mt-1 h-5 text-xs text-ink-500">{task.stageLabel}</div>

      <div className="mt-5 h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-brand-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          animate={{ width: `${task.progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
        <span className={isSubtitle ? 'font-semibold text-brand-700' : ''}>① 字幕提取</span>
        <span>→</span>
        <span className={!isSubtitle ? 'font-semibold text-brand-700' : ''}>② AI 大纲</span>
      </div>
      <div className="mt-1 flex w-full max-w-sm items-center justify-between text-[11px] text-ink-500">
        <span>{isSubtitle ? 'Coze 工作流' : 'doubao-seed-2.0-pro'}</span>
        <span className="tabular-nums">{Math.round(task.progress)}% · {mm}:{ss}</span>
      </div>

      {/* 后台 + 通知开关 */}
      <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
        <button
          onClick={onMoveToBackground}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition active:scale-[0.98] hover:bg-brand-600"
        >
          <Layers size={14} /> 改为后台运行 · 完成时通知我
        </button>
        <button
          onClick={onToggleNotify}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold transition ${
            task.notifyOnComplete
              ? 'bg-amber-500 text-white shadow-card'
              : 'bg-white text-ink-700 shadow-card hover:bg-amber-50'
          }`}
        >
          {task.notifyOnComplete ? <Bell size={12} /> : <BellOff size={12} />}
          {task.notifyOnComplete ? '完成时通知已开启' : '完成时也通知我'}
        </button>
      </div>

      {softTimeout && (
        <div className="mt-4 w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          ⏰ 接口响应超过 4 分钟，可能已失败（如无声视频）。建议终止并改用手动粘贴。
        </div>
      )}

      <button
        onClick={onCancel}
        className={`mt-4 inline-flex items-center justify-center gap-1 rounded-2xl px-4 py-2 text-xs font-semibold transition ${
          softTimeout
            ? 'bg-amber-500 text-white shadow-card active:scale-[0.98] hover:bg-amber-600'
            : 'text-ink-500 underline'
        }`}
      >
        {softTimeout ? '终止轮询并改用手动粘贴' : '取消并改用手动粘贴'}
      </button>
    </div>
  )
}
