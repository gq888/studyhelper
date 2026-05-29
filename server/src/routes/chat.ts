import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

export async function chatRoutes(app: FastifyInstance) {
  app.get('/chat/sessions', { preHandler: requireAuth }, async (req) => {
    return prisma.chatSession.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
    })
  })

  app.post('/chat/sessions', { preHandler: requireAuth }, async (req) => {
    const parsed = z
      .object({ courseId: z.string().optional(), title: z.string().optional() })
      .safeParse(req.body)
    const data = parsed.success ? parsed.data : {}
    return prisma.chatSession.create({
      data: { userId: req.userId!, courseId: data.courseId, title: data.title ?? '新对话' },
    })
  })

  app.get('/chat/sessions/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const s = await prisma.chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!s || s.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    return s
  })

  app.delete('/chat/sessions/:id', { preHandler: requireAuth }, async (req) => {
    const id = (req.params as any).id as string
    await prisma.chatSession.deleteMany({ where: { id, userId: req.userId! } })
    return { ok: true }
  })
}
