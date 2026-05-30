interface HeatmapDay {
  date: string
  minutes: number
}

interface HeatmapProps {
  days: HeatmapDay[]
  cellSize?: number
  /** 点击单元格时回调（传 null 表示空格） */
  onSelectDay?: (day: HeatmapDay | null) => void
}

/**
 * GitHub 风格的热力图，按周排列。最右一列为今天。
 */
export function Heatmap({ days, cellSize = 12, onSelectDay }: HeatmapProps) {
  if (!days.length) return null
  // 把第一个日期对齐到周日（按 ISO，0=周日）。
  const first = new Date(days[0].date)
  const offset = first.getDay()
  const padded: (HeatmapDay | null)[] = [...Array(offset).fill(null), ...days]

  // 切成 7 行 × N 列
  const weeks: (HeatmapDay | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))
  // 转置：行=星期，列=周
  const matrix: (HeatmapDay | null)[][] = []
  for (let r = 0; r < 7; r++) matrix.push(weeks.map((w) => w[r] ?? null))

  const max = Math.max(60, ...days.map((d) => d.minutes))
  const colorFor = (m: number) => {
    if (m <= 0) return '#fff1e0'
    const ratio = Math.min(1, m / max)
    // 浅橙 -> 深橙
    const shades = ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c']
    return shades[Math.min(shades.length - 1, Math.floor(ratio * shades.length))]
  }

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((w, idx) => {
    const first = w.find((d) => d) as HeatmapDay | undefined
    if (!first) return
    const mo = new Date(first.date).getMonth()
    if (mo !== lastMonth) {
      monthLabels.push({ col: idx, label: months[mo] })
      lastMonth = mo
    }
  })

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="ml-6 flex text-[10px] text-ink-500">
          {monthLabels.map((m, i) => (
            <div key={i} style={{ width: (cellSize + 2) * 4 }} className="shrink-0">
              {m.label}
            </div>
          ))}
        </div>
        <div className="flex gap-0.5">
          <div className="mr-1 flex flex-col justify-between py-0.5 text-[10px] text-ink-500">
            <span>日</span>
            <span>三</span>
            <span>六</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {matrix.map((row, r) => (
              <div key={r} className="flex gap-0.5">
                {row.map((d, c) => {
                  const cellStyle = {
                    width: cellSize,
                    height: cellSize,
                    background: d ? colorFor(d.minutes) : 'transparent',
                    borderRadius: 3,
                  } as const
                  if (d && onSelectDay) {
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onSelectDay(d)}
                        title={`${d.date} · ${d.minutes} 分钟`}
                        aria-label={`${d.date} 学习 ${d.minutes} 分钟`}
                        style={{ ...cellStyle, padding: 0, border: 'none', cursor: 'pointer' }}
                        className="transition active:scale-90"
                      />
                    )
                  }
                  return (
                    <div
                      key={c}
                      title={d ? `${d.date} · ${d.minutes} 分钟` : ''}
                      style={cellStyle}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
