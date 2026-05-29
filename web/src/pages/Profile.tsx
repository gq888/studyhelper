import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CalendarCheck2,
  ChevronRight,
  Flame,
  LogOut,
  Receipt,
  Settings,
  ShoppingBag,
} from 'lucide-react'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'
import { Mascot } from '@/components/Mascot'
import { Heatmap } from '@/components/Heatmap'

interface MeData {
  id: string
  username: string
  nickname: string
  bio?: string
  avatar?: string
  stats: { achievements: number; favorites: number; learned: number; streak: number }
}

const ACHIEVEMENTS = [
  { code: 'first_course', title: '初入书院', icon: '🎓', desc: '保存第一门课程' },
  { code: 'streak_3', title: '小有恒心', icon: '🔥', desc: '连续打卡 3 天' },
  { code: 'streak_7', title: '一周坚持', icon: '🌟', desc: '连续打卡 7 天' },
  { code: 'streak_30', title: '月度大师', icon: '🏆', desc: '连续打卡 30 天' },
  { code: 'study_5h', title: '专注力+', icon: '⏳', desc: '累计 5 小时' },
  { code: 'rate_10', title: '善于反思', icon: '⭐', desc: '点评 10 门' },
  { code: 'fav_20', title: '收藏家', icon: '📚', desc: '收藏 20 门' },
  { code: 'all_subjects', title: '通识达人', icon: '🌈', desc: '跨 5 学科' },
]

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

  return (
    <div className="container-app pt-[max(env(safe-area-inset-top),8px)] pb-10">
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
            {[
              { n: me?.stats.achievements ?? 0, l: '我的奖章' },
              { n: me?.stats.favorites ?? 0, l: '我的收藏' },
              { n: me?.stats.learned ?? 0, l: '我已学习' },
            ].map((x, i) => (
              <div key={i}>
                <div className="text-2xl font-extrabold">{x.n}</div>
                <div className="text-[11px] opacity-90">{x.l}</div>
              </div>
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
        <div className="card flex items-center gap-2 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Flame size={20} />
          </div>
          <div>
            <div className="text-sm font-bold">连续 {me?.stats.streak ?? 0} 天</div>
            <div className="text-[11px] text-ink-500">坚持就是胜利 💪</div>
          </div>
        </div>
      </div>

      {/* 成就 */}
      <section className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-sm font-bold">我的成就</h3>
          <span className="text-xs text-ink-500">{me?.stats.achievements ?? 0} / {ACHIEVEMENTS.length}</span>
        </div>
        <div className="card grid grid-cols-4 gap-3 p-4">
          {ACHIEVEMENTS.slice(0, 8).map((a) => (
            <div key={a.code} className="flex flex-col items-center text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-2xl">
                {a.icon}
              </div>
              <div className="mt-1 text-[11px] font-semibold leading-tight">{a.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 热力图 */}
      <section className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-sm font-bold">学习热力图</h3>
          <span className="text-xs text-ink-500">近 6 个月</span>
        </div>
        <div className="card p-4">
          <Heatmap days={heatmap} />
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
        <button onClick={() => nav('/mall')} className="card flex w-full items-center justify-between p-4">
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
        <button onClick={() => nav('/orders')} className="card mt-3 flex w-full items-center justify-between p-4">
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
        <div className="card mt-3 flex w-full items-center justify-between p-4 opacity-80">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Settings size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">设置</div>
              <div className="text-[11px] text-ink-500">通知、第三方接口</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink-500" />
        </div>
      </section>
    </div>
  )
}
