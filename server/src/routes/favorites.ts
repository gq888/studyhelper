import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

export async function favoriteRoutes(app: FastifyInstance) {
  app.post('/favorites', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z.object({ courseId: z.string() }).safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const { courseId } = parsed.data
    const fav = await prisma.favorite.upsert({
      where: { userId_courseId: { userId: req.userId!, courseId } },
      update: {},
      create: { userId: req.userId!, courseId },
    })
    return fav
  })

  app.delete('/favorites/:courseId', { preHandler: requireAuth }, async (req) => {
    const courseId = (req.params as any).courseId as string
    await prisma.favorite
      .delete({ where: { userId_courseId: { userId: req.userId!, courseId } } })
      .catch(() => null)
    return { ok: true }
  })

  app.get('/favorites', { preHandler: requireAuth }, async (req) => {
    const list = await prisma.favorite.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { course: true },
    })
    return list.map((f) => ({ ...f, course: serialize(f.course) }))
  })
}

function serialize(c: any) {
  if (!c) return c
  const parse = (s: string, fb: any) => {
    try {
      return JSON.parse(s)
    } catch {
      return fb
    }
  }
  return {
    ...c,
    tags: parse(c.tags ?? '[]', []),
    objectives: parse(c.objectives ?? '[]', []),
    prerequisites: parse(c.prerequisites ?? '[]', []),
    outline: parse(c.outline ?? '[]', []),
    resources: parse(c.resources ?? '[]', []),
  }
}
