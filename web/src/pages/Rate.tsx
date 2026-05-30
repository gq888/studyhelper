import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronLeft } from 'lucide-react'
import { api } from '@/api/client'
import { Stars } from '@/components/Stars'

export default function Rate() {
  const nav = useNavigate()
  const { courseId } = useParams<{ courseId: string }>()
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api<any>(`/courses/${courseId}`),
    enabled: !!courseId,
  })

  const submit = useMutation({
    mutationFn: () => api('/ratings', { method: 'POST', json: { courseId, stars, comment } }),
    onSuccess: () => {
      toast.success('感谢评价 🌟')
      nav('/', { replace: true })
    },
    onError: () => toast.error('提交失败'),
  })

  return (
    <div className="container-app pb-24">
      <div className="pt-[max(env(safe-area-inset-top),12px)]" />
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">课程打分</div>
        <div className="w-9" />
      </header>

      <div className="flex flex-col items-center pt-6">
        <div className="grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br from-brand-200 to-brand-400 text-4xl text-white shadow-card">
          🎓
        </div>
        <div className="mt-3 text-xl font-extrabold">{course?.title ?? '加载中…'}</div>
        <div className="mt-1 text-sm text-ink-500">这门课我觉得 ——</div>
        <div className="mt-3">
          <Stars value={stars} onChange={setStars} size={32} />
        </div>
      </div>

      <div className="mt-7 text-sm font-semibold">写个锐评！</div>
      <textarea
        className="input mt-2 h-32 resize-none bg-brand-50/60"
        placeholder="今天学到了什么？卡在哪？给未来的自己/同学留个话～"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={() => nav('/')}>返回主页</button>
        <button className="btn-primary" onClick={() => submit.mutate()} disabled={submit.isPending}>
          提交
        </button>
      </div>
    </div>
  )
}
