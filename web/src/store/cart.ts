import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  title: string
  cover: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  remove: (productId: string) => void
  setQty: (productId: string, quantity: number) => void
  clear: () => void
  totalCents: () => number
  totalCount: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        const items = [...get().items]
        const idx = items.findIndex((i) => i.productId === item.productId)
        if (idx >= 0) items[idx].quantity += qty
        else items.push({ ...item, quantity: qty })
        set({ items })
      },
      remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQty: (productId, quantity) => {
        if (quantity <= 0) return get().remove(productId)
        set({ items: get().items.map((i) => (i.productId === productId ? { ...i, quantity } : i)) })
      },
      clear: () => set({ items: [] }),
      totalCents: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      totalCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'sh-cart' },
  ),
)
