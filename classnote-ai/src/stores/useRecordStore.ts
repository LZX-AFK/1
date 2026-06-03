import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RecordingConfig, TimelineMarkItem, MarkType } from '@/types/index'
import { WsManager, type WsStatus } from '@/utils/wsManager'

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing' | 'done'

const WS_URL = 'wss://api.classnote.ai/ws/transcribe'      // production endpoint
const DEEPGRAM_TIMEOUT_MS = 15000  // 15s 无响应 → 显示兜底提示
const SUMMARY_POLL_INTERVAL_MS = 3000
const SUMMARY_TIMEOUT_MS = 90000  // 90s 总结超时

export const useRecordStore = defineStore('record', () => {
  // ── 录音状态 ──────────────────────────────────────────────────
  const status = ref<RecordingStatus>('idle')
  const config = ref<RecordingConfig | null>(null)
  const elapsed = ref(0)
  const accuracy = ref(0)
  const transcript = ref<{ timestamp: number; text: string }[]>([])
  const marks = ref<TimelineMarkItem[]>([])

  // ── WebSocket 状态 ────────────────────────────────────────────
  const wsStatus = ref<WsStatus>('idle')
  const wsRetryCount = ref(0)
  const localSaved = ref(false)      // 后端宕机时录音已本地保存
  const summaryTimedOut = ref(false) // AI 总结轮询超时

  let wsManager: WsManager | null = null
  let deepgramTimer: ReturnType<typeof setTimeout> | null = null
  let summaryPollTimer: ReturnType<typeof setInterval> | null = null
  let summaryTimeoutTimer: ReturnType<typeof setTimeout> | null = null

  // ── Mock 转写数据 ─────────────────────────────────────────────
  const mockTranscript = [
    { timestamp: 1110, text: '上一节课我们讨论过，有丝分裂是一种细胞分裂方式......' },
    { timestamp: 1122, text: '有丝分裂和减数分裂最主要的区别是......' },
    { timestamp: 1135, text: '现在，我们来看这个图表......' },
  ]

  // ── WebSocket ─────────────────────────────────────────────────
  function connectWs() {
    wsManager?.disconnect()
    wsManager = new WsManager({
      url: WS_URL,
      onMessage(data) {
        try {
          const msg = JSON.parse(data)
          if (msg.type === 'transcript' && msg.text) {
            transcript.value.push({ timestamp: elapsed.value, text: msg.text })
          }
          if (msg.type === 'accuracy') accuracy.value = msg.value
        } catch {}
        // 收到任何消息都重置 Deepgram 超时计时器
        resetDeepgramTimer()
      },
      onStatusChange(s) {
        wsStatus.value = s
        wsRetryCount.value = wsManager?.getRetryCount() ?? 0
        if (s === 'disconnected') {
          // 达到最大重试次数 → 本地保存兜底
          saveLocally()
        }
      },
    })
    wsManager.connect()
    startDeepgramTimer()
  }

  function disconnectWs() {
    wsManager?.disconnect()
    wsManager = null
    clearDeepgramTimer()
  }

  /** 网络恢复或切回前台时调用，不重置重试计数 */
  function resumeWs() {
    wsManager?.resume()
  }

  // ── Deepgram 超时兜底 ─────────────────────────────────────────
  function startDeepgramTimer() {
    clearDeepgramTimer()
    deepgramTimer = setTimeout(() => {
      if (status.value === 'recording') {
        transcript.value.push({
          timestamp: elapsed.value,
          text: '【识别服务暂无响应，请检查网络连接】',
        })
      }
    }, DEEPGRAM_TIMEOUT_MS)
  }

  function resetDeepgramTimer() { startDeepgramTimer() }

  function clearDeepgramTimer() {
    if (deepgramTimer) { clearTimeout(deepgramTimer); deepgramTimer = null }
  }

  // ── 后端宕机：本地保存 ────────────────────────────────────────
  function saveLocally() {
    if (localSaved.value) return
    localSaved.value = true
    // 实际应将录音 buffer 写入 uni.setStorage
    try {
      uni.setStorageSync('classnote_local_recording', {
        savedAt: Date.now(),
        transcript: transcript.value,
        marks: marks.value,
        config: config.value,
      })
    } catch {}
    uni.showToast({ title: '服务暂不可用，录音已本地保存', icon: 'none', duration: 3000 })
  }

  // ── AI 总结轮询（最长 90s）────────────────────────────────────
  function startSummaryPolling(sessionId: string, onDone: () => void) {
    summaryTimedOut.value = false
    clearSummaryPolling()

    summaryPollTimer = setInterval(async () => {
      try {
        // 实际调用：const res = await request.get(`/sessions/${sessionId}/summary`)
        // if (res.data?.status === 'done') { clearSummaryPolling(); onDone() }
      } catch {}
    }, SUMMARY_POLL_INTERVAL_MS)

    summaryTimeoutTimer = setTimeout(() => {
      clearSummaryPolling()
      summaryTimedOut.value = true
      uni.showToast({ title: '总结生成超时，请稍后查看', icon: 'none', duration: 3000 })
    }, SUMMARY_TIMEOUT_MS)
  }

  function clearSummaryPolling() {
    if (summaryPollTimer) { clearInterval(summaryPollTimer); summaryPollTimer = null }
    if (summaryTimeoutTimer) { clearTimeout(summaryTimeoutTimer); summaryTimeoutTimer = null }
  }

  // ── 录音控制 ──────────────────────────────────────────────────
  function startRecording(cfg: RecordingConfig) {
    config.value = cfg
    status.value = 'recording'
    elapsed.value = 0
    accuracy.value = 95
    transcript.value = [...mockTranscript]
    marks.value = []
    localSaved.value = false
    summaryTimedOut.value = false
    connectWs()
  }

  function pauseRecording() {
    if (status.value === 'recording') status.value = 'paused'
    // WS 保持连接，只停止向服务端发送音频帧
  }

  function resumeRecording() {
    if (status.value === 'paused') status.value = 'recording'
  }

  function stopRecording() {
    status.value = 'processing'
    disconnectWs()
    setTimeout(() => { status.value = 'done' }, 1500)
  }

  function addMark(type: MarkType, excerpt: string) {
    marks.value.push({
      id: `mark-${Date.now()}`,
      recordingId: 'mock-recording',
      timestamp: elapsed.value,
      type,
      excerpt,
    })
  }

  function reset() {
    disconnectWs()
    clearSummaryPolling()
    status.value = 'idle'
    config.value = null
    elapsed.value = 0
    transcript.value = []
    marks.value = []
    localSaved.value = false
    summaryTimedOut.value = false
    wsStatus.value = 'idle'
    wsRetryCount.value = 0
  }

  return {
    status, config, elapsed, accuracy, transcript, marks,
    wsStatus, wsRetryCount, localSaved, summaryTimedOut,
    startRecording, pauseRecording, resumeRecording, stopRecording,
    addMark, reset, connectWs, disconnectWs, resumeWs, saveLocally,
    startSummaryPolling,
  }
})
