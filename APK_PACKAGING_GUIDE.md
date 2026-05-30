# Android APK 打包指南

## 🎯 当前状态
- ✅ Web 前端已构建
- ✅ 已同步到 Android 项目
- ✅ API 地址已配置 (`http://121.43.226.178:8787/api`)
- ✅ 服务器 CORS 已配置
- ✅ Gradle 国内镜像已配置

---

## 🚀 方案一：使用 GitHub Actions 在线打包（最简单）

### 步骤：
1. 将代码推送到 GitHub
2. 在 GitHub 仓库中点击 `Actions`
3. 选择 `Build Android APK` 工作流
4. 点击 `Run workflow` 开始打包
5. 等待完成后，在 `Artifacts` 中下载 `studyhelper-apk`

---

## 💻 方案二：本地打包（需要 Android Studio）

### 1. 安装 Android Studio
下载并安装：https://developer.android.com/studio

### 2. 首次启动 Android Studio
- 启动后会自动下载 SDK Platform 36、Build Tools 等必要组件
- 等待下载完成

### 3. 打开项目
```powershell
cd web
npm run android:open
```

### 4. 打包 APK
在 Android Studio 中：
- 菜单 `Build > Build Bundle(s)/APK(s) > Build APK(s)`
- 等待构建完成
- APK 位置：`web/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔧 方案三：手动安装 Android SDK 命令行工具

### 1. 下载 Command Line Tools
访问：https://developer.android.com/studio#command-tools
下载 Windows 版本并解压到：`C:\Android\cmdline-tools\latest`

### 2. 配置环境变量
```powershell
$env:ANDROID_HOME = "C:\Android"
$env:PATH += ";$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools"
```

### 3. 安装 SDK 组件
```powershell
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

### 4. 打包 APK
```powershell
cd web\android
.\gradlew.bat assembleDebug
```

---

## 📱 安装和使用 APK
1. 将 APK 传输到手机
2. 在手机上允许「安装未知来源应用」
3. 点击 APK 安装
4. 使用账号 `demo / demo1234` 登录

---

## 🛠️ 已配置内容
- ✅ `web/.env.production` - API 地址
- ✅ `web/android/local.properties` - SDK 路径
- ✅ `web/android/build.gradle` - 国内镜像
- ✅ `web/android/gradle/wrapper/gradle-wrapper.properties` - Gradle 镜像

---

## 🚀 快速开始（推荐方案一）

如果你有 GitHub 账号，使用方案一是最简单的。我已经为你创建了 GitHub Actions 配置文件！
