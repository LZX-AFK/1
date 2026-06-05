/**
 * 后端可达性检测，缓存 30 秒
 * 不依赖 Vue / Pinia
 */

import type { BackendProcessResult } from '@/services/api'
import { checkHealth } from '@/services/api'

const TTL = 30_000
let cachedOnline: boolean | null = null
let lastChecked = 0
let warned = false

export async function isBackendOnline(): Promise<boolean> {
  const now = Date.now()
  if (cachedOnline !== null && now - lastChecked < TTL) {
    return cachedOnline
  }

  try {
    const res = await checkHealth()
    cachedOnline = !!(res && res.ok)
  } catch {
    cachedOnline = false
    if (!warned) {
      console.warn('[api] backend offline')
      warned = true
    }
  }
  lastChecked = now
  return cachedOnline
}

export function resetHealthCache(): void {
  cachedOnline = null
  lastChecked = 0
  warned = false
}

/**
 * 将后端各种格式的响应归一化为 BackendProcessResult
 * 兼容 {data:{...}} / {result:{...}} / 直接 {...} / transcript=string
 */
export function normalizeBackendResult(input: unknown): BackendProcessResult {
  if (!input || typeof input !== 'object') return {}

  const obj = input as Record<string, unknown>

  // 展开 data 或 result 嵌套
  const source = (obj.data ?? obj.result ?? obj) as Record<string, unknown>

  // transcript 可能是 string
  let transcript = source.transcript
  if (typeof transcript === 'string') {
    transcript = { text: transcript }
  }

  return {
    taskId: source.taskId as string | undefined,
    topic: source.topic as string | undefined,
    source: source.source as BackendProcessResult['source'],
    transcript: transcript as BackendProcessResult['transcript'],
    summary: source.summary as string | undefined,
    keywords: (source.keywords as string[] | undefined) ?? [],
    suggestions: (source.suggestions as string[] | undefined) ?? [],
    translation: (source.translation as BackendProcessResult['translation']) ?? null,
    emotion: (source.emotion as BackendProcessResult['emotion']) ?? null,
    nextActions: (source.nextActions as string[] | undefined) ?? [],
    recordId: source.recordId as string | undefined,
  }
}
