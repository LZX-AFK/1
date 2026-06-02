/**
 * ClassNote AI — WebSocket 封装
 * 断线重连 · 心跳保活 · 消息分发 · 连接状态管理
 */
import { getAudioWsUrl } from '@/utils/config'

// ---------- 类型定义 ----------
export type WsMessageType =
  | 'transcript'        // 实时转写文本
  | 'error'             // 错误消息
  | 'heartbeat'         // 心跳
  | 'session_status'    // 会话状态变更
  | 'summary_progress'  // AI 总结进度

export interface WsMessage {
  type: WsMessageType
  text?: string
  isFinal?: boolean
  timestampMs?: number
  data?: any
  message?: string
}

export type MessageHandler = (msg: WsMessage) => void

export enum WsConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSED = 'closed',
}

export interface WsOptions {
  /** WebSocket 服务地址 */
  url: string
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number
  /** 重连最大次数，0 表示无限 */
  maxReconnectAttempts?: number
  /** 重连基础间隔（毫秒），指数退避 */
  reconnectBaseInterval?: number
  /** 重连最大间隔（毫秒） */
  reconnectMaxInterval?: number
  /** 连接超时（毫秒） */
  connectTimeout?: number
  /** 是否自动重连 */
  autoReconnect?: boolean
  /** 调试模式 */
  debug?: boolean
}

// ---------- WebSocket 类 ----------
export class ClassNoteWebSocket {
  private ws: UniApp.SocketTask | null = null
  private url: string
  private options: Required<WsOptions>
  private handlers: Map<WsMessageType, MessageHandler[]> = new Map()
  private wildcardHandlers: MessageHandler[] = []
  private reconnectCount = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private _connectionState: WsConnectionState = WsConnectionState.DISCONNECTED
  private intentionallyClosed = false
  private lastHeartbeatResponse = 0

  // 连接状态回调
  private stateChangeCallbacks: Array<(state: WsConnectionState) => void> = []

  constructor(options: WsOptions) {
    this.url = options.url
    this.options = {
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      reconnectBaseInterval: options.reconnectBaseInterval ?? 1000,
      reconnectMaxInterval: options.reconnectMaxInterval ?? 30000,
      connectTimeout: options.connectTimeout ?? 10000,
      autoReconnect: options.autoReconnect ?? true,
      debug: options.debug ?? false,
    }
  }

  // ========== 公共 API ==========

  /** 获取当前连接状态 */
  get connectionState(): WsConnectionState {
    return this._connectionState
  }

  /** 设置连接状态并通知回调 */
  private set connectionState(state: WsConnectionState) {
    this._connectionState = state
    this.stateChangeCallbacks.forEach((cb) => cb(state))
    this.log(`状态变更: ${state}`)
  }

  /** 监听连接状态变更 */
  onStateChange(callback: (state: WsConnectionState) => void) {
    this.stateChangeCallbacks.push(callback)
  }

  /** 移除连接状态监听 */
  offStateChange(callback: (state: WsConnectionState) => void) {
    this.stateChangeCallbacks = this.stateChangeCallbacks.filter((cb) => cb !== callback)
  }

