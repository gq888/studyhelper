# 学海小书院 · 技术文档

> AI 驱动的「视频 → 课程 → 陪学」学习伴侣。粘贴一条学习视频链接或抖音分享口令，30-120s 内完成：**字幕提取 → 结构化大纲 → 知识库切块 → 流式陪学问答 → 学习计划编排**。全链路真接 LLM，无 mock。

---

## 1. 功能版图

| 模块 | 能力 |
|---|---|
| 视频解析 | 链接/分享口令 → 字幕 → AI 结构化大纲（标题/章节/学习目标/前置/Tips/资源） |
| 抖音兼容 | HTML 分享页四层兜底 → mp4 直链 |
| 视频搜索 | 关键词检索候选 → 多选批量解析（AI 可自主触发） |
| AI 陪学 | 流式聊天 + 5 类指令标记（番茄钟/计划草稿/任务掌握/复习/视频搜索） |
| 知识库 RAG | 字幕静默切块 + 关键词检索增强 |
| 学习计划 | AI 一键排期 + 真实打卡 + 番茄钟联动 |
| 跨端 | Web + PWA + Android APK（Capacitor） |

---

## 2. 技术架构

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" width="100%" font-family="-apple-system,Segoe UI,sans-serif" font-size="12">
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#64748b"/>
    </marker>
    <linearGradient id="gc" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#ffedd5"/>
    </linearGradient>
    <linearGradient id="gs" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fef3c7"/><stop offset="1" stop-color="#fde68a"/>
    </linearGradient>
    <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#dbeafe"/><stop offset="1" stop-color="#bfdbfe"/>
    </linearGradient>
  </defs>
  <!-- Clients row -->
  <g>
    <text x="360" y="20" text-anchor="middle" font-weight="700" fill="#475569">客户端层</text>
    <rect x="100" y="32" width="120" height="48" rx="8" fill="url(#gc)" stroke="#fb923c"/>
    <text x="160" y="52" text-anchor="middle" font-weight="600">Web Browser</text>
    <text x="160" y="68" text-anchor="middle" fill="#64748b" font-size="11">React 18 + Vite</text>
    <rect x="300" y="32" width="120" height="48" rx="8" fill="url(#gc)" stroke="#fb923c"/>
    <text x="360" y="52" text-anchor="middle" font-weight="600">PWA</text>
    <text x="360" y="68" text-anchor="middle" fill="#64748b" font-size="11">vite-plugin-pwa</text>
    <rect x="500" y="32" width="120" height="48" rx="8" fill="url(#gc)" stroke="#fb923c"/>
    <text x="560" y="52" text-anchor="middle" font-weight="600">Android APK</text>
    <text x="560" y="68" text-anchor="middle" fill="#64748b" font-size="11">Capacitor 8</text>
  </g>
  <!-- Caddy -->
  <line x1="360" y1="80" x2="360" y2="105" stroke="#64748b" marker-end="url(#ah)"/>
  <rect x="270" y="108" width="180" height="32" rx="6" fill="#f1f5f9" stroke="#94a3b8"/>
  <text x="360" y="128" text-anchor="middle" font-weight="600">Caddy · TLS / SPA / /api 反代</text>
  <!-- Backend box -->
  <line x1="360" y1="140" x2="360" y2="165" stroke="#64748b" marker-end="url(#ah)"/>
  <rect x="60" y="170" width="600" height="120" rx="10" fill="url(#gs)" stroke="#f59e0b"/>
  <text x="360" y="190" text-anchor="middle" font-weight="700" fill="#92400e">Fastify 4 后端（单容器，TypeScript ESM）</text>
  <g font-size="11" fill="#1f2937">
    <rect x="80" y="200" width="180" height="34" rx="5" fill="white" stroke="#fdba74"/>
    <text x="170" y="220" text-anchor="middle" font-weight="600">Routes (17)</text>
    <text x="170" y="231" text-anchor="middle" fill="#64748b">auth/ai/extract/chat/plans/kb…</text>
    <rect x="270" y="200" width="180" height="34" rx="5" fill="white" stroke="#fdba74"/>
    <text x="360" y="220" text-anchor="middle" font-weight="600">Services</text>
    <text x="360" y="231" text-anchor="middle" fill="#64748b">ark · coze · douyin · kb</text>
    <rect x="460" y="200" width="180" height="34" rx="5" fill="white" stroke="#fdba74"/>
    <text x="550" y="220" text-anchor="middle" font-weight="600">Prisma (SQLite)</text>
    <text x="550" y="231" text-anchor="middle" fill="#64748b">13 表 · 索引 · 唯一键</text>
    <rect x="270" y="246" width="180" height="32" rx="5" fill="white" stroke="#fdba74"/>
    <text x="360" y="266" text-anchor="middle" font-weight="600">JWT · zod · bcryptjs</text>
  </g>
  <!-- External AI services -->
  <line x1="220" y1="290" x2="200" y2="320" stroke="#64748b" marker-end="url(#ah)"/>
  <line x1="500" y1="290" x2="520" y2="320" stroke="#64748b" marker-end="url(#ah)"/>
  <rect x="80" y="322" width="240" height="48" rx="8" fill="url(#ga)" stroke="#3b82f6"/>
  <text x="200" y="342" text-anchor="middle" font-weight="700" fill="#1e3a8a">火山方舟 Ark · doubao-seed-2.0-pro</text>
  <text x="200" y="358" text-anchor="middle" font-size="11" fill="#1e40af">流式 SSE · JSON 模式 · 5 套 system prompt</text>
  <rect x="400" y="322" width="240" height="48" rx="8" fill="url(#ga)" stroke="#3b82f6"/>
  <text x="520" y="342" text-anchor="middle" font-weight="700" fill="#1e3a8a">Coze 工作流 · 视频字幕</text>
  <text x="520" y="358" text-anchor="middle" font-size="11" fill="#1e40af">async_run + /task/:id 轮询</text>
