import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Bell,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ListChecks,
  MessageCircle,
  Play,
  Trash2,
} from 'lucide-react'
import { Mascot } from '@/components/Mascot'
import { usePlanDetail, usePlan } from '@/hooks/usePlan'
import { useNotifications } from '@/hooks/useNotifications'

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { data: plan, isLoading } = usePlanDetail(id)
  const { toggleItem, deleteItem, removePlan } = usePlan()
  const notify = useNotifications()

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

  /** 为任务日期当天早上 9 点排一条提醒 */
  function scheduleAtFor(itemDate: string) {
    const [y, m, d] = itemDate.split('-').map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1, 9, 0, 0)
  }

  async function scheduleAllReminders() {
    if (!plan || !plan.items) return
    const pendings = plan.items.filter((it) => !it.done && scheduleAtFor(it.date).getTime() > Date.now())
    if (pendings.length === 0) {
      toast('没有需要提醒的待办（或都过期了）')
      return
    }
    if (notify.status === 'denied') {
      notify.promoteAppInstall('浏览器通知权限被拒，需要装 App 才能稳定提醒')
      return
    }
    let ok = 0
    let needAppCount = 0
    for (const it of pendings) {
      const success = await notify.scheduleAt({
        id: `plan-${plan.id}-item-${it.id}`,
        at: scheduleAtFor(it.date),
        title: `📚 该学习啦：${it.title}`,
        body: `${it.minutes} 分钟 · 来自计划《${plan.title}》`,
      })
      if (success) ok++
      else needAppCount++
    }
    if (ok > 0) toast.success(`已为 ${ok} 个任务安排提醒 🔔`)
    if (needAppCount > 0 && !notify.isNative) {
      notify.promoteAppInstall('部分提醒无法在浏览器下后台触发')
    }
  }

  async function scheduleSingle(item: { id: string; title: string; minutes: number; date: string }) {
    if (notify.status === 'denied') {
      notify.promoteAppInstall('浏览器通知权限被拒，去装 App 吧')
      return
    }
    const success = await notify.scheduleAt({
      id: `plan-${plan!.id}-item-${item.id}`,
      at: scheduleAtFor(item.date),
      title: `📚 该学习啦：${item.title}`,
      body: `${item.minutes} 分钟 · 来自计划《${plan!.title}》`,
    })
    if (success) toast.success('已开启提醒 🔔')
    else notify.promoteAppInstall('此环境不支持后台提醒')
  }

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

      {/* 提醒条 */}
      <button
        onClick={scheduleAllReminders}
        className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-500 p-3 text-left shadow-card active:scale-[0.99]"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/20 text-white">
          <BellRing size={18} />
        </div>
        <div className="flex-1 text-white">
          <div className="text-[11px] opacity-90">
            {notify.isNative ? '系统通知' : notify.status === 'granted' ? '浏览器通知' : '需要授权'}
          </div>
          <div className="text-sm font-bold leading-tight">为所有待办任务开启学习提醒</div>
        </div>
        <span className="text-xs font-semibold text-white/90">一键开启 →</span>
      </button>

      <div className="mt-5 flex items-center gap-2 text-sm font-bold">
        <ListChecks size={16} /> 任务列表
        <button
          onClick={() => {
            const qs = new URLSearchParams({ planId: plan.id })
            const ids = (plan.courses ?? []).map((c) => c.id).filter(Boolean)
            if (ids.length) qs.set('courseIds', ids.join(','))
            nav(`/chat?${qs.toString()}`)
          }}
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
                    <div
                      key={it.id}
                      className={`rounded-2xl p-3 shadow-card ${
                        it.done ? 'bg-emerald-50/60' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className={`text-[14px] font-semibold leading-snug ${it.done ? 'text-ink-500 line-through' : ''}`}>
                            {it.title}
                          </div>
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
                          className="shrink-0 p-1 text-ink-400 hover:text-red-500"
                          aria-label="删除任务"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() =>
                            toggleItem({ planId: plan.id, itemId: it.id, done: !it.done })
                          }
                          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                            it.done
                              ? 'bg-emerald-500 text-white shadow-card hover:bg-emerald-600'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 size={14} />
                          {it.done ? '✓ 已掌握' : '标记已掌握'}
                        </button>
                        <button
                          onClick={() => {
                            const qs = new URLSearchParams({
                              planId: plan.id,
                              itemId: it.id,
                              autoSend: `我要开始学习这个任务:${it.title}（${it.minutes} 分钟）`,
                            })
                            const courseIds = (plan.courses ?? []).map((c) => c.id).filter(Boolean)
                            if (courseIds.length) qs.set('courseIds', courseIds.join(','))
                            nav(`/chat?${qs.toString()}`)
                          }}
                          disabled={it.done}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white shadow-card transition active:scale-[0.98] hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500"
                        >
                          <Play size={13} />
                          {it.done ? '已掌握' : '开始学习'}
                        </button>
                      </div>

                      {!it.done && (
                        <button
                          onClick={() => scheduleSingle({ id: it.id, title: it.title, minutes: it.minutes, date: it.date })}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          <Bell size={11} /> 单独提醒我（{it.date} 09:00）
                        </button>
                      )}
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
