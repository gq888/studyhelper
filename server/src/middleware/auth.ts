import type { FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await req.jwtVerify<{ sub: string }>()
    req.userId = decoded.sub
  } catch {
    reply.code(401).send({ error: 'unauthorized' })
  }
}
