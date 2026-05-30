// 抖音分享链接 → 直链 mp4 URL
// Coze 字幕工作流要求 video_url 是「纯视频格式」直链，而抖音分享给出的是 HTML 页面，
// 这里负责把分享口令 / 短链 / 网页地址抹平成可被 Coze 抓到的直链。

const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'

const DOUYIN_HOST_RE = /(^|\.)(?:douyin\.com|iesdouyin\.com|tiktokv\.com)$/i

/** 从可能带文字的分享口令里抽出第一个 http(s) URL */
export function extractFirstUrl(input: string): string | null {
  if (!input) return null
  // 中文标点、空白、引号都视作分隔
  const m = input.match(/https?:\/\/[^\s一-鿿，。！？、；：""''《》【】（）()<>]+/i)
  if (!m) return null
  // 去掉末尾常见的标点残留
  return m[0].replace(/[.,;:!?)]+$/, '')
}

export function isDouyinShareUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return DOUYIN_HOST_RE.test(u.hostname)
  } catch {
    return false
  }
}

/** 抖音分享地址 → 可直接下载的 mp4 直链；失败抛错 */
export async function resolveDouyinVideoUrl(rawUrl: string): Promise<string> {
  // 1. 跟随重定向，短链 v.douyin.com/xxx → www.iesdouyin.com/share/video/<id>/...
  const res = await fetch(rawUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': UA_MOBILE,
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`抖音页面访问失败 ${res.status}`)
  const finalUrl = res.url
  const html = await res.text()

  // 2. 优先解析嵌入的 RENDER_DATA（URI 编码 JSON）
  const renderMatch = html.match(
    /<script[^>]+id=["']RENDER_DATA["'][^>]*>([\s\S]+?)<\/script>/i,
  )
  if (renderMatch) {
    try {
      const decoded = decodeURIComponent(renderMatch[1].trim())
      const url = pickPlayAddr(JSON.parse(decoded))
      if (url) return await followToMp4(normalizePlayUrl(url))
    } catch {
      /* 继续尝试其他来源 */
    }
  }

  // 3. 兜底解析 window._ROUTER_DATA = {...}
  const routerMatch = html.match(/_ROUTER_DATA\s*=\s*(\{[\s\S]+?\})\s*<\/script>/)
  if (routerMatch) {
    try {
      const url = pickPlayAddr(JSON.parse(routerMatch[1]))
      if (url) return await followToMp4(normalizePlayUrl(url))
    } catch {
      /* 继续兜底 */
    }
  }

  // 4. 再兜底：调用 iteminfo（无 cookie 也能返回，但偶尔被风控）
  const idMatch =
    finalUrl.match(/\/(?:video|note)\/(\d+)/) ?? rawUrl.match(/[?&]item_ids=(\d+)/)
  if (idMatch) {
    try {
      const apiRes = await fetch(
        `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${idMatch[1]}`,
        { headers: { 'User-Agent': UA_MOBILE } },
      )
      if (apiRes.ok) {
        const data = (await apiRes.json().catch(() => null)) as any
        const url = pickPlayAddr(data)
        if (url) return await followToMp4(normalizePlayUrl(url))
      }
    } catch {
      /* 忽略，下方统一报错 */
    }
  }

  throw new Error('未能从抖音页面解析到视频地址，可能被风控或链接已失效')
}

/**
 * 中间链 https://aweme.snssdk.com/aweme/v1/play/?... 通常会 302 跳到 CDN 上真正的 mp4。
 * 这里 GET 一次拿最终 URL，避免下游消费方（Coze 工作流 / 浏览器直接打开）必须再跟一次。
 * 失败时回退到中间链——大多数消费方也能自动 follow，只是体验稍差。
 */
async function followToMp4(url: string, timeoutMs = 8000): Promise<string> {
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': UA_MOBILE,
        Accept: 'video/*,*/*;q=0.8',
        // 抖音 CDN 经常对 Range 友好，请求 1 字节即可知道 content-type/final URL
        Range: 'bytes=0-1',
      },
      signal: ctl.signal,
    })
    clearTimeout(timer)
    if (res.ok || res.status === 206) {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('video') || res.url.includes('.mp4') || /douyinvod|aweme/.test(res.url)) {
        return res.url
      }
    }
  } catch {
    /* 网络问题/超时 → 回退 */
  }
  return url
}

/** 递归从任意嵌套 JSON 里挖 play_addr.url_list[0] / playAddr / playApi */
function pickPlayAddr(root: any): string | null {
  if (!root || typeof root !== 'object') return null
  const stack: any[] = [root]
  const seen = new Set<any>()
  while (stack.length) {
    const cur = stack.pop()
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue
    seen.add(cur)

    const playAddr = (cur as any).play_addr ?? (cur as any).playAddr
    if (playAddr) {
      if (typeof playAddr === 'string') return playAddr
      if (Array.isArray(playAddr) && playAddr[0]?.src) return playAddr[0].src
      if (Array.isArray(playAddr.url_list) && playAddr.url_list.length)
        return playAddr.url_list[0]
    }
    if (typeof (cur as any).playApi === 'string') return (cur as any).playApi

    for (const k in cur) {
      const v = (cur as any)[k]
      if (v && typeof v === 'object') stack.push(v)
    }
  }
  return null
}

/** 强制 https + 尝试去水印（playwm → play，抖音老 API 风格） */
function normalizePlayUrl(u: string): string {
  let url = u.startsWith('//') ? 'https:' + u : u.replace(/^http:/, 'https:')
  url = url.replace('/playwm/', '/play/')
  return url
}
