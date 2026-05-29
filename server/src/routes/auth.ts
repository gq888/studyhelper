import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'

const credSchema = z.object({
  username: z.string().min(3).max(40),
  password: z.string().min(6).max(100),
  nickname: z.string().min(1).max(40).optional(),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const parsed = credSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input', detail: parsed.error.format() })
    const { username, password, nickname } = parsed.data
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) return reply.code(409).send({ error: 'user_exists' })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, passwordHash, nickname: nickname ?? username },
    })
    const token = await reply.jwtSign({ sub: user.id })
    return reply.send({
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar },
    })
  })

  app.post('/auth/login', async (req, reply) => {
    const parsed = z.object({ username: z.string(), password: z.string() }).safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    const { username, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'invalid_credentials' })
    const token = await reply.jwtSign({ sub: user.id })
    return reply.send({
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, bio: user.bio },
    })
  })
}
