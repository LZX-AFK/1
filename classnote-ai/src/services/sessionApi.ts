/**
 * Session API — 新版后端接口封装
 * 后端统一响应格式: { code: 200, data: T, message: string }
 */

import { request, getApiBaseUrl } from './api'

// ==================== 类型定义 ====================

export interface SessionCreatePayload {
  title?: string
  subject?: string
  courseName?: string
  source?: string
  spaceId?: string
  spaceName?: string
  spaceType?: string
  language?: string
  summaryLanguage?: string
}

export interface SessionSummary {
  id: string
  sessionId: string
  content: string
  keyPoints: string[] | string
  status?: string
  error?: string
  title?: string
  oneSentenceSummary?: string
  mainline?: string[]
  keywords?: string[]
  suggestions?: string[]
  terms?: Array<{ term: string; explanation: string; example?: string }>
  reviewTasks?: string[]
  examFocus?: Array<{ point: string; reason?: string; question?: string }>
  weakPoints?: string[]
  mindMap?: Array<{ name: string; children?: Array<{ name: string }> }>
  source?: string
  documentType?: string
  pageCount?: number
}

export interface SessionMarker {
  id: string
  sessionId: string
  timestampMs: number
  label: string
  note?: string
  aiFollowUp: boolean
}

export interface SessionTranscript {
  id: string
  sessionId: string
  fullText?: string
  segments: Array<{ text: string; timestampMs?: number }> | string
}

export interface SessionDetail {
  id: string
  userId: string
  title?: string
  subject?: string
  status: 'recording' | 'summarizing' | 'done' | 'failed'
  error?: string
  audioUrl?: string
  durationMs: number
  startedAt: string
  endedAt?: string
  transcript?: SessionTranscript
  markers?: SessionMarker[]
  summary?: SessionSummary
}

export interface SessionListItem {
  id: string
  title?: string
  subject?: string
  status: string
  durationMs: number
  startedAt: string
  source?: string
  markerCount?: number
}

// ==================== API 函数 ====================

/** 创建课堂会话 */
export function createSession(payload: SessionCreatePayload = {}): Promise<{ sessionId: string }> {
  return request<{ sessionId: string }>({
    method: 'POST',
    path: '/api/sessions',
    data: payload as Record<string, unknown>,
    timeout: 8000,
  })
}

/** 获取历史课堂列表 */
export function getSessions(q?: string): Promise<SessionListItem[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : ''
  return request<SessionListItem[]>({
    method: 'GET',
    path: `/api/sessions${query}`,
    timeout: 10000,
  })
}

/** 获取课堂详情（含转写、标记、总结） */
export function getSession(id: string): Promise<SessionDetail> {
  return request<SessionDetail>({
    method: 'GET',
    path: `/api/sessions/${encodeURIComponent(id)}`,
    timeout: 10000,
  })
}

/** 结束课堂（触发后端异步 AI 总结） */
export function endSession(id: string, options?: { generateSummary?: boolean }): Promise<{ status: string }> {
  return request<{ status: string }>({
    method: 'PATCH',
    path: `/api/sessions/${encodeURIComponent(id)}/end`,
    body: { generateSummary: options?.generateSummary !== false },
    timeout: 10000,
  })
}

/** 保存录音但不生成总结 */
export function saveSessionOnly(id: string): Promise<{ status: string }> {
  return endSession(id, { generateSummary: false })
}

/** 删除 session 及其所有关联数据 */
export function deleteSession(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>({
    method: 'DELETE',
    path: `/api/sessions/${encodeURIComponent(id)}`,
    timeout: 8000,
  })
}

/** 添加标记 */
export function addMarker(
  sessionId: string,
  payload: {
    timestampMs: number
    label: string
    note?: string
    type?: string
    content?: string
    contextText?: string
    sourceId?: string
    sourceType?: string
    spaceId?: string
    spaceName?: string
  },
): Promise<{ markerId: string; id?: string }> {
  return request<{ markerId: string; id?: string }>({
    method: 'POST',
    path: `/api/sessions/${encodeURIComponent(sessionId)}/markers`,
    data: payload as Record<string, unknown>,
    timeout: 8000,
  })
}