</svg>

**技术栈**：React 18 + TS + Tailwind + Zustand + TanStack Query + Framer Motion · Fastify 4 + Prisma 5 + SQLite + JWT + zod · Capacitor 8 · Docker + Caddy。

---

## 3. 核心数据流：粘贴链接 → 课程大纲

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" width="100%" font-family="-apple-system,Segoe UI,sans-serif" font-size="11">
  <defs>
    <marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#0ea5e9"/>
    </marker>
    <marker id="ah3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#10b981"/>
    </marker>
  </defs>
  <!-- Actors -->
  <g font-weight="700" text-anchor="middle">
    <rect x="20"  y="10" width="80" height="26" rx="4" fill="#fef3c7" stroke="#f59e0b"/><text x="60"  y="28">User</text>
    <rect x="140" y="10" width="80" height="26" rx="4" fill="#fed7aa" stroke="#fb923c"/><text x="180" y="28">Web</text>
    <rect x="260" y="10" width="80" height="26" rx="4" fill="#fde68a" stroke="#f59e0b"/><text x="300" y="28">Server</text>
    <rect x="380" y="10" width="80" height="26" rx="4" fill="#fecaca" stroke="#ef4444"/><text x="420" y="28">Douyin</text>
    <rect x="500" y="10" width="80" height="26" rx="4" fill="#bbf7d0" stroke="#10b981"/><text x="540" y="28">Coze</text>
    <rect x="620" y="10" width="80" height="26" rx="4" fill="#bfdbfe" stroke="#3b82f6"/><text x="660" y="28">Ark</text>
  </g>
  <!-- lifelines -->
  <g stroke="#cbd5e1" stroke-dasharray="3 3">
    <line x1="60"  y1="38" x2="60"  y2="370"/>
    <line x1="180" y1="38" x2="180" y2="370"/>
    <line x1="300" y1="38" x2="300" y2="370"/>
    <line x1="420" y1="38" x2="420" y2="370"/>
    <line x1="540" y1="38" x2="540" y2="370"/>
    <line x1="660" y1="38" x2="660" y2="370"/>
  </g>
  <!-- arrows -->
  <g font-size="10" fill="#0f172a">
    <line x1="60"  y1="55" x2="180" y2="55" stroke="#0ea5e9" marker-end="url(#ah2)"/>
    <text x="120" y="50" text-anchor="middle">① 粘贴抖音口令</text>
    <line x1="180" y1="80" x2="300" y2="80" stroke="#0ea5e9" marker-end="url(#ah2)"/>
    <text x="240" y="75" text-anchor="middle">POST /extract/video</text>
    <line x1="300" y1="105" x2="420" y2="105" stroke="#0ea5e9" marker-end="url(#ah2)"/>
    <text x="360" y="100" text-anchor="middle">② 抓 HTML，正则抽 RENDER_DATA</text>
    <line x1="420" y1="125" x2="300" y2="125" stroke="#10b981" marker-end="url(#ah3)" stroke-dasharray="3 2"/>
    <text x="360" y="138" text-anchor="middle" fill="#065f46">play_addr.url_list[0] (mp4 直链)</text>
    <line x1="300" y1="155" x2="540" y2="155" stroke="#0ea5e9" marker-end="url(#ah2)"/>
    <text x="420" y="150" text-anchor="middle">③ async_run(video_url)</text>
    <line x1="540" y1="175" x2="300" y2="175" stroke="#10b981" marker-end="url(#ah3)" stroke-dasharray="3 2"/>
    <text x="420" y="188" text-anchor="middle" fill="#065f46">taskId</text>
    <line x1="300" y1="200" x2="180" y2="200" stroke="#10b981" marker-end="url(#ah3)" stroke-dasharray="3 2"/>
    <text x="240" y="195" text-anchor="middle" fill="#065f46">{ taskId }</text>
    <text x="180" y="222" font-style="italic" fill="#64748b">前端每 3s 轮询 GET /extract/video/:id（省略）…</text>
    <line x1="540" y1="245" x2="300" y2="245" stroke="#10b981" marker-end="url(#ah3)" stroke-dasharray="3 2"/>
    <text x="420" y="240" text-anchor="middle" fill="#065f46">SRT 字幕（completed）</text>
    <line x1="300" y1="275" x2="660" y2="275" stroke="#0ea5e9" marker-end="url(#ah2)"/>
    <text x="480" y="270" text-anchor="middle">④ POST /chat/completions · JSON 模式 + EXTRACT_SYSTEM</text>
    <line x1="660" y1="295" x2="300" y2="295" stroke="#10b981" marker-end="url(#ah3)" stroke-dasharray="3 2"/>
    <text x="480" y="308" text-anchor="middle" fill="#065f46">结构化课程 JSON（title/outline/objectives…）</text>
    <text x="300" y="330" font-style="italic" fill="#64748b">⑤ Course 入库 · 字幕 ≥2000 字 → setImmediate(buildKbForCourse)</text>
    <line x1="300" y1="350" x2="180" y2="350" stroke="#10b981" marker-end="url(#ah3)" stroke-dasharray="3 2"/>
    <text x="240" y="345" text-anchor="middle" fill="#065f46">{ id, title }</text>
    <line x1="180" y1="368" x2="60" y2="368" stroke="#10b981" marker-end="url(#ah3)" stroke-dasharray="3 2"/>
    <text x="120" y="363" text-anchor="middle" fill="#065f46">跳 /course/:id</text>
  </g>
