import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { daysBack, todayChina } from '../utils/date.js'

export async function checkInRoutes(app: FastifyInstance) {
  // 真实打卡：当天可记录 1 次（per course 唯一）
  app.post('/checkins', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        courseId: z.string().optional().nullable(),
        minutes: z.number().int().min(1).max(600).optional(),
        note: z.string().max(200).optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const today = todayChina()
    try {
      const created = await prisma.checkIn.create({
        data: {
          userId: req.userId!,
          date: today,
          courseId: parsed.data.courseId ?? null,
          minutes: parsed.data.minutes ?? 25,
          note: parsed.data.note,
        },
      })
      return created
    } catch (err: any) {
      if (String(err?.message ?? '').includes('Unique')) {
        return reply.code(409).send({ error: 'already_checked_in' })
      }
      throw err
    }
  })

  // 热力图：返回近 N 天每日累计分钟数
  app.get('/checkins/heatmap', { preHandler: requireAuth }, async (req) => {
    const days = Math.min(Number((req.query as any)?.days ?? 180), 366)
    const range = daysBack(days)
    const rows = await prisma.checkIn.groupBy({
      by: ['date'],
      where: { userId: req.userId!, date: { in: range } },
      _sum: { minutes: true },
      _count: true,
    })
    const map: Record<string, { minutes: number; count: number }> = {}
    for (const r of rows) {
      map[r.date] = { minutes: r._sum.minutes ?? 0, count: r._count }
    }
    return range.map((d) => ({ date: d, minutes: map[d]?.minutes ?? 0, count: map[d]?.count ?? 0 }))
  })

  app.get('/checkins/today', { preHandler: requireAuth }, async (req) => {
    const today = todayChina()
    const items = await prisma.checkIn.findMany({
      where: { userId: req.userId!, date: today },
      orderBy: { createdAt: 'desc' },
    })
    return { date: today, items }
  })
}