/** 获取课堂的所有标记 */
export function getMarkers(sessionId: string): Promise<SessionMarker[]> {
  return request<SessionMarker[]>({
    method: 'GET',
    path: `/api/sessions/${encodeURIComponent(sessionId)}/markers`,
    timeout: 8000,
  })
}

/** 获取 AI 总结 */
export function getSummary(sessionId: string): Promise<SessionSummary> {
  return request<SessionSummary>({
    method: 'GET',
    path: `/api/sessions/${encodeURIComponent(sessionId)}/summary`,
    timeout: 8000,
  })
}

/** 上传课堂音视频文件 */
export function uploadLectureMedia(
  filePath: string,
  options: { mediaType: 'audio' | 'video'; courseName?: string; language?: string; spaceId?: string; spaceName?: string; spaceType?: string },
): Promise<{ sessionId: string; status: string }> {
  return new Promise((resolve, reject) => {
    const baseUrl = getApiBaseUrl()
    uni.uploadFile({
      url: `${baseUrl}/api/sessions/upload-media`,
      filePath,
      name: 'file',
      formData: {
        mediaType: options.mediaType,
        courseName: options.courseName || '上传课堂',
        language: options.language || 'en',
        ...(options.spaceId ? { spaceId: options.spaceId } : {}),
        ...(options.spaceName ? { spaceName: options.spaceName } : {}),
        ...(options.spaceType ? { spaceType: options.spaceType } : {}),
      },
      timeout: 60000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const body = JSON.parse(res.data)
            if (body && (body.ok === true || body.code === 200)) {
              resolve(body.data)
            } else {
              reject(new Error(body?.error || body?.message || 'Upload failed'))
            }
          } catch {
            reject(new Error('Failed to parse upload response'))
          }
        } else {
          try {
            const body = JSON.parse(res.data)
            reject(new Error(body?.error || `HTTP ${res.statusCode}`))
          } catch {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || 'Upload network error'))
      },
    })
  })
}

/** 轮询 AI 总结直到完成或超时 */
export async function pollSummary(
  sessionId: string,
  options: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<SessionSummary> {
  const { intervalMs = 2000, maxAttempts = 15 } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await getSummary(sessionId)
      console.log(`[pollSummary] attempt ${attempt}, status: ${result.status}`)

      // 成功：有 content
      if (result.status === 'done' && result.content) {
        return result
      }

      // 失败：提取 error code
      if (result.status === 'failed') {
        const errorCode = result.error || 'SUMMARY_FAILED'
        console.warn('[pollSummary] failed, error:', errorCode)
        throw new Error(errorCode)
      }

      // 仍在录音或处理中，继续轮询
      if (result.status === 'recording' || result.status === 'processing') {
        // continue
      }

      // status=done 但无 content（可能还在写入），继续轮询
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Phase 11-C: 业务错误码立即停止轮询（补全 TRANSCRIPT_TOO_SHORT 等）
      const FATAL_ERRORS = [
        'TRANSCRIPT_EMPTY', 'TRANSCRIPT_TOO_SHORT',
        'DEEPSEEK_NOT_CONFIGURED', 'DEEPSEEK_PROCESS_FAILED',
        'AI_SERVICE_UNAVAILABLE', 'SUMMARY_FAILED',
        'UPLOAD_MEDIA_FAILED', 'FFMPEG_NOT_AVAILABLE',
      ]
      if (FATAL_ERRORS.includes(msg)) {
        throw err
      }
      // 404/网络错误，继续轮询
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, intervalMs))
        continue
      }
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }

  throw new Error('SUMMARY_TIMEOUT')
}
