import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import tz from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(tz)

const ZONE = 'Asia/Shanghai'

export function todayChina(): string {
  return dayjs().tz(ZONE).format('YYYY-MM-DD')
}

export function dateChina(d: Date | string | number): string {
  return dayjs(d).tz(ZONE).format('YYYY-MM-DD')
}

export function daysBack(n: number): string[] {
  const out: string[] = []
  const today = dayjs().tz(ZONE)
  for (let i = n - 1; i >= 0; i--) {
    out.push(today.subtract(i, 'day').format('YYYY-MM-DD'))
  }
  return out
}

export function diffDays(a: string, b: string): number {
  return Math.abs(dayjs(a).diff(dayjs(b), 'day'))
}
