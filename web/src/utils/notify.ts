/**
 * 不依赖 React 的通知工具，可被全局后台任务、worker 等调用。
 *
 * - 原生 Capacitor 环境：Capacitor LocalNotifications，App 关闭也能推
 * - 浏览器：标准 Notification API（页面打开时才有效）
 */
import { isNative } from '@/native'
import { LocalNotifications } from '@capacitor/local-notifications'

export type NotifyStatus = 'unknown' | 'unsupported' | 'denied' | 'granted' | 'default'

export async function checkNotificationPermission(): Promise<NotifyStatus> {
  if (isNative()) {
    try {
      console.log('[notify] 检查本地通知权限（原生环境）')
      const perm = await LocalNotifications.checkPermissions()
      console.log('[notify] 权限检查结果:', perm)
      return perm.display === 'granted' ? 'granted' : perm.display === 'denied' ? 'denied' : 'default'
    } catch (e) {
      console.error('[notify] 检查权限失败:', e)
      return 'unsupported'
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as NotifyStatus
}

export async function requestNotificationPermission(): Promise<NotifyStatus> {
  if (isNative()) {
    try {
      console.log('[notify] 请求本地通知权限（原生环境）')
      const r = await LocalNotifications.requestPermissions()
      console.log('[notify] 权限请求结果:', r)
      return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default'
    } catch (e) {
      console.error('[notify] 请求权限失败:', e)
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
      console.log('[notify] 尝试发送本地通知（原生环境）')
      const perm = await LocalNotifications.checkPermissions()
      console.log('[notify] 通知权限:', perm)
      if (perm.display !== 'granted') {
        console.log('[notify] 权限不足，无法发送')
        return false
      }
      const idNum = args.id ? hashToInt(args.id) : intIdCounter++
      console.log('[notify] 发送通知 ID:', idNum)
      await LocalNotifications.schedule({
        notifications: [
          {
            id: idNum,
            title: args.title,
            body: args.body,
            schedule: { at: new Date(Date.now() + 100), allowWhileIdle: true },
            smallIcon: 'ic_launcher',
            channelId: 'background-tasks',
            extra: args.url ? { url: args.url } : undefined,
          },
        ],
      })
      console.log('[notify] 通知发送成功')
      return true
    } catch (e) {
      console.error('[notify] 发送通知失败:', e)
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