  /** 注册消息处理器 */
  on(type: WsMessageType, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, [])
    }
    this.handlers.get(type)!.push(handler)
  }

  /** 注册通配符消息处理器（接收所有消息） */
  onMessage(handler: MessageHandler) {
    this.wildcardHandlers.push(handler)
  }

  /** 移除消息处理器 */
  off(type: WsMessageType, handler: MessageHandler) {
    const handlers = this.handlers.get(type)
    if (handlers) {
      const idx = handlers.indexOf(handler)
      if (idx > -1) handlers.splice(idx, 1)
    }
  }

  /** 连接 WebSocket */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.log('WebSocket 已连接或正在连接')
        resolve()
        return
      }

      this.intentionallyClosed = false
      this.connectionState = WsConnectionState.CONNECTING
      this.log(`正在连接: ${this.url}`)

      // 连接超时
      this.connectTimeoutTimer = setTimeout(() => {
        if (this.connectionState === WsConnectionState.CONNECTING) {
          this.log('连接超时')
          this.cleanup()
          reject(new Error('WebSocket 连接超时'))
        }
      }, this.options.connectTimeout)

      this.ws = uni.connectSocket({
        url: this.url,
        success: () => {
          this.log('connectSocket 调用成功')
        },
        fail: (err) => {
          this.log('connectSocket 调用失败', err)
          this.cleanup()
          reject(err)
        },
      })

      // 监听连接打开
      this.ws.onOpen(() => {
        this.log('连接已打开')
        if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer)
        this.connectionState = WsConnectionState.CONNECTED
        this.reconnectCount = 0
        this.startHeartbeat()
        resolve()
      })

      // 监听消息
      this.ws.onMessage((event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data as string)
          this.dispatchMessage(msg)

          // 心跳响应
          if (msg.type === 'heartbeat') {
            this.lastHeartbeatResponse = Date.now()
          }
        } catch {
          this.log('消息解析失败:', event.data)
        }
      })

      // 监听关闭
      this.ws.onClose((event) => {
        this.log(`连接关闭: code=${event.code}`)
        this.stopHeartbeat()
        this.ws = null

        if (!this.intentionallyClosed) {
          this.connectionState = WsConnectionState.RECONNECTING
          this.tryReconnect()
        } else {
          this.connectionState = WsConnectionState.CLOSED
        }
      })

      // 监听错误
      this.ws.onError((err) => {
        this.log('WebSocket 错误:', err)
        // onClose 通常会跟随 onError 触发，不在此处处理重连
        this.dispatchMessage({ type: 'error', message: 'WebSocket 连接错误' })
      })
    })
  }

  /** 发送消息 */
  send(data: string | ArrayBuffer): boolean {
    if (!this.ws || this.connectionState !== WsConnectionState.CONNECTED) {
      this.log('发送失败：WebSocket 未连接')
      return false
    }

    this.ws.send({
      data,
      success: () => {
        // 发送成功
      },
      fail: (err) => {
        this.log('发送失败:', err)
      },
    })
    return true
  }

  /** 发送 JSON 消息 */
  sendJson(data: Record<string, any>): boolean {
    return this.send(JSON.stringify(data))
  }

  /** 发送二进制音频帧 */
  sendAudioFrame(frame: ArrayBuffer): boolean {
    return this.send(frame)
  }

  /** 关闭连接 */
  close(code = 1000, reason = '正常关闭') {
    this.intentionallyClosed = true
    this.stopHeartbeat()
    this.clearReconnectTimer()

    if (this.ws) {
      this.ws.close({ code, reason })
      this.ws = null
    }
    this.connectionState = WsConnectionState.CLOSED
  }

  /** 销毁实例 */
  destroy() {
    this.close()
    this.handlers.clear()
    this.wildcardHandlers = []
    this.stateChangeCallbacks = []
  }

  // ========== 私有方法 ==========

  /** 消息分发 */
  private dispatchMessage(msg: WsMessage) {
    // 分发给特定类型处理器
    const handlers = this.handlers.get(msg.type)
    if (handlers) {
      handlers.forEach((h) => h(msg))
    }

    // 分发给通配符处理器
    this.wildcardHandlers.forEach((h) => h(msg))
  }

  /** 开始心跳 */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.lastHeartbeatResponse = Date.now()

    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState !== WsConnectionState.CONNECTED) {
        this.stopHeartbeat()
        return
      }

      // 检查上次心跳是否超时（3 倍心跳间隔）
      const heartbeatTimeout = Date.now() - this.lastHeartbeatResponse
      if (heartbeatTimeout > this.options.heartbeatInterval * 3) {
        this.log('心跳超时，主动断开重连')
        this.ws?.close({ code: 4001, reason: '心跳超时' })
        return
      }

      this.sendJson({ type: 'heartbeat', timestamp: Date.now() })
    }, this.options.heartbeatInterval)
  }

  /** 停止心跳 */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /** 尝试重连（指数退避） */
  private tryReconnect() {
    if (!this.options.autoReconnect) return
    if (this.intentionallyClosed) return

    const maxAttempts = this.options.maxReconnectAttempts
    if (maxAttempts > 0 && this.reconnectCount >= maxAttempts) {
      this.log(`已达到最大重连次数 (${maxAttempts})，停止重连`)
      this.connectionState = WsConnectionState.CLOSED
      return
    }

    // 指数退避：base * 2^n，但不超过 max
    const delay = Math.min(
      this.options.reconnectBaseInterval * Math.pow(2, this.reconnectCount),
      this.options.reconnectMaxInterval
    )

    this.reconnectCount++
    this.log(`第 ${this.reconnectCount} 次重连，${delay}ms 后...`)

    this.reconnectTimer = setTimeout(() => {
      if (this.intentionallyClosed) return
      this.connect().catch(() => {
        // connect 内部会触发 onClose → tryReconnect 循环
      })
    }, delay)
  }

  /** 清除重连定时器 */
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /** 清理连接资源 */
  private cleanup() {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer)
      this.connectTimeoutTimer = null
    }
    this.stopHeartbeat()
    this.ws = null
  }

  /** 调试日志 */
  private log(...args: any[]) {
    if (this.options.debug) {
      console.log('[ClassNoteWS]', ...args)
    }
  }
}

// ========== 工厂函数 ==========

/** 创建 WebSocket 实例 */
export function createWebSocket(url: string, options?: Partial<WsOptions>): ClassNoteWebSocket {
  return new ClassNoteWebSocket({ url, ...options })
}

/** 创建音频会话 WebSocket（连接后端 ASR 管道） */
export function createAudioSessionWs(sessionId: string, options?: Partial<WsOptions>): ClassNoteWebSocket {
  const url = getAudioWsUrl(sessionId)
  return new ClassNoteWebSocket({
    url,
    heartbeatInterval: 15000,
    autoReconnect: true,
    debug: true,
    ...options,
  })
}

export default {
  ClassNoteWebSocket,
  createWebSocket,
  createAudioSessionWs,
}
