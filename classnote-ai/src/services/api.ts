/**
 * 后端 API 传输层
 * 封装 uni.request / uni.uploadFile，不在 Store 中直接写请求细节
 */

// ==================== 类型定义 ====================

export interface BackendTranscript {
  scene?: string
  topic?: string
  text?: string
  segments?: Array<{ start?: number; end?: number; text?: string }>
  confidence?: number
  language?: string
  durationSeconds?: number
  [key: string]: unknown
}

export interface BackendProcessResult {
  taskId?: string
  topic?: string
  source?: { filePath?: string; fileName?: string; uploadedUrl?: string }
  transcript?: BackendTranscript
  summary?: string
  keywords?: string[]
  suggestions?: string[]
  translation?: { targetLanguage?: string; text?: string } | null
  emotion?: { label?: string; score?: number; note?: string } | null
  nextActions?: string[]
  recordId?: string
  [key: string]: unknown
}

export interface ProcessAudioPayload {
  recordId?: string
  courseId?: string
  courseName?: string
  topic?: string
  scene?: string
  text?: string
  transcript?: string
  segments?: Array<{ id?: string; time?: number; text?: string }>
  marks?: Array<Record<string, unknown>>
  durationSeconds?: number
  source?: string
  [key: string]: unknown
}

export interface BackendRecord {
  id: string
  createdAt: string
  updatedAt?: string
  topic?: string
  scene?: string
  filePath?: string
  uploadedFile?: Record<string, unknown> | null
  result?: BackendProcessResult | null
}

interface ApiResponseEnvelope<T> {
  ok: boolean
  data?: T
  error?: string
  message?: string
}

// ==================== Base URL ====================

import { API_BASE_URL } from '@/config/runtime'

let baseUrl = API_BASE_URL

export function setApiBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, '')
}

export function getApiBaseUrl(): string {
  return baseUrl
}

/**
 * 从 runtime config 重新读取 baseUrl
 * 用于用户在设置页修改服务器地址后刷新
 */
export function reloadApiBaseUrl(): void {
  // 动态 import 避免循环依赖；runtime config 已在模块加载时解析一次
  // 这里直接重新读 storage 并更新 baseUrl
  try {
    const customUrl = uni.getStorageSync('CUSTOM_API_BASE')
    if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
      baseUrl = customUrl.trim().replace(/\/+$/, '')
    } else {
      baseUrl = API_BASE_URL
    }
  } catch {
    baseUrl = API_BASE_URL
  }
}

// ==================== HTTP 工具 ====================

export function request<T>(options: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  data?: Record<string, unknown>
  timeout?: number
}): Promise<T> {
  const { method, path, data, timeout = 10000 } = options
  const url = `${baseUrl}${path}`

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data: data ?? {},
      header: { 'Content-Type': 'application/json' },
      timeout,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data as Record<string, unknown>
          // 兼容两种响应格式:
          // 旧版: { ok: true, data: T }
          // 新版: { code: 200, data: T, message: string }
          if (body && (body.ok === true || body.code === 200)) {
            resolve(body.data as T)
          } else {
            reject(new Error(
              (body?.message as string) || (body?.error as string) || `API error: ${url}`,
            ))
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || `Network error: ${url}`))
      },
    })
  })
}

// ==================== API 函数 ====================

/** 健康检查 */
export function checkHealth(): Promise<{ ok: boolean; time?: string; [key: string]: unknown }> {
  return request({
    method: 'GET',
    path: '/health',
    timeout: 3000,
  })
}

/** JSON 方式调用 AI 处理 */
export function processAudio(payload: ProcessAudioPayload): Promise<BackendProcessResult> {
  return request<BackendProcessResult>({
    method: 'POST',
    path: '/api/ai/process',
    data: payload,
    timeout: 15000,
  })
}

/** 上传音频文件（multipart） */
export function uploadAudio(
  filePath: string,
  fields?: Record<string, string>,
): Promise<BackendProcessResult> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${baseUrl}/api/audio/upload`,
      filePath,
      name: 'audio',
      formData: fields,
      timeout: 30000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const body = JSON.parse(res.data) as ApiResponseEnvelope<BackendProcessResult>
            if (body && body.ok) {
              resolve(body.data as BackendProcessResult)
            } else {
              reject(new Error(body?.message || body?.error || 'Upload returned ok=false'))
            }
          } catch {
            reject(new Error('Failed to parse upload response'))
          }
        } else {
          reject(new Error(`Upload HTTP ${res.statusCode}`))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || 'Upload network error'))
      },
    })
  })
}

/** 获取所有记录 */
export function getRecords(): Promise<BackendRecord[]> {
  return request<BackendRecord[]>({
    method: 'GET',
    path: '/api/records',
    timeout: 10000,
  })
}

/** 获取单条记录 */
export function getRecord(id: string): Promise<BackendRecord> {
  return request<BackendRecord>({
    method: 'GET',
    path: `/api/records/${encodeURIComponent(id)}`,
    timeout: 10000,
  })
}
