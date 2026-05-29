# 学海小书院 · StudyHelper

> 一款 AI 驱动的学习伴侣 App —— 你只需粘贴一条学习视频/课程链接，AI 立刻为你整理结构化大纲，并陪你一步步完成。

> **关于本项目：** 仿制视频《随厨小食堂》同款交互的「学习版」实现，主题从烹饪改为学习课程，作为国家级产品竞赛参赛作品。
>
> - 真实接入 **火山方舟 `doubao-seed-2.0-pro`** 模型（无任何 mock）
> - 自写后端 + 数据库 + JWT 鉴权 + 真实打卡/收藏/打分/订单
> - 全平台响应式 + PWA（手机/平板/桌面 / 可安装到主屏）

---

## ✨ 核心功能

| 模块 | 视频原版（烹饪） | 本项目（学习） |
| --- | --- | --- |
| 粘贴链接 → 结构化提取 | 粘贴抖音视频，AI 提取菜谱 | 粘贴学习视频/课程链接，AI 提取**学习大纲** |
| 详情页 | 食材、步骤、难度、Tips | 学习目标、章节大纲、前置知识、Tips、推荐资料 |
| 分量调节 | 1 / 2 / 3 人份换算 | ×1 ~ ×5 学习强度调节 |
| AI 陪伴 | 熊掌厨 Panda Chef | 书院熊 · 学习陪伴助教（流式输出） |
| 关键步骤定时 | 烹饪倒计时 | **番茄钟** 自动嵌入聊天 |
| 评分 | 5 星 + 评论 | 5 星 + 评论（升级到 upsert） |
| 个人主页 | 头像/3 列统计/成就/热力图 | 同款 + **真实数据库** 后端打卡 |
| 商城闭环 | — | **书籍 / 课程 / 文具周边** + 购物车 + 订单流 |

## 🛠 技术栈

- **Web**：React 18 + Vite 5 + TypeScript + Tailwind CSS + Zustand + TanStack Query + Framer Motion + lucide-react + html-to-image + vite-plugin-pwa
- **Server**：Node.js + Fastify 4 + Prisma 5 + SQLite + JWT + bcryptjs + zod
- **AI**：火山方舟 doubao-seed-2.0-pro（OpenAI 兼容的 Chat Completions，支持流式 SSE + JSON 模式）
- **部署**：Docker + docker-compose + Caddy

## 🚀 本地启动

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npm run db:push -w server
npm run db:seed -w server

# 3. 启动（默认 server :8787 / web :5173）
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)，注册账号开始体验。

> 默认账号：`demo / demo1234`（如未存在请自行注册）

## 🔑 环境变量

`.env`（仓库根目录）：

```env
# 火山方舟
API_KEY=14caf287-24be-442a-8e6a-e2d5e322d840
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=doubao-seed-2-0-pro-260215

# JWT
JWT_SECRET=please-change-me
JWT_EXPIRES_IN=30d

# Server
PORT=8787
NODE_ENV=development
CORS_ORIGIN=*

# DB（Prisma 路径相对 prisma/schema.prisma 所在目录）
DATABASE_URL=file:./dev.db
```

### ⚠️ 火山方舟模型开通

`doubao-seed-2-0-pro-260215` 需要在 **方舟控制台 → 模型管理 → 模型服务** 一键开通（点一下即可，免费），否则会返回：

```
{"error":{"code":"ModelNotOpen","message":"Your account ... has not activated the model ..."}}
```

开通后无需重启服务，API 立即生效。

## 📦 接口清单（按需购买）

代码里已经预留接入位，仅在需要时购买并填入 `.env` 即可：

| 接口 | 用途 | 推荐供应商 | 代码位置 |
| --- | --- | --- | --- |
| 短信验证码 | 手机号注册/找回 | 阿里云 / 腾讯云 / 华信 | `SMS_*` 环境变量（auth.ts 中新增 handler） |
| 真实支付 | 商城订单结算 | 支付宝 / 微信支付 / Stripe | `server/src/routes/orders.ts` → `/orders/:id/pay` |
| 对象存储 | 头像 / 课程封面 / 分享图上传 | 阿里 OSS / 腾讯 COS / S3 | `OSS_*`（新增 upload 路由） |
| 视频解析 | 抖音 / B 站文案与字幕直接拉取 | 第三方解析服务 | `extract-course` 已支持手动粘贴文案，加上后可省去用户复制 |

> 当前下单走「沙箱直接确认」流程：实际部署接入支付平台后，把 `pay` 与 `confirm` 路由替换为真实预下单 + 异步回调签名校验即可。

## 🐳 部署到云服务器

```bash
# 1. 修改 Caddyfile 中的 example.com 为你的域名
# 2. 启动
docker compose up -d --build
```

服务会暴露在 `https://yourdomain` 上（Caddy 自动签证书）。后端 API 走 `/api/*` 反代到容器 :8787。

## 📱 PWA & 跨平台适配

- 在手机浏览器打开网页，添加到主屏即可作为 App 使用
- 所有页面使用 `container-app` 容器自适应：手机 `max-w-[480px]`，桌面端切换为侧边栏 + 多列网格
- 安全区适配 (`env(safe-area-inset-*)`)、`100dvh`、`viewport-fit=cover`

## 🗂 项目结构

```
studyhelper/
├── server/
│   ├── prisma/schema.prisma   # 10 张表：User / Course / CheckIn / Rating / Favorite / ChatSession / ChatMessage / Achievement / Product / Order
│   └── src/
│       ├── routes/{auth,users,courses,checkins,ratings,favorites,chat,products,orders,ai}.ts
│       ├── services/ark.ts    # 火山方舟 chat / stream / JSON
│       └── middleware/auth.ts # JWT 中间件
└── web/
    ├── src/
    │   ├── pages/             # Splash, Login, Home, Extract, Course, Chat, Rate, Profile, Mall, Product, Cart, Orders
    │   ├── components/        # Mascot（SVG 书院熊吉祥物）, BottomNav, SideNav, Stars, Heatmap, PomoTimer
    │   ├── api/client.ts      # fetch + SSE 流式
    │   └── store/{auth,cart}.ts
    └── vite.config.ts         # Vite + PWA + /api 代理
```

## 🎬 仿原视频对照表

| 原视频片段 | 本项目实现 |
| --- | --- |
| 启动屏 + 吉祥物 | `Splash.tsx`：书院熊学士帽 + 弹簧动画 |
| "粘贴一个抖音视频链接" | `Home.tsx` 大橙色按钮 → `Extract.tsx` 粘贴页 |
| "立刻 AI 提取清晰的文字版菜谱" | `aiRoutes.ts: /ai/extract-course`，强制 JSON 模式 |
| 加载中熊掌厨 | `Extract.tsx` 进度条 + 反向梯度推进 |
| 「菜谱生成」详情页 | `Course.tsx`：渐变 banner + 目标/前置/章节/Tips/资料 |
| 多人份换算 | 详情页右上「调整学时 ×N」弹窗 |
| 一键分享卡片 | `html-to-image` 截图 + 保存 PNG |
| Panda Chef 沉浸式陪伴 | `Chat.tsx` 流式 SSE + 表情包熊 + 进度条 |
| 关键步骤定时器 | `PomoTimer.tsx`，AI 输出 `<<TIMER:25:本节专注>>` 自动渲染 |
| 菜谱打分 | `Rate.tsx` 5 星 + 评论 |
| 我的：奖章/收藏/学习/热力图 | `Profile.tsx` + 真实后端聚合 |
| 顶部分页 + 底部 NavBar | `BottomNav.tsx` + `SideNav.tsx`（响应式） |

## 📄 License

MIT
