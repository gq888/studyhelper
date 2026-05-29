import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const createSchema = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) }))
    .min(1),
  address: z.string().max(500).optional(),
  payMethod: z.enum(['alipay', 'wechat', 'stripe', 'balance']).optional(),
})

export async function orderRoutes(app: FastifyInstance) {
  app.post('/orders', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const { items, address, payMethod } = parsed.data

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    })
    if (products.length !== items.length) return reply.code(400).send({ error: 'product_missing' })
    const priceMap = new Map(products.map((p) => [p.id, p.price]))
    const total = items.reduce((s, i) => s + (priceMap.get(i.productId) ?? 0) * i.quantity, 0)

    const order = await prisma.order.create({
      data: {
        userId: req.userId!,
        totalCents: total,
        status: 'pending',
        address,
        payMethod,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            priceCents: priceMap.get(i.productId) ?? 0,
          })),
        },
      },
      include: { items: true },
    })
    return order
  })

  app.get('/orders', { preHandler: requireAuth }, async (req) => {
    return prisma.order.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    })
  })

  app.get('/orders/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const o = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    })
    if (!o || o.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    return o
  })

  /**
   * 支付占位：真实接入支付宝/微信/Stripe 时，应在此发起预下单。
   * 当前实现：返回应跳转的支付参数 + 提供 /orders/:id/confirm 模拟回调。
   * 真实生产时需替换 createPayIntent + verify signature。
   */
  app.post('/orders/:id/pay', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const o = await prisma.order.findUnique({ where: { id } })
    if (!o || o.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    if (o.status !== 'pending') return reply.code(400).send({ error: 'order_not_pending' })
    // 真实接口购买后，把以下替换为真实下单
    return {
      orderId: o.id,
      amount: o.totalCents,
      payUrl: null,
      message:
        '当前未配置真实支付（支付宝/微信/Stripe）。请在 .env 中配置 PAY_* 密钥并接入支付服务后启用。',
    }
  })

  // 支付回调：真实接入时必须校验签名
  app.post('/orders/:id/confirm', { preHandler: requireAuth }, async (req, reply) => {
    const id = (req.params as any).id as string
    const o = await prisma.order.findUnique({ where: { id } })
    if (!o || o.userId !== req.userId) return reply.code(404).send({ error: 'not_found' })
    if (o.status !== 'pending') return o
    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
    })
    // 更新商品销量
    const items = await prisma.orderItem.findMany({ where: { orderId: id } })
    for (const it of items) {
      await prisma.product.update({
        where: { id: it.productId },
        data: { sold: { increment: it.quantity } },
      })
    }
    return updated
  })
}
