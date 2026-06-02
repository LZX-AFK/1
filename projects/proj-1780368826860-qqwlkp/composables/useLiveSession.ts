/**
 * ClassNote AI — 实时课堂会话 Composable
 * 整合：录音管理 + WebSocket 音频流 + 转写接收 + 会话生命周期
 */
import { ref, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useRecorderStore } from '@/stores/recorder'
import {
  createAudioSessionWs,
  WsConnectionState,
  type ClassNoteWebSocket,
  type WsMessage,
} from '@/utils/ws'

export function useLiveSession() {
  const sessionStore = useSessionStore()
  const recorderStore = useRecorderStore()

  // ---- WebSocket ----
  const wsClient = ref<ClassNoteWebSocket | null>(null)
  const wsState = ref<WsConnectionState>(WsConnectionState.DISCONNECTED)

  // ---- 状态 ----
  const isStarting = ref(false)
  const isEnding = ref(false)
  const isPaused = ref(false)
  const error = ref<string | null>(null)

  // ---- 时间同步 ----
  let sessionStartTimestamp = 0

  // ========== Public API ==========

  /** 判断是否已初始化会话 */
  function hasSession(): boolean {
    return !!sessionStore.sessionId
  }

  /** 启动实时课堂：连接 WebSocket → 开始录音 */
  async function start(): Promise<void> {
    if (isStarting.value) return
    if (!sessionStore.sessionId) {
      error.value = '会话未初始化'
      return
    }

    isStarting.value = true
    error.value = null

    try {
      // 1. 创建并连接 WebSocket
      const ws = createAudioSessionWs(sessionStore.sessionId)
      wsClient.value = ws

      // 注册消息处理器
      ws.on('transcript', handleTranscript)
      ws.on('error', handleWsError)
      ws.onMessage(handleWsMessage)
      ws.onStateChange((state) => {
        wsState.value = state
      })

      // 连接 WebSocket
      await ws.connect()
      sessionStartTimestamp = Date.now()

      // 2. 开始录音，PCM 逐帧发送到 WebSocket
      const started = recorderStore.startRecording((frame: ArrayBuffer) => {
        if (
          ws.connectionState === WsConnectionState.CONNECTED &&
          !recorderStore.isPaused
        ) {
          ws.sendAudioFrame(frame)
        }
      })

      if (!started) {
        throw new Error('录音启动失败')
      }

      // 3. 同步录音时长到 session store
      startDurationSync()

    } catch (err: any) {
      error.value = err.message || '启动课堂失败'
      // 清理
      if (wsClient.value) {
        wsClient.value.close()
        wsClient.value = null
      }
      throw err
    } finally {
      isStarting.value = false
    }
  }

  /** 暂停录音 */
  function pause() {
    if (recorderStore.isRecording && !recorderStore.isPaused) {
      recorderStore.pauseRecording()
      isPaused.value = true
      sessionStore.updateStatus('paused')
    }
  }

  /** 恢复录音 */
  function resume() {
    if (recorderStore.isPaused) {
      recorderStore.resumeRecording()
      isPaused.value = false
      sessionStore.updateStatus('recording')
    }
  }

  /** 切换暂停/恢复 */
  function togglePause() {
    if (isPaused.value) {
      resume()
    } else {
      pause()
    }
  }

  /** 结束课堂：停止录音 → 关闭 WS → PATCH 会话 → 跳转总结页 */
  async function endSession(): Promise<void> {
    if (isEnding.value) return
    isEnding.value = true

    try {
      // 1. 停止录音
      await recorderStore.stopRecording()

      // 2. 关闭 WebSocket
      if (wsClient.value) {
        wsClient.value.close(1000, '课堂结束')
        wsClient.value = null
      }

      // 3. 停止时长同步
      stopDurationSync()

      // 4. PATCH 结束会话
      await sessionStore.endSession()

      // 5. 跳转到 AI 总结页
      uni.redirectTo({ url: '/pages/ai-summary/ai-summary' })

    } catch (err: any) {
      error.value = err.message || '结束课堂失败'
      // 即使出错也尝试跳转
      uni.redirectTo({ url: '/pages/ai-summary/ai-summary' })
    } finally {
      isEnding.value = false
    }
  }

  /** 强制清理（页面卸载时调用） */
  function cleanup() {
    stopDurationSync()

    if (wsClient.value) {
      wsClient.value.destroy()
      wsClient.value = null
    }

    if (recorderStore.isActive) {
      recorderStore.stopRecording().catch(() => {})
    }
  }

  // ========== Private Methods ==========

  /** 处理转写消息 */
  function handleTranscript(msg: WsMessage) {
    const timestampMs = msg.timestampMs || (Date.now() - sessionStartTimestamp)

    if (msg.isFinal && msg.text) {
      // 最终结果：追加到已确认列表
      sessionStore.appendTranscript({
        start: timestampMs - 2000, // 估算开始时间
        end: timestampMs,
        text: msg.text,
        isFinal: true,
      })
    }

    // 更新实时字幕显示
    sessionStore.updateLiveTranscript(
      msg.text || '',
      msg.isFinal || false,
      timestampMs,
    )

    // 同步当前时间戳
    sessionStore.liveTimestampMs = timestampMs
  }

  /** 处理 WebSocket 错误 */
  function handleWsError(msg: WsMessage) {
    console.warn('[LiveSession] WS error:', msg.message)
    // 非致命错误不阻断录音，仅记录
  }

  /** 处理所有 WebSocket 消息 */
  function handleWsMessage(msg: WsMessage) {
    if (msg.type === 'session_status') {
      // 后端通知会话状态变更
      if (msg.data?.status) {
        sessionStore.updateStatus(msg.data.status)
      }
    }
  }

  // ---- 时长同步 ----
  let durationTimer: ReturnType<typeof setInterval> | null = null

  /** 定期同步录音时长到 session store */
  function startDurationSync() {
    stopDurationSync()
    durationTimer = setInterval(() => {
      sessionStore.updateDuration(recorderStore.recordingElapsed)
    }, 1000)
  }

  function stopDurationSync() {
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
  }

  // ---- 生命周期 ----
  onUnmounted(() => {
    cleanup()
  })

  // ========== Return ==========
  return {
    // 状态
    wsClient,
    wsState,
    isStarting,
    isEnding,
    isPaused,
    error,
    hasSession,

    // 方法
    start,
    pause,
    resume,
    togglePause,
    endSession,
    cleanup,
  }
}
