import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import staticPlugin from '@fastify/static'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { env } from './env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { courseRoutes } from './routes/courses.js'
import { checkInRoutes } from './routes/checkins.js'
import { ratingRoutes } from './routes/ratings.js'
import { favoriteRoutes } from './routes/favorites.js'
import { chatRoutes } from './routes/chat.js'
import { productRoutes } from './routes/products.js'
import { orderRoutes } from './routes/orders.js'
import { aiRoutes } from './routes/ai.js'
import { planRoutes } from './routes/plans.js'
import { extractRoutes } from './routes/extract.js'
import { downloadRoutes } from './routes/download.js'
import { kbRoutes } from './routes/kb.js'
import { searchRoutes } from './routes/search.js'

const app = Fastify({
  logger: { level: env.NODE_ENV === 'development' ? 'info' : 'warn' },
  bodyLimit: 10 * 1024 * 1024,
})

await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true })
await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_EXPIRES_IN } })

app.get('/healthz', async () => ({ ok: true }))
app.get('/api/info', async () => ({
  app: '学海小书院 API',
  version: '1.0.0',
  model: env.ARK_MODEL,
  time: new Date().toISOString(),
}))

await app.register(authRoutes, { prefix: '/api' })
await app.register(userRoutes, { prefix: '/api' })
await app.register(courseRoutes, { prefix: '/api' })
await app.register(checkInRoutes, { prefix: '/api' })
await app.register(ratingRoutes, { prefix: '/api' })
await app.register(favoriteRoutes, { prefix: '/api' })
await app.register(chatRoutes, { prefix: '/api' })
await app.register(productRoutes, { prefix: '/api' })
await app.register(orderRoutes, { prefix: '/api' })
await app.register(aiRoutes, { prefix: '/api' })
await app.register(planRoutes, { prefix: '/api' })
await app.register(extractRoutes, { prefix: '/api' })
await app.register(kbRoutes, { prefix: '/api' })
await app.register(searchRoutes, { prefix: '/api' })
await app.register(downloadRoutes)

// 静态托管 APK 等下载产物（在 SPA fallback 之前注册）
const downloadDir = path.resolve(__dirname, '../public/downloads')
if (fs.existsSync(downloadDir)) {
  await app.register(staticPlugin, {
    root: downloadDir,
    prefix: '/downloads/',
    decorateReply: false,
  })
}

// 生产环境同源托管前端 SPA（如有 web/dist 则提供静态文件 + history fallback）
const webDist = path.resolve(__dirname, '../../web/dist')
console.log(`[server] Checking webDist path: ${webDist}, exists: ${fs.existsSync(webDist)}`)
if (fs.existsSync(webDist)) {
  await app.register(staticPlugin, { 
    root: webDist, 
    prefix: '/', 
    wildcard: false,
    dotfiles: 'allow',
    etag: true,
    lastModified: true
  })
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api')) return reply.code(404).send({ error: 'not_found' })
    // Check if it's an asset file before serving index.html
    if (req.url.startsWith('/assets/') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
      return reply.code(404).send({ error: 'not_found' })
    }
    return reply.sendFile('index.html')
  })
  console.log(`[server] Serving SPA from ${webDist}`)
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  console.log(`[server] http://localhost:${env.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
