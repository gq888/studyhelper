import { Star } from 'lucide-react'

export function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          aria-label={`${n} 星`}
          className={onChange ? 'transition active:scale-95' : 'pointer-events-none'}
        >
          <Star
            size={size}
            className={n <= value ? 'fill-brand-500 text-brand-500' : 'text-brand-200'}
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  )
}
