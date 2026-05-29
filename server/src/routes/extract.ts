import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { getVideoExtractionTask, srtToPlainText, submitVideoExtraction } from '../services/coze.js'

const submitSchema = z.object({
  url: z.string().url(),
})

export async function extractRoutes(app: FastifyInstance) {
  /** 提交解析任务，返回 taskId（前端轮询 /api/extract/video/:taskId） */
  app.post('/extract/video', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = submitSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'bad_input' })
    try {
      const taskId = await submitVideoExtraction(parsed.data.url)
      return { taskId, status: 'pending' as const }
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
