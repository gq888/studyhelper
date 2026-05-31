import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { arkChat, arkChatStream, arkJson } from '../services/ark.js'
import { KB_TRIGGER_MIN_CHARS, buildKbForCourse, searchMultiKb } from '../services/kb.js'

const EXTRACT_SYSTEM = `你是「学海小书院」的 AI 学习教练。用户会粘贴一条学习视频/链接的描述或文案，你的任务是基于该描述把内容拆解为一份**结构化学习课程大纲**。

严格输出 JSON，字段如下：
{
  "title": "课程标题（精炼，10-20 字）",
  "subtitle": "副标题，对学习目标的一句话总结（30 字内）",
  "category": "学科分类：math/english/cs/lang/science/humanities/exam/skill/other 之一",
  "difficulty": 1-5 的整数,
  "estimatedHours": 浮点数（预计完成总学时）,
  "tags": ["标签1", "标签2", ...] 3-6 个,
  "objectives": ["可衡量的学习目标 1", "目标 2", ...] 3-6 个,
  "prerequisites": ["前置知识 1", ...] 0-5 个,
  "outline": [
    {
      "title": "章节标题",
      "duration": "建议时长，例如 20 分钟",
      "points": ["知识点 1", "知识点 2"],
      "tips": ["学习 tips 1"]
    },
    ...
  ] 3-8 个章节,
  "resources": [
    { "type": "book|video|article|practice", "title": "资源标题", "url": "可选" }
  ] 0-5 条
}

要求：
- 内容必须围绕**学习/教育**主题，不要输出菜谱、烹饪、生活类内容。
- 章节顺序需要符合循序渐进的学习路径。
- 每段 tips 给出可操作的方法（如：记忆口诀、易错点、训练题型）。
- 仅输出 JSON，不要任何解释、不要 markdown 围栏。`

const CHAT_SYSTEM = `你是「书院鸮」，一只可爱、温柔且博学的学习陪伴 AI 助教。你的目标是陪用户一起完成本节课程：
- 使用亲切的口吻、适当的语气词（如"呀""嗷""唔"），偶尔使用 emoji，但不要泛滥。
- 用 5 句以内的短段落回答，避免长篇大论。
- 用户在学习过程中提问时：用易懂的比喻 + 关键步骤拆解 + 一句小总结。
- 用户表达卡顿/不会时：先共情，再给出最小可执行下一步。
- 用户没特别要求时，主动引导他完成下一步学习，并适时提醒休息。

═══ 可用的特殊指令标记（输出在消息末尾，UI 会自动识别并渲染） ═══

A) 番茄钟：\`<<TIMER:分钟数:标签>>\`
B) 学习计划草稿：\`<<PLAN:goal=...|weeks=...|hours=...|courseIds=...>>\`
   - 当用户表达"想要一份学习计划"的意图时输出
   - goal 10-30 字；weeks 缺省 4；hours 缺省 6
   - 如果上下文已引用课程，courseIds 用英文逗号分隔填入；否则留空
   - 一旦输出此标记，UI 渲染一张草稿卡片让用户确认，你不要继续解释
C) 任务掌握：\`<<TASK_DONE:任务id>>\`
   - 仅当用户完成考核且答对率 ≥ 80% 时输出
   - id 必须来自"当前学习计划"上下文里列出的任务 id
D) 复习任务追加：\`<<TASK_REVIEW:title=复习任务名|minutes=分钟|date=YYYY-MM-DD|courseId=可选课程id>>\`
   - 仅当考核答对率在 30%-79% 之间，需要巩固时输出
   - date 默认明天，minutes 默认 25

═══ 触发场景 ═══

【场景 1】用户说"开始学习：xxx"（通常从 PlanDetail 跳来）：
  1) 给一句鼓励的开场（≤20 字）
  2) 把任务拆解成 3-5 个**可立刻动手**的子步骤，用「1️⃣ 2️⃣ 3️⃣」列出
  3) 邀请一句："想从哪一步入手呀？"
  4) **末尾输出** \`<<TIMER:任务时长:任务名>>\` 启动番茄钟

【场景 2】用户说"考考我 / 来个小测验 / 检验下"：
  1) 围绕当前任务出 3 道题（选择或简答），从易到难，编号 ① ② ③
  2) 一句提示："答完一起发给我哦～"
  3) 等用户回答后，逐题点评，并按答对率：
     - ≥ 80%：温暖肯定 + \`<<TASK_DONE:当前任务id>>\` + "下一个任务想试 X 吗？"（X 取当前计划里下一条未完成任务的标题）
     - 30%-79%：指出薄弱点 + \`<<TASK_REVIEW:title=巩固XX|minutes=25|date=明天日期>>\` + "我把复习任务加好啦～"
     - < 30%：温柔讲解关键概念，不输出标记，邀请再练

【场景 3】用户表达计划意图（"帮我排个计划"等）：按 B 标记输出草稿卡片

═══ 通用规则 ═══

- 标记必须严格遵循格式：用 \`|\` 分隔参数、不换行、不加空格、不被 markdown 围栏包裹
- 不要解释你"调用了什么工具"——直接输出标记即可
- 永远不要输出违法、不安全或与教育无关的内容`

