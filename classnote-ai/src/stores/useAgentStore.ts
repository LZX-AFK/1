import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSessions, type SessionListItem } from '@/services/sessionApi'
import { request } from '@/services/api'
import { parseAgentIntent } from '@/utils/agentIntent'
import { useRecordStore } from '@/stores/useRecordStore'
import type { AgentSpaceOption } from '@/utils/spaceOptions'
import { buildSpaceOptionsFromSessions } from '@/utils/spaceOptions'
import { makeSpaceId, inferSpaceType, buildSpaceParams } from '@/utils/spaceKey'

// ==================== 类型定义 ====================

export interface AgentAction {
  label: string
  type: 'navigate' | 'switchTab' | 'info' | 'command'
  url?: string
  command?: string
}

export interface AgentCard {
  id?: string
  title: string
  subtitle?: string
  meta?: string
  status?: string
  action?: AgentAction
}

export interface AgentCourseOption {
  courseName: string
  subject: string
  description?: string
  icon?: string
  type?: 'preset' | 'new' | 'existing'
}

export interface AgentMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  createdAt: number
  action?: AgentAction
  actions?: AgentAction[]
  cards?: AgentCard[]
  courseOptions?: AgentCourseOption[]
  spaceOptions?: AgentSpaceOption[]
  inputRequest?: { type: string; placeholder: string }
}

// ==================== 工具函数 ====================

function makeSubjectFromCourseName(name: string): string {
  const cleaned = name.trim()
  if (/^[a-zA-Z0-9\s-]+$/.test(cleaned)) return cleaned.toLowerCase().replace(/\s+/g, '-')
  return cleaned
}

/** 标准化 session status */
function normalizeStatus(raw: string): 'recording' | 'processing' | 'done' | 'failed' | 'saved' {
  switch (raw) {
    case 'recording': case 'active': return 'recording'
    case 'saved': return 'saved'
    case 'summarizing': case 'processing': case 'pending': return 'processing'
    case 'done': case 'completed': case 'success': return 'done'
    case 'failed': case 'error': default: return 'failed'
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffH = diffMs / 3600000
    if (diffH < 1) return '刚刚'
    if (diffH < 24) return `${Math.floor(diffH)}小时前`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return ''
  }
}

// ==================== Store ====================

