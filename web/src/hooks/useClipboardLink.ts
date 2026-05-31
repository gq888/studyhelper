import { useCallback, useEffect, useRef } from 'react'

/**
 * 监测剪贴板里有没有视频/网页链接，命中时回调一次（不会同一个 URL 反复弹）。
 *
 * 触发时机：
 *   - mount（App 启动时）
 *   - 标签页 visibilitychange → visible（从后台回前台，APK 切回应用、浏览器切回 tab）
 *   - window focus（从别的窗口聚焦回来）
 *
 * 容错：浏览器没授予剪贴板读权限就静默跳过，不报错。
 */

const DISMISSED_KEY = 'sh-clipboard-dismissed'
const DISMISSED_MAX = 50

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveDismissed(set: Set<string>) {
  try {
    // 控制大小，只留最近 N 个
    const arr = Array.from(set).slice(-DISMISSED_MAX)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr))
  } catch {
    /* localStorage 不可用就忽略 */
  }
}

/** 从可能带文字的剪贴板内容里抽 URL（含抖音分享口令） */
function extractUrl(text: string): string | null {
  if (!text) return null
  // 注意：使用与服务端 douyin.ts 一致的边界字符集（中文范围 + 全角标点）
  const m = text.match(/https?:\/\/[^\s一-鿿，。！？、；：""''《》【】（）()<>]+/i)
  if (!m) return null
  return m[0].replace(/[.,;:!?)]+$/, '')
}

/** 看这个 URL 是不是平台已知的视频域名（影响 UI 文案，不影响功能） */
export function detectPlatform(url: string): 'douyin' | 'bilibili' | 'youtube' | 'generic' {
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (/(^|\.)(douyin\.com|iesdouyin\.com|tiktokv\.com)$/.test(h)) return 'douyin'
    if (/(^|\.)bilibili\.com$/.test(h) || h === 'b23.tv') return 'bilibili'
    if (h.endsWith('youtube.com') || h === 'youtu.be') return 'youtube'
    return 'generic'
  } catch {
    return 'generic'
  }
}

export interface ClipboardHit {
  url: string
  rawText: string
  platform: ReturnType<typeof detectPlatform>
}

export function useClipboardLink(onDetected: (hit: ClipboardHit) => void) {
  // 用 ref 锁定回调，避免每次 onDetected 变化都重新挂监听
  const cbRef = useRef(onDetected)
  cbRef.current = onDetected
  const lastSeenRef = useRef<string | null>(null)
  const dismissedRef = useRef<Set<string>>(loadDismissed())

  const check = useCallback(async () => {
    if (!navigator.clipboard?.readText) return
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      // 没权限 / 浏览器不允许后台读 → 静默
      return
    }
    if (!text) return
    const url = extractUrl(text)
    if (!url) return
    if (url === lastSeenRef.current) return
    if (dismissedRef.current.has(url)) return
    lastSeenRef.current = url
    cbRef.current({ url, rawText: text, platform: detectPlatform(url) })
  }, [])

  useEffect(() => {
    // 首次进入：稍微延后，等首屏渲染稳定，避免和 splash 抢权限弹窗
    const initial = setTimeout(check, 600)

    const onVis = () => {
      if (document.visibilityState === 'visible') check()
    }
    const onFocus = () => check()

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)

    return () => {
      clearTimeout(initial)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])

  /** 让外部调用，标记某 URL 不再打扰 */
  const dismiss = useCallback((url: string) => {
    dismissedRef.current.add(url)
    saveDismissed(dismissedRef.current)
  }, [])

  return { check, dismiss }
}
