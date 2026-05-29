import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Check,
  ChevronLeft,
  Clock3,
  ListChecks,
  MessageCircle,
  Trash2,
} from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { usePlanDetail, usePlan } from '@/hooks/usePlan'

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { data: plan, isLoading } = usePlanDetail(id)
  const { toggleItem, deleteItem, removePlan } = usePlan()

  // 按日期分组
  const grouped = useMemo(() => {
    const items = plan?.items ?? []
    if (!items.length) return [] as { date: string; items: typeof items }[]
    const map = new Map<string, typeof items>()
    for (const it of items) {
      const list = map.get(it.date) ?? []
      list.push(it)
      map.set(it.date, list)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({ date, items }))
  }, [plan])

  if (isLoading || !plan) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Mascot size={100} mood="thinking" bobbing />
      </div>
    )
  }

  const totalMin = plan.items?.reduce((s, i) => s + i.minutes, 0) ?? 0
  const doneMin = plan.items?.filter((i) => i.done).reduce((s, i) => s + i.minutes, 0) ?? 0
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="container-app pt-[max(env(safe-area-inset-top),8px)] pb-24">
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold">学习计划</div>
        <button
          onClick={() => {
            if (confirm('确认删除这个计划？')) {
              removePlan(plan.id)
              nav('/plans', { replace: true })
            }
          }}
          className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      </header>

      {/* Header card */}
      <div className="overflow-hidden rounded-3xl shadow-card" style={{ background: `linear-gradient(135deg, ${plan.color}, #fff)` }}>
        <div className="space-y-2 p-5 text-white" style={{ background: plan.color }}>
          <div className="text-lg font-extrabold leading-snug">{plan.title}</div>
          {plan.goal && <div className="text-sm opacity-90">🎯 {plan.goal}</div>}
        </div>
        <div className="grid grid-cols-3 divide-x divide-brand-100 bg-white px-2 py-3 text-center">
          <div>
            <div className="text-xl font-extrabold text-brand-700">{plan.progress.percent}%</div>
            <div className="text-[11px] text-ink-500">完成度</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-brand-700">{plan.progress.done}/{plan.progress.total}</div>
            <div className="text-[11px] text-ink-500">任务</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-brand-700">{(doneMin / 60).toFixed(1)}/{(totalMin / 60).toFixed(1)}h</div>
            <div className="text-[11px] text-ink-500">学时</div>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-50">
        <div className="h-full transition-all" style={{ width: `${plan.progress.percent}%`, background: plan.color }} />
      </div>

      {/* 引用课程 */}
      {plan.courses && plan.courses.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold text-ink-700">关联课程</div>
          <div className="flex flex-wrap gap-1.5">
            {plan.courses.map((c) => (
              <button
                key={c.id}
                onClick={() => nav(`/course/${c.id}`)}
                className="chip"
              >
                📘 {c.title.slice(0, 14)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-sm font-bold">
        <ListChecks size={16} /> 任务列表
        <button
          onClick={() => nav(`/chat?planId=${plan.id}`)}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600"
        >
          <MessageCircle size={12} /> 让书院熊答疑
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-brand-200 p-8 text-center text-sm text-ink-500">
          还没有任务，去课程详情页加入吧。
        </div>
      ) : (
        <div className="mt-2 space-y-4">
          {grouped.map(({ date, items }) => {
            const isToday = date === today
            return (
              <div key={date}>
                <div className="mb-1.5 flex items-center gap-2 text-[12px]">
                  <span className={isToday ? 'rounded-full bg-brand-500 px-2 py-0.5 font-bold text-white' : 'font-bold text-ink-700'}>
                    {date}
                  </span>
                  {isToday && <span className="text-brand-600">今天</span>}
                </div>
                <div className="space-y-2">
                  {(items ?? []).map((it) => (
                    <div key={it.id} className={`flex items-start gap-3 rounded-2xl p-3 shadow-card ${it.done ? 'bg-brand-50/60 opacity-70' : 'bg-white'}`}>
                      <button
                        onClick={() => toggleItem({ planId: plan.id, itemId: it.id, done: !it.done })}
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                          it.done ? 'border-brand-500 bg-brand-500 text-white' : 'border-brand-300 hover:border-brand-500'
                        }`}
                      >
                        {it.done && <Check size={14} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[14px] font-semibold ${it.done ? 'line-through' : ''}`}>{it.title}</div>
                        {it.note && <div className="mt-0.5 text-[11px] text-ink-500">{it.note}</div>}
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-500">
                          <Clock3 size={10} /> {it.minutes} 分钟
                          {it.courseId && (
                            <button
                              onClick={() => nav(`/course/${it.courseId}`)}
                              className="text-brand-600"
                            >
                              · 关联课程
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteItem({ planId: plan.id, itemId: it.id })}
                        className="text-ink-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
