import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { arkJson } from '../services/ark.js'
import { todayChina } from '../utils/date.js'

const itemSchema = z.object({
  date: z.string(),
  title: z.string().min(1).max(120),
  courseId: z.string().optional().nullable(),
  minutes: z.number().int().min(5).max(600).optional(),
  note: z.string().max(300).optional().nullable(),
  order: z.number().int().optional(),
})

const createSchema = z.object({
  title: z.string().min(1).max(120),
  goal: z.string().max(500).optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  weeklyHours: z.number().min(0.5).max(80).optional(),
  color: z.string().optional(),
  items: z.array(itemSchema).optional(),
})

function progress(items: { done: boolean }[]) {
  if (items.length === 0) return { done: 0, total: 0, percent: 0 }
  const done = items.filter((i) => i.done).length
  return { done, total: items.length, percent: Math.round((done / items.length) * 100) }
}

export async function planRoutes(app: FastifyInstance) {
  // 列表
  app.get('/plans', { preHandler: requireAuth }, async (req) => {
    const plans = await prisma.studyPlan.findMany({
      where: { userId: req.userId! },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: { items: { select: { done: true } } },
    })
    return plans.map((p) => ({ ...p, items: undefined, progress: progress(p.items) }))
  })

  // 详情
  app.get('/plans/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const p = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        items: { orderBy: [{ date: 'asc' }, { order: 'asc' }] },
      },
    })
    if (!p || p.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    // 附带每项对应的课程信息（若有）
    const courseIds = Array.from(new Set(p.items.map((i) => i.courseId).filter(Boolean) as string[]))
    const courses = courseIds.length
      ? await prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, category: true },
        })
      : []
    return { ...p, progress: progress(p.items), courses }
  })

  // 创建
  app.post('/plans', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input', detail: parsed.error.format() })
    const { items, ...data } = parsed.data
    const created = await prisma.studyPlan.create({
      data: {
        ...data,
        weeklyHours: data.weeklyHours ?? 5,
        userId: req.userId!,
        items: items?.length
          ? {
              create: items.map((it, idx) => ({
                date: it.date,
                title: it.title,
                courseId: it.courseId ?? null,
                minutes: it.minutes ?? 45,
                note: it.note ?? null,
                order: it.order ?? idx,
              })),
            }
          : undefined,
      },
      include: { items: true },
    })
    return created
  })

  // 更新计划元数据
  app.patch('/plans/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = z
      .object({
        title: z.string().optional(),
        goal: z.string().optional().nullable(),
        weeklyHours: z.number().optional(),
        status: z.enum(['active', 'done', 'archived']).optional(),
        color: z.string().optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const p = await prisma.studyPlan.findUnique({ where: { id } })
    if (!p || p.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    return prisma.studyPlan.update({ where: { id }, data: parsed.data })
  })

  // 删除
  app.delete('/plans/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const p = await prisma.studyPlan.findUnique({ where: { id } })
    if (!p || p.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    await prisma.studyPlan.delete({ where: { id } })
    return { ok: true }
  })

  // 新增条目
  app.post('/plans/:id/items', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const p = await prisma.studyPlan.findUnique({ where: { id } })
    if (!p || p.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    const parsed = itemSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    return prisma.studyPlanItem.create({
      data: {
        planId: id,
        date: parsed.data.date,
        title: parsed.data.title,
        courseId: parsed.data.courseId ?? null,
        minutes: parsed.data.minutes ?? 45,
        note: parsed.data.note ?? null,
        order: parsed.data.order ?? 0,
      },
    })
  })

  // 修改条目（含勾选完成 → 自动打卡）
  app.patch('/plans/:id/items/:itemId', { preHandler: requireAuth }, async (req, reply) => {
    const { id, itemId } = req.params as any
    const p = await prisma.studyPlan.findUnique({ where: { id } })
    if (!p || p.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    const parsed = z
      .object({
        title: z.string().optional(),
        date: z.string().optional(),
        minutes: z.number().optional(),
        note: z.string().nullable().optional(),
        done: z.boolean().optional(),
        order: z.number().optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const before = await prisma.studyPlanItem.findUnique({ where: { id: itemId } })
    if (!before || before.planId !== id) return reply.code(404).send({ error: 'item_not_found' })
    const updated = await prisma.studyPlanItem.update({
      where: { id: itemId },
      data: {
        ...parsed.data,
        doneAt: parsed.data.done === true && !before.done ? new Date() : parsed.data.done === false ? null : undefined,
      },
    })
    // 勾选完成 → 自动写一条打卡（若今日未打过该课程）
    if (parsed.data.done === true && !before.done) {
      const today = todayChina()
      await prisma.checkIn
        .create({
          data: {
            userId: req.userId!,
            date: today,
            courseId: before.courseId,
            minutes: updated.minutes,
            note: `计划：${updated.title}`,
          },
        })
        .catch(() => null) // 唯一索引冲突时静默
    }
    return updated
  })

  // 删除条目
  app.delete('/plans/:id/items/:itemId', { preHandler: requireAuth }, async (req, reply) => {
    const { id, itemId } = req.params as any
    const p = await prisma.studyPlan.findUnique({ where: { id } })
    if (!p || p.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    await prisma.studyPlanItem.deleteMany({ where: { id: itemId, planId: id } })
    return { ok: true }
  })

  // AI 生成完整计划
  app.post('/ai/generate-plan', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        goal: z.string().min(2).max(500),
        startDate: z.string().optional(),
        weeks: z.number().int().min(1).max(26).optional(),
        weeklyHours: z.number().min(1).max(40).optional(),
        courseIds: z.array(z.string()).optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })

    const start = parsed.data.startDate ?? todayChina()
    const weeks = parsed.data.weeks ?? 4
    const weeklyHours = parsed.data.weeklyHours ?? 6

    // 拉取引用课程的大纲（若有）
    let courseSummary = ''
    if (parsed.data.courseIds?.length) {
      const courses = await prisma.course.findMany({
        where: { id: { in: parsed.data.courseIds } },
        select: { id: true, title: true, subtitle: true, outline: true, objectives: true, estimatedHours: true },
      })
      courseSummary = courses
        .map(
          (c, i) =>
            `课程 ${i + 1}（id=${c.id}）《${c.title}》${c.subtitle ?? ''}\n  目标: ${c.objectives}\n  大纲: ${c.outline}\n  预计学时: ${c.estimatedHours}h`,
        )
        .join('\n\n')
    }

    const SYSTEM = `你是一位优秀的学习规划顾问，请基于用户目标生成一份**结构化、可执行**的学习计划。
严格 JSON 输出：
{
  "title": "计划标题（10-20 字）",
  "endDate": "YYYY-MM-DD 结束日期",
  "color": "#xxxxxx",
  "items": [
    { "date": "YYYY-MM-DD", "title": "今日学习任务", "minutes": 数字, "courseId": "对应课程 id 或 null", "note": "一句话提示" }
  ]
}
规则：
- 从 ${start} 开始，覆盖 ${weeks} 周，每周约 ${weeklyHours} 学时；按天平均分配，单日 30-90 分钟为佳。
- 若有引用课程，则把课程大纲按顺序拆解到各天，把 courseId 填到对应条目；其余天数可安排复习/练习/小项目。
- title 要具体（"完成 Python 函数小测验 5 道"，而不是泛泛的"学习"）。
- items 数组按日期升序排列，**不输出**没有任务的空日期。
- 仅输出 JSON，不要 markdown 围栏或解释文字。`

    const data = await arkJson<any>({
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `学习目标：${parsed.data.goal}\n开始日期：${start}\n每周可用学时：${weeklyHours}h\n持续周数：${weeks}\n${courseSummary ? '可用课程清单：\n' + courseSummary : '（用户未指定课程）'}`,
        },
      ],
      temperature: 0.6,
      maxTokens: 4000,
    })

    // 入库
    const created = await prisma.studyPlan.create({
      data: {
        userId: req.userId!,
        title: String(data.title ?? '我的学习计划').slice(0, 120),
        goal: parsed.data.goal,
        startDate: start,
        endDate: String(data.endDate ?? start),
        weeklyHours,
        color: typeof data.color === 'string' ? data.color : '#fb7c2d',
        items: {
          create: (data.items ?? []).slice(0, 200).map((it: any, idx: number) => ({
            date: String(it.date ?? start),
            title: String(it.title ?? '学习任务').slice(0, 120),
            courseId: typeof it.courseId === 'string' && it.courseId ? it.courseId : null,
            minutes: Math.max(5, Math.min(300, Number(it.minutes ?? 45))),
            note: it.note ? String(it.note).slice(0, 300) : null,
            order: idx,
          })),
        },
      },
      include: { items: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
    })
    return { ...created, progress: progress(created.items) }
  })
}
