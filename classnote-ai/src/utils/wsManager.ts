// WebSocket 管理器：指数退避自动重连 + 消息队列
export type WsStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface WsOptions {
  url: string
  onMessage: (data: string) => void
  onStatusChange: (status: WsStatus) => void
  maxRetries?: number
}

const INITIAL_DELAY_MS = 3000
const MAX_DELAY_MS = 30000
const DEFAULT_MAX_RETRIES = 10

export class WsManager {
  private socket: UniApp.SocketTask | null = null
  private currentStatus: WsStatus = 'idle'
  private retryCount = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private messageQueue: string[] = []
  private destroyed = false
  private opts: Required<WsOptions>

  constructor(options: WsOptions) {
    this.opts = { maxRetries: DEFAULT_MAX_RETRIES, ...options }
  }

  connect() {
    if (this.destroyed) return
    this.setStatus('connecting')

    try {
      this.socket = uni.connectSocket({ url: this.opts.url }) as UniApp.SocketTask

      this.socket.onOpen(() => {
        this.retryCount = 0
        this.setStatus('connected')
        // 重连成功后补发队列消息
        while (this.messageQueue.length > 0) {
          this.socket!.send({ data: this.messageQueue.shift()! })
        }
      })

      this.socket.onMessage((res) => {
        const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        this.opts.onMessage(data)
      })

      this.socket.onClose(() => {
        if (!this.destroyed) this.scheduleReconnect()
      })

      this.socket.onError(() => {
        if (!this.destroyed) this.scheduleReconnect()
      })
    } catch {
      this.scheduleReconnect()
    }
  }

  send(data: string) {
    if (this.currentStatus === 'connected' && this.socket) {
      this.socket.send({ data })
    } else {
      // 断线期间消息入队，重连后补发（防止字幕丢失）
      this.messageQueue.push(data)
    }
  }

  /** 网络恢复或 App 切前台时主动触发重连 */
  resume() {
    if (this.destroyed || this.currentStatus === 'connected') return
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null }
    this.destroyed = false
    this.connect()
  }

  disconnect() {
    this.destroyed = true
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null }
    this.socket?.close({})
    this.socket = null
    this.messageQueue = []
    this.setStatus('idle')
  }

  getRetryCount() { return this.retryCount }
  getStatus() { return this.currentStatus }

  private scheduleReconnect() {
    if (this.destroyed) return
    if (this.retryCount >= this.opts.maxRetries) {
      this.setStatus('disconnected')
      return
    }
    this.setStatus('reconnecting')
    const delay = Math.min(INITIAL_DELAY_MS * Math.pow(1.5, this.retryCount), MAX_DELAY_MS)
    this.retryCount++
    this.retryTimer = setTimeout(() => {
      if (!this.destroyed) {
        this.socket = null
        this.connect()
      }
    }, delay)
  }

  private setStatus(s: WsStatus) {
    this.currentStatus = s
    this.opts.onStatusChange(s)
  }
}
