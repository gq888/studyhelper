# 使用 Android Studio 打包 APK

## 🚀 快速步骤

### 1. 打开 Android Studio
启动已安装的 Android Studio

### 2. 打开项目
在 Android Studio 中：
- 点击 `Open an Existing Project`
- 或选择 `File > Open`
- 导航到项目文件夹：`studyhelper\web\android`
- 选择并打开该文件夹

### 3. 等待 Gradle 同步
- Android Studio 会自动检测并下载所需的 SDK 组件（Platform 36, Build Tools 35）
- 会提示接受许可证，请点击 `Accept`
- 等待底部的进度条完成（可能需要 5-10 分钟）

### 4. 构建 APK
同步完成后：
- 点击菜单 `Build > Build Bundle(s) / APK(s) > Build APK(s)`
- 等待构建完成

### 5. 获取 APK
构建成功后：
- 点击弹出通知中的 `locate`
- 或直接导航到：`studyhelper\web\android\app\build\outputs\apk\debug\`
- 文件名为：`app-debug.apk`

---

## 📱 APK 使用
- 将 APK 传输到手机
- 允许安装未知来源应用
- 点击安装
- 默认账号：`demo` / `demo1234`

---

## 🛟 提示
- 如果 Gradle 同步失败，点击 `Try Again`
- 确保网络连接正常
