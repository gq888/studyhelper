import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardPaste,
  Edit3,
  Link2,
  Sparkles,
} from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { api } from '@/api/client'

type Phase = 'idle' | 'subtitle' | 'outline' | 'done'

interface ExtractCourseResp {
  id?: string
  title?: string
}

interface VideoTaskResp {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | string
  taskId: string
  subtitleText?: string
  plainText?: string
  subtitleUrl?: string | null
  error?: string
}

const SUBTITLE_STEPS = [
  '📥 提交解析任务…',
  '🎬 下载视频音轨…',
  '🎙 自动语音识别中…',
  '📜 整理 SRT 字幕…',
  '✅ 字幕提取完成',
]
const OUTLINE_STEPS = [
  '🧠 书院熊在阅读字幕…',
  '🎯 提炼学习目标…',
  '📚 拆解章节大纲…',
  '💡 准备学习 tips…',
  '✨ 整理输出 JSON…',
]
const SUBTITLE_SOFT_TIMEOUT_SEC = 240 // 4 分钟后出现「可能已失败」提示，但不主动停

export default function Extract() {
  const nav = useNavigate()
  const [url, setUrl] = useState('')
  const [hint, setHint] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [manualContent, setManualContent] = useState('')

  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [softTimeout, setSoftTimeout] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  const cancelRef = useRef(false)

  // 进度条 + 阶段轮换
  useEffect(() => {
    if (phase !== 'subtitle' && phase !== 'outline') {
      setProgress(0)
      setStepIdx(0)
      setSoftTimeout(false)
      setElapsedSec(0)
      return
    }
    setProgress(6)
    const tick = setInterval(() => {
      setProgress((p) => {
        const delta = Math.max(0.4, (92 - p) * 0.05)
        return Math.min(p + delta, 92)
      })
    }, 280)
    const rot = setInterval(() => {
      const steps = phase === 'subtitle' ? SUBTITLE_STEPS : OUTLINE_STEPS
      setStepIdx((i) => (i + 1) % steps.length)
    }, 1800)
    return () => {
      clearInterval(tick)
      clearInterval(rot)
    }
  }, [phase])

  // 字幕阶段计时 + 超时提示
  useEffect(() => {
    if (phase !== 'subtitle') return
    const startedAt = Date.now()
    setElapsedSec(0)
    setSoftTimeout(false)
    const t = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000)
      setElapsedSec(sec)
      if (sec >= SUBTITLE_SOFT_TIMEOUT_SEC) setSoftTimeout(true)
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

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

  /** 把字幕/手动文案送到 AI 大纲生成 */
  async function runOutlineStage(content: string) {
    setPhase('outline')
    try {
      const data = await api<ExtractCourseResp>('/ai/extract-course', {
        method: 'POST',
        json: { sourceUrl: url || undefined, content, hint: hint || undefined },
      })
      if (data?.id) {
        setPhase('done')
        toast.success('课程已生成 🎉')
        nav(`/course/${data.id}`, { replace: true })
      } else {
        throw new Error('AI 返回缺少课程 id')
      }
    } catch (e: any) {
      const msg: string = e?.data?.detail ?? e?.message ?? '生成失败'
      if (msg.includes('ModelNotOpen') || msg.includes('does not exist'))
        toast.error('请先在火山方舟控制台开通 doubao-seed 模型服务', { duration: 5000 })
      else toast.error('AI 大纲生成失败')
      setPhase('idle')
    }
  }

  /** 提交 URL → 轮询字幕 → AI 大纲 */
  async function runFromUrl() {
    if (!url.trim()) return toast('请粘贴视频链接')
    cancelRef.current = false
    setErrorMsg(null)
    setPhase('subtitle')

    let taskId: string
    try {
      const submit = await api<{ taskId: string }>('/extract/video', {
        method: 'POST',
        json: { url: url.trim() },
      })
      taskId = submit.taskId
    } catch (e: any) {
      const msg = e?.data?.detail ?? e?.message ?? ''
      if (e?.status === 503 || /not_configured/.test(msg)) {
        setErrorMsg('视频解析服务未配置 COZE_API_TOKEN，请改用手动粘贴')
      } else {
        setErrorMsg('提交解析任务失败：' + String(msg).slice(0, 120))
      }
      setPhase('idle')
      setAdvanced(true)
      return
    }

    // 软超时：不主动停，仅在 UI 上提示，让用户自己决定继续还是终止
    while (!cancelRef.current) {
      await new Promise((r) => setTimeout(r, 3000))
      let row: VideoTaskResp
      try {
        row = await api<VideoTaskResp>(`/extract/video/${taskId}`)
      } catch {
        continue // 暂时网络抖动忽略
      }
      if (row.status === 'completed') {
        const content = (row.plainText || row.subtitleText || '').trim()
        if (!content) {
          setErrorMsg('解析成功但没有识别到任何文字，可能是无声视频')
          setPhase('idle')
          setAdvanced(true)
          return
        }
        await runOutlineStage(content)
        return
      }
      if (row.status === 'failed' || row.status === 'cancelled') {
        setErrorMsg('视频解析失败：' + (row.error?.slice(0, 120) || row.status))
        setPhase('idle')
        setAdvanced(true)
        return
      }
      // pending / running → 继续等
    }
  }

  async function runFromManual() {
    if (!manualContent.trim()) return toast('请粘贴视频文案 / 字幕')
    await runOutlineStage(manualContent.trim())
  }

  const busy = phase === 'subtitle' || phase === 'outline'

  return (
    <div className="container-app pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card" aria-label="返回">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">视频解析</div>
        <div className="w-9" />
      </header>

      {busy ? (
        <BusyView
          phase={phase}
          progress={progress}
          stepIdx={stepIdx}
          softTimeout={softTimeout}
          elapsedSec={elapsedSec}
          onCancel={() => {
            cancelRef.current = true
            setPhase('idle')
            setAdvanced(true)
            setErrorMsg('已终止解析，请在下方手动粘贴视频文案。')
          }}
        />
      ) : (
        <>
          {/* 主流程：URL only */}
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
              placeholder="https://www.bilibili.com/video/... 或 mp4 直链"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoCapitalize="none"
            />
            <p className="mt-2 text-[11px] text-ink-500">
              支持有人声的中文 / 英文学习视频。无声视频请走「高级 → 手动粘贴文案」。
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

          {/* 错误降级提示 */}
          {errorMsg && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 高级 / 手动模式 */}
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
                如果视频无声或链接不支持解析，可以手动复制视频文案来这里。
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
  phase,
  progress,
  stepIdx,
  softTimeout,
  elapsedSec,
  onCancel,
}: {
  phase: Exclude<Phase, 'idle' | 'done'>
  progress: number
  stepIdx: number
  softTimeout: boolean
  elapsedSec: number
  onCancel: () => void
}) {
  const isSubtitle = phase === 'subtitle'
  const steps = isSubtitle ? SUBTITLE_STEPS : OUTLINE_STEPS
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0')
  const ss = String(elapsedSec % 60).padStart(2, '0')
  return (
    <div className="flex flex-col items-center py-10">
      <Mascot size={140} mood={isSubtitle ? 'thinking' : 'reading'} bobbing />
      <div className="mt-4 text-base font-bold">
        {isSubtitle ? '正在提取视频字幕…' : '书院熊正在整理学习大纲…'}
      </div>
      <div className="mt-1 h-5 text-xs text-ink-500">{steps[stepIdx]}</div>

      <div className="mt-5 h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-brand-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* 两阶段指示 */}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
        <span className={isSubtitle ? 'font-semibold text-brand-700' : ''}>① 字幕提取</span>
        <span>→</span>
        <span className={!isSubtitle ? 'font-semibold text-brand-700' : ''}>② AI 大纲</span>
      </div>

      <div className="mt-1 flex w-full max-w-sm items-center justify-between text-[11px] text-ink-500">
        <span>{isSubtitle ? 'Coze 工作流' : 'doubao-seed-2.0-pro'}</span>
        <span className="tabular-nums">
          {Math.round(progress)}%
          {isSubtitle && elapsedSec > 0 ? ` · ${mm}:${ss}` : ''}
        </span>
      </div>

      <p className="mt-4 text-center text-[11px] text-ink-500">
        {isSubtitle ? '语音识别通常 30-120 秒，会一直等到接口返回结果。' : '通常 10-20 秒。'}
      </p>

      {isSubtitle && softTimeout && (
        <div className="mt-4 w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          ⏰ 接口响应时间超过 4 分钟，可能已失败（如无声视频 / 平台不支持）。
          建议终止轮询并改用手动粘贴文案。
        </div>
      )}

      {isSubtitle && (
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
      )}
    </div>
  )
}
