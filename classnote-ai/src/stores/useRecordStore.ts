import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RecordingConfig, TimelineMark, MarkType } from '@/types'
import { createSession, endSession, pollSummary, getSession, addMarker as apiAddMarker, uploadLectureMedia, saveSessionOnly } from '@/services/sessionApi'
import { mapSessionToSummary } from '@/utils/mapSessionToSummary'
import { connectSessionAudio } from '@/services/asrSocket'

// Phase 11-B: 平台判断
let _isApp: boolean | null = null
function isAppRuntime(): boolean {
  if (_isApp !== null) return _isApp
  try {
    const info = uni.getSystemInfoSync()
    _isApp = info.uniPlatform === 'app' || info.platform === 'android' || info.platform === 'ios'
  } catch { _isApp = false }
  return _isApp!
}

// Phase 11-B: App 录音管理器
const appRecorder = isAppRuntime() ? uni.getRecorderManager() : null

/** 原文转写块 */
export interface TranscriptBlock {
  timeRange: string
  title: string
  text: string
  hasMarks: boolean
}

/** 课堂时间线段 */
export interface LectureTimelineItem {
  timeRange: string
  title: string
  whatTaught: string
  teacherEmphasis: string
  relatedMarks: string
}

/** 结构化总结主题 */
export interface StructuredSummaryTopic {
  title: string
  coreConcept: string
  bulletPoints: string[]
}

/** 考点项 */
export interface ExamFocusItem {
  point: string
  reason?: string
  question?: string
}

/** 知识图谱节点 */
export interface MindMapNode {
  name: string
  children?: MindMapNode[]
}

/** AI 总结数据结构 */
export interface SummaryResult {
  courseName: string
  date: string
  duration: number
  source?: string
  documentType?: string
  pageCount?: number
  spaceId?: string
  spaceName?: string
  spaceType?: string
  sourceType?: string
  markCount: number
  accuracy: number
  classFlow: string
  oneSentenceSummary: string
  keyPoints: string[]
  keywords: string[]
  personalizedItems: { text: string }[]
  reviewTasks: { id: string; title: string; completed: boolean }[]
  transcriptBlocks: TranscriptBlock[]
  lectureTimeline: LectureTimelineItem[]
  structuredSummary: StructuredSummaryTopic[]
  timelineMarks: TimelineMark[]
  examFocusItems: ExamFocusItem[]
  questionTypes: { type: string; description: string }[]
  commonMistakes: { text: string }[]
  terms: { term: string; chinese: string; explanation: string; relatedConcepts: string; confusingWith?: string }[]
  mindMap: MindMapNode[]
  reviewPlan: {
    estimatedMinutes: number
    completionRate: string
    steps: { title: string; tasks: { id: string; title: string; completed: boolean }[] }[]
  }
}

