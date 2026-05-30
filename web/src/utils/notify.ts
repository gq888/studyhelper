/**
 * 不依赖 React 的通知工具，可被全局后台任务、worker 等调用。
 *
 * - 原生 Capacitor 环境：Capacitor LocalNotifications，App 关闭也能推
 * - 浏览器：标准 Notification API（页面打开时才有效）
 */
import { isNative } from '@/native'

export type NotifyStatus = 'unknown' | 'unsupported' | 'denied' | 'granted' | 'default'

export async function checkNotificationStatus(): Promise<NotifyStatus> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.checkPermissions()
      return perm.display === 'granted' ? 'granted' : perm.display === 'denied' ? 'denied' : 'default'
    } catch {
      return 'unsupported'
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as NotifyStatus
}

export async function requestNotificationPermission(): Promise<NotifyStatus> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const res = await LocalNotifications.requestPermissions()
      return res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'default'
    } catch {
      return 'unsupported'
    }
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  const r = await Notification.requestPermission()
  return r as NotifyStatus
}

let intIdCounter = 1

/** 立即触发一次本地通知（不管时间，立即响）。返回 true 表示成功投递 */
export async function fireLocalNotification(args: {
  title: string
  body: string
  /** 点开通知后想用的深链（仅 Web 直接 focus 时可用） */
  url?: string
  /** 用于去重的稳定 id；未传则自动 */
  id?: string
}): Promise<boolean> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') return false
      const idNum = args.id ? hashToInt(args.id) : intIdCounter++
      await LocalNotifications.schedule({
        notifications: [
          {
            id: idNum,
            title: args.title,
            body: args.body,
            schedule: { at: new Date(Date.now() + 100), allowWhileIdle: true },
            smallIcon: 'res://drawable/ic_launcher',
            channelId: 'background-tasks',
            extra: args.url ? { url: args.url } : undefined,
          },
        ],
      })
      return true
    } catch {
      return false
    }
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    const n = new Notification(args.title, { body: args.body, tag: args.id })
    if (args.url) {
      n.onclick = () => {
        window.focus()
        location.href = args.url!
      }
    }
    return true
  } catch {
    return false
  }
}

function hashToInt(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) % 2_000_000_000 || 1
}