const PERSONALIZE_SYSTEM = `你是学习路径规划专家。根据用户的诉求与口味，输出 3 套不同风格的学习路线推荐。
严格 JSON：
{
  "plans": [
    {
      "name": "路线名（例如：经典稳健派）",
      "subject": "主题学科",
      "schedule": "每周建议学时",
      "modules": ["模块 1", "模块 2", "模块 3"]
    },
    { ... },
    { ... }
  ]
}
仅输出 JSON。`

export async function aiRoutes(app: FastifyInstance) {
  // 课程提取（粘贴链接/文案 → 课程大纲）
  app.post('/ai/extract-course', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        sourceUrl: z.string().optional(),
        content: z.string().min(2).max(40000),
        hint: z.string().max(200).optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const { sourceUrl, content, hint } = parsed.data

    let userMsg = `视频/链接来源：${sourceUrl ?? '（用户直接粘贴文案）'}\n\n用户提供的内容如下：\n"""\n${content}\n"""`
    if (hint) userMsg += `\n\n用户的个性化偏好：${hint}`

    const data = await arkJson<any>({
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.6,
      maxTokens: 3000,
    })

    // 入库
    try {
      const saved = await prisma.course.create({
        data: {
          title: String(data.title ?? '未命名课程').slice(0, 200),
          subtitle: data.subtitle ? String(data.subtitle).slice(0, 200) : null,
          sourceUrl: sourceUrl ?? null,
          difficulty: Math.max(1, Math.min(5, Number(data.difficulty ?? 3))),
          estimatedHours: Number(data.estimatedHours ?? 1) || 1,
          category: String(data.category ?? 'general').slice(0, 40),
          tags: JSON.stringify(data.tags ?? []),
          objectives: JSON.stringify(data.objectives ?? []),
          prerequisites: JSON.stringify(data.prerequisites ?? []),
          outline: JSON.stringify(data.outline ?? []),
          resources: JSON.stringify(data.resources ?? []),
          ownerId: req.userId!,
          isPublic: true,
        },
      })
      // 字幕够长就静默构建知识库；不 await，让用户先跳详情
      if (content.length >= KB_TRIGGER_MIN_CHARS) {
        setImmediate(() => {
          buildKbForCourse(saved.id, req.userId!, content).catch((err) => {
            app.log.error({ err }, '[kb] silent build failed')
          })
        })
      }
      return { ...data, id: saved.id, kbWillBuild: content.length >= KB_TRIGGER_MIN_CHARS }
    } catch (e: any) {
      return reply.code(500).send({ error: 'save_failed', detail: String(e?.message ?? e) })
    }
  })

  // 个性化推荐
  app.post('/ai/personalize', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z.object({ preference: z.string().min(1).max(500) }).safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const data = await arkJson<any>({
      messages: [
        { role: 'system', content: PERSONALIZE_SYSTEM },
        { role: 'user', content: parsed.data.preference },
      ],
      temperature: 0.8,
      maxTokens: 1500,
    })
    return data
  })

  // 流式陪学
  app.post('/ai/chat', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        sessionId: z.string(),
        message: z.string().min(1).max(2000),
        courseId: z.string().optional(),
        courseIds: z.array(z.string()).optional(),
        planId: z.string().optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const { sessionId, message, courseId, courseIds, planId } = parsed.data

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 30 } },
    })
    if (!session || session.userId !== req.userId)
      return reply.code(404).send({ error: 'session_not_found' })

    // 整合所有引用课程
    const allIds = Array.from(new Set([...(courseIds ?? []), ...(courseId ? [courseId] : [])]))
    let courseContext = ''
    if (allIds.length > 0) {
      const courses = await prisma.course.findMany({ where: { id: { in: allIds } } })
      if (courses.length) {
        courseContext =
          '\n\n用户已引用以下课程作为本次对话的背景资料：\n' +
          courses
            .map(
              (c, i) =>
                `【${i + 1}】《${c.title}》${c.subtitle ? '- ' + c.subtitle : ''}\n   学习目标: ${c.objectives}\n   章节大纲: ${c.outline}`,
            )
            .join('\n') +
          '\n\n当用户问与课程相关的内容时优先基于上述资料回答。'
      }
    }

    // 知识库检索：引用了课程且课程有 ready 的 KB 就根据 user message 检索 top-3 chunks
    let kbContext = ''
    if (allIds.length > 0) {
      const kbs = await prisma.knowledgeBase.findMany({
        where: { userId: req.userId!, courseId: { in: allIds }, status: 'ready' },
        select: { id: true, title: true, courseId: true },
      })
      if (kbs.length > 0) {
        try {
          const hits = await searchMultiKb(
            kbs.map((k) => k.id),
            message,
            3,
          )
          if (hits.length > 0) {
            const titleMap = new Map(kbs.map((k) => [k.id, k.title]))
            kbContext =
              '\n\n以下是从引用课程的知识库里检索到的、与用户当前问题最相关的原文片段（按相关度降序）：\n' +
              hits
                .map(
                  (h, i) =>
                    `【片段 ${i + 1} · 来自《${titleMap.get(h.kbId) ?? ''}》 #${h.ord}】\n${h.text}`,
                )
                .join('\n\n') +
              '\n\n回答时优先引用这些片段；若片段不够支撑答案，可以补充说明并提醒用户「这部分没有从视频里直接找到对应内容」。'
          }
        } catch {
          /* KB 检索失败不影响对话 */
        }
      }
    }

    // 引用学习计划
    let planContext = ''
    if (planId) {
      const plan = await prisma.studyPlan.findFirst({
        where: { id: planId, userId: req.userId! },
        include: { items: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
      })
      if (plan) {
        const itemsTxt = plan.items
          .map(
            (it) =>
              `  - id=${it.id} | ${it.date} | ${it.minutes}min | ${it.done ? '✅' : '⏳'} | ${it.title}${it.courseId ? ` | courseId=${it.courseId}` : ''}`,
          )
          .join('\n')
        const nextUndone = plan.items.find((it) => !it.done)
        planContext = `\n\n用户正在执行学习计划《${plan.title}》：
  目标：${plan.goal ?? '（未填）'}
  起止：${plan.startDate} → ${plan.endDate}（每周 ${plan.weeklyHours}h）
  完整任务清单：
${itemsTxt}
  下一条未完成任务：${nextUndone ? `${nextUndone.id} - ${nextUndone.title}` : '无（计划已全部完成）'}

当用户提到"今天该学什么"、"下一步"、"这个计划"时，必须基于上述任务清单回答；
若要输出 \`<<TASK_DONE:id>>\` 或 \`<<TASK_REVIEW:...>>\`，id 必须严格用清单里的真实 id。`
      }
    }

    await prisma.chatMessage.create({
      data: { sessionId, role: 'user', content: message },
    })

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: CHAT_SYSTEM + courseContext + kbContext + planContext },
      ...session.messages.map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    let acc = ''
    try {
      for await (const chunk of arkChatStream({
        messages,
        temperature: 0.7,
        maxTokens: 1200,
      })) {
        acc += chunk
        reply.raw.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`)
      }
      await prisma.chatMessage.create({
        data: { sessionId, role: 'assistant', content: acc },
      })
      await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    } catch (e: any) {
      reply.raw.write(
        `data: ${JSON.stringify({ error: String(e?.message ?? e) })}\n\n`,
      )
    } finally {
      reply.raw.end()
    }
  })

  // 简单文本生成（用于课程卡片标题/分享语等）
  app.post('/ai/text', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({ prompt: z.string().min(1).max(2000), maxTokens: z.number().optional() })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const out = await arkChat({
      messages: [{ role: 'user', content: parsed.data.prompt }],
      maxTokens: parsed.data.maxTokens ?? 600,
    })
    return { text: out }
  })
}
