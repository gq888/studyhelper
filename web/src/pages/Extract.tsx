import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { ChevronLeft, ClipboardPaste, Sparkles } from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { api } from '@/api/client'

export default function Extract() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!loading) return
    setProgress(8)
    const t = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 6, 92)), 600)
    return () => clearInterval(t)
  }, [loading])

  async function tryPaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return toast('剪贴板是空的')
      // 简单提取链接
      const urlMatch = text.match(/(https?:\/\/[^\s]+)/i)
      if (urlMatch) setUrl(urlMatch[0])
      setContent(text)
      toast.success('已粘贴 ✨')
    } catch {
      toast.error('需要允许访问剪贴板')
    }
  }

  async function submit() {
    if (!content.trim()) return toast('请粘贴或输入视频内容/链接描述')
    setLoading(true)
    try {
      const data = await api<{ id?: string; title: string }>('/ai/extract-course', {
        method: 'POST',
        json: { sourceUrl: url || undefined, content, hint: hint || undefined },
      })
      if (data?.id) {
        toast.success('课程已生成 🎉')
        navigate(`/course/${data.id}`, { replace: true })
      } else {
        toast.error('生成失败，请重试')
      }
    } catch (e: any) {
      const msg: string = e?.data?.detail ?? e?.message ?? '生成失败'
      if (msg.includes('ModelNotOpen') || msg.includes('does not exist')) {
        toast.error('请先在火山方舟控制台开通 doubao-seed 模型服务', { duration: 5000 })
      } else if (msg.includes('AuthenticationError') || msg.includes('401')) {
        toast.error('API_KEY 无效，请检查 .env')
      } else {
        toast.error('AI 服务暂时不可用')
      }
    } finally {
      setLoading(false)
      setProgress(100)
    }
  }

  return (
    <div className="container-app pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center justify-between py-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">课程提取</div>
        <div className="w-9" />
      </header>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Mascot size={140} mood="reading" bobbing />
          <div className="mt-4 text-base font-semibold">书院熊正在解析…</div>
          <div className="mt-1 text-xs text-ink-500">为你整理结构化学习大纲</div>
          <div className="mt-6 h-2 w-56 overflow-hidden rounded-full bg-brand-100">
            <motion.div
              className="h-full bg-brand-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="card mt-2 p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">视频或课程链接（可选）</label>
              <button className="chip" onClick={tryPaste}>
                <ClipboardPaste size={12} />
                粘贴
              </button>
            </div>
            <input
              className="input mt-2"
              placeholder="https://www.bilibili.com/video/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="card mt-3 p-4">
            <label className="text-sm font-semibold">视频文案 / 简介 / 字幕</label>
            <p className="mt-1 text-[11px] text-ink-500">
              如果有完整字幕或文案，粘贴效果最好；也可以直接描述视频在讲什么。
            </p>
            <textarea
              className="input mt-2 h-40 resize-none"
              placeholder="例：本视频讲解了机器学习中的反向传播算法，从感知机讲到多层感知机，再到链式法则推导…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="card mt-3 p-4">
            <label className="text-sm font-semibold">学习偏好（可选）</label>
            <input
              className="input mt-2"
              placeholder="例：希望偏向考试题型 / 我是零基础 / 我想用一周学完"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>

          <button onClick={submit} className="btn-primary mt-5 w-full" disabled={!content}>
            <Sparkles size={18} /> 一键提取学习大纲
          </button>
          <p className="mt-3 text-center text-[11px] text-ink-500">
            实时调用 doubao-seed-2.0-pro · 强 JSON 模式 · 无任何 mock
          </p>
        </>
      )}
    </div>
  )
}