</svg>

> AI 陪学的流程类似，区别在于：`/ai/chat` 是 SSE 流式响应；服务端先 `searchMultiKb()` 拿到 top-3 字幕片段塞进 system prompt，让模型基于片段作答。

---

## 4. AI 模型与能力

| 提供方 | 模型 / 工作流 | 调用 | 场景 |
|---|---|---|---|
| 火山方舟 | doubao-seed-2.0-pro | OpenAI 兼容 `/chat/completions`：SSE 流式 + `response_format: json_object` | 大纲生成、陪学、计划生成、知识库切块、关键词提取 |
| Coze | 自建「视频字幕」工作流 | `async_run` + 轮询 `/task/:id` | 视频 URL → SRT 字幕 |

### Ark 客户端 3 个出口（`services/ark.ts`）

- `arkChat()` — 非流式
- `arkChatStream()` — `AsyncGenerator` 逐 delta yield，前端 SSE 转 fetch ReadableStream
- `arkJson<T>()` — **JSON 模式 + 失败把上次错误回喂模型自我纠错**：

```ts
for (let i = 0; i < 2; i++) {
  const out = await arkChat({ ...opts, messages, responseFormat: 'json_object' })
  try { return JSON.parse(out.trim().replace(/^```json|```$/g, '').trim()) as T }
  catch {
    messages.push({ role: 'assistant', content: out })
    messages.push({ role: 'user', content: '上一次回复不是合法 JSON，请只输出 JSON。' })
  }
}
```

