import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

export async function ratingRoutes(app: FastifyInstance) {
  app.post('/ratings', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        courseId: z.string(),
        stars: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const { courseId, stars, comment } = parsed.data
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return reply.code(404).send({ error: 'course_not_found' })
    const rating = await prisma.rating.upsert({
      where: { userId_courseId: { userId: req.userId!, courseId } },
      update: { stars, comment },
      create: { userId: req.userId!, courseId, stars, comment },
    })
    return rating
  })

  app.get('/ratings/me', { preHandler: requireAuth }, async (req) => {
    return prisma.rating.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { course: true },
    })
  })
}
