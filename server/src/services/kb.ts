/**
 * 知识库构建：把视频字幕切成可检索的 chunk + 关键词。
 *
 * 设计要点：
 * - 字幕 > 阈值字数才构建（否则 AI 摘要已足够）
 * - 单次调用 doubao 把若干批字幕切成 JSON 结构，避免 N 次小调用
 * - fire-and-forget：不阻塞用户的「视频解析 → 跳详情」流程
 */
import { prisma } from '../db.js'
import { arkJson } from './ark.js'

export const KB_TRIGGER_MIN_CHARS = 2000   // 短字幕不构建
const MAX_CHARS_PER_BATCH = 6000           // 单次塞给 AI 的字幕最大字数（doubao token 限）
const TARGET_CHUNK_CHARS = 350             // 每个 chunk 目标长度

interface AiChunk {
  text: string
  keywords: string // 空格分隔
}

const SYSTEM = `你是知识库构建助手。我会给你一段视频字幕，请把它切成结构化的知识块。

要求：
- 按主题或自然段落切分，每块约 ${TARGET_CHUNK_CHARS} 字（200-500 之间）
- 不要丢失任何重要信息；可以合并破碎短句以提高可读性
- 每个 chunk 提取 5-12 个能用于关键词检索的中文词（可单字、词或短语）
- 输出严格 JSON：{ "chunks": [{ "text": "...", "keywords": "k1 k2 k3 ..." }] }
- 不要解释、不要 markdown 围栏、只输出 JSON`

/** 把整段字幕按段切成 N 批，每批不超过 MAX_CHARS_PER_BATCH */
function splitForBatches(text: string): string[] {
  const out: string[] = []
  let cur = ''
  for (const para of text.split(/\n+/)) {
    if (cur.length + para.length + 1 > MAX_CHARS_PER_BATCH) {
      if (cur) out.push(cur.trim())
      cur = ''
    }
    cur += (cur ? '\n' : '') + para
  }
  if (cur.trim()) out.push(cur.trim())
  return out.length ? out : [text]
}

async function chunkOne(text: string): Promise<AiChunk[]> {
  const data = await arkJson<{ chunks: AiChunk[] }>({
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: '请处理下面这段字幕：\n\n' + text },
    ],
    temperature: 0.3,
    maxTokens: 4000,
  })
  if (!Array.isArray(data?.chunks)) return []
  return data.chunks
    .filter((c) => c && typeof c.text === 'string' && c.text.trim().length > 0)
    .map((c) => ({
      text: c.text.trim(),
      keywords: typeof c.keywords === 'string' ? c.keywords.trim() : '',
    }))
}

/**
 * 为指定 course 构建/重建知识库。fire-and-forget，错误吞掉只更新 status。
 * 已存在的 KB 会被先清空再写入。
 */
export async function buildKbForCourse(
  courseId: string,
  ownerId: string,
  fullText: string,
): Promise<{ kbId: string } | null> {
  if (!fullText || fullText.length < KB_TRIGGER_MIN_CHARS) return null

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return null

  // 先建/找 KB 记录，进入 building
  let kb = await prisma.knowledgeBase.findFirst({ where: { courseId, userId: ownerId } })
  if (kb) {
    await prisma.kbChunk.deleteMany({ where: { kbId: kb.id } })
    await prisma.knowledgeBase.update({
      where: { id: kb.id },
      data: {
        title: course.title,
        sourceUrl: course.sourceUrl,
        totalChars: fullText.length,
        chunkCount: 0,
        status: 'building',
        errorMsg: null,
      },
    })
  } else {
    kb = await prisma.knowledgeBase.create({
      data: {
        userId: ownerId,
        courseId,
        title: course.title,
        sourceUrl: course.sourceUrl,
        totalChars: fullText.length,
        status: 'building',
      },
    })
  }

  try {
    const batches = splitForBatches(fullText)
    const allChunks: AiChunk[] = []
    for (const b of batches) {
      const cs = await chunkOne(b)
      allChunks.push(...cs)
    }
    if (allChunks.length === 0) throw new Error('AI 未返回任何 chunk')

    // 批量入库
    await prisma.kbChunk.createMany({
      data: allChunks.map((c, i) => ({
        kbId: kb!.id,
        ord: i,
        text: c.text.slice(0, 1500),
        keywords: c.keywords.slice(0, 200),
        charCount: c.text.length,
      })),
    })
    await prisma.knowledgeBase.update({
      where: { id: kb.id },
      data: { status: 'ready', chunkCount: allChunks.length, description: makeSummary(allChunks) },
    })
    return { kbId: kb.id }
  } catch (e: any) {
    await prisma.knowledgeBase.update({
      where: { id: kb.id },
      data: { status: 'failed', errorMsg: String(e?.message ?? e).slice(0, 500) },
    })
    return null
  }
}

function makeSummary(chunks: AiChunk[]): string {
  if (chunks.length === 0) return ''
  // 用第一个 chunk 的前 80 字 + 总块数
  return chunks[0].text.slice(0, 80) + '…'
}

/**
 * 搜索：给一段查询，把 ARK 提取关键词，去 KB 里关键词命中 + 文本 LIKE 命中，
 * 按命中数排序返回 top-k。中文场景下这套足够给 LLM 当上下文用。
 */
const KEYWORD_SYSTEM = `把用户问句拆成 3-10 个中文检索关键词（单字、词或短语都可）。
严格输出 JSON：{ "keywords": ["k1","k2",...] }。仅输出 JSON。`

async function queryToKeywords(query: string): Promise<string[]> {
  try {
    const d = await arkJson<{ keywords: string[] }>({
      messages: [
        { role: 'system', content: KEYWORD_SYSTEM },
        { role: 'user', content: query },
      ],
      temperature: 0.2,
      maxTokens: 200,
    })
    if (Array.isArray(d?.keywords)) return d.keywords.filter((s) => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
  } catch {}
  // 兜底：直接按非字母数字切分
  return Array.from(new Set(query.split(/[\s,，。！？、；：""''《》【】（）().!?]+/).filter((s) => s.length >= 2 && s.length <= 8)))
}

export async function searchKb(
  kbId: string,
  query: string,
  k = 3,
): Promise<{ ord: number; text: string; keywords: string; score: number }[]> {
  const kw = await queryToKeywords(query)
  if (kw.length === 0) return []

  const rows = await prisma.kbChunk.findMany({ where: { kbId }, orderBy: { ord: 'asc' } })
  const scored = rows.map((r) => {
    let score = 0
    for (const w of kw) {
      if (!w) continue
      // 关键词字段命中权重更高（结构化提取过）
      if (r.keywords.includes(w)) score += 3
      if (r.text.includes(w)) score += 1
    }
    return { ord: r.ord, text: r.text, keywords: r.keywords, score }
  })
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

/** 同时搜多个 KB，合并 top-k */
export async function searchMultiKb(
  kbIds: string[],
  query: string,
  k = 3,
): Promise<{ kbId: string; ord: number; text: string; score: number }[]> {
  if (kbIds.length === 0) return []
  const kw = await queryToKeywords(query)
  if (kw.length === 0) return []
  const rows = await prisma.kbChunk.findMany({ where: { kbId: { in: kbIds } } })
  const scored = rows.map((r) => {
    let score = 0
    for (const w of kw) {
      if (!w) continue
      if (r.keywords.includes(w)) score += 3
      if (r.text.includes(w)) score += 1
    }
    return { kbId: r.kbId, ord: r.ord, text: r.text, score }
  })
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