export const useAgentStore = defineStore('agent', () => {
  // --- 状态 ---
  const isAgentAvailable = ref(true)
  const isPanelOpen = ref(false)
  const isThinking = ref(false)
  const floatingPosition = ref({ x: 0, y: 0, set: false })
  const messages = ref<AgentMessage[]>([])
  const pendingInput = ref<{ type: string } | null>(null)

  // --- 调度标记 ---
  /** index 页已预处理消息时设为 true，chat 页 onMounted 跳过重复处理 */
  const lastActionDispatched = ref(false)

  // Phase 11-A: 防止 Agent 重复触发
  type AgentFlowState = 'idle' | 'waiting_space_selection' | 'waiting_space_name_for_recording' | 'creating_recording'
  const agentFlowState = ref<AgentFlowState>('idle')

  // --- 缓存 ---
  let sessionsCache: SessionListItem[] | null = null
  let sessionsCacheAt = 0
  const CACHE_TTL = 30_000 // 30s

  // --- 基础方法 ---
  function openPanel() { isPanelOpen.value = true }
  function closePanel() { isPanelOpen.value = false }
  function setFloatingPosition(x: number, y: number) { floatingPosition.value = { x, y, set: true } }
  function resetMessages() { messages.value = []; sessionsCache = null }

  function addAgentMessage(
    content: string,
    extras?: {
      action?: AgentAction
      actions?: AgentAction[]
      cards?: AgentCard[]
      courseOptions?: AgentCourseOption[]
      spaceOptions?: AgentSpaceOption[]
      inputRequest?: AgentMessage['inputRequest']
    },
  ) {
    messages.value.push({
      id: `ag${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'agent',
      content,
      createdAt: Date.now(),
      action: extras?.action,
      actions: extras?.actions,
      cards: extras?.cards,
      courseOptions: extras?.courseOptions,
      spaceOptions: extras?.spaceOptions,
      inputRequest: extras?.inputRequest,
    })
  }

  // ==================== 后端数据获取 ====================

  /** 获取 sessions（带缓存） */
  async function fetchSessions(): Promise<SessionListItem[]> {
    const now = Date.now()
    if (sessionsCache && now - sessionsCacheAt < CACHE_TTL) return sessionsCache
    try {
      const list = await getSessions()
      sessionsCache = list
      sessionsCacheAt = now
      return list
    } catch (err) {
      console.warn('[agent] fetchSessions failed', err)
      throw err
    }
  }

  // ==================== 意图处理器 ====================

  /** 1. 询问学习空间 → 展示 Space 选项 */
  async function askCourseForRecording() {
    // Phase 11-A: 防止重复触发
    if (agentFlowState.value !== 'idle') {
      addAgentMessage('请先完成当前学习空间选择。')
      return
    }
    agentFlowState.value = 'waiting_space_selection'
    addAgentMessage('你想把这次录音放到哪个学习空间？')
    isThinking.value = true
    try {
      const sessions = await fetchSessions()
      const options = buildSpaceOptionsFromSessions(sessions)
      isThinking.value = false
      addAgentMessage('', { spaceOptions: options })
    } catch {
      isThinking.value = false
      addAgentMessage('', {
        spaceOptions: [
          { spaceId: '__new__', spaceName: '新建学习空间', spaceType: 'general', description: '输入一个新名称', icon: '＋', type: 'new' },
        ],
      })
    }
  }

  /** 用户选择 Space 后创建 session 并跳转实时转写 */
  async function startRecordingWithCourse(course: AgentCourseOption) {
    // 兼容旧 AgentCourseOption 调用
    const spaceId = course.subject === '__new__' ? makeSpaceId(course.courseName) : course.subject
    const spaceName = course.courseName
    const spaceType = course.subject === '__new__' ? inferSpaceType(course.courseName) : 'course'
    await startRecordingWithSpace({ spaceId, spaceName, spaceType, type: course.type === 'new' ? 'new' : 'existing' })
  }

  /** 用户选择 Space 后创建 session 并跳转实时转写 */
  let isCreatingRecording = false
  async function startRecordingWithSpace(space: AgentSpaceOption) {
    // Phase 11-A: 防止重复创建
    if (isCreatingRecording) return
    isCreatingRecording = true
    agentFlowState.value = 'creating_recording'
    addAgentMessage(`正在为你创建「${space.spaceName}」课堂录音…`)
    isThinking.value = true
    try {
      const recordStore = useRecordStore()
      const params = buildSpaceParams(space.spaceId, space.spaceName, space.spaceType as any)
      const sessionId = await recordStore.createRecordingSession({
        spaceId: params.spaceId,
        spaceName: params.spaceName,
        spaceType: params.spaceType,
        courseName: params.courseName,
        subject: params.subject,
        source: 'realtime-recording',
      })
      isThinking.value = false
      addAgentMessage(`已为你创建「${space.spaceName}」课堂录音，正在进入实时转写。`)
      setTimeout(() => {
        agentFlowState.value = 'idle'
        isCreatingRecording = false
        uni.navigateTo({ url: `/pages/record/live?sessionId=${sessionId}` })
      }, 500)
    } catch (err) {
      isThinking.value = false
      isCreatingRecording = false
      agentFlowState.value = 'idle'
      addAgentMessage('创建课堂失败，请检查后端服务后重试。')
      console.warn('[agent] startRecordingWithSpace failed', err)
    }
  }

  /** 提示用户输入新学习空间名 */
  function askNewCourseNameForRecording() {
    agentFlowState.value = 'waiting_space_name_for_recording'
    pendingInput.value = { type: 'new_space_for_recording' }
    addAgentMessage('请输入学习空间名称，例如：Computer Networks / Biology Final Review / AI Agent Project', {
      inputRequest: { type: 'space_name', placeholder: '请输入学习空间名称' },
    })
  }

  /** 处理待定输入 */
  async function handlePendingInput(text: string): Promise<boolean> {
    if (!pendingInput.value) return false
    if (pendingInput.value.type === 'new_space_for_recording' || pendingInput.value.type === 'new_course_name_for_recording') {
      pendingInput.value = null
      const spaceName = text.trim()
      if (!spaceName) {
        addAgentMessage('学习空间名称不能为空，请重新输入。')
        return true
      }
      const spaceId = makeSpaceId(spaceName)
      const spaceType = inferSpaceType(spaceName)
      await startRecordingWithSpace({ spaceId, spaceName, spaceType, type: 'new' })
      return true
    }
    pendingInput.value = null
    return false
  }

  /** 2. 打开上传资料 */
  function handleOpenUpload() {
    addAgentMessage('我为你打开上传资料页。', {
      action: { label: '打开上传资料 ›', type: 'navigate', url: '/pages/materials/upload' },
    })
    setTimeout(() => uni.navigateTo({ url: '/pages/materials/upload' }), 600)
  }

  /** 3. 打开知识库 */
  function handleOpenKnowledge() {
    addAgentMessage('我为你打开知识库。')
    setTimeout(() => uni.switchTab({ url: '/pages/knowledge/index' }), 400)
  }

  /** 4. 打开最近总结 */
  async function handleOpenLatestSummary() {
    isThinking.value = true
    try {
      const sessions = await fetchSessions()
      const doneSession = sessions
        .filter(s => normalizeStatus(s.status) === 'done')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]

      isThinking.value = false
      if (doneSession) {
        const name = doneSession.title || doneSession.subject || '最近课堂'
        addAgentMessage(`找到最近一节已完成总结的课堂：「${name}」`, {
          actions: [
            { label: '查看总结 ›', type: 'navigate', url: `/pages/record/summary?sessionId=${doneSession.id}&from=agent` },
          ],
        })
      } else {
        addAgentMessage('暂时没有已完成的课堂总结。你可以先录音或上传课堂音频。', {
          actions: [
            { label: '◉ 开始录音', type: 'command', command: 'ask_course_for_recording' },
            { label: '↑ 上传资料', type: 'navigate', url: '/pages/materials/upload' },
          ],
        })
      }
    } catch {
      isThinking.value = false
      addAgentMessage('我暂时无法连接知识库服务，请确认后端已启动。')
    }
  }

  /** 5. 查看最近课堂 */
  async function handleListRecentSessions() {
    isThinking.value = true
    try {
      const sessions = await fetchSessions()
      const recent = sessions
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 5)

      isThinking.value = false
      if (recent.length === 0) {
        addAgentMessage('暂时没有课堂记录。你可以先开始录音或上传课堂音频。', {
          actions: [
            { label: '◉ 开始录音', type: 'command', command: 'ask_course_for_recording' },
            { label: '↑ 上传资料', type: 'navigate', url: '/pages/materials/upload' },
          ],
        })
        return
      }

      const cards: AgentCard[] = recent.map(s => {
        const st = normalizeStatus(s.status)
        const title = s.title || s.subject || '未命名课堂'
        const subtitle = formatTime(s.startedAt)
        let status = ''
        let action: AgentAction | undefined
        if (st === 'done') {
          status = '已完成'
          action = { label: '查看总结', type: 'navigate', url: `/pages/record/summary?sessionId=${s.id}&from=agent` }
        } else if (st === 'processing') {
          status = '生成中'
          action = { label: '生成中…', type: 'info' }
        } else if (st === 'failed') {
          status = '生成失败'
          action = { label: '失败', type: 'info' }
        } else if (st === 'recording') {
          status = '录制中'
          action = { label: '录制中', type: 'info' }
        }
        return { id: s.id, title, subtitle, status, action }
      })

      addAgentMessage(`最近 ${recent.length} 节课堂：`, { cards })
    } catch {
      isThinking.value = false
      addAgentMessage('我暂时无法连接知识库服务，请确认后端已启动。')
    }
  }

  /** 6. 打开上传课堂 */
  async function handleOpenUploadCourse() {
    isThinking.value = true
    try {
      const sessions = await fetchSessions()
      const uploaded = sessions.filter(s =>
        (s.subject || '').toLowerCase() === 'upload' ||
        (s.title || '').includes('上传') ||
        (s.subject || '').includes('upload'),
      )

      isThinking.value = false
      if (uploaded.length > 0) {
        addAgentMessage(`找到 ${uploaded.length} 条上传课堂记录。`, {
          action: { label: '查看上传课堂 ›', type: 'navigate', url: '/pages/knowledge/course?courseId=upload&courseName=上传课堂' },
        })
      } else {
        addAgentMessage('还没有上传课堂记录，你可以先上传课堂音频或视频。', {
          action: { label: '↑ 上传资料', type: 'navigate', url: '/pages/materials/upload' },
        })
      }
    } catch {
      isThinking.value = false
      addAgentMessage('我暂时无法连接知识库服务，请确认后端已启动。')
    }
  }

  /** 7. 查看失败总结 */
  async function handleListFailedSessions() {
    isThinking.value = true
    try {
      const sessions = await fetchSessions()
      const failed = sessions.filter(s => normalizeStatus(s.status) === 'failed')

      isThinking.value = false
      if (failed.length === 0) {
        addAgentMessage('目前没有失败的课堂总结。')
        return
      }

      const cards: AgentCard[] = failed.map(s => ({
        id: s.id,
        title: s.title || s.subject || '未命名课堂',
        subtitle: formatTime(s.startedAt),
        status: '生成失败',
        action: { label: '失败', type: 'info' as const },
      }))

      addAgentMessage(`有 ${failed.length} 节课堂总结生成失败：`, { cards })
    } catch {
      isThinking.value = false
      addAgentMessage('我暂时无法连接知识库服务，请确认后端已启动。')
    }
  }

  /** 8. 复习最近课堂 */
  async function handleReviewLatest() {
    isThinking.value = true
    try {
      const sessions = await fetchSessions()
      const doneSession = sessions
        .filter(s => normalizeStatus(s.status) === 'done')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]

      isThinking.value = false
      if (doneSession) {
        const name = doneSession.title || doneSession.subject || '最近课堂'
        addAgentMessage(`我找到最近一节可复习的课堂：「${name}」`, {
          actions: [
            { label: '开始复习 ›', type: 'navigate', url: `/pages/review/index?sessionId=${doneSession.id}` },
          ],
        })
      } else {
        addAgentMessage('暂时没有可复习的课堂总结。你可以先完成一次录音或上传课堂音频。', {
          actions: [
            { label: '◉ 开始录音', type: 'command', command: 'ask_course_for_recording' },
            { label: '↑ 上传资料', type: 'navigate', url: '/pages/materials/upload' },
          ],
        })
      }
    } catch {
      isThinking.value = false
      addAgentMessage('我暂时无法连接知识库服务，请确认后端已启动。')
    }
  }

  /** 9. 查看知识图谱 */
  async function handleOpenConceptMapLatest() {
    isThinking.value = true
    try {
      const sessions = await fetchSessions()
      const doneSession = sessions
        .filter(s => normalizeStatus(s.status) === 'done')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]

      isThinking.value = false
      if (doneSession) {
        const name = doneSession.title || doneSession.subject || '最近课堂'
        addAgentMessage(`正在打开「${name}」的知识图谱。`, {
          action: { label: '查看知识图谱 ›', type: 'navigate', url: `/pages/concept-map/index?sessionId=${doneSession.id}` },
        })
        setTimeout(() => {
          uni.navigateTo({ url: `/pages/concept-map/index?sessionId=${doneSession.id}` })
        }, 600)
      } else {
        addAgentMessage('暂时没有可生成知识图谱的课堂总结。')
      }
    } catch {
      isThinking.value = false
      addAgentMessage('我暂时无法连接知识库服务，请确认后端已启动。')
    }
  }

  /** 10. 打开设置 */
  function handleOpenSettings() {
    addAgentMessage('我为你打开设置。')
    setTimeout(() => uni.navigateTo({ url: '/pages/settings/index' }), 400)
  }

  /** fallback */
  function handleFallback() {
    addAgentMessage('我可以帮你：', {
      actions: [
        { label: '◉ 开始录音', type: 'command', command: 'ask_course_for_recording' },
        { label: '↑ 上传资料', type: 'navigate', url: '/pages/materials/upload' },
        { label: '打开知识库', type: 'switchTab', url: '/pages/knowledge/index' },
        { label: '查看最近总结', type: 'command', command: 'open_latest_summary' },
        { label: '复习最近课堂', type: 'command', command: 'review_latest' },
        { label: '查看知识图谱', type: 'command', command: 'open_concept_map_latest' },
      ],
    })
  }

  // ==================== 消息发送 + 意图分发 ====================

  /** 执行意图处理（不 push 用户消息，供 chat 页 onMounted 复用） */
  async function executeIntent(text: string) {
    // 优先处理 pending input
    if (pendingInput.value) {
      const handled = await handlePendingInput(text)
      if (handled) return
    }

    // Phase 11-A: 流程中不重复触发录音意图
    if (agentFlowState.value !== 'idle') {
      const intent = parseAgentIntent(text)
      if (intent.type === 'ask_course_for_recording') {
        addAgentMessage('请先完成当前学习空间选择。')
        return
      }
    }

    // 意图识别
    const intent = parseAgentIntent(text)

    switch (intent.type) {
      case 'ask_course_for_recording':
        await askCourseForRecording()
        break
      case 'open_upload':
        handleOpenUpload()
        break
      case 'open_knowledge':
        handleOpenKnowledge()
        break
      case 'open_latest_summary':
        await handleOpenLatestSummary()
        break
      case 'list_recent_sessions':
        await handleListRecentSessions()
        break
      case 'open_upload_course':
        await handleOpenUploadCourse()
        break
      case 'list_failed_sessions':
        await handleListFailedSessions()
        break
      case 'review_latest':
        await handleReviewLatest()
        break
      case 'open_concept_map_latest':
        await handleOpenConceptMapLatest()
        break
      case 'open_settings':
        handleOpenSettings()
        break
      case 'chat_fallback':
      default:
        isThinking.value = true
        try {
          const result = await request<{ content: string }>({
            method: 'POST',
            path: '/api/agent/chat',
            data: {
              message: text,
              history: messages.value.slice(-20).map(m => ({ role: m.role, content: m.content })),
            },
            timeout: 20000,
          })
          isThinking.value = false
          if (result.content) {
            addAgentMessage(result.content)
          } else {
            handleFallback()
          }
        } catch (err) {
          isThinking.value = false
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('503') || msg.includes('NOT_CONFIGURED')) {
            addAgentMessage('DeepSeek 服务未配置，请检查后端 API Key 设置。')
          } else {
            // 后端不可用时走 fallback
            handleFallback()
          }
        }
        break
    }
  }

  /** 发送消息（push 用户消息 + 执行意图） */
  async function sendMessage(content: string) {
    const text = content.trim()
    if (!text) return
    messages.value.push({ id: `u${Date.now()}`, role: 'user', content: text, createdAt: Date.now() })
    await executeIntent(text)
  }

  /** 执行 action command */
  async function executeCommand(command: string) {
    switch (command) {
      case 'ask_course_for_recording':
        await askCourseForRecording()
        break
      case 'open_latest_summary':
        await handleOpenLatestSummary()
        break
      case 'review_latest':
        await handleReviewLatest()
        break
      case 'open_concept_map_latest':
        await handleOpenConceptMapLatest()
        break
      case 'list_recent_sessions':
        await handleListRecentSessions()
        break
      case 'list_failed_sessions':
        await handleListFailedSessions()
        break
      default:
        break
    }
  }

  return {
    isAgentAvailable,
    isPanelOpen,
    isThinking,
    floatingPosition,
    messages,
    pendingInput,
    lastActionDispatched,
    agentFlowState,
    openPanel,
    closePanel,
    setFloatingPosition,
    sendMessage,
    executeIntent,
    addAgentMessage,
    askCourseForRecording,
    askNewCourseNameForRecording,
    startRecordingWithCourse,
    startRecordingWithSpace,
    handlePendingInput,
    executeCommand,
    resetMessages,
  }
})
