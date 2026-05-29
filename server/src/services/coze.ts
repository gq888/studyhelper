// Coze 视频字幕解析工作流封装
import { env } from '../env.js'

export interface CozeTaskRow {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | string
  result?: {
    subtitle_url?: string
    subtitle_text?: string
    [k: string]: any
  }
  error?: any
  created_at?: string
  completed_at?: string
}

function ensureConfigured() {
  if (!env.COZE_BASE_URL || !env.COZE_API_TOKEN) {
    throw new Error('COZE_API_TOKEN / COZE_BASE_URL 未配置，无法调用视频字幕工作流')
  }
}

/** 提交异步视频解析任务，返回 task_id */
export async function submitVideoExtraction(videoUrl: string): Promise<string> {
  ensureConfigured()
  const res = await fetch(`${env.COZE_BASE_URL}/async_run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.COZE_API_TOKEN}`,
    },
    body: JSON.stringify({ video_url: videoUrl }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Coze submit ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = (await res.json()) as { task_id?: string }
  if (!data.task_id) throw new Error('Coze 返回缺少 task_id')
  return data.task_id
}

/** 查询任务状态 */
export async function getVideoExtractionTask(taskId: string): Promise<CozeTaskRow> {
  ensureConfigured()
  const res = await fetch(`${env.COZE_BASE_URL}/task/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${env.COZE_API_TOKEN}` },
  })
  if (res.status === 404) throw new Error('task_not_found')
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Coze get ${res.status}: ${txt.slice(0, 200)}`)
  }
  return (await res.json()) as CozeTaskRow
}

/** 把 SRT 字幕里的时间戳/编号去掉，仅保留正文（喂给大模型用） */
export function srtToPlainText(srt: string): string {
  if (!srt) return ''
  return srt
    .replace(/^\d+\s*$/gm, '')
    .replace(/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s-->\s\d{2}:\d{2}:\d{2}[,.]\d{3}.*$/gm, '')
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