export const useRecordStore = defineStore('record', () => {
  // --- 录音配置 ---
  const config = ref<RecordingConfig>({
    courseId: '',
    lectureTitle: '',
    lectureLanguage: 'English',
    summaryLanguage: '中文',
    keepTermsInEnglish: true,
    recordingMode: 'lecture',
    noteStyle: 'balanced',
  })

  // --- 录音状态 ---
  const isRecording = ref(false)
  const isPaused = ref(false)
  const duration = ref(0)
  const accuracy = ref(0)
  const courseName = ref('')
  const deviceDisconnected = ref(false)
  const currentSegmentIndex = ref(0)
  const processing = ref(false)
  const isSaved = ref(false)
  const summaryStatus = ref<'none' | 'not_generated' | 'generated'>('none')
  const backendConnected = ref(false)

  // --- Session 状态 ---
  const currentSessionId = ref<string | null>(null)
  const sessionStatus = ref<string>('idle')
  const sessionError = ref<string | null>(null)
  const summaryError = ref<string | null>(null)

  // --- ASR 状态 ---
  const asrConnected = ref(false)   // WS 已连接
  const asrReady = ref(false)       // 后端 ASR provider 已就绪（收到 ready 事件）
  const asrConnecting = ref(false)
  const asrError = ref<string | null>(null)
  const micPermissionError = ref(false)
  const mediaRecorderReady = ref(false)
  const audioChunkCount = ref(0)
  const currentPartialTranscript = ref('')

  // --- 上传状态 ---
  const uploadLoading = ref(false)
  const uploadError = ref<string | null>(null)

  // --- 转写段落（由 WebSocket ASR 实时填充） ---
  const transcriptSegments = ref<Array<{ id: string; time: number; text: string }>>([])

  // --- ASR 连接和麦克风 ---
  let asrConnection: import('@/services/asrSocket').AsrConnection | null = null
  let mediaStream: MediaStream | null = null
  let audioContext: AudioContext | null = null
  let scriptProcessor: ScriptProcessorNode | null = null
  const TARGET_SAMPLE_RATE = 16000

  // --- 时间轴标记 ---
  const marks = ref<TimelineMark[]>([])

  // --- 计算属性 ---
  const markCount = computed(() => marks.value.length)
  const formattedDuration = computed(() => {
    const mins = Math.floor(duration.value / 60)
    const secs = duration.value % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  // --- 方法 ---
  function startRecording() {
    isRecording.value = true
    isPaused.value = false
    duration.value = 0
  }

  function pauseRecording() {
    isPaused.value = !isPaused.value
  }

  function resumeRecording() {
    isPaused.value = false
  }

  function stopRecording() {
    isRecording.value = false
    isPaused.value = false
  }

  /**
   * 将浏览器麦克风音频实时转换为 PCM 16kHz mono
   * DashScope Fun-ASR 要求 PCM 16000Hz 16bit 单声道
   */
  function setupPcmCapture(stream: MediaStream) {
    audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
    const source = audioContext.createMediaStreamSource(stream)

    // ScriptProcessorNode 4096 样本缓冲区
    // 注意：ScriptProcessorNode 已废弃，但 AudioWorklet 在 uni-app H5 中可能有兼容问题
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1)

    let pcmChunkCount = 0
    scriptProcessor.onaudioprocess = (event) => {
      if (!asrReady.value || !asrConnection?.isConnected()) return
      if (isPaused.value) return

      const float32Data = event.inputBuffer.getChannelData(0)

      // Float32 → Int16 PCM
      const pcmBuffer = new Int16Array(float32Data.length)
      for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]))
        pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // 发送 PCM 二进制数据
      asrConnection.sendAudioChunk(pcmBuffer.buffer)
      pcmChunkCount++
      audioChunkCount.value = pcmChunkCount

      if (pcmChunkCount <= 3 || pcmChunkCount % 40 === 0) {
        console.log('[asr] pcm chunk #' + pcmChunkCount, pcmBuffer.buffer.byteLength, 'bytes')
      }
    }

    source.connect(scriptProcessor)
    scriptProcessor.connect(audioContext.destination)
    console.log('[asr] PCM capture setup complete, sample rate:', audioContext.sampleRate)
  }

  // ==================== Phase 11-B: App 真机录音 ====================

  /** App 真机开始录音（uni.getRecorderManager） */
  function startAppRecording() {
    if (!appRecorder) return
    console.log('[app-record] starting recorderManager')

    appRecorder.onStart(() => {
      console.log('[app-record] recorder started')
      mediaRecorderReady.value = true
    })

    appRecorder.onError((err) => {
      console.error('[app-record] recorder error', err)
      asrError.value = '录音启动失败，请检查麦克风权限'
      micPermissionError.value = true
    })

    appRecorder.onStop(async (res) => {
      const recordingSeconds = duration.value
      console.log('[app-record] recorder stopped, file:', res.tempFilePath)
      console.log('[app-record] recording seconds:', recordingSeconds)

      // 获取文件大小
      try {
        const fileInfo = await new Promise<any>((resolve) => {
          uni.getFileInfo({
            filePath: res.tempFilePath,
            success: resolve,
            fail: () => resolve({ size: 0 }),
          })
        })
        console.log('[app-record] upload file size:', fileInfo.size, 'bytes')
      } catch { /* ignore */ }

      // 录音时间过短提示
      if (recordingSeconds < 10) {
        uni.showToast({ title: '录音时间较短，可能无法生成总结', icon: 'none', duration: 2000 })
      }

      // 上传音频文件，复用已有后端闭环
      await uploadAppRecording(res.tempFilePath)
    })

    appRecorder.start({
      duration: 60 * 60 * 1000, // 最长 60 分钟
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
    })
  }

  /** App 录音结束后上传音频文件 */
  async function uploadAppRecording(tempFilePath: string) {
    processing.value = true
    summaryError.value = null

    try {
      const spaceName = courseName.value || config.value.lectureTitle || '课堂录音'
      const spaceId = config.value.courseId || ''

      console.log('[app-record] uploading audio file...')
      const result = await uploadLectureMedia(tempFilePath, {
        mediaType: 'audio',
        courseName: spaceName,
        language: 'en',
        spaceId: spaceId || undefined,
        spaceName: spaceName,
        spaceType: 'course',
      })
      console.log('[app-record] upload response:', JSON.stringify(result))

      // Phase 11-B Hotfix: 兼容多种返回格式提取 sessionId
      const uploadedSessionId = result?.sessionId || (result as any)?.data?.sessionId || ''
      if (!uploadedSessionId) {
        throw new Error('UPLOAD_SESSION_ID_MISSING')
      }
      console.log('[app-record] uploaded sessionId:', uploadedSessionId)

      // 关键：更新 currentSessionId 为上传返回的新 sessionId
      currentSessionId.value = uploadedSessionId
      sessionStatus.value = 'summarizing'

      // 轮询总结（无论 status 是 processing 还是其他，都 poll 确认最终状态）
      console.log('[app-record] polling uploaded sessionId:', uploadedSessionId)
      const summary = await pollSummary(uploadedSessionId, { intervalMs: 3000, maxAttempts: 40 })

      // 获取完整 session 数据
      const sessionDetail = await getSession(uploadedSessionId)
      summaryResult.value = mapSessionToSummary(sessionDetail, {
        courseName: spaceName,
        duration: duration.value,
      })
      sessionStatus.value = 'done'
      summaryStatus.value = 'generated'
      console.log('[app-record] summary generated successfully, sessionId:', uploadedSessionId)

      // Phase 11-B Hotfix: App 模式直接跳转 Summary，不依赖 ProcessingOverlay
      processing.value = false
      uni.navigateTo({
        url: `/pages/record/summary?sessionId=${uploadedSessionId}&from=record&sourceType=upload-audio`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[app-record] upload/process failed:', msg)
      summaryError.value = msg
      summaryResult.value = createEmptySummary()
      processing.value = false
      uni.showToast({ title: `总结失败: ${msg}`, icon: 'none', duration: 3000 })
    }
  }

  /** App 真机停止录音 */
  function stopAppRecording() {
    if (!appRecorder) return
    console.log('[app-record] stopping recorderManager')
    isRecording.value = false
    isPaused.value = false
    appRecorder.stop()
    // onStop 回调会自动触发 uploadAppRecording
  }

  // ==================== H5 实时 ASR ====================

  /** 启动 ASR 实时转写（H5 only: WebSocket + 麦克风 → PCM 16kHz） */
  async function startAsrStreaming(sessionId: string) {
    // Phase 11-B: App 环境不走 H5 实时 ASR
    if (isAppRuntime()) {
      console.log('[asr] App runtime detected, skipping H5 ASR streaming')
      return
    }
    console.log('[asr] start streaming, sessionId:', sessionId)
    asrConnecting.value = true
    asrError.value = null
    micPermissionError.value = false
    asrReady.value = false
    audioChunkCount.value = 0

    try {
      // 1. 请求麦克风权限
      console.log('[asr] requesting microphone...')
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('[asr] microphone granted')

      // 2. 连接 WebSocket
      asrConnection = connectSessionAudio(sessionId, {
        onOpen() {
          asrConnected.value = true
          asrConnecting.value = false
          console.log('[asr] ws connected, waiting for provider ready...')
        },
        onAsrReady() {
          // 后端 ASR provider 就绪，现在可以开始发送音频
          asrReady.value = true
          console.log('[asr] provider ready, starting PCM capture')
          // 在 ASR 就绪后才启动麦克风音频采集
          if (mediaStream) setupPcmCapture(mediaStream)
        },
        onTranscript(event) {
          if (event.isFinal) {
            transcriptSegments.value.push({
              id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              time: Math.round(event.timestampMs / 1000),
              text: event.text,
            })
            currentPartialTranscript.value = ''
            console.log('[asr] final segment added, total:', transcriptSegments.value.length)
          } else {
            currentPartialTranscript.value = event.text
          }
        },
        onError(event) {
          asrError.value = event.message
          asrConnecting.value = false
          console.warn('[asr] error:', event.error, event.message)
        },
        onClose() {
          asrConnected.value = false
          asrReady.value = false
          console.log('[asr] ws closed')
        },
        onDone() {
          asrConnected.value = false
          asrReady.value = false
          console.log('[asr] done')
        },
      })

      mediaRecorderReady.value = true
    } catch (err) {
      asrConnecting.value = false
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[asr] start error:', msg)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('permission')) {
        micPermissionError.value = true
        asrError.value = '麦克风权限被拒绝'
      } else if (msg.includes('getUserMedia') || msg.includes('not supported')) {
        asrError.value = '当前环境不支持实时录音，请在支持麦克风的浏览器或真机测试'
      } else {
        asrError.value = msg
      }
    }
  }

  /** 停止 ASR 实时转写 */
  function stopAsrStreaming() {
    console.log('[asr] stopping...')
    // 停止 PCM 采集
    if (scriptProcessor) {
      scriptProcessor.disconnect()
      scriptProcessor = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    // 停止麦克风
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      mediaStream = null
    }
    // 停止 WS
    if (asrConnection) {
      asrConnection.stop()
      asrConnection = null
    }
    asrConnected.value = false
    asrReady.value = false
    asrConnecting.value = false
    mediaRecorderReady.value = false
    currentPartialTranscript.value = ''
  }

  /** 创建后端课堂会话 */
  async function createRecordingSession(options?: {
    courseName?: string
    subject?: string
    spaceId?: string
    spaceName?: string
    spaceType?: string
    source?: string
  }): Promise<string> {
    const spaceName = options?.spaceName || options?.courseName || config.value.lectureTitle || '课堂录音'
    const spaceId = options?.spaceId || options?.subject || config.value.courseId || ''

    // Phase 11-B: App 模式不预创建 session（避免 TRANSCRIPT_EMPTY）
    // 录音结束后通过 upload-media 接口由后端创建 session
    if (isAppRuntime()) {
      courseName.value = spaceName
      config.value.courseId = spaceId
      isRecording.value = true
      isPaused.value = false
      duration.value = 0
      sessionStatus.value = 'recording'
      transcriptSegments.value = []
      marks.value = []
      summaryResult.value = createEmptySummary()
      summaryError.value = null
      currentSessionId.value = null // App 模式不预设 sessionId
      console.log('[record] App mode: skipping session creation, will upload file later')
      return 'app-recording-pending'
    }

    try {
      sessionError.value = null
      const result = await createSession({
        title: `${spaceName} 课堂录音`,
        spaceId,
        spaceName,
        spaceType: options?.spaceType || 'general',
        subject: spaceId,
        courseName: spaceName,
        source: options?.source || 'realtime-recording',
      })
      currentSessionId.value = result.sessionId
      sessionStatus.value = 'recording'
      backendConnected.value = true
      // 清空旧数据
      transcriptSegments.value = []
      marks.value = []
      summaryResult.value = createEmptySummary()
      summaryError.value = null
      return result.sessionId
    } catch (err) {
      backendConnected.value = false
      const msg = err instanceof Error ? err.message : String(err)
      sessionError.value = msg
      throw new Error('SESSION_CREATE_FAILED')
    }
  }

  /** 远程标记（乐观更新 + 同步后端） — Phase 10-D: 传 space/source 上下文 */
  async function addRemoteMarker(type: MarkType, label?: string, opts?: { contextText?: string; spaceId?: string; spaceName?: string }) {
    const markerLabel = label || type
    const localMark: TimelineMark = {
      id: `mk${Date.now()}`,
      time: duration.value,
      type,
      label: markerLabel,
      aiExplanation: '',
      hasPlayback: false,
      syncStatus: currentSessionId.value ? 'syncing' : 'local-only',
    }
    marks.value.push(localMark)

    if (currentSessionId.value) {
      try {
        const backendLabel = type === 'confusing' ? 'didnt_understand' : type === 'important' ? 'important' : type === 'exam' ? 'exam' : type === 'review' ? 'review' : 'question'
        await apiAddMarker(currentSessionId.value, {
          timestampMs: duration.value * 1000,
          label: backendLabel,
          note: markerLabel,
          type: backendLabel,
          content: opts?.contextText || markerLabel,
          contextText: opts?.contextText || '',
          sourceId: currentSessionId.value,
          sourceType: 'recording',
          spaceId: opts?.spaceId || '',
          spaceName: opts?.spaceName || '',
        })
        const idx = marks.value.findIndex((m) => m.id === localMark.id)
        if (idx >= 0) marks.value[idx].syncStatus = 'synced'
      } catch (err) {
        const idx = marks.value.findIndex((m) => m.id === localMark.id)
        if (idx >= 0) marks.value[idx].syncStatus = 'failed'
        console.warn('[record] addRemoteMarker failed', err)
      }
    }
  }

  /** 结束录音并生成 AI 总结 */
  // Phase 11-B Hotfix: 标记 App 上传中，阻止 ProcessingOverlay 触发错误导航
  const isAppUploading = ref(false)

  async function endRecording() {
    console.log('[record] endRecording called, isApp:', isAppRuntime())

    // Phase 11-B: App 真机走文件录音 → 上传路径
    if (isAppRuntime()) {
      isAppUploading.value = true
      stopAppRecording()
      // stopAppRecording 的 onStop 回调会自动触发 uploadAppRecording
      return
    }

    isRecording.value = false
    isPaused.value = false
    processing.value = true
    summaryError.value = null

    // 1. 停止 ASR 流（H5 only）
    stopAsrStreaming()

    // 2. 等待后端 final transcript 写库（竞态修复）
    // ASR 的 final transcript 可能还在后端写库途中
    if (transcriptSegments.value.length > 0) {
      console.log('[record] waiting 1500ms for backend flush...')
      await new Promise(r => setTimeout(r, 1500))
    }

    if (!currentSessionId.value) {
      processing.value = false
      summaryError.value = 'SESSION_MISSING'
      return
    }

    // 3. transcript 为空时仍允许继续（后端会返回 TRANSCRIPT_EMPTY）
    if (transcriptSegments.value.length === 0) {
      console.warn('[record] transcript is empty, proceeding anyway')
    }

    try {


      // 4. 结束课堂
      console.log('[record] ending session:', currentSessionId.value)
      await endSession(currentSessionId.value)
      sessionStatus.value = 'summarizing'

      // 5. 轮询总结
      console.log('[record] polling summary...')
      const summary = await pollSummary(currentSessionId.value, { intervalMs: 2000, maxAttempts: 20 })

      // 6. 获取完整 session 数据

      const sessionDetail = await getSession(currentSessionId.value)

      // 7. 映射为前端结构
      summaryResult.value = mapSessionToSummary(sessionDetail, {
        courseName: courseName.value || config.value.lectureTitle || '课堂录音',
        duration: duration.value,
      })
      sessionStatus.value = 'done'
      summaryStatus.value = 'generated'
      console.log('[record] summary generated successfully')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[record] endRecording failed:', msg)
      // 区分错误类型
      if (msg.includes('CORS') || msg.includes('net::ERR') || msg.includes('Network')) {
        summaryError.value = 'BACKEND_CORS'
      } else if (msg === 'TRANSCRIPT_EMPTY') {
        summaryError.value = 'TRANSCRIPT_EMPTY'
      } else if (msg === 'TRANSCRIPT_TOO_SHORT') {
        summaryError.value = 'TRANSCRIPT_TOO_SHORT'
      } else if (msg === 'DEEPSEEK_NOT_CONFIGURED') {
        summaryError.value = 'DEEPSEEK_NOT_CONFIGURED'
      } else if (msg === 'DEEPSEEK_PROCESS_FAILED' || msg.includes('AI 总结失败')) {
        summaryError.value = 'DEEPSEEK_PROCESS_FAILED'
      } else if (msg === 'AI_SERVICE_UNAVAILABLE') {
        summaryError.value = 'AI_SERVICE_UNAVAILABLE'
      } else if (msg === 'SUMMARY_TIMEOUT') {
        summaryError.value = 'SUMMARY_TIMEOUT'
      } else {
        summaryError.value = msg
      }
      summaryResult.value = createEmptySummary()
    } finally {
      processing.value = false
    }
  }

  /** 上传课堂音视频并生成 AI 总结 */
  async function uploadLectureAndGenerateSummary(filePath: string, mediaType: 'audio' | 'video', spaceOpts?: { spaceId?: string; spaceName?: string; spaceType?: string }) {
    console.log('[record] upload lecture media:', mediaType, filePath, spaceOpts ? `space=${spaceOpts.spaceId}` : '')
    uploadLoading.value = true
    uploadError.value = null
    processing.value = true

    try {
      // 1. 上传文件（带 space 归属）
      const result = await uploadLectureMedia(filePath, {
        mediaType,
        courseName: spaceOpts?.spaceName || '上传课堂',
        language: 'en',
        spaceId: spaceOpts?.spaceId,
        spaceName: spaceOpts?.spaceName,
        spaceType: spaceOpts?.spaceType,
      })
      console.log('[record] upload result:', result)
      currentSessionId.value = result.sessionId

      // 2. 轮询总结（后端异步处理）
      if (result.status === 'processing') {
        console.log('[record] polling summary for uploaded media...')
        const summary = await pollSummary(result.sessionId, { intervalMs: 3000, maxAttempts: 40 })
      }

      // 3. 获取完整 session 数据
      const sessionDetail = await getSession(result.sessionId)

      // 4. 映射为前端结构
      summaryResult.value = mapSessionToSummary(sessionDetail, {
        courseName: sessionDetail.title || '上传课堂',
      })
      sessionStatus.value = 'done'
      summaryStatus.value = 'generated'
      console.log('[record] upload summary generated successfully')

      // 5. 跳转 summary 页
      uni.navigateTo({
        url: `/pages/record/summary?sessionId=${result.sessionId}&from=upload`,
      })

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[record] upload failed:', msg)
      uploadError.value = msg

      // 映射错误码到中文
      const errorMap: Record<string, string> = {
        FILE_REQUIRED: '请选择要上传的文件',
        FILE_TOO_LARGE: '文件过大，请选择 100MB 以内的音视频',
        UNSUPPORTED_MEDIA_TYPE: '暂不支持该文件格式',
        FFMPEG_NOT_AVAILABLE: '视频解析需要后端安装 ffmpeg，请先上传音频文件测试',
        ASR_PROCESS_FAILED: '语音识别失败，请换一个清晰的音频文件',
        TRANSCRIPT_EMPTY: '未识别到有效课堂内容',
        TRANSCRIPT_TOO_SHORT: '转写内容太短，无法生成 AI 总结',
        DEEPSEEK_NOT_CONFIGURED: 'DeepSeek 未配置，请检查后端环境变量',
        DEEPSEEK_PROCESS_FAILED: 'AI 总结生成失败，请稍后重试',
        UPLOAD_MEDIA_FAILED: '上传解析失败，请稍后重试',
      }
      const toastMsg = errorMap[msg] || `上传失败: ${msg}`
      uni.showToast({ title: toastMsg, icon: 'none', duration: 3000 })
    } finally {
      uploadLoading.value = false
      processing.value = false
    }
  }

  /** 获取历史 session summary */
  async function fetchSessionSummary(sessionId: string) {
    processing.value = true
    summaryError.value = null
    try {

      const sessionDetail = await getSession(sessionId)
      currentSessionId.value = sessionId

      if (sessionDetail.status === 'failed') {
        summaryError.value = 'SUMMARY_FAILED'
        summaryResult.value = createEmptySummary()
        return
      }
      if (sessionDetail.status === 'summarizing') {
        summaryError.value = 'SUMMARY_PROCESSING'
        summaryResult.value = createEmptySummary()
        return
      }

      summaryResult.value = mapSessionToSummary(sessionDetail, {
        courseName: sessionDetail.title || sessionDetail.subject || '课堂录音',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      summaryError.value = msg
    } finally {
      processing.value = false
    }
  }

  /** 保存录音但不生成 AI 总结 — Phase 10-E: 调后端保存状态 */
  async function saveRecordingOnly() {
    isRecording.value = false
    isPaused.value = false

    // 停止 ASR 流
    stopAsrStreaming()

    if (currentSessionId.value) {
      try {
        const result = await saveSessionOnly(currentSessionId.value)
        sessionStatus.value = result.status || 'saved'
        console.log('[record] saveRecordingOnly success, status:', result.status)
      } catch (err) {
        console.warn('[record] saveRecordingOnly failed', err)
        // 不崩溃，本地状态仍标记为已保存
      }
    }

    isSaved.value = true
    summaryStatus.value = 'not_generated'
    processing.value = false
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function addMark(type: MarkType, label: string) {
    addRemoteMarker(type, label)
  }

  function updateConfig(partial: Partial<RecordingConfig>) {
    config.value = { ...config.value, ...partial }
  }

  function setRecordingConfig(cfg: RecordingConfig) {
    config.value = { ...cfg }
  }

  /** 重置录音状态（不连接后端，用于 UI 测试） */
  function resetRecordingState() {
    isRecording.value = true
    isPaused.value = false
    duration.value = 0
    marks.value = []
    transcriptSegments.value = []
  }

  /** 创建空的 summary 结构 */
  function createEmptySummary(): SummaryResult {
    return {
      courseName: '', date: '', duration: 0, source: '', documentType: '', pageCount: 0, spaceId: '', spaceName: '', spaceType: '', sourceType: '', markCount: 0, accuracy: 0,
      classFlow: '', oneSentenceSummary: '',
      keyPoints: [], keywords: [], personalizedItems: [], reviewTasks: [],
      transcriptBlocks: [], lectureTimeline: [], structuredSummary: [],
      timelineMarks: [], examFocusItems: [], questionTypes: [],
      commonMistakes: [], terms: [], mindMap: [],
      reviewPlan: { estimatedMinutes: 0, completionRate: '0%', steps: [] },
    }
  }

  const summaryResult = ref<SummaryResult>(createEmptySummary())

  const hasSummaryData = computed(() => summaryResult.value.courseName !== '')

  function toggleSummaryReviewTask(taskId: string) {
    const task = summaryResult.value.reviewTasks.find((t) => t.id === taskId)
    if (task) task.completed = !task.completed
  }

  function toggleReviewPlanTask(taskId: string) {
    for (const step of summaryResult.value.reviewPlan.steps) {
      const task = step.tasks.find((t) => t.id === taskId)
      if (task) { task.completed = !task.completed; return }
    }
  }

  function addNote() { /* placeholder */ }

  function resetSession() {
    isRecording.value = false
    isPaused.value = false
    duration.value = 0
    marks.value = []
    processing.value = false
    deviceDisconnected.value = false
  }

  return {
    // state
    config, isRecording, isPaused, duration, accuracy,
    courseName, deviceDisconnected, currentSegmentIndex, processing,
    isSaved, summaryStatus, backendConnected,
    transcriptSegments, marks, summaryResult,
    currentSessionId, sessionStatus, sessionError, summaryError,
    asrConnected, asrReady, asrConnecting, asrError, micPermissionError,
    mediaRecorderReady, audioChunkCount,
    currentPartialTranscript,
    uploadLoading, uploadError,
    // getters
    markCount, formattedDuration, hasSummaryData,
    // methods
    startRecording, pauseRecording, resumeRecording, stopRecording,
    endRecording, saveRecordingOnly, formatDuration, addMark, updateConfig,
    setRecordingConfig, resetRecordingState,
    toggleSummaryReviewTask, toggleReviewPlanTask,
    addNote, resetSession,
    createRecordingSession, addRemoteMarker, fetchSessionSummary,
    startAsrStreaming, stopAsrStreaming,
    startAppRecording, stopAppRecording,
    uploadLectureAndGenerateSummary,
    // Phase 11-B: platform
    isAppRuntime, isAppUploading,
  }
})
