# 📦 打包成原生 Android 应用

学海小书院 Web 端已经通过 **Capacitor 6** 完成原生 Android 封装。本文档说明如何从源码构建出可安装/可上架的 APK / AAB。

## 0. 一次性环境

需要装好（macOS 为例）：

- **JDK 17**（本机已有）
- **Android Studio**（Hedgehog 或更新）→ 自带 Android SDK + 模拟器 + Gradle
  - 下载：https://developer.android.com/studio
  - 首次打开后让它装好默认 SDK Platform 34、Build-Tools 34

装好后在 `~/.zshrc` / `~/.bash_profile` 加：

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v17)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

## 1. 配置后端 API 地址（**重要**）

打包后的 APK 内的 WebView 跑在 `https://localhost` 这个虚拟 origin，**无法访问 `/api` 同源代理**。
必须在 `web/.env.production`（或 `web/.env`）里指定你的真实后端地址：

```env
VITE_API_BASE=https://api.yourdomain.com/api
```

并且后端 `server/.env`（或根 `.env`）需要把 CORS 改成允许应用的 origin：

```env
CORS_ORIGIN=https://localhost,capacitor://localhost,http://localhost
```

> 火山方舟 API 的 KEY 仍然只放在 **后端**，前端 / APK 永远不会接触；这一点是安全前提。

## 2. 构建并同步资源

```bash
cd web
npm run build            # 产出 dist/
npx cap sync android     # 把 dist 拷进 android/app/src/main/assets/public
```

或一键：

```bash
npm run android:sync
```

## 3. Debug APK（最快验证）

```bash
cd web/android
./gradlew assembleDebug
# 产出：app/build/outputs/apk/debug/app-debug.apk
```

直接 `adb install -r app-debug.apk` 到手机即可运行。

## 4. Release APK / AAB（上架）

### 4.1 生成签名密钥（一次性，保管好 keystore）

```bash
cd web/android
keytool -genkey -v -keystore studyhelper.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias studyhelper
```

### 4.2 配置 gradle 签名

新建 `web/android/release-signing.properties`（**不要入库**，已在 .gitignore）：

```properties
storeFile=studyhelper.jks
storePassword=你的密码
keyAlias=studyhelper
keyPassword=你的密码
```

在 `web/android/app/build.gradle` 的 `android { ... }` 段增加：

```groovy
def keystorePropertiesFile = rootProject.file("release-signing.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4.3 出包

- 安装包（用户直接装）：`./gradlew assembleRelease` → `app-release.apk`
- 上架 Google Play / 应用市场：`./gradlew bundleRelease` → `app-release.aab`

## 5. 在 Android Studio 调试

```bash
cd web
npm run android:open      # 自动打开 Android Studio，加载 android/ 工程
```

在 Android Studio 里点 ▶ 即可推到模拟器或真机。

## 6. 真机热调试（HMR + WebView）

`web/capacitor.config.ts` 里把 `server` 段打开：

```ts
server: {
  url: 'http://你电脑的局域网 IP:5173',
  cleartext: true,
}
```

然后 `npm run dev`（电脑），`npm run android:run`（连真机）就可以热重载调试。

## 7. 应用图标 / 启动屏

- 源图存 `web/resources/icon.svg` 与 `web/resources/splash.svg`
- 改完执行：`npm run assets:gen && npx cap sync android`
- 会自动生成全套 mipmap-*dpi、drawable-*dpi 适配。

## 8. 国内市场上架说明（小米 / 华为 / OPPO / vivo / 应用宝）

- 准备物：图标、5 张截图、隐私政策网页、ICP（如果是商业用途）
- Target SDK 必须 ≥ 34（已默认）
- 需要把后端域名 ICP 备案；网络请求强制 HTTPS
- 建议把 `applicationId` 改成你自己的反向域名（如 `com.yourname.studyhelper`）：编辑 `web/android/app/build.gradle` 与 `web/capacitor.config.ts` 中的 `appId`

## 常见问题

| 现象 | 解决 |
|---|---|
| 装上后白屏 | `VITE_API_BASE` 没配 / 后端 CORS 没放行 / dist 没 sync |
| 启动屏闪一下消失 | 正常，`SplashScreen.hide()` 在 `web/src/native.ts` 中 400ms 后调用 |
| 真机请求 HTTPS 报证书错 | 后端用了自签证书；开发期可在 capacitor.config 的 server 里加 `cleartext: true` |
| Gradle 下载慢 | 在 `~/.gradle/gradle.properties` 加镜像：`systemProp.gradle.distributions.url=https://mirrors.cloud.tencent.com/gradle/` |
| 应用太大（>20MB） | 已开 minify 与 shrinkResources；如还要小可切 AAB 让 Play Store 拆分 ABI |
