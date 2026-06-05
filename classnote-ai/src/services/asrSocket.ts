/**
 * ASR WebSocket 客户端
 * 封装 WS 连接 + 音频发送，不要把 WS 逻辑散落在 live.vue
 *
 * 连接后端 WS /ws/session/:id/audio，发送音频 chunk，接收实时转写
 */

import { getApiBaseUrl } from './api'

export interface AsrTranscriptEvent {
  text: string
  isFinal: boolean
  timestampMs: number
}

export interface AsrErrorEvent {
  error: string
  message: string
}

export interface AsrHandlers {
  onOpen?: () => void
  onAsrReady?: () => void
  onTranscript?: (event: AsrTranscriptEvent) => void
  onError?: (event: AsrErrorEvent) => void
  onClose?: () => void
  onDone?: () => void
}

export interface AsrConnection {
  sendAudioChunk(data: ArrayBuffer | Blob): void
  sendJson(data: Record<string, unknown>): void
  stop(): void
  close(): void
  isConnected(): boolean
  isAsrReady(): boolean
}

/**
 * 连接到后端 ASR WebSocket
 *
 * WS 消息协议：
 * - 前端 → 后端: { type: 'start' } | { type: 'stop' } | { type: 'ping' } | binary audio chunk
 * - 后端 → 前端: { type: 'ready', provider } | { type: 'transcript', text, isFinal, timestampMs }
 *                 | { type: 'error', error, message } | { type: 'done' } | { type: 'pong' }
 */
export function connectSessionAudio(sessionId: string, handlers: AsrHandlers): AsrConnection {
  const baseUrl = getApiBaseUrl()
  const wsUrl = baseUrl.replace(/^https/, 'ws').replace(/^http/, 'ws') + `/ws/session/${sessionId}/audio`

  console.log('[asr] connecting to', wsUrl)

  let ws: WebSocket | null = null
  let connected = false
  let asrReady = false
  let chunkCount = 0

  function connect() {
    ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      connected = true
      console.log('[asr] ws open')
      // 发送 start 控制消息告知后端
      ws?.send(JSON.stringify({ type: 'start', sessionId }))
      handlers.onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data))
        switch (msg.type) {
          case 'ready':
            // 后端 ASR provider 已就绪，可以开始发送音频
            asrReady = true
            console.log('[asr] provider ready:', msg.provider)
            handlers.onAsrReady?.()
            break
          case 'transcript':
            console.log('[asr] transcript:', msg.text?.slice(0, 60), 'isFinal:', msg.isFinal)
            handlers.onTranscript?.({
              text: msg.text || '',
              isFinal: msg.isFinal === true,
              timestampMs: msg.timestampMs || 0,
            })
            break
          case 'error':
            console.warn('[asr] error event:', msg.error, msg.message)
            handlers.onError?.({
              error: msg.error || 'UNKNOWN',
              message: msg.message || '未知错误',
            })
            break
          case 'done':
            console.log('[asr] done event')
            handlers.onDone?.()
            break
          case 'pong':
            break
          default:
            console.log('[asr] unknown message type:', msg.type)
        }
      } catch {
        // 二进制帧忽略
      }
    }

    ws.onerror = (err) => {
      console.warn('[asr] ws error:', err)
      handlers.onError?.({
        error: 'WS_ERROR',
        message: 'WebSocket 连接错误',
      })
    }

    ws.onclose = (event) => {
      connected = false
      asrReady = false
      console.log('[asr] ws closed, code:', event.code, 'reason:', event.reason)
      handlers.onClose?.()
    }
  }

  connect()

  return {
    sendAudioChunk(data: ArrayBuffer | Blob) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      if (data instanceof Blob) {
        data.arrayBuffer().then((buf) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(buf)
            chunkCount++
            if (chunkCount <= 5 || chunkCount % 20 === 0) {
              console.log('[asr] sent chunk #' + chunkCount, buf.byteLength, 'bytes')
            }
          }
        })
      } else {
        ws.send(data)
        chunkCount++
        if (chunkCount <= 5 || chunkCount % 20 === 0) {
          console.log('[asr] sent chunk #' + chunkCount, data.byteLength, 'bytes')
        }
      }
    },

    sendJson(data: Record<string, unknown>) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      }
    },

    stop() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('[asr] sending stop')
        ws.send(JSON.stringify({ type: 'stop' }))
      }
    },

    close() {
      if (ws) {
        ws.close()
        ws = null
        connected = false
        asrReady = false
      }
    },

    isConnected() {
      return connected
    },

    isAsrReady() {
      return asrReady
    },
  }
}
