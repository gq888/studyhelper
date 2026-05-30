import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Brain,
  CalendarCheck2,
  CalendarRange,
  ChevronRight,
  Flame,
  Library as LibraryIcon,
  LogOut,
  Receipt,
  Settings,
  ShoppingBag,
} from 'lucide-react'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'
import { Mascot } from '@/components/Mascot'
import { Heatmap } from '@/components/Heatmap'
import {
  AchievementSheet,
  type AchievementDef,
  type AchievementProgress,
} from '@/components/AchievementSheet'

interface MeData {
  id: string
  username: string
  nickname: string
  bio?: string
  avatar?: string
  stats: { achievements: number; favorites: number; learned: number; streak: number }
}

const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'first_course', title: '初入书院', icon: '🎓', desc: '收藏你的第一门课程' },
  { code: 'streak_3', title: '小有恒心', icon: '🔥', desc: '连续打卡 3 天' },
  { code: 'streak_7', title: '一周坚持', icon: '🌟', desc: '连续打卡 7 天' },
  { code: 'streak_30', title: '月度大师', icon: '🏆', desc: '连续打卡 30 天' },
  { code: 'study_5h', title: '专注力+', icon: '⏳', desc: '累计学习 5 小时' },
  { code: 'rate_10', title: '善于反思', icon: '⭐', desc: '点评 10 门课程' },
  { code: 'fav_20', title: '收藏家', icon: '📚', desc: '收藏 20 门课程' },
  { code: 'all_subjects', title: '通识达人', icon: '🌈', desc: '学习覆盖 5 个学科' },
]

/** 从已有 stats / 热力图分钟数推导每个成就的进度 */
function getProgress(
  code: string,
  stats: { favorites: number; learned: number; streak: number },
  totalMinutes: number,
): AchievementProgress {
  switch (code) {
    case 'first_course':
      // 收藏第一门课程即解锁（与解析结果页的「❤ 收藏」按钮统计一致）
      return { current: Math.min(stats.favorites, 1), target: 1 }
    case 'streak_3':
      return { current: Math.min(stats.streak, 3), target: 3, unit: ' 天' }
    case 'streak_7':
      return { current: Math.min(stats.streak, 7), target: 7, unit: ' 天' }
    case 'streak_30':
      return { current: Math.min(stats.streak, 30), target: 30, unit: ' 天' }
    case 'study_5h':
      return {
        current: Math.min(totalMinutes, 300),
        target: 300,
        unit: ' 分钟',
      }
    case 'rate_10':
      return { current: Math.min(stats.learned, 10), target: 10 }
    case 'fav_20':
      return { current: Math.min(stats.favorites, 20), target: 20 }
    case 'all_subjects':
      // 暂未在 /me 暴露 distinct categories，先标记为待统计
      return { current: 0, target: 5, unknown: true }
    default:
      return { current: 0, target: 1 }
  }
}

/** 下一个 streak 里程碑 */
function nextStreakMilestone(streak: number): { target: number; title: string } | null {
  const stops = [
    { target: 3, title: '小有恒心' },
    { target: 7, title: '一周坚持' },
    { target: 30, title: '月度大师' },
    { target: 100, title: '百日筑基' },
  ]
  return stops.find((s) => streak < s.target) ?? null
}

