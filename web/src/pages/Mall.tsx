import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShoppingCart } from 'lucide-react'
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

const CATS = [
  { code: 'all', label: '全部' },
  { code: 'book', label: '📘 书籍' },
  { code: 'course', label: '🎓 课程' },
  { code: 'merch', label: '✏️ 文具周边' },
]

export default function Mall() {
  const nav = useNavigate()
  const { totalCount } = useCart()
  const url = new URL(window.location.href)
  const cat = url.searchParams.get('cat') || 'all'

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', cat],
    queryFn: () => api<Product[]>(`/products${cat !== 'all' ? `?category=${cat}` : ''}`),
  })

  return (
    <div className="container-app pb-24">
      <div className="pt-[max(env(safe-area-inset-top),12px)]" />
      <header className="flex items-center justify-between py-2">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">书院商城</div>
        <button onClick={() => nav('/cart')} className="relative grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ShoppingCart size={18} />
          {totalCount() > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
              {totalCount()}
            </span>
          )}
        </button>
      </header>

      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <a
            key={c.code}
            href={`?cat=${c.code}`}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
              cat === c.code ? 'bg-ink-900 text-white' : 'bg-white text-ink-700 shadow-card'
            }`}
          >
            {c.label}
          </a>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-brand-50/60" />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => nav(`/product/${p.id}`)}
              className="text-left card overflow-hidden transition active:scale-[0.99]"
            >
              <div className="relative aspect-square w-full bg-gradient-to-br from-brand-200 to-brand-400">
                <img
                  src={p.cover}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => ((e.currentTarget.style.display = 'none'))}
                />
                <div className="absolute inset-x-2 bottom-2 text-3xl text-white/70">
                  {p.category === 'book' ? '📘' : p.category === 'course' ? '🎓' : '✏️'}
                </div>
              </div>
              <div className="space-y-1 p-2.5">
                <div className="line-clamp-2 text-[13px] font-bold leading-tight">{p.title}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-extrabold text-brand-600">¥{(p.price / 100).toFixed(0)}</span>
                  {p.originalPrice && (
                    <span className="text-[11px] text-ink-500 line-through">¥{(p.originalPrice / 100).toFixed(0)}</span>
                  )}
                </div>
                <div className="text-[10px] text-ink-500">已售 {p.sold} · ⭐ {p.rating}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
