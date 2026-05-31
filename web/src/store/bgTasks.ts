/**
 * 全局后台任务存储。
 *
 * 把「视频解析 → AI 大纲」「AI 学习计划生成」这种 30-120 秒级长操作
 * 从页面里抽出来：fetch 在 store 里发起，Promise 由 store 持有，所以
 * 即便用户离开页面，任务仍在跑。完成时根据 notifyOnComplete 触发本地通知。
 */
import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { api } from '@/api/client'
import { fireLocalNotification, requestNotificationPermission } from '@/utils/notify'

export type BgStage =
  | 'submitting'
  | 'subtitle'
  | 'outline'
  | 'plan-generating'
  | 'done'
  | 'error'
  | 'cancelled'

export type BgKind = 'video-extract' | 'plan-generate'

export interface BgTask {
  id: string
  kind: BgKind
  title: string
  emoji: string
  /** 当前阶段 + 一句轮换提示，用于 UI 渲染 */
  stage: BgStage
  stageLabel: string
  progress: number // 0..100
  startedAt: number
  endedAt?: number
  notifyOnComplete: boolean
  notified: boolean
  /** 完成结果信息 */
  result?: any
  resultPath?: string // 用于深链跳转
  resultLabel?: string
  error?: string
  /** 是否被用户主动转后台（仅用于 UI 区分） */
  inBackground: boolean
}

interface State {
  tasks: BgTask[]
}

interface Actions {
  add: (t: BgTask) => void
  patch: (id: string, p: Partial<BgTask>) => void
  setNotify: (id: string, v: boolean) => void
  setBackground: (id: string, v: boolean) => void
  remove: (id: string) => void
  cancel: (id: string) => void
  clearDone: () => void
  /** 取一个进行中或已结束但未读的任务（按 kind 过滤） */
  latest: (kind?: BgKind) => BgTask | undefined
}

export const useBgTasks = create<State & Actions>((set, get) => ({
  tasks: [],
  add: (t) => set((s) => ({ tasks: [t, ...s.tasks] })),
  patch: (id, p) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
  setNotify: (id, v) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, notifyOnComplete: v } : t)) })),
  setBackground: (id, v) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, inBackground: v } : t)) })),
  remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  cancel: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, stage: 'cancelled', endedAt: Date.now() } : t)),
    })),
  clearDone: () =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.stage !== 'done' && t.stage !== 'cancelled') })),
  latest: (kind) => {
    const ts = get().tasks
    return kind ? ts.find((t) => t.kind === kind) : ts[0]
  },
}))

function isLive(id: string) {
  const t = useBgTasks.getState().tasks.find((x) => x.id === id)
  return t && t.stage !== 'cancelled'
}

async function maybeNotify(task: BgTask, title: string, body: string) {
  if (!task.notifyOnComplete) return
  await fireLocalNotification({
    id: task.id,
    title,
    body,
    url: task.resultPath ? location.origin + task.resultPath : undefined,
  })
  useBgTasks.getState().patch(task.id, { notified: true })
}

/** 用户在不确定环境（可能浏览器 / 可能 native）下点击「完成时提醒我」时调用 */
export async function ensureNotificationPermission(): Promise<boolean> {
  console.log('[ensureNotificationPermission] 开始检查通知权限...')
  const r = await requestNotificationPermission()
  console.log('[ensureNotificationPermission] requestNotificationPermission 返回:', r)
  console.log('[ensureNotificationPermission] 是否 granted:', r === 'granted')
  return r === 'granted'
}

const SUBTITLE_STEPS = [
  '📥 提交解析任务…',
  '🎬 下载视频音轨…',
  '🎙 自动语音识别中…',
  '📜 整理 SRT 字幕…',
]
const OUTLINE_STEPS = [
  '🧠 书院鸮在阅读字幕…',
  '🎯 提炼学习目标…',
  '📚 拆解章节大纲…',
  '💡 准备学习 tips…',
  '✨ 整理输出 JSON…',
]
const PLAN_STEPS = [
  '🔍 解析你的学习目标…',
  '📚 检索引用的课程大纲…',
  '🧠 规划每周节奏与重点…',
  '📅 把任务排进日历…',
  '✨ 整理输出 JSON…',
]