export default function Profile() {
  const nav = useNavigate()
  const { user, logout } = useAuth()
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeData>('/me'),
  })
  const { data: heatmap = [] } = useQuery({
    queryKey: ['heatmap', 180],
    queryFn: () => api<{ date: string; minutes: number }[]>('/checkins/heatmap?days=180'),
  })

  const checkin = useMutation({
    mutationFn: () => api('/checkins', { method: 'POST', json: { minutes: 25 } }),
    onSuccess: () => toast.success('打卡成功 🎉'),
    onError: (e: any) =>
      String(e?.message).includes('already_checked_in')
        ? toast('今天已经打过卡啦 ✨')
        : toast.error('打卡失败'),
  })

  // 弹窗：当前查看的成就
  const [openedAchievement, setOpenedAchievement] = useState<AchievementDef | null>(null)

  // 成就区锚点，用于「奖章」统计跳转
  const achievementsRef = useRef<HTMLElement | null>(null)

  const totalMinutes = useMemo(
    () => heatmap.reduce((sum, d) => sum + (d.minutes ?? 0), 0),
    [heatmap],
  )

  const statsForProgress = {
    favorites: me?.stats.favorites ?? 0,
    learned: me?.stats.learned ?? 0,
    streak: me?.stats.streak ?? 0,
  }

  // 计算已完成成就数量
  const completedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter((a) => {
      const p = getProgress(a.code, statsForProgress, totalMinutes)
      return !p.unknown && p.current >= p.target
    }).length
  }, [statsForProgress, totalMinutes])

  // 顶部三个统计的点击行为
  const headerStats: { n: number; l: string; onClick: () => void }[] = [
    {
      n: completedAchievements,
      l: '我的奖章',
      onClick: () =>
        achievementsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    {
      n: me?.stats.favorites ?? 0,
      l: '我的收藏',
      onClick: () => nav('/library?tab=fav'),
    },
    {
      n: me?.stats.learned ?? 0,
      l: '我已学习',
      onClick: () => nav('/library?tab=learned'),
    },
  ]

  // 「连续 X 天」点击 → 下一个里程碑提示
  const onStreakTap = () => {
    const streak = me?.stats.streak ?? 0
    const ms = nextStreakMilestone(streak)
    if (!ms) {
      toast.success(`已连续 ${streak} 天，超神级 🌟`)
      return
    }
    toast(
      `已连续 ${streak} 天，距离「${ms.title}」(${ms.target} 天) 还差 ${ms.target - streak} 天 💪`,
      { duration: 3000 },
    )
  }

  // 热力图格子点击
  const onHeatmapTap = (d: { date: string; minutes: number } | null) => {
    if (!d) return
    if (d.minutes <= 0) {
      toast(`${d.date} · 这天没有学习记录`)
    } else {
      toast.success(`${d.date} · 学习 ${d.minutes} 分钟`)
    }
  }

  return (
    <div className="container-app pb-10">
      <div className="pt-[max(env(safe-area-inset-top),8px)]" />
      <header className="flex items-center justify-between py-2">
        <div className="text-base font-bold">个人中心</div>
        <button onClick={() => nav('/')} className="text-xs text-ink-500">
          首页 →
        </button>
      </header>

      {/* 渐变头部卡 */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-300 via-brand-400 to-brand-600 px-5 pb-5 pt-6 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/30">
              <Mascot size={56} mood="happy" />
            </div>
            <div>
              <div className="text-lg font-extrabold">{me?.nickname ?? user?.nickname}</div>
              <div className="text-[12px] opacity-80">@{me?.username ?? user?.username}</div>
            </div>
            <button onClick={() => logout()} className="ml-auto rounded-full bg-white/20 p-2">
              <LogOut size={16} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-3 text-center">
            {headerStats.map((x, i) => (
              <button
                key={i}
                type="button"
                onClick={x.onClick}
                className="rounded-2xl py-1 transition active:scale-[0.97] hover:bg-white/10"
              >
                <div className="text-2xl font-extrabold">{x.n}</div>
                <div className="text-[11px] opacity-90">{x.l}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 打卡按钮 */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => checkin.mutate()} className="card flex items-center gap-2 p-4 active:scale-[0.99]">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarCheck2 size={20} />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold">每日打卡</div>
            <div className="text-[11px] text-ink-500">记录今天学了 25 分钟</div>
          </div>
        </button>
        <button
          type="button"
          onClick={onStreakTap}
          className="card flex items-center gap-2 p-4 text-left active:scale-[0.99]"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Flame size={20} />
          </div>
          <div>
            <div className="text-sm font-bold">连续 {me?.stats.streak ?? 0} 天</div>
            <div className="text-[11px] text-ink-500">点击查看下一里程碑 💪</div>
          </div>
        </button>
      </div>

      {/* 成就 */}
      <section className="mt-4" ref={achievementsRef}>
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-sm font-bold">我的成就</h3>
          <span className="text-xs text-ink-500">
            {completedAchievements} / {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="card grid grid-cols-4 gap-3 p-4">
          {ACHIEVEMENTS.slice(0, 8).map((a) => {
            const p = getProgress(a.code, statsForProgress, totalMinutes)
            const unlocked = !p.unknown && p.current >= p.target
            return (
              <button
                key={a.code}
                type="button"
                onClick={() => setOpenedAchievement(a)}
                className="flex flex-col items-center text-center transition active:scale-95"
                aria-label={`查看「${a.title}」成就进度`}
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl transition ${
                    unlocked
                      ? 'bg-gradient-to-br from-brand-300 to-brand-500 text-white shadow-card'
                      : 'bg-brand-50 grayscale-[40%] opacity-80'
                  }`}
                >
                  {a.icon}
                </div>
                <div className="mt-1 text-[11px] font-semibold leading-tight">{a.title}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 热力图 */}
      <section className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-sm font-bold">学习热力图</h3>
          <span className="text-xs text-ink-500">近 6 个月</span>
        </div>
        <div className="card p-4">
          <Heatmap days={heatmap} onSelectDay={onHeatmapTap} />
          <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-ink-500">
            少
            <span style={{ background: '#fff1e0' }} className="inline-block h-3 w-3 rounded-sm" />
            <span style={{ background: '#fed7aa' }} className="inline-block h-3 w-3 rounded-sm" />
            <span style={{ background: '#fb923c' }} className="inline-block h-3 w-3 rounded-sm" />
            <span style={{ background: '#ea580c' }} className="inline-block h-3 w-3 rounded-sm" />
            多
          </div>
        </div>
      </section>

      {/* 入口列表 */}
      <section className="mt-4">
        <button onClick={() => nav('/plans')} className="card flex w-full items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <CalendarRange size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">学习计划</div>
              <div className="text-[11px] text-ink-500">AI 排期 + 真实打卡联动</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-500" />
        </button>
        <button onClick={() => nav('/library')} className="card mt-3 flex w-full items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <LibraryIcon size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">我的视频解析</div>
              <div className="text-[11px] text-ink-500">所有 AI 提取过的课程</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-500" />
        </button>
        <button onClick={() => nav('/kb')} className="card mt-3 flex w-full items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Brain size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">我的知识库</div>
              <div className="text-[11px] text-ink-500">长视频字幕的可检索片段</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-500" />
        </button>
        <button onClick={() => nav('/mall')} className="card mt-3 flex w-full items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <ShoppingBag size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">书院商城</div>
              <div className="text-[11px] text-ink-500">配套书籍、课程与文具</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-500" />
        </button>
        <button onClick={() => nav('/orders')} className="card mt-3 flex w-full items-center justify-between p-4 first-of-type:mt-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Receipt size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">我的订单</div>
              <div className="text-[11px] text-ink-500">查看历史购买</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-500" />
        </button>
        <button onClick={() => nav('/settings')} className="card mt-3 flex w-full items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Settings size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">设置</div>
              <div className="text-[11px] text-ink-500">通知、下载 App</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-500" />
        </button>
      </section>

      <AchievementSheet
        item={openedAchievement}
        progress={
          openedAchievement
            ? getProgress(openedAchievement.code, statsForProgress, totalMinutes)
            : undefined
        }
        onClose={() => setOpenedAchievement(null)}
      />
    </div>
  )
}
