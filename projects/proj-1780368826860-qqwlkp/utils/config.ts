/**
 * ClassNote AI — 统一环境配置
 *
 * 联调时只需修改这里的 URL，无需改动其他文件。
 *
 * 本地开发：将 ENV 改为 'dev'，后端默认跑在 localhost:3000
 * 生产部署：将 ENV 改为 'prod'，填入 Railway/Render 地址
 */

type Env = 'dev' | 'prod'

// ↓↓↓ 切换环境只改这一行 ↓↓↓
const ENV: Env = 'dev'
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

const configs: Record<Env, { apiBase: string; wsHost: string; wsProtocol: 'ws' | 'wss' }> = {
  dev: {
    apiBase: 'http://localhost:3000',   // 本地后端地址
    wsHost: 'localhost:3000',
    wsProtocol: 'ws',
  },
  prod: {
    apiBase: 'https://your-app.railway.app', // TODO: 替换为 Railway/Render 部署地址
    wsHost: 'your-app.railway.app',          // TODO: 同上，去掉 https://
    wsProtocol: 'wss',
  },
}

const current = configs[ENV]

/** HTTP 请求根地址，例如 http://localhost:3000 */
export const API_BASE_URL = current.apiBase

/** WebSocket 音频会话地址模板，传入 sessionId 即可 */
export function getAudioWsUrl(sessionId: string): string {
  return `${current.wsProtocol}://${current.wsHost}/ws/session/${sessionId}/audio`
}

/** 当前是否为开发环境 */
export const IS_DEV = ENV === 'dev'
