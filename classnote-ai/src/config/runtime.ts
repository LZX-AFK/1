/**
 * ============================================================
 * 运行时环境配置（支持本地存储覆盖）
 * ============================================================
 *
 * 默认使用下方 RUNTIME_ENV 配置的地址。
 * 用户可在 App「设置 → 服务状态 → 服务器地址」中手动输入地址，
 * 保存后写入 uni.setStorageSync('CUSTOM_API_BASE')，
 * 下次启动时自动覆盖默认值。
 *
 * 三种环境：
 *   - local-h5    → 本地 H5 开发，连接 127.0.0.1
 *   - lan-test    → 手机局域网真机测试，连接电脑局域网 IP
 *   - public-demo → APK 演示/分发，连接公网 HTTPS 后端
 * ============================================================
 */

// ==================== 在此修改 ====================

/** 当前运行环境 — 打包 APK 时改为 'public-demo' */
const RUNTIME_ENV: 'local-h5' | 'lan-test' | 'public-demo' = 'public-demo'

/** 局域网测试时改成电脑的局域网 IP（例如 192.168.1.2） */
const LAN_API_HOST = '192.168.1.2'

/**
 * 公网后端地址 — 填主机名，不含协议和端口
 * Cloudflare Tunnel: 'xxxx-xxxx.trycloudflare.com'
 * ngrok:             'xxxx.ngrok-free.app'
 * Railway:           'your-app.up.railway.app'
 */
const PUBLIC_API_HOST = 'icq-struck-compiler-incoming.trycloudflare.com'

/** 公网后端端口 — 如果使用标准 443 端口则留空字符串 */
const PUBLIC_API_PORT = ''

// ==================== 以下勿改 ====================

export interface RuntimeConfig {
  env: typeof RUNTIME_ENV
  apiBaseUrl: string
  wsBaseUrl: string
  label: string
  isCustom: boolean
}

function buildDefaultConfig(): RuntimeConfig {
  switch (RUNTIME_ENV) {
    case 'local-h5':
      return {
        env: 'local-h5',
        apiBaseUrl: 'http://127.0.0.1:3000',
        wsBaseUrl: 'ws://127.0.0.1:3000',
        label: '本地开发',
        isCustom: false,
      }
    case 'lan-test':
      return {
        env: 'lan-test',
        apiBaseUrl: `http://${LAN_API_HOST}:3000`,
        wsBaseUrl: `ws://${LAN_API_HOST}:3000`,
        label: '局域网测试',
        isCustom: false,
      }
    case 'public-demo': {
      const port = PUBLIC_API_PORT ? `:${PUBLIC_API_PORT}` : ''
      return {
        env: 'public-demo',
        apiBaseUrl: `https://${PUBLIC_API_HOST}${port}`,
        wsBaseUrl: `wss://${PUBLIC_API_HOST}${port}`,
        label: '公网演示',
        isCustom: false,
      }
    }
    default:
      return {
        env: 'local-h5',
        apiBaseUrl: 'http://127.0.0.1:3000',
        wsBaseUrl: 'ws://127.0.0.1:3000',
        label: '本地开发',
        isCustom: false,
      }
  }
}

/**
 * 从用户输入的地址推导 wsBaseUrl
 * - https://xxx → wss://xxx
 * - http://xxx  → ws://xxx
 * - xxx（无协议）→ 自动加 https → wss
 */
function deriveWsUrl(apiUrl: string): string {
  if (apiUrl.startsWith('wss://') || apiUrl.startsWith('ws://')) return apiUrl
  if (apiUrl.startsWith('https://')) return apiUrl.replace('https://', 'wss://')
  if (apiUrl.startsWith('http://')) return apiUrl.replace('http://', 'ws://')
  return `wss://${apiUrl}`
}

/**
 * 读取最终配置：优先本地存储覆盖，否则使用默认
 */
function resolveConfig(): RuntimeConfig {
  const base = buildDefaultConfig()

  try {
    const customUrl = uni.getStorageSync('CUSTOM_API_BASE')
    if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
      const cleaned = customUrl.trim().replace(/\/+$/, '')
      return {
        env: base.env,
        apiBaseUrl: cleaned,
        wsBaseUrl: deriveWsUrl(cleaned),
        label: '自定义服务器',
        isCustom: true,
      }
    }
  } catch {
    // storage 读取失败，使用默认
  }

  return base
}

const config = resolveConfig()

export const RUNTIME_ENVIRONMENT = config.env
export const API_BASE_URL = config.apiBaseUrl
export const WS_BASE_URL = config.wsBaseUrl
export const RUNTIME_LABEL = config.label
export const IS_CUSTOM_API = config.isCustom

/**
 * 保存用户自定义服务器地址
 * @param url 完整 URL，如 'https://xxxx.trycloudflare.com'
 */
export function saveCustomApiUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, '')
  uni.setStorageSync('CUSTOM_API_BASE', cleaned)
}

/** 清除自定义地址，恢复默认 */
export function clearCustomApiUrl(): void {
  uni.removeStorageSync('CUSTOM_API_BASE')
}

/** 获取当前生效的服务器地址 */
export function getCurrentApiUrl(): string {
  return config.apiBaseUrl
}

/** 获取当前生效的 WS 地址 */
export function getCurrentWsUrl(): string {
  return config.wsBaseUrl
}

/**
 * 验证运行时配置
 */
export function validateRuntimeConfig(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (config.isCustom) {
    // 用户自定义地址，不做环境校验
    return { ok: true, warnings }
  }

  if (RUNTIME_ENV === 'public-demo') {
    if (PUBLIC_API_HOST === 'YOUR_PUBLIC_HOST_HERE' || !PUBLIC_API_HOST) {
      warnings.push('请先配置公网 API 地址（PUBLIC_API_HOST）后再打包 APK。')
      return { ok: false, warnings }
    }
  }

  if (RUNTIME_ENV === 'lan-test') {
    warnings.push('当前为局域网测试环境，仅限同一 Wi-Fi 下使用，不适合分发给其他用户。')
  }

  if (RUNTIME_ENV === 'local-h5') {
    warnings.push('当前为本地 H5 开发环境，仅限本机浏览器使用。')
  }

  return { ok: true, warnings }
}