function rotateLabel(taskId: string, steps: string[]) {
  let i = 0
  const t = setInterval(() => {
    if (!isLive(taskId)) return clearInterval(t)
    const cur = useBgTasks.getState().tasks.find((x) => x.id === taskId)
    if (!cur || cur.stage === 'done' || cur.stage === 'error') return clearInterval(t)
    useBgTasks.getState().patch(taskId, { stageLabel: steps[i % steps.length] })
    i++
  }, 1800)
  return () => clearInterval(t)
}

function bumpProgress(taskId: string, target: number, step = 0.6) {
  const t = setInterval(() => {
    if (!isLive(taskId)) return clearInterval(t)
    const cur = useBgTasks.getState().tasks.find((x) => x.id === taskId)
    if (!cur) return clearInterval(t)
    if (cur.stage === 'done' || cur.stage === 'error') return clearInterval(t)
    const delta = Math.max(step, (target - cur.progress) * 0.04)
    const next = Math.min(cur.progress + delta, target)
    useBgTasks.getState().patch(taskId, { progress: next })
  }, 280)
  return () => clearInterval(t)
}

/** 真正跑视频解析流程的内部函数：复用已经存在的 BgTask 条目 */
async function runVideoExtract(
  id: string,
  input: { url: string; hint?: string },
): Promise<{ courseId: string; title: string } | null> {
  const store = useBgTasks.getState()
  let stopRotate: (() => void) | null = null
  let stopBump: (() => void) | null = null
  try {
    // 阶段 1：提交 → 轮询
    stopRotate = rotateLabel(id, SUBTITLE_STEPS)
    stopBump = bumpProgress(id, 50)
    store.patch(id, { stage: 'subtitle', stageLabel: SUBTITLE_STEPS[0], progress: 4 })
    const submit = await api<{ taskId: string }>('/extract/video', {
      method: 'POST',
      json: { url: input.url },
    })
    const cozeTaskId = submit.taskId
    while (true) {
      if (!isLive(id)) return null
      await new Promise((r) => setTimeout(r, 3000))
      const row = await api<any>(`/extract/video/${cozeTaskId}`).catch(() => null)
      if (!row) continue
      if (row.status === 'completed') {
        stopRotate?.()
        stopBump?.()
        store.patch(id, { stage: 'outline', progress: 55, stageLabel: OUTLINE_STEPS[0] })
        stopRotate = rotateLabel(id, OUTLINE_STEPS)
        stopBump = bumpProgress(id, 92)
        const content = (row.plainText || row.subtitleText || '').trim()
        if (!content) throw new Error('无字幕内容（可能无人声视频）')
        const data = await api<{ id: string; title: string }>('/ai/extract-course', {
          method: 'POST',
          json: { sourceUrl: input.url, content, hint: input.hint },
        })
        if (!data?.id) throw new Error('AI 大纲生成失败')
        stopRotate?.()
        stopBump?.()
        const finished = {
          stage: 'done' as const,
          progress: 100,
          endedAt: Date.now(),
          result: data,
          resultPath: `/course/${data.id}`,
          resultLabel: '查看课程',
        }
        store.patch(id, finished)
        await maybeNotify(
          { ...store.tasks.find((t) => t.id === id)!, ...finished },
          '✨ 课程大纲已就绪',
          `《${data.title}》已生成，点击查看`,
        )
        return { courseId: data.id, title: data.title }
      }
      if (row.status === 'failed' || row.status === 'cancelled') {
        throw new Error(row.error || '视频解析失败')
      }
    }
  } catch (e: any) {
    stopRotate?.()
    stopBump?.()
    const msg = String(e?.message ?? e).slice(0, 200)
    store.patch(id, { stage: 'error', error: msg, endedAt: Date.now() })
    const t = useBgTasks.getState().tasks.find((x) => x.id === id)
    if (t) await maybeNotify(t, '⚠️ 视频解析失败', msg)
    return null
  }
}

/** 视频字幕解析 + AI 大纲生成（两段流水线） */
export function startVideoExtract(input: {
  url: string
  hint?: string
  title?: string
  notifyOnComplete?: boolean
}): { id: string; promise: Promise<{ courseId: string; title: string } | null> } {
  const id = nanoid()
  const store = useBgTasks.getState()
  store.add({
    id,
    kind: 'video-extract',
    title: input.title ?? '提取视频字幕 + 生成课程大纲',
    emoji: '🎙',
    stage: 'submitting',
    stageLabel: SUBTITLE_STEPS[0],
    progress: 4,
    startedAt: Date.now(),
    notifyOnComplete: input.notifyOnComplete ?? false,
    notified: false,
    inBackground: false,
  })
  return { id, promise: runVideoExtract(id, input) }
}

