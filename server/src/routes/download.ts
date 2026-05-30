import type { FastifyInstance } from 'fastify'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOWNLOAD_DIR = path.resolve(__dirname, '../../public/downloads')

interface ReleaseInfo {
  version: string
  versionCode: number
  fileName: string
  sizeBytes: number
  sha256: string
  url: string
  releasedAt: string
}

let cache: ReleaseInfo | null = null

/** 读取目录里最新的 APK 并计算元信息（启动时算一次） */
function loadReleaseInfo(publicBaseUrl = ''): ReleaseInfo | null {
  if (!fs.existsSync(DOWNLOAD_DIR)) return null
  const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.endsWith('.apk'))
  if (files.length === 0) return null
  // 取最新修改时间
  files.sort(
    (a, b) =>
      fs.statSync(path.join(DOWNLOAD_DIR, b)).mtimeMs -
      fs.statSync(path.join(DOWNLOAD_DIR, a)).mtimeMs,
  )
  const fileName = files[0]
  const full = path.join(DOWNLOAD_DIR, fileName)
  const stat = fs.statSync(full)
  const buf = fs.readFileSync(full)
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  // 文件名形如 studyhelper-v1.0.0.apk
  const m = fileName.match(/v?(\d+\.\d+\.\d+)/i)
  const version = m?.[1] ?? '1.0.0'
  return {
    version,
    versionCode: Number(version.replace(/\D/g, '')) || 1,
    fileName,
    sizeBytes: stat.size,
    sha256,
    url: `${publicBaseUrl}/downloads/${encodeURIComponent(fileName)}`,
    releasedAt: stat.mtime.toISOString(),
  }
}

export async function downloadRoutes(app: FastifyInstance) {
  cache = loadReleaseInfo()
  if (cache) {
    app.log.info(`[download] APK ready: ${cache.fileName} (${(cache.sizeBytes / 1024 / 1024).toFixed(1)}MB)`)
  } else {
    app.log.warn('[download] no APK in server/public/downloads/, /api/download/android will 404')
  }

  /** 元信息 + 下载链接（前端 /download 页使用） */
  app.get('/api/download/android', async (req, reply) => {
    if (!cache) return reply.code(404).send({ error: 'no_release' })
    // 用请求自身的 protocol+host 拼绝对 url，方便 Capacitor / 二维码扫码
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol ?? 'http')
    const host = req.headers['host'] ?? 'localhost'
    return {
      ...cache,
      url: `${proto}://${host}/downloads/${encodeURIComponent(cache.fileName)}`,
    }
  })

  /** 触发浏览器下载（带 Content-Disposition） */
  app.get('/api/download/android/file', async (req, reply) => {
    if (!cache) return reply.code(404).send({ error: 'no_release' })
    const full = path.join(DOWNLOAD_DIR, cache.fileName)
    reply.header('Content-Type', 'application/vnd.android.package-archive')
    reply.header('Content-Disposition', `attachment; filename="${cache.fileName}"`)
    return reply.send(fs.createReadStream(full))
  })
}
