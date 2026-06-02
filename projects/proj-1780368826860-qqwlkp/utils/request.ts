/**
 * ClassNote AI — HTTP 请求封装
 * 自动携带 Token、统一错误处理、请求/响应拦截
 */

// ---------- 类型定义 ----------
export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: Record<string, any>
  header?: Record<string, string>
  timeout?: number
  showLoading?: boolean
  loadingText?: string
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface RequestError {
  code: number
  message: string
  data?: any
}

// ---------- 配置 ----------
import { API_BASE_URL } from '@/utils/config'
const BASE_URL = API_BASE_URL
const DEFAULT_TIMEOUT = 15000

// ---------- Token 管理 ----------
let token: string | null = null

export function setToken(t: string) {
  token = t
  // 持久化到本地存储
  uni.setStorageSync('auth_token', t)
}

export function getToken(): string | null {
  if (!token) {
    token = uni.getStorageSync('auth_token') || null
  }
  return token
}

export function clearToken() {
  token = null
  uni.removeStorageSync('auth_token')
}

// ---------- 工具函数 ----------
function getFullUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return BASE_URL + url
}

/**
 * 默认错误处理：展示 Toast 提示
 */
function handleError(error: RequestError) {
  const msg = error.message || '网络请求失败，请稍后重试'
  uni.showToast({
    title: msg,
    icon: 'none',
    duration: 2500,
  })
  return Promise.reject(error)
}

// ---------- 核心请求方法 ----------
function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    timeout = DEFAULT_TIMEOUT,
    showLoading = false,
    loadingText = '加载中...',
  } = options

  // Loading 提示
  if (showLoading) {
    uni.showLoading({ title: loadingText, mask: true })
  }

  // 组装请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  }

  // 自动携带 Token
  const authToken = getToken()
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: getFullUrl(url),
      method,
      data,
      header: headers,
      timeout,
      success(res) {
        if (showLoading) uni.hideLoading()

        const statusCode = res.statusCode
        const responseData = res.data as ApiResponse<T>

        // HTTP 2xx 成功
        if (statusCode >= 200 && statusCode < 300) {
          // 业务状态码判断
          if (responseData.code === 0 || responseData.code === 200) {
            resolve(responseData)
          } else {
            // 业务错误
            const err: RequestError = {
              code: responseData.code,
              message: responseData.message || '请求失败',
              data: responseData.data,
            }
            // Token 过期处理
            if (responseData.code === 401) {
              clearToken()
              uni.reLaunch({ url: '/pages/index/index' })
            }
            handleError(err).catch(reject)
          }
        } else if (statusCode === 401) {
          // HTTP 401 未授权
          clearToken()
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          uni.reLaunch({ url: '/pages/index/index' })
          reject({ code: 401, message: '未授权' } as RequestError)
        } else {
          const err: RequestError = {
            code: statusCode,
            message: `服务器错误 (${statusCode})`,
          }
          handleError(err).catch(reject)
        }
      },
      fail(err) {
        if (showLoading) uni.hideLoading()

        // 网络错误
        const netErr: RequestError = {
          code: -1,
          message: '网络连接失败，请检查网络设置',
        }
        handleError(netErr).catch(reject)
      },
    })
  })
}

// ---------- 快捷方法 ----------
export function get<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'GET', data, ...options })
}

export function post<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'POST', data, ...options })
}

export function put<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'PUT', data, ...options })
}

export function patch<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'PATCH', data, ...options })
}

export function del<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'DELETE', data, ...options })
}

// ---------- 文件上传 ----------
export function uploadFile(
  filePath: string,
  url: string,
  formData?: Record<string, any>,
  options?: Partial<RequestOptions>
): Promise<ApiResponse> {
  const authToken = getToken()
  const headers: Record<string, string> = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  if (options?.showLoading) {
    uni.showLoading({ title: options.loadingText || '上传中...', mask: true })
  }

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: getFullUrl(url),
      filePath,
      name: 'file',
      formData,
      header: headers,
      success(res) {
        if (options?.showLoading) uni.hideLoading()
        try {
          const data = JSON.parse(res.data) as ApiResponse
          if (data.code === 0 || data.code === 200) {
            resolve(data)
          } else {
            reject({ code: data.code, message: data.message } as RequestError)
          }
        } catch {
          reject({ code: -1, message: '响应解析失败' } as RequestError)
        }
      },
      fail() {
        if (options?.showLoading) uni.hideLoading()
        reject({ code: -1, message: '上传失败' } as RequestError)
      },
    })
  })
}

export default {
  request,
  get,
  post,
  put,
  patch,
  del,
  uploadFile,
  setToken,
  getToken,
  clearToken,
}
