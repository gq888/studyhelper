import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { buildKbForCourse, searchKb } from '../services/kb.js'

export async function kbRoutes(app: FastifyInstance) {
  /** 我的所有知识库 */
  app.get('/kb', { preHandler: requireAuth }, async (req) => {
    const rows = await prisma.knowledgeBase.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, category: true, sourceUrl: true } },
      },
    })
    return rows
  })

  /** KB 详情 + chunks */
  app.get('/kb/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, category: true, sourceUrl: true } },
        chunks: { orderBy: { ord: 'asc' } },
      },
    })
    if (!kb || kb.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    return kb
  })

  /** 删除 KB */
  app.delete('/kb/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const kb = await prisma.knowledgeBase.findUnique({ where: { id } })
    if (!kb || kb.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    await prisma.knowledgeBase.delete({ where: { id } })
    return { ok: true }
  })

  /** 搜索（chat 后端在自动调，这里也开放给前端调试） */
  app.post('/kb/:id/search', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = z
      .object({ query: z.string().min(1).max(500), k: z.number().int().min(1).max(20).optional() })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const kb = await prisma.knowledgeBase.findUnique({ where: { id } })
    if (!kb || kb.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    const hits = await searchKb(id, parsed.data.query, parsed.data.k ?? 3)
    return { hits }
  })

  /**
   * 手动重建（用户在 KB 详情页可以点重建；需要传 sourceText，因为后端没存原始字幕）
   */
  app.post('/kb/build', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        courseId: z.string(),
        content: z.string().min(100).max(40000),
      })
      .safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } })
    if (!course) return reply.code(404).send({ error: 'course_not_found' })
    const result = await buildKbForCourse(parsed.data.courseId, req.userId!, parsed.data.content)
    if (!result) return reply.code(500).send({ error: 'build_failed' })
    return result
  })
}