### 标记协议（替代 function-calling）

让模型把工具调用以**内联文本标记**形式发出，前端边流边识别边渲染对应组件。比 OpenAI tool-use 在中文场景更稳，且不必等整条消息完成就能给用户即时反馈。

| 标记 | 触发 | 前端渲染 |
|---|---|---|
| `<<TIMER:25:专注>>` | 用户开始任务 | `PomoTimer` 自动开始 |
| `<<PLAN:goal=…\|weeks=4\|hours=6\|courseIds=a,b>>` | 用户要排计划 | `PlanProposalCard` 一键创建 |
| `<<TASK_DONE:id>>` | 考核 ≥80% 正确率 | "已掌握" chip |
| `<<TASK_REVIEW:title=…\|date=…>>` | 考核 30-79% | "已加复习任务" |
| `<<VIDEO_SEARCH:关键词\|reason=…>>` | KB 未覆盖 | 琥珀卡，点开打开搜索 Sheet 批量解析 |

system prompt 同时给出**完整示例输出**提升遵循率：

```
【场景 4】用户问到 KB 没覆盖的知识点：
  1) 先承认 "资料里没细讲～"   2) 给 ≤80 字兜底解释   3) 末尾必须输出 <<VIDEO_SEARCH:...>>
  示例：资料里没有这部分呢～简单说，闭包是函数记住了它定义时的外层变量……
       <<VIDEO_SEARCH:JavaScript 闭包 动画讲解|reason=动画 + 实战例子比纯文字好懂>>
```

### 轻量级 RAG（无向量库）

中文学习场景下关键词足够。构建时让 doubao 同时**切块 + 标 5-12 个关键词**写库；检索时再让 doubao 把问句拆 3-10 个关键词，按"关键词命中 ×3 + 文本命中 ×1"打分取 top-3：

```ts
const scored = rows.map(r => {
  let score = 0
  for (const w of kw) {
    if (r.keywords.includes(w)) score += 3
    if (r.text.includes(w))     score += 1
  }
  return { ord: r.ord, text: r.text, score }
})
return scored.filter(x => x.score > 0).sort((a,b)=>b.score-a.score).slice(0, k)
```

---

## 5. 核心实现要点

### 5.1 抖音 HTML → mp4（`services/douyin.ts`）

四层兜底，单层失败自动落到下一层：
1. 用 iPhone UA 跟随短链 302 到 `iesdouyin.com/share/video/<id>/`
2. 解析 `<script id="RENDER_DATA">`（URI 编码 JSON）→ 递归找 `play_addr.url_list[0]`
3. 解析 `window._ROUTER_DATA = {...}`
4. 抠 `item_ids` 调老 `iteminfo` 接口
5. 最后用 `Range: bytes=0-1` 极小请求触发 302 拿 CDN final URL，并校验 content-type 含 `video/`

实测一条真实分享口令端到端 ~1.5s 拿到 720p mp4 直链。

