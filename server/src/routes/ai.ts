import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { arkChat, arkChatStream, arkJson } from '../services/ark.js'

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

const CHAT_SYSTEM = `你是「书院熊」，一只可爱、温柔且博学的学习陪伴 AI 助教。你的目标是陪用户一起完成本节课程：
- 使用亲切的口吻、适当的语气词（如"呀""嗷""唔"），偶尔使用 emoji，但不要泛滥。
- 用 5 句以内的短段落回答，避免长篇大论。
- 用户在学习过程中提问时：用易懂的比喻 + 关键步骤拆解 + 一句小总结。
- 用户表达卡顿/不会时：先共情，再给出最小可执行下一步。
- 用户没特别要求时，主动引导他完成下一步学习，并适时提醒休息。
- 当用户回复"开始学习/进入下一步/计时"时，可在末尾追加一行 \`<<TIMER:25:本节专注>>\`（分钟数:标签）让 UI 渲染番茄钟卡片。
- 永远不要输出违法、不安全或与教育无关的内容。`

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
        content: z.string().min(2).max(8000),
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
      return { ...data, id: saved.id }
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
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const { sessionId, message, courseId } = parsed.data

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 30 } },
    })
    if (!session || session.userId !== req.userId)
      return reply.code(404).send({ error: 'session_not_found' })

    let courseContext = ''
    if (courseId) {
      const c = await prisma.course.findUnique({ where: { id: courseId } })
      if (c) {
        courseContext = `\n\n当前学习课程信息：标题《${c.title}》；副标题：${c.subtitle ?? ''}；目标：${c.objectives}；大纲：${c.outline}`
      }
    }

    await prisma.chatMessage.create({
      data: { sessionId, role: 'user', content: message },
    })

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: CHAT_SYSTEM + courseContext },
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
