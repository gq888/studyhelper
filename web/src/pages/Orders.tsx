import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Package, Truck, CheckCircle2, Clock } from 'lucide-react'
import { api } from '@/api/client'

const STATUS: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: '待支付', icon: Clock, color: 'text-amber-600' },
  paid: { label: '已支付', icon: CheckCircle2, color: 'text-emerald-600' },
  shipped: { label: '配送中', icon: Truck, color: 'text-blue-600' },
  done: { label: '已完成', icon: Package, color: 'text-ink-600' },
  cancelled: { label: '已取消', icon: Clock, color: 'text-ink-400' },
}

interface OrderItem {
  id: string
  quantity: number
  priceCents: number
  product: { title: string; cover: string }
}

interface Order {
  id: string
  status: string
  totalCents: number
  createdAt: string
  items: OrderItem[]
}

export default function Orders() {
  const nav = useNavigate()
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<Order[]>('/orders'),
  })

  return (
    <div className="container-app pb-10">
      <div className="pt-[max(env(safe-area-inset-top),12px)]" />
      <header className="flex items-center justify-between py-2">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">我的订单</div>
        <div className="w-9" />
      </header>

      {orders.length === 0 ? (
        <div className="mt-20 text-center text-sm text-ink-500">
          <div className="text-5xl">📦</div>
          <div className="mt-2">还没有订单</div>
          <button className="btn-primary mt-4" onClick={() => nav('/mall')}>逛逛商城</button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {orders.map((o) => {
            const st = STATUS[o.status] || STATUS.pending
            const Icon = st.icon
            return (
              <div key={o.id} className="card p-4">
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>订单号 {o.id.slice(0, 8)}</span>
                  <span className={`inline-flex items-center gap-1 font-medium ${st.color}`}>
                    <Icon size={12} /> {st.label}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-200 to-brand-400">
                        <img src={it.product.cover} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                      <div className="flex-1">
                        <div className="line-clamp-1 text-sm font-medium">{it.product.title}</div>
                        <div className="mt-0.5 text-[11px] text-ink-500">×{it.quantity}</div>
                      </div>
                      <div className="text-sm font-semibold text-brand-600">
                        ¥{(it.priceCents / 100).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-brand-50 pt-2 text-sm">
                  <span className="text-ink-500">合计</span>
                  <span className="text-base font-extrabold text-brand-600">
                    ¥{(o.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