/**
 * 批量启动多个视频解析任务，并发上限 = concurrency。
 *
 * 策略：先把 N 个 BgTask 全部注册到 store 里（用户立刻能在浮窗看到 N 条「⏳ 排队等待」），
 * 再用一个简单的内部 worker 按 concurrency 出列，只有出列的才真正调用 Coze。
 */
export function startVideoExtractsBatched(
  items: { url: string; hint?: string; title?: string }[],
  concurrency = 3,
  notifyOnComplete = false,
): { ids: string[] } {
  const store = useBgTasks.getState()
  // 1. 先一次性注册所有任务，让用户立即看到完整列表
  const queue = items.map((it) => {
    const id = nanoid()
    store.add({
      id,
      kind: 'video-extract',
      title: it.title ?? '提取视频字幕 + 生成课程大纲',
      emoji: '🎙',
      stage: 'submitting',
      stageLabel: '⏳ 排队等待中…',
      progress: 0,
      startedAt: Date.now(),
      notifyOnComplete,
      notified: false,
      inBackground: false,
    })
    return { id, input: { url: it.url, hint: it.hint } }
  })

  // 2. worker 池：最多 concurrency 个并发执行
  let active = 0
  let cursor = 0
  const tick = () => {
    while (active < concurrency && cursor < queue.length) {
      const job = queue[cursor++]
      // 如果用户在排队期间就取消了，直接跳过
      const t = useBgTasks.getState().tasks.find((x) => x.id === job.id)
      if (!t || t.stage === 'cancelled') continue
      active++
      runVideoExtract(job.id, job.input).finally(() => {
        active--
        tick()
      })
    }
  }
  tick()
  return { ids: queue.map((q) => q.id) }
}

/** AI 生成学习计划 */
export function startPlanGenerate(input: {
  goal: string
  weeks: number
  weeklyHours: number
  courseIds: string[]
  notifyOnComplete?: boolean
}): { id: string; promise: Promise<{ planId: string; title: string } | null> } {
  const id = nanoid()
  const store = useBgTasks.getState()
  store.add({
    id,
    kind: 'plan-generate',
    title: `生成计划：${input.goal.slice(0, 20)}…`,
    emoji: '📅',
    stage: 'plan-generating',
    stageLabel: PLAN_STEPS[0],
    progress: 6,
    startedAt: Date.now(),
    notifyOnComplete: input.notifyOnComplete ?? false,
    notified: false,
    inBackground: false,
  })

  const promise = (async () => {
    const stopRotate = rotateLabel(id, PLAN_STEPS)
    const stopBump = bumpProgress(id, 92)
    try {
      const data = await api<{ id: string; title: string; items: any[] }>('/ai/generate-plan', {
        method: 'POST',
        json: {
          goal: input.goal,
          weeks: input.weeks,
          weeklyHours: input.weeklyHours,
          courseIds: input.courseIds,
        },
      })
      stopRotate()
      stopBump()
      if (!data?.id) throw new Error('生成失败')
      const finished = {
        stage: 'done' as const,
        progress: 100,
        endedAt: Date.now(),
        result: data,
        resultPath: `/plans/${data.id}`,
        resultLabel: '查看计划',
      }
      store.patch(id, finished)
      const t = useBgTasks.getState().tasks.find((x) => x.id === id)
      if (t)
        await maybeNotify(
          { ...t, ...finished },
          '✨ 学习计划已生成',
          `《${data.title}》共 ${data.items?.length ?? 0} 个任务`,
        )
      return { planId: data.id, title: data.title }
    } catch (e: any) {
      stopRotate()
      stopBump()
      const msg = String(e?.message ?? e).slice(0, 200)
      store.patch(id, { stage: 'error', error: msg, endedAt: Date.now() })
      const t = useBgTasks.getState().tasks.find((x) => x.id === id)
      if (t) await maybeNotify(t, '⚠️ 计划生成失败', msg)
      return null
    }
  })()

  return { id, promise }
}