### 5.2 全局后台任务（`store/bgTasks.ts`）

视频解析 30-120s，不能阻塞页面。Zustand store 维护 `BgTask[]`，每个任务有 `stage / progress / stageLabel`；任务 Promise 持有在 store，**用户切走页面继续跑**；`BackgroundTaskFloater` 全局挂在 `App.tsx`，右下角圆形按钮 + 抽屉跨页可见；完成时走 `@capacitor/local-notifications` 本地通知。

批量解析用 worker 池 concurrency=3 防 Coze QPS 超限：先一次性把 N 个 BgTask 注册显示「⏳ 排队等待中…」，再受控出队真正调用：

```ts
const queue = items.map(it => { const id = nanoid(); store.add({ id, stageLabel: '⏳ 排队等待中…', ... }); return { id, input: it } })
let active = 0, cursor = 0
const tick = () => {
  while (active < concurrency && cursor < queue.length) {
    const job = queue[cursor++]
    if (store.tasks.find(x => x.id === job.id)?.stage === 'cancelled') continue
    active++
    runVideoExtract(job.id, job.input).finally(() => { active--; tick() })
  }
}
```

### 5.3 流式 SSE 解析（`services/ark.ts`）

注意半行 buffer，避免跨 chunk 的 SSE 行被切断：

```ts
let buf = ''
while (true) {
  const { value, done } = await reader.read(); if (done) break
  buf += decoder.decode(value, { stream: true })
  const lines = buf.split('\n'); buf = lines.pop() ?? ''   // 半行留到下次
  for (const raw of lines) {
    const line = raw.trim(); if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim(); if (payload === '[DONE]') return
    const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content
    if (delta) yield delta
  }
}
```

### 5.4 标记解析（`pages/Chat.tsx`）

边流边 `extractAllTags()`，识别后内联渲染对应组件并从纯文本里剥离：

```ts
for (const m of content.matchAll(/<<VIDEO_SEARCH:([^>]+)>>/g)) {
  const parts = m[1].trim().split('|').map(s => s.trim())
  const head = parts[0]
  const kv: Record<string,string> = {}
  for (const p of parts.slice(1)) { const i = p.indexOf('='); if (i>0) kv[p.slice(0,i).trim()] = p.slice(i+1).trim() }
  const keyword = !head.includes('=') ? head : (kv.keyword || kv.q || '')
  if (keyword) tags.push({ kind: 'video_search', key: `vs-${idx++}`, keyword, reason: kv.reason })
}
```

### 5.5 解析完成自动加入对话引用

Chat 订阅 bgTasks store，监控自己提交的 taskIds，完成时把新 courseId 加进 `citedCourseIds`，AI 下一轮回答就能基于新素材：

```ts
useEffect(() => useBgTasks.subscribe((state) => {
  for (const id of pendingRef.current) {
    const t = state.tasks.find(x => x.id === id)
    if (t?.stage === 'done' && t.result?.id) {
      setCitedCourseIds(prev => prev.includes(t.result.id) ? prev : [...prev, t.result.id])
      toast.success(`已自动引用《${t.result.title.slice(0,18)}》到当前对话`)
      pendingRef.current.delete(id)
    }
  }
}), [])
```

### 5.6 剪贴板感知（`hooks/useClipboardLink.ts`）

mount 延迟 600ms（避开 splash）+ `visibilitychange→visible` + `window focus` 三个时机读 `navigator.clipboard`；内存 `lastSeenRef` 防重弹 + localStorage 持久化忽略列表；APK 上 Capacitor WebView 原生支持，无需额外插件。

---

