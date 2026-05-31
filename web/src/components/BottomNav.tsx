import { NavLink } from 'react-router-dom'
import { Home, MessagesSquare, User } from 'lucide-react'

const items = [
  { to: '/', label: '探索', icon: Home },
  { to: '/chat', label: 'AI 陪学', icon: MessagesSquare },
  { to: '/me', label: '我的', icon: User },
]

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100/70 bg-white/95 backdrop-blur pb-[var(--safe-bottom)] md:hidden"
      style={{ boxShadow: '0 -6px 20px -10px rgba(0,0,0,0.08)' }}
    >
      <div className="container-app flex justify-around py-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition ${
                isActive ? 'text-brand-600' : 'text-ink-600'
              }`
            }
          >
            <Icon size={22} strokeWidth={2.2} />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function SideNav() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 flex-col gap-1 border-r border-brand-100/60 bg-white/70 px-4 py-6 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white">
          🦉
        </div>
        <div>
          <div className="text-base font-bold leading-none">学海小书院</div>
          <div className="text-[11px] text-ink-500">你的学习陪伴</div>
        </div>
      </div>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-brand-50/60'
            }`
          }
        >
          <Icon size={20} strokeWidth={2.1} />
          <span>{label}</span>
        </NavLink>
      ))}
    </aside>
  )
}
