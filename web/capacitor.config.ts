import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cn.studyhelper.app',
  appName: '学海小书院',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true, // 允许 HTTP/HTTPS 混合
  },
  server: {
    androidScheme: 'https',
    cleartext: true, // 允许 HTTP 明文请求
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // 由 React 端调用 SplashScreen.hide() 时机
      backgroundColor: '#fff7ed',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#fb7c2d',
      style: 'LIGHT',
    },
  },
}

export default config
