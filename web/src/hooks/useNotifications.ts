import { useCallback, useEffect, useState } from 'react'
import { isNative } from '@/native'
import { LocalNotifications } from '@capacitor/local-notifications'

/**
 * 学习提醒一体化 hook。
 *
 * - 原生（Capacitor）：用 @capacitor/local-notifications 调度 OS 级提醒，
 *   App 即便关闭也会推送。
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
  const [status, setStatus] = useState<NotifyStatus>('unknown')
  const native = isNative()

  // 初始化探测
  useEffect(() => {
    if (native) {
      ;(async () => {
        try {
          console.log('[notifications] 初始化（原生环境）')
          const perm = await LocalNotifications.checkPermissions()
          console.log('[notifications] 初始化权限检查结果:', perm)
          setStatus(perm.display === 'granted' ? 'granted' : perm.display === 'denied' ? 'denied' : 'default')
        } catch (e) {
          console.error('[notifications] 初始化失败:', e)
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
        console.log('[notifications] 请求权限（原生环境）')
        const r = await LocalNotifications.requestPermissions()
        console.log('[notifications] 请求权限结果:', r)
        const next: NotifyStatus = r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default'
        setStatus(next)
        return next
      } catch (e) {
        console.error('[notifications] 请求权限失败:', e)
        setStatus('unsupported')
        return 'unsupported'
      }
    }
    if (typeof Notification === 'undefined') {
      setStatus('unsupported')
      return 'unsupported'
    }
    const r = await Notification.requestPermission()
    setStatus(r as NotifyStatus)
    return r as NotifyStatus
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
          console.log('[notifications] 调度通知（原生环境）')
          let perm = (await LocalNotifications.checkPermissions()).display
          console.log('[notifications] 当前权限:', perm)
          if (perm !== 'granted') {
            const r = await LocalNotifications.requestPermissions()
            perm = r.display
            console.log('[notifications] 请求后权限:', perm)
          }
          if (perm !== 'granted') return false
          await LocalNotifications.schedule({
            notifications: [
              {
                id: idNum,
                title: opts.title,
                body: opts.body,
                schedule: { at: new Date(targetAt), allowWhileIdle: true },
                smallIcon: 'ic_launcher',
                channelId: 'study-plan',
              },
            ],
          })
          console.log('[notifications] 调度成功')
          return true
        } catch (e) {
          console.error('[notifications] 调度失败:', e)
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
          await LocalNotifications.cancel({ notifications: [{ id: idNum }] })
        } catch {
          /* ignore */
        }
      }
      // 浏览器 setTimeout 不好取消，忽略
    },
    [native],
  )

  /** 引导用户去下载 App（在不支持通知的浏览器里调用）。弹确认框，用户同意才跳。 */
  const promoteAppInstall = useCallback(
    async (reason = '当前环境无法保证后台学习提醒') => {
      const { confirmInstallApp } = await import('@/components/InstallAppConfirm')
      await confirmInstallApp({
        title: '下载 App 获得稳定通知',
        body: reason + '。要下载 App 获得稳定的本地学习提醒能力吗？',
      })
    },
    [],
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
