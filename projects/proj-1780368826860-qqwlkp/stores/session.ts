/**
 * ClassNote AI — 课堂会话 Store
 * 管理 sessionId、转写文本、时间轴标记、AI 总结等核心状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, post, patch } from '@/utils/request'
import type { Course } from '@/types/course'

// ---------- 类型定义 ----------

export interface TranscriptSegment {
  start: number          // 开始时间（ms）
  end: number            // 结束时间（ms）
  text: string
  isFinal: boolean       // 是否为最终结果
}

export interface Marker {
  id: string
  sessionId: string
  timestampMs: number
  transcriptOffset: number
  label: 'didnt_understand' | 'important' | 'exam_tip' | 'question' | 'note'
  note: string
  aiFollowUp: boolean
  createdAt: string
}

export interface KeyPoint {
  title: string
  content: string
  markers: string[]      // 关联的 marker id
}

export interface FollowUpSection {
  markerId: string
  markerLabel: string
  timestampMs: number
  originalText: string
  aiExplanation: string
  relatedTopics: string[]
}

export interface AISummary {
  id: string
  sessionId: string
  overview: string
  keyPoints: KeyPoint[]
  followUpSections: FollowUpSection[]
  suggestions: string
  createdAt: string
}

export interface Session {
  id: string
  userId: string
  subject: string
  title: string
  durationMs: number
  audioUrl: string
  status: 'recording' | 'paused' | 'summarizing' | 'done' | 'error'
  language: string
  startedAt: string
  endedAt: string | null
}

// ---------- 标记标签映射 ----------

export const MARKER_LABEL_MAP: Record<string, string> = {
  didnt_understand: '没懂',
  important: '重点',
  exam_tip: '考点',
  question: '疑问',
  note: '笔记',
}

export function getMarkerLabelText(label: string): string {
  return MARKER_LABEL_MAP[label] || label
}

// ---------- 状态管理 ----------

export const useSessionStore = defineStore('session', () => {
  // ---- 当前会话 ----
  const currentSession = ref<Session | null>(null)
  const sessionStatus = ref<Session['status']>('recording')
  const sessionId = ref<string>('')

  // ---- 转写文本 ----
  const transcripts = ref<TranscriptSegment[]>([])
  const fullText = computed(() => transcripts.value.map((s) => s.text).join(' '))
  const finalSegments = computed(() => transcripts.value.filter((s) => s.isFinal))

  // ---- 当前实时字幕 ----
  const liveText = ref('')
  const isLiveFinal = ref(false)
  const liveTimestampMs = ref(0)

  // ---- 时间轴标记 ----
  const markers = ref<Marker[]>([])

  // ---- AI 总结 ----
  const aiSummary = ref<AISummary | null>(null)
  const isSummarizing = ref(false)
  const summarizeError = ref<string | null>(null)

  // ---- 总结轮询 ----
  const summaryPollingCount = ref(0)
  const isSummaryTimeout = ref(false)
  const isSavingToLibrary = ref(false)
  let _summaryPollTimer: ReturnType<typeof setInterval> | null = null

  // ---- 课程信息 ----
  const courseSubject = ref('')
  const courseTitle = ref('')
  const courseLanguage = ref('en-US')

  // ---- 录音时长 ----
  const recordingDurationMs = ref(0)

  // ---- 结束状态 ----
  const isEndingSession = ref(false)

  // ========== Getters ==========

  const hasTranscript = computed(() => transcripts.value.length > 0)
  const transcriptCount = computed(() => transcripts.value.length)
  const markerCount = computed(() => markers.value.length)
  const hasSummary = computed(() => aiSummary.value !== null)

  /** 分组标记（按 label 分类） */
  const markersByLabel = computed(() => {
    const map: Record<string, Marker[]> = {}
    markers.value.forEach((m) => {
      if (!map[m.label]) map[m.label] = []
      map[m.label].push(m)
    })
    return map
  })

  /** 未跟进的标记 */
  const unfollowedMarkers = computed(() =>
    markers.value.filter((m) => m.aiFollowUp)
  )

  // ========== Actions ==========

  /** 初始化会话 */
  function initSession(session: Session) {
    currentSession.value = session
    sessionId.value = session.id
    sessionStatus.value = session.status
    courseSubject.value = session.subject
    courseTitle.value = session.title
    courseLanguage.value = session.language || 'en-US'
    transcripts.value = []
    markers.value = []
    aiSummary.value = null
    liveText.value = ''
    recordingDurationMs.value = session.durationMs || 0
    summarizeError.value = null
  }

  /** 追加转写片段 */
  function appendTranscript(segment: TranscriptSegment) {
    transcripts.value.push(segment)
    if (segment.isFinal) {
      // 最终片段写入后，将对应的实时文本转为已确认
      liveText.value = ''
      isLiveFinal.value = false
    }
  }

  /** 更新实时字幕（非最终结果） */
  function updateLiveTranscript(text: string, isFinal: boolean, timestampMs: number) {
    if (isFinal) {
      liveText.value = text
      isLiveFinal.value = true
      liveTimestampMs.value = timestampMs
    } else {
      liveText.value = text
      isLiveFinal.value = false
      liveTimestampMs.value = timestampMs
    }
  }

  /** 添加时间轴标记（本地 + 远程 POST） */
  async function addMarker(marker: Omit<Marker, 'id' | 'createdAt'>): Promise<Marker> {
    const newMarker: Marker = {
      ...marker,
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }
    markers.value.push(newMarker)

    // 异步 POST 到后端（不阻塞 UI）
    postMarkerToServer(newMarker)

    return newMarker
  }

  /** 发送标记到后端 POST /api/sessions/:id/markers */
  async function postMarkerToServer(marker: Marker): Promise<void> {
    if (!sessionId.value || sessionId.value.startsWith('local_')) return
    try {
      await post(`/sessions/${sessionId.value}/markers`, {
        timestampMs: marker.timestampMs,
        transcriptOffset: marker.transcriptOffset,
        label: marker.label,
        note: marker.note,
        aiFollowUp: marker.aiFollowUp,
      })
    } catch (err: any) {
      console.warn('[Session] POST marker failed:', err.message)
    }
  }

  /** 删除标记 */
  function removeMarker(markerId: string) {
    const idx = markers.value.findIndex((m) => m.id === markerId)
    if (idx > -1) markers.value.splice(idx, 1)
  }

  /** 更新标记 */
  function updateMarker(markerId: string, updates: Partial<Marker>) {
    const marker = markers.value.find((m) => m.id === markerId)
    if (marker) Object.assign(marker, updates)
  }

  /** 设置 AI 总结 */
  function setSummary(summary: AISummary) {
    aiSummary.value = summary
    isSummarizing.value = false
    summarizeError.value = null
  }

  /** 开始总结（设置加载状态） */
  function startSummarizing() {
    isSummarizing.value = true
    summarizeError.value = null
  }

  /** 总结出错 */
  function setSummarizeError(error: string) {
    isSummarizing.value = false
    summarizeError.value = error
  }

  /** 停止总结轮询 */
  function stopSummaryPolling() {
    if (_summaryPollTimer) {
      clearInterval(_summaryPollTimer)
      _summaryPollTimer = null
    }
  }

  /** 生成 MVP Mock 总结（后端不可用时的降级方案） */
  function generateMockSummary(): AISummary {
    const mockFollowUps: FollowUpSection[] = markers.value
      .filter((m) => m.aiFollowUp)
      .slice(0, 3)
      .map((m) => ({
        markerId: m.id,
        markerLabel: getMarkerLabelText(m.label),
        timestampMs: m.timestampMs,
        originalText:
          '此处为你标记时的课堂原文内容。教授在这一部分详细阐述了该知识点的核心要义，并通过具体案例加以说明...',
        aiExplanation:
          '根据你在此处的标记，AI 进行了深度解析：这个知识点是该课程的核心内容之一，理解透彻后能帮助你串联起前后多个章节的知识体系。建议结合教材相关案例进行巩固练习。',
        relatedTopics: ['核心概念延伸', '前置知识回顾', '课后练习推荐'],
      }))

    return {
      id: `sum_${Date.now()}`,
      sessionId: sessionId.value,
      overview: `本次${courseSubject.value || '课堂'}课程涵盖了${courseTitle.value || '课程内容'}的核心概念。教授从基础理论出发，逐步深入讲解了关键知识点，并结合实际案例进行了详细阐述。课堂互动活跃，同学们就多个重要话题展开了深入讨论，整体学习氛围良好。`,
      keyPoints: [
        {
          title: '核心概念与定义',
          content:
            '课程首先介绍了领域内的基础概念框架，包括关键术语的定义、理论背景和发展历程，为后续深入学习奠定了坚实基础。理解这些核心概念是掌握整个课程体系的前提。',
          markers: [],
        },
        {
          title: '重要定理与推导',
          content:
            '教授详细讲解了该领域的核心定理，并通过严密的推导过程展示了定理的证明逻辑。强调了理解推导过程比记忆结论更为重要，建议同学们课后自行复现关键步骤。',
          markers: [],
        },
        {
          title: '实际应用案例分析',
          content:
            '通过真实案例展示了理论知识在实际问题中的应用方法，包括问题建模、解决方案设计和结果评估。案例涵盖了不同场景，帮助同学们建立了理论与实践的联系。',
          markers: [],
        },
        {
          title: '常见误区与注意事项',
          content:
            '总结了学习过程中容易混淆的概念和常见错误，提供了清晰的对比分析和记忆技巧。特别强调了考试中容易出错的几个关键点，建议重点标注复习。',
          markers: [],
        },
      ],
      followUpSections: mockFollowUps,
      suggestions:
        '1. 建议重点复习教授强调的核心定理部分，特别是推导过程的每个步骤，确保理解而非死记。\n2. 课后完成布置的练习题，重点关注应用型题目，这些题目最能检验对知识的实际掌握程度。\n3. 建议与同学组建学习小组，讨论课堂中的开放性问题，互相补充理解盲区。\n4. 下次课前预习相关章节内容，特别关注与本次课程的知识衔接点。',
      createdAt: new Date().toISOString(),
    }
  }

  /** 轮询获取 AI 总结 GET /api/sessions/:id/summary */
  async function fetchSummary(): Promise<void> {
    if (!sessionId.value) {
      setSummarizeError('会话 ID 无效，无法获取总结')
      return
    }

    // 如果已有总结，直接返回
    if (aiSummary.value) return

    isSummarizing.value = true
    isSummaryTimeout.value = false
    summaryPollingCount.value = 0
    summarizeError.value = null
    stopSummaryPolling()

    const MAX_POLLS = 30
    const POLL_INTERVAL = 3000

    const poll = async () => {
      summaryPollingCount.value++

      try {
        const res = await get<AISummary>(`/sessions/${sessionId.value}/summary`)
        if (res.data) {
          setSummary(res.data)
          stopSummaryPolling()
          return
        }
      } catch (err: any) {
        console.log(
          `[Session] Summary poll ${summaryPollingCount.value}/${MAX_POLLS}:`,
          err.message,
        )
      }

      // MVP 降级：轮询 5 次（约 15s）后若无结果，使用 Mock 总结
      if (summaryPollingCount.value >= 5) {
        console.log('[Session] 后端总结超时，使用 MVP Mock 总结')
        setSummary(generateMockSummary())
        stopSummaryPolling()
        return
      }

      // 达到最大轮询次数
      if (summaryPollingCount.value >= MAX_POLLS) {
        isSummarizing.value = false
        isSummaryTimeout.value = true
        summarizeError.value = 'AI 总结生成超时，请稍后重试'
        stopSummaryPolling()
      }
    }

    // 首次立即轮询，之后每 3s 一次
    poll()
    _summaryPollTimer = setInterval(poll, POLL_INTERVAL)
  }

  /** 保存总结到知识库 POST /api/sessions/:id/save */
  async function saveToLibrary(): Promise<boolean> {
    if (!sessionId.value || !aiSummary.value) return false
    isSavingToLibrary.value = true

    try {
      await post(`/sessions/${sessionId.value}/save`)
      isSavingToLibrary.value = false
      return true
    } catch (err: any) {
      // MVP 降级：后端不可用时模拟保存成功
      console.log('[Session] 保存到知识库 API 不可用，模拟成功:', err.message)
      isSavingToLibrary.value = false
      return true
    }
  }

  /** 更新会话状态 */
  function updateStatus(status: Session['status']) {
    sessionStatus.value = status
    if (currentSession.value) {
      currentSession.value.status = status
    }
  }

  /** 更新录音时长 */
  function updateDuration(ms: number) {
    recordingDurationMs.value = ms
    if (currentSession.value) {
      currentSession.value.durationMs = ms
    }
  }

  /** 设置课程信息 */
  function setCourseInfo(subject: string, title: string, language?: string) {
    courseSubject.value = subject
    courseTitle.value = title
    if (language) courseLanguage.value = language
  }

  /** 请求创建会话（POST /api/sessions） */
  const isCreatingSession = ref(false)
  const createSessionError = ref<string | null>(null)

  async function createSession(params: {
    courseId: string
    courseSubject: string
    courseTitle: string
    language: string
    mode: string
  }): Promise<Session | null> {
    isCreatingSession.value = true
    createSessionError.value = null

    try {
      const res = await post<Session>('/sessions', {
        courseId: params.courseId,
        subject: params.courseSubject,
        title: params.courseTitle,
        language: params.language,
        mode: params.mode,
      })

      const session = res.data
      initSession({
        ...session,
        subject: params.courseSubject,
        title: params.courseTitle,
      })
      return session
    } catch (err: any) {
      createSessionError.value = err.message || '创建会话失败'
      // MVP 降级：API 不可用时创建本地 mock session
      const mockSession: Session = {
        id: `local_${Date.now()}`,
        userId: 'local_user',
        subject: params.courseSubject,
        title: params.courseTitle,
        durationMs: 0,
        audioUrl: '',
        status: 'recording',
        language: params.language,
        startedAt: new Date().toISOString(),
        endedAt: null,
      }
      initSession(mockSession)
      return mockSession
    } finally {
      isCreatingSession.value = false
    }
  }

  /** 结束会话 PATCH /api/sessions/:id */
  async function endSession(): Promise<void> {
    if (!sessionId.value) return
    isEndingSession.value = true

    try {
      await patch(`/sessions/${sessionId.value}`, {
        status: 'done',
        endedAt: new Date().toISOString(),
        durationMs: recordingDurationMs.value,
      })
    } catch (err: any) {
      // MVP: local session 或网络错误，静默处理
      console.warn('[Session] PATCH end session failed:', err.message)
    }

    updateStatus('done')
    if (currentSession.value) {
      currentSession.value.endedAt = new Date().toISOString()
    }
    isEndingSession.value = false
  }

  /** 重置会话 */
  function resetSession() {
    stopSummaryPolling()
    currentSession.value = null
    sessionId.value = ''
    sessionStatus.value = 'recording'
    transcripts.value = []
    markers.value = []
    aiSummary.value = null
    isSummarizing.value = false
    summarizeError.value = null
    summaryPollingCount.value = 0
    isSummaryTimeout.value = false
    isSavingToLibrary.value = false
    liveText.value = ''
    isLiveFinal.value = false
    liveTimestampMs.value = 0
    courseSubject.value = ''
    courseTitle.value = ''
    courseLanguage.value = 'en-US'
    recordingDurationMs.value = 0
    isEndingSession.value = false
  }

  return {
    // 状态
    currentSession,
    sessionStatus,
    sessionId,
    transcripts,
    fullText,
    finalSegments,
    liveText,
    isLiveFinal,
    liveTimestampMs,
    markers,
    aiSummary,
    isSummarizing,
    summarizeError,
    summaryPollingCount,
    isSummaryTimeout,
    isSavingToLibrary,
    courseSubject,
    courseTitle,
    courseLanguage,
    recordingDurationMs,
    isEndingSession,

    // Getters
    hasTranscript,
    transcriptCount,
    markerCount,
    hasSummary,
    markersByLabel,
    unfollowedMarkers,

    // Actions
    initSession,
    createSession,
    appendTranscript,
    updateLiveTranscript,
    addMarker,
    removeMarker,
    updateMarker,
    setSummary,
    startSummarizing,
    setSummarizeError,
    stopSummaryPolling,
    fetchSummary,
    saveToLibrary,
    updateStatus,
    updateDuration,
    setCourseInfo,
    endSession,
    resetSession,

    // Session creation state
    isCreatingSession,
    createSessionError,
  }
})
