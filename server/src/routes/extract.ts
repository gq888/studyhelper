import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { getVideoExtractionTask, srtToPlainText, submitVideoExtraction } from '../services/coze.js'
import {
  extractFirstUrl,
  isDouyinShareUrl,
  resolveDouyinVideoUrl,
} from '../services/douyin.js'

// 放宽到字符串，支持「4.62 复制打开抖音… https://v.douyin.com/xxx/ …」这类分享口令
const submitSchema = z.object({
  url: z.string().min(1).max(4000),
})

/** 把用户粘进来的内容标准化成 Coze 可消费的直链；目前仅对抖音做 HTML 解析 */
async function normalizeVideoUrl(raw: string): Promise<string> {
  const trimmed = raw.trim()
  // 既可能是干净 URL，也可能是带文字的分享口令
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : extractFirstUrl(trimmed)
  if (!url) throw new Error('未能识别到视频链接')
  if (isDouyinShareUrl(url)) return resolveDouyinVideoUrl(url)
  return url
}

export async function extractRoutes(app: FastifyInstance) {
  /** 提交解析任务，返回 taskId（前端轮询 /api/extract/video/:taskId） */
  app.post('/extract/video', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = submitSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })

    let videoUrl: string
    try {
      videoUrl = await normalizeVideoUrl(parsed.data.url)
    } catch (e: any) {
      return reply.code(400).send({
        error: 'resolve_failed',
        detail: String(e?.message ?? e).slice(0, 200),
      })
    }

    try {
      const taskId = await submitVideoExtraction(videoUrl)
      return { taskId, status: 'pending' as const, resolvedUrl: videoUrl }
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      if (msg.includes('未配置'))
        return reply.code(503).send({ error: 'coze_not_configured', detail: msg })
      return reply.code(502).send({ error: 'coze_submit_failed', detail: msg })
    }
  })

  /**
   * 查询任务状态。
   * - pending/running：返回 { status }
   * - completed：返回 { status, subtitleText, subtitleUrl, plainText }
   * - failed：返回 { status, error }
   */
  app.get('/extract/video/:taskId', { preHandler: requireAuth }, async (req, reply) => {
    const taskId = (req.params as any).taskId as string
    if (!taskId) return reply.code(400).send({ error: 'bad_input' })
    try {
      const row = await getVideoExtractionTask(taskId)
      if (row.status === 'completed') {
        const subtitleText = row.result?.subtitle_text ?? ''
        return {
          status: 'completed' as const,
          taskId,
          subtitleUrl: row.result?.subtitle_url ?? null,
          subtitleText,
          plainText: srtToPlainText(subtitleText),
          completedAt: row.completed_at,
        }
      }
      if (row.status === 'failed' || row.status === 'cancelled') {
        return {
          status: row.status,
          taskId,
          error: typeof row.error === 'string' ? row.error : JSON.stringify(row.error ?? null),
        }
      }
      return { status: row.status, taskId }
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      if (msg === 'task_not_found') return reply.code(404).send({ error: 'task_not_found' })
      return reply.code(502).send({ error: 'coze_query_failed', detail: msg })
    }
  })
}
