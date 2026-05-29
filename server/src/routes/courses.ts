import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

function decodeJsonField<T>(s: string, fb: T): T {
  try {
    return JSON.parse(s) as T
  } catch {
    return fb
  }
}

function serialize(c: any) {
  return {
    ...c,
    tags: decodeJsonField<string[]>(c.tags ?? '[]', []),
    objectives: decodeJsonField<string[]>(c.objectives ?? '[]', []),
    prerequisites: decodeJsonField<string[]>(c.prerequisites ?? '[]', []),
    outline: decodeJsonField<any[]>(c.outline ?? '[]', []),
    resources: decodeJsonField<any[]>(c.resources ?? '[]', []),
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional().nullable(),
  cover: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  difficulty: z.number().int().min(1).max(5).optional(),
  estimatedHours: z.number().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  outline: z.array(z.any()).optional(),
  resources: z.array(z.any()).optional(),
  isPublic: z.boolean().optional(),
})

export async function courseRoutes(app: FastifyInstance) {
  app.get('/courses', async (req) => {
    const q = (req.query as any) ?? {}
    const where: any = { isPublic: true }
    if (q.category) where.category = q.category
    if (q.search) where.title = { contains: q.search }
    const items = await prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(q.take ?? 30), 60),
    })
    return items.map(serialize)
  })

  app.get('/courses/:id', async (req, reply) => {
    const id = (req.params as any).id as string
    const c = await prisma.course.findUnique({ where: { id } })
    if (!c) return reply.code(404).send({ error: 'not_found' })
    const ratings = await prisma.rating.findMany({
      where: { courseId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { nickname: true, avatar: true } } },
    })
    const agg = await prisma.rating.aggregate({ where: { courseId: id }, _avg: { stars: true }, _count: true })
    return {
      ...serialize(c),
      ratingAvg: agg._avg.stars ?? 0,
      ratingCount: agg._count,
      ratings: ratings.map((r) => ({
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        createdAt: r.createdAt,
        user: r.user,
      })),
    }
  })

  app.post('/courses', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input', detail: parsed.error.format() })
    const data = parsed.data
    const created = await prisma.course.create({
      data: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        cover: data.cover ?? null,
        sourceUrl: data.sourceUrl ?? null,
        difficulty: data.difficulty ?? 3,
        estimatedHours: data.estimatedHours ?? 1,
        category: data.category ?? 'general',
        tags: JSON.stringify(data.tags ?? []),
        objectives: JSON.stringify(data.objectives ?? []),
        prerequisites: JSON.stringify(data.prerequisites ?? []),
        outline: JSON.stringify(data.outline ?? []),
        resources: JSON.stringify(data.resources ?? []),
        ownerId: req.userId!,
        isPublic: data.isPublic ?? true,
      },
    })
    return serialize(created)
  })

  app.delete('/courses/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const c = await prisma.course.findUnique({ where: { id } })
    if (!c) return reply.code(404).send({ error: 'not_found' })
    if (c.ownerId !== req.userId) return reply.code(403).send({ error: 'forbidden' })
    await prisma.course.delete({ where: { id } })
    return { ok: true }
  })
}