## 6. 数据模型

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" width="100%" font-family="-apple-system,Segoe UI,sans-serif" font-size="11">
  <defs>
    <marker id="er" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#475569"/>
    </marker>
  </defs>
  <!-- User -->
  <rect x="310" y="10" width="100" height="48" rx="6" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="360" y="28" text-anchor="middle" font-weight="700">User</text>
  <text x="360" y="44" text-anchor="middle" fill="#64748b" font-size="10">id · username · hash</text>
  <!-- Course -->
  <rect x="20" y="100" width="120" height="58" rx="6" fill="#fed7aa" stroke="#fb923c"/>
  <text x="80" y="118" text-anchor="middle" font-weight="700">Course</text>
  <text x="80" y="133" text-anchor="middle" fill="#64748b" font-size="10">title · category</text>
  <text x="80" y="146" text-anchor="middle" fill="#64748b" font-size="10">outline JSON</text>
  <!-- StudyPlan -->
  <rect x="170" y="100" width="120" height="58" rx="6" fill="#fed7aa" stroke="#fb923c"/>
  <text x="230" y="118" text-anchor="middle" font-weight="700">StudyPlan</text>
  <text x="230" y="133" text-anchor="middle" fill="#64748b" font-size="10">goal · weeks</text>
  <text x="230" y="146" text-anchor="middle" fill="#64748b" font-size="10">weeklyHours</text>
  <!-- ChatSession -->
  <rect x="320" y="100" width="120" height="58" rx="6" fill="#fed7aa" stroke="#fb923c"/>
  <text x="380" y="118" text-anchor="middle" font-weight="700">ChatSession</text>
  <text x="380" y="133" text-anchor="middle" fill="#64748b" font-size="10">title · courseId?</text>
  <text x="380" y="146" text-anchor="middle" fill="#64748b" font-size="10">updatedAt</text>
  <!-- KB -->
  <rect x="470" y="100" width="120" height="58" rx="6" fill="#fed7aa" stroke="#fb923c"/>
  <text x="530" y="118" text-anchor="middle" font-weight="700">KnowledgeBase</text>
  <text x="530" y="133" text-anchor="middle" fill="#64748b" font-size="10">status · chunkCount</text>
  <text x="530" y="146" text-anchor="middle" fill="#64748b" font-size="10">1:1 → Course</text>
  <!-- Order -->
  <rect x="600" y="100" width="100" height="58" rx="6" fill="#fed7aa" stroke="#fb923c"/>
  <text x="650" y="118" text-anchor="middle" font-weight="700">Order</text>
  <text x="650" y="133" text-anchor="middle" fill="#64748b" font-size="10">totalCents</text>
  <text x="650" y="146" text-anchor="middle" fill="#64748b" font-size="10">status</text>
  <!-- relations from User -->
  <g stroke="#475569" fill="none">
    <line x1="320" y1="60" x2="80" y2="98" marker-end="url(#er)"/>
    <line x1="335" y1="60" x2="230" y2="98" marker-end="url(#er)"/>
    <line x1="360" y1="60" x2="380" y2="98" marker-end="url(#er)"/>
    <line x1="385" y1="60" x2="530" y2="98" marker-end="url(#er)"/>
    <line x1="400" y1="60" x2="650" y2="98" marker-end="url(#er)"/>
  </g>
  <!-- Sub tables row -->
  <rect x="20" y="220" width="110" height="40" rx="5" fill="#fff7ed" stroke="#fdba74"/>
  <text x="75" y="237" text-anchor="middle" font-weight="600" font-size="11">Rating · Favorite</text>
  <text x="75" y="251" text-anchor="middle" fill="#64748b" font-size="10">N:1 → Course</text>
  <rect x="140" y="220" width="110" height="40" rx="5" fill="#fff7ed" stroke="#fdba74"/>
  <text x="195" y="237" text-anchor="middle" font-weight="600" font-size="11">StudyPlanItem</text>
  <text x="195" y="251" text-anchor="middle" fill="#64748b" font-size="10">date · done · order</text>
  <rect x="260" y="220" width="120" height="40" rx="5" fill="#fff7ed" stroke="#fdba74"/>
  <text x="320" y="237" text-anchor="middle" font-weight="600" font-size="11">ChatMessage</text>
  <text x="320" y="251" text-anchor="middle" fill="#64748b" font-size="10">role · content · meta</text>
  <rect x="390" y="220" width="120" height="40" rx="5" fill="#fff7ed" stroke="#fdba74"/>
  <text x="450" y="237" text-anchor="middle" font-weight="600" font-size="11">KbChunk</text>
  <text x="450" y="251" text-anchor="middle" fill="#64748b" font-size="10">ord · text · keywords</text>
  <rect x="520" y="220" width="90" height="40" rx="5" fill="#fff7ed" stroke="#fdba74"/>
  <text x="565" y="237" text-anchor="middle" font-weight="600" font-size="11">OrderItem</text>
  <text x="565" y="251" text-anchor="middle" fill="#64748b" font-size="10">qty · price</text>
  <rect x="620" y="220" width="80" height="40" rx="5" fill="#fff7ed" stroke="#fdba74"/>
  <text x="660" y="237" text-anchor="middle" font-weight="600" font-size="11">CheckIn</text>
  <text x="660" y="251" text-anchor="middle" fill="#64748b" font-size="10">date · minutes</text>
  <!-- 1:N lines -->
  <g stroke="#475569" stroke-dasharray="3 3" fill="none">
    <line x1="80"  y1="160" x2="75"  y2="218" marker-end="url(#er)"/>
    <line x1="230" y1="160" x2="195" y2="218" marker-end="url(#er)"/>
    <line x1="380" y1="160" x2="320" y2="218" marker-end="url(#er)"/>
    <line x1="530" y1="160" x2="450" y2="218" marker-end="url(#er)"/>
    <line x1="650" y1="160" x2="565" y2="218" marker-end="url(#er)"/>
    <line x1="360" y1="60"  x2="660" y2="218" marker-end="url(#er)"/>
  </g>
  <!-- Product -->
  <rect x="540" y="290" width="100" height="40" rx="5" fill="#fde68a" stroke="#f59e0b"/>
  <text x="590" y="307" text-anchor="middle" font-weight="600">Product</text>
  <text x="590" y="321" text-anchor="middle" fill="#64748b" font-size="10">title · price · stock</text>
  <line x1="590" y1="290" x2="565" y2="262" stroke="#475569" marker-end="url(#er)"/>
  <!-- legend -->
  <text x="20" y="350" fill="#64748b" font-size="10">实线=直接外键 · 虚线=1:N 子表 · 共 13 张表（其余略）</text>
