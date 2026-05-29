import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { daysBack, todayChina } from '../utils/date.js'

export async function userRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireAuth }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) return { error: 'not_found' }
    const [favCount, ratedCount, achievements, recentDays] = await Promise.all([
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.rating.count({ where: { userId: user.id } }),
      prisma.userAchievement.count({ where: { userId: user.id } }),
      prisma.checkIn.groupBy({
        by: ['date'],
        where: { userId: user.id, date: { in: daysBack(365) } },
        _sum: { minutes: true },
      }),
    ])
    // 连续天数
    const set = new Set(recentDays.map((d) => d.date))
    let streak = 0
    let cursor = todayChina()
    while (set.has(cursor)) {
      streak++
      const [y, m, d] = cursor.split('-').map(Number)
      const dt = new Date(Date.UTC(y, m - 1, d))
      dt.setUTCDate(dt.getUTCDate() - 1)
      cursor = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
    }
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      stats: {
        achievements,
        favorites: favCount,
        learned: ratedCount,
        streak,
      },
    }
  })

  app.patch('/me', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        nickname: z.string().min(1).max(40).optional(),
        avatar: z.string().url().optional(),
        bio: z.string().max(200).optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const user = await prisma.user.update({ where: { id: req.userId! }, data: parsed.data })
    return { id: user.id, nickname: user.nickname, avatar: user.avatar, bio: user.bio }
  })
}
