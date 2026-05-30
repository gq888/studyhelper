import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronLeft, ShoppingCart, Zap } from 'lucide-react'
import { api } from '@/api/client'
import { useCart } from '@/store/cart'

interface Product {
  id: string
  title: string
  cover: string
  description: string
  price: number
  originalPrice?: number
  category: string
  tags: string[]
  sold: number
  rating: number
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { add, totalCount } = useCart()
  const { data: p } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>(`/products/${id}`),
    enabled: !!id,
  })
  if (!p) return null

  const addToCart = (buyNow = false) => {
    add({ productId: p.id, title: p.title, cover: p.cover, price: p.price })
    if (buyNow) nav('/cart')
    else toast.success('已加入购物车 🛒')
  }

  return (
    <div className="container-app pb-32">
      <div className="pt-[max(env(safe-area-inset-top),8px)]" />
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => nav('/cart')} className="relative grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ShoppingCart size={18} />
          {totalCount() > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
              {totalCount()}
            </span>
          )}
        </button>
      </header>

      <div className="card overflow-hidden">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-200 to-brand-500 sm:aspect-[16/9]">
          <img
            src={p.cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div className="absolute inset-x-4 bottom-3 text-5xl text-white/80">
            {p.category === 'book' ? '📘' : p.category === 'course' ? '🎓' : '✏️'}
          </div>
        </div>
        <div className="p-4">
          <div className="text-lg font-extrabold leading-snug">{p.title}</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-brand-600">¥{(p.price / 100).toFixed(0)}</span>
            {p.originalPrice && (
              <span className="text-sm text-ink-500 line-through">¥{(p.originalPrice / 100).toFixed(0)}</span>
            )}
            <span className="ml-auto text-xs text-ink-500">已售 {p.sold} · ⭐ {p.rating}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>
          <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-brand-50/60 p-3 text-sm text-ink-700">
            {p.description}
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-100/70 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:relative md:mt-4 md:rounded-3xl md:border md:p-4 md:shadow-card">
        <div className="container-app flex gap-2">
          <button onClick={() => addToCart()} className="btn-ghost flex-1">
            <ShoppingCart size={16} /> 加入购物车
          </button>
          <button onClick={() => addToCart(true)} className="btn-primary flex-1">
            <Zap size={16} /> 立即购买
          </button>
        </div>
      </div>
    </div>
  )
}