</svg>

**要点**：JSON 字段（tags / outline / objectives）以 TEXT 存 JSON 字符串，路由层统一 `serialize()` 反序列化；`CheckIn(userId,date,courseId)` 唯一键防重复打卡；`KnowledgeBase.courseId ON DELETE SET NULL` 删课程不丢知识库；`KbChunk / ChatMessage / StudyPlanItem` 级联删除。

---

## 7. 部署与运行

```bash
npm install && npm run db:push -w server && npm run db:seed -w server
npm run dev                  # 本地：server 8787 + web 5173
docker compose up -d --build # 生产：Dockerfile 3 阶段构建 + Caddy 自动 TLS
```

**关键环境变量**：`API_KEY`（火山方舟）· `ARK_MODEL`（默认 doubao-seed-2.0-pro）· `JWT_SECRET` · `COZE_BASE_URL` / `COZE_API_TOKEN` · `DATABASE_URL`（默认 SQLite）。

**关键文件索引**：`server/src/services/{ark,coze,douyin,kb}.ts` · `server/src/routes/{ai,extract,chat,plans}.ts` · `web/src/store/bgTasks.ts` · `web/src/pages/{Home,Chat,Library,Extract}.tsx` · `web/src/components/{VideoSearchSheet,BackgroundTaskFloater,ClipboardLinkPrompt,PlanProposalCard}.tsx` · `web/src/hooks/useClipboardLink.ts`。

代码量：后端 ~2,400 LOC，前端 ~6,300 LOC，合计 ~9,000 行（不含生成代码）。
