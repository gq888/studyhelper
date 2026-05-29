import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

function decode(p: any) {
  let tags: string[] = []
  try {
    tags = JSON.parse(p.tags ?? '[]')
  } catch {
    tags = []
  }
  return { ...p, tags }
}

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', async (req) => {
    const q = (req.query as any) ?? {}
    const where: any = {}
    if (q.category) where.category = q.category
    if (q.search) where.title = { contains: q.search }
    const items = await prisma.product.findMany({
      where,
      orderBy: { sold: 'desc' },
      take: Math.min(Number(q.take ?? 30), 60),
    })
    return items.map(decode)
  })

  app.get('/products/:id', async (req, reply) => {
    const id = (req.params as any).id as string
    const p = await prisma.product.findUnique({ where: { id } })
    if (!p) return reply.code(404).send({ error: 'not_found' })
    return decode(p)
  })
}
