import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Square, Timer as TimerIcon } from 'lucide-react'

interface PomoTimerProps {
  minutes: number
  label?: string
  onFinish?: () => void
}

export function PomoTimer({ minutes, label, onFinish }: PomoTimerProps) {
  const total = minutes * 60
  const [remain, setRemain] = useState(total)
  const [running, setRunning] = useState(true)
  const finishedRef = useRef(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) {
          clearInterval(id)
          if (!finishedRef.current) {
            finishedRef.current = true
            onFinish?.()
            try {
              navigator.vibrate?.(120)
            } catch {}
          }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, onFinish])

  const m = String(Math.floor(remain / 60)).padStart(2, '0')
  const s = String(remain % 60).padStart(2, '0')
  const pct = 1 - remain / total

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2.5 text-white shadow-card">
      <TimerIcon size={18} />
      <div className="flex flex-col leading-none">
        <span className="text-[11px] opacity-80">{label ?? '专注计时'}</span>
        <span className="text-lg font-extrabold tabular-nums">
          {m}:{s}
        </span>
      </div>
      <div className="relative ml-1 h-8 w-8">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
          <circle
            cx="18"
            cy="18"
            r="14"
            stroke="#fff"
            strokeWidth="3"
            fill="none"
            strokeDasharray={`${pct * 88} 88`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="ml-1 flex items-center gap-1.5">
        <button
          onClick={() => setRunning(!running)}
          className="grid h-8 w-8 place-items-center rounded-xl bg-white/20"
          aria-label={running ? '暂停' : '继续'}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => {
            setRemain(total)
            setRunning(true)
            finishedRef.current = false
          }}
          className="grid h-8 w-8 place-items-center rounded-xl bg-white/20"
          aria-label="重置"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => setRemain(0)}
          className="grid h-8 w-8 place-items-center rounded-xl bg-white/20"
          aria-label="结束"
        >
          <Square size={14} />
        </button>
      </div>
    </div>
  )
}
