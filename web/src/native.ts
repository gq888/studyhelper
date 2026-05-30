/**
 * 在 Capacitor 原生环境下做一些一次性初始化：
 * - 设置状态栏颜色
 * - 隐藏启动屏（等 React 准备好之后）
 * 在浏览器 / PWA 环境下静默无操作。
 */
import { Capacitor } from '@capacitor/core'

let inited = false

export async function initNative() {
  if (inited) return
  inited = true
  console.log('[native] initNative() called')
  console.log('[native] Capacitor.isNativePlatform():', Capacitor.isNativePlatform())
  console.log('[native] Capacitor.platform:', Capacitor.getPlatform())
  if (!Capacitor.isNativePlatform()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#fb7c2d' })
  } catch (e) {
    console.error('[native] StatusBar error:', e)
  }

  // 给 React 留一拍渲染时间再隐藏启动屏，避免白屏
  setTimeout(async () => {
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide()
    } catch (e) {
      console.error('[native] SplashScreen error:', e)
    }
  }, 400)
}

export const isNative = () => {
  const result = Capacitor.isNativePlatform()
  console.log('[native] isNative() called, returning:', result)
  console.log('[native] Capacitor platform:', Capacitor.getPlatform())
  return result
}
