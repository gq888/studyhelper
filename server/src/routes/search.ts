// 视频候选搜索接口（mock 阶段）。
// 用 B 站公开 API 当数据源 ——
//   • /x/web-interface/popular           → 全站热门，无签名、稳定
//   • /x/web-interface/dynamic/region    → 分区最新，知识(36)/科技(188)/校园学习(208)/计算机(95)
//   • 不需要 key、cookie 或 wbi 签名
//   • 返回的 URL 是真实可点击的 bilibili.com 视频页
// 后续接 SerpAPI / Bing 时，只需替换 fetchCandidates() 的实现。

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'

export interface VideoCandidate {
  id: string
  title: string
  url: string
  cover: string
  author: string
  durationSec: number
  platform: 'bilibili' | 'douyin' | 'youtube' | 'other'
  views?: number
  /** mock 数据标记，前端可做 UI 区分 */
  mock?: boolean
}

const BILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Referer: 'https://www.bilibili.com/',
}

/** rid: 36=知识、188=科技数码、208=校园学习、95=计算机技术 */
const BILI_KNOWLEDGE_RIDS = [36, 188, 95, 208]

function biliItemToCandidate(it: any): VideoCandidate | null {
  if (!it?.bvid) return null
  return {
    id: it.bvid,
    title: String(it.title ?? '').replace(/<\/?em[^>]*>/g, ''),
    url: `https://www.bilibili.com/video/${it.bvid}`,
    cover: String(it.pic ?? '').replace(/^http:/, 'https:'),
    author: String(it.owner?.name ?? 'UP 主'),
    durationSec: Number(it.duration ?? 0),
    platform: 'bilibili',
    views: Number(it.stat?.view ?? 0),
    mock: true,
  }
}

async function fetchBiliPopular(): Promise<VideoCandidate[]> {
  try {
    const r = await fetch('https://api.bilibili.com/x/web-interface/popular?ps=30&pn=1', {
      headers: BILI_HEADERS,
    })
    const j = (await r.json().catch(() => null)) as any
    if (j?.code !== 0) return []
    return ((j?.data?.list ?? []) as any[])
      .map(biliItemToCandidate)
      .filter((x): x is VideoCandidate => !!x)
  } catch {
    return []
  }
}

async function fetchBiliRegion(rid: number): Promise<VideoCandidate[]> {
  try {
    const r = await fetch(
      `https://api.bilibili.com/x/web-interface/dynamic/region?rid=${rid}&ps=15&pn=1`,
      { headers: BILI_HEADERS },
    )
    const j = (await r.json().catch(() => null)) as any
    if (j?.code !== 0) return []
    return ((j?.data?.archives ?? []) as any[])
      .map(biliItemToCandidate)
      .filter((x): x is VideoCandidate => !!x)
  } catch {
    return []
  }
}

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search/videos', { preHandler: requireAuth }, async (req) => {
    const q = String((req.query as any)?.q ?? '').trim()
    const limit = Math.min(20, Math.max(1, Number((req.query as any)?.limit ?? 8)))

    try {
      // 并发抓：知识 4 个分区 + 全站热门，混合去重
      const batches = await Promise.all([
        fetchBiliPopular(),
        ...BILI_KNOWLEDGE_RIDS.map((rid) => fetchBiliRegion(rid)),
      ])
      const dedup = new Map<string, VideoCandidate>()
      for (const list of batches) {
        for (const v of list) if (!dedup.has(v.id)) dedup.set(v.id, v)
      }
      const pool = Array.from(dedup.values())

      // 关键词命中加权
      if (q) {
        const kw = q.toLowerCase()
        const tokens = kw.split(/\s+/).filter(Boolean)
        const score = (t: string) => {
          const lower = t.toLowerCase()
          if (lower.includes(kw)) return 100
          return tokens.reduce((s, k) => s + (lower.includes(k) ? 10 : 0), 0)
        }
        pool.sort(
          (a, b) =>
            score(b.title) - score(a.title) ||
            (b.views ?? 0) - (a.views ?? 0),
        )
      } else {
        pool.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      }

      return {
        items: pool.slice(0, limit),
        query: q,
        source: 'bilibili-popular+region-mock',
      }
    } catch (e: any) {
      return {
        items: [] as VideoCandidate[],
        query: q,
        source: 'failed',
        error: String(e?.message ?? e).slice(0, 200),
      }
    }
  })
}
