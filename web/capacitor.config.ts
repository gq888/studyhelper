import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cn.studyhelper.app',
  appName: '学海小书院',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#fff7ed',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#fb7c2d',
      style: 'LIGHT',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#fb7c2d',
      sound: 'beep.wav',
    },
  },
}

export default config
