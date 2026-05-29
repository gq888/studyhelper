import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cn.studyhelper.app',
  appName: '学海小书院',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false, // 强制 https
  },
  server: {
    androidScheme: 'https',
    // 真机/模拟器调试时把下面解开并指向局域网 IP：
    // url: 'http://192.168.0.10:5173',
    // cleartext: true,
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
