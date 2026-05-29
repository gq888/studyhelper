import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

export async function chatRoutes(app: FastifyInstance) {
  app.get('/chat/sessions', { preHandler: requireAuth }, async (req) => {
    const rows = await prisma.chatSession.findMany({
      where: { userId: req.userId!, messages: { some: {} } },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      courseId: r.courseId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      messageCount: r._count.messages,
    }))
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

  // 改标题
  app.patch('/chat/sessions/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = z.object({ title: z.string().min(1).max(80) }).safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const updated = await prisma.chatSession.updateMany({
      where: { id, userId: req.userId! },
      data: { title: parsed.data.title },
    })
    if (updated.count === 0) return reply.code(404).send({ error: 'not_found' })
    return { ok: true }
  })
}
