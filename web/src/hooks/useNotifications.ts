import { useCallback, useEffect, useState } from 'react'
import { isNative } from '@/native'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

/**
 * 学习提醒一体化 hook。
 *
 * - 原生（Capacitor）：用 @capacitor/local-notifications 调度 OS 级提醒，
 *   App 即使关闭也会推送。
 * - 浏览器：用 Notification API + setTimeout 调度，仅在页面打开时有效。
 * - 都不可用时：showWebFallback 弹层引导用户去 /download 装 App。
 */

export type NotifyStatus = 'unknown' | 'unsupported' | 'denied' | 'granted' | 'default'

export interface ScheduledNotification {
  id: number
  title: string
  body: string
  /** ISO time string */
  at: string
}

/** 在 web 端用稳定数字 id 调度番茄钟/学习提醒 */
function stableId(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  // 取正整数
  return Math.abs(h) % 2_000_000_000 || 1
}

export function useNotifications() {
  const nav = useNavigate()
  const [status, setStatus] = useState<NotifyStatus>('unknown')
  const native = isNative()

  // 初始化探测
  useEffect(() => {
    if (native) {
      ;(async () => {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          const perm = await LocalNotifications.checkPermissions()
          setStatus(perm.display === 'granted' ? 'granted' : perm.display === 'denied' ? 'denied' : 'default')
        } catch {
          setStatus('unsupported')
        }
      })()
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      setStatus(Notification.permission as NotifyStatus)
    } else {
      setStatus('unsupported')
    }
  }, [native])

  /** 请求权限 */
  const requestPermission = useCallback(async (): Promise<NotifyStatus> => {
    if (native) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const res = await LocalNotifications.requestPermissions()
        const next: NotifyStatus = res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'default'
        setStatus(next)
        return next
      } catch {
        setStatus('unsupported')
        return 'unsupported'
      }
    }
    if (typeof Notification === 'undefined') {
      setStatus('unsupported')
      return 'unsupported'
    }
    const res = await Notification.requestPermission()
    setStatus(res as NotifyStatus)
    return res as NotifyStatus
  }, [native])

  /**
   * 调度一个未来时间点的提醒。
   * 返回是否真的调度成功（false → 调用方应引导用户下载 App）
   */
  const scheduleAt = useCallback(
    async (opts: { id?: string; at: Date; title: string; body: string }) => {
      const targetAt = opts.at.getTime()
      if (targetAt <= Date.now() + 1000) return false // 已过期/太近
      const idNum = stableId(opts.id ?? `${opts.title}-${targetAt}`)

      if (native) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          let perm = (await LocalNotifications.checkPermissions()).display
          if (perm !== 'granted') {
            const r = await LocalNotifications.requestPermissions()
            perm = r.display
          }
          if (perm !== 'granted') return false
          await LocalNotifications.schedule({
            notifications: [
              {
                id: idNum,
                title: opts.title,
                body: opts.body,
                schedule: { at: new Date(targetAt), allowWhileIdle: true },
                smallIcon: 'res://drawable/ic_launcher',
                channelId: 'study-plan',
              },
            ],
          })
          return true
        } catch {
          return false
        }
      }

      // 浏览器：必须页面打开。先要权限
      if (typeof Notification === 'undefined') return false
      let perm: NotificationPermission = Notification.permission
      if (perm !== 'granted') perm = await Notification.requestPermission()
      if (perm !== 'granted') return false
      // 用 setTimeout 简单调度（页面关掉就失效，所以也叫用户装 App）
      const delay = targetAt - Date.now()
      setTimeout(() => {
        try {
          new Notification(opts.title, { body: opts.body, tag: String(idNum) })
        } catch {
          /* ignore */
        }
      }, delay)
      return true
    },
    [native],
  )

  /** 取消调度 */
  const cancel = useCallback(
    async (id: string) => {
      const idNum = stableId(id)
      if (native) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          await LocalNotifications.cancel({ notifications: [{ id: idNum }] })
        } catch {}
      }
      // 浏览器 setTimeout 不好取消，忽略
    },
    [native],
  )

  /** 引导用户去下载 App（在不支持通知的浏览器里调用） */
  const promoteAppInstall = useCallback(
    (reason = '此浏览器无法保证后台学习提醒') => {
      toast(reason + '，去装 App 获得稳定的提醒能力吧 →')
      nav('/download')
    },
    [nav],
  )

  return {
    isNative: native,
    status,
    requestPermission,
    scheduleAt,
    cancel,
    promoteAppInstall,
  }
}
