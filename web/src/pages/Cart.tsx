import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/store/cart'
import { api } from '@/api/client'

export default function Cart() {
  const nav = useNavigate()
  const { items, setQty, remove, clear, totalCents } = useCart()
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)

  const checkout = async () => {
    if (items.length === 0) return toast('购物车是空的')
    setBusy(true)
    try {
      const order = await api<{ id: string }>('/orders', {
        method: 'POST',
        json: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          address,
          payMethod: 'alipay',
        },
      })
      // 模拟支付：实际接入支付宝/微信/Stripe 时跳转 payUrl
      const pay = await api<{ payUrl: string | null; message?: string }>(`/orders/${order.id}/pay`, {
        method: 'POST',
      })
      if (pay.payUrl) {
        window.location.href = pay.payUrl
      } else {
        // 进入"模拟确认"流程：实际生产时由支付平台异步回调
        await api(`/orders/${order.id}/confirm`, { method: 'POST' })
        toast.success('订单已支付（沙箱）🎉')
      }
      clear()
      nav('/orders', { replace: true })
    } catch (e: any) {
      toast.error('下单失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-app pb-56">
      <div className="pt-[max(env(safe-area-inset-top),12px)]" />
      <header className="flex items-center justify-between py-2">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">购物车</div>
        <div className="w-9" />
      </header>

      {items.length === 0 ? (
        <div className="mt-20 text-center text-sm text-ink-500">
          <div className="text-5xl">🛒</div>
          <div className="mt-2">空空如也，去逛逛 →</div>
          <button className="btn-primary mt-4" onClick={() => nav('/mall')}>去商城</button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.productId} className="card flex items-center gap-3 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-200 to-brand-400">
                  <img src={i.cover} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className="flex-1">
                  <div className="line-clamp-2 text-sm font-semibold">{i.title}</div>
                  <div className="mt-1 text-base font-extrabold text-brand-600">¥{(i.price / 100).toFixed(0)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-brand-700" onClick={() => setQty(i.productId, i.quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <div className="w-5 text-center text-sm font-bold">{i.quantity}</div>
                  <button className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-brand-700" onClick={() => setQty(i.productId, i.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                  <button className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-red-50 text-red-500" onClick={() => remove(i.productId)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card mt-4 p-4">
            <label className="text-sm font-semibold">收货地址</label>
            <input
              className="input mt-2"
              placeholder="姓名 / 电话 / 详细地址"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="fixed inset-x-0 bottom-[60px] md:bottom-0 z-20 border-t border-brand-100/70 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
            <div className="container-app flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-ink-500">合计</div>
                <div className="text-xl font-extrabold text-brand-600">¥{(totalCents() / 100).toFixed(2)}</div>
              </div>
              <button onClick={checkout} disabled={busy} className="btn-primary">
                {busy ? '下单中…' : '去结算'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
