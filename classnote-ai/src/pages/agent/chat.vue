<template>
  <view class="chat-page">
    <view class="chat-nav">
      <text class="chat-nav__back" @tap="safeBack">‹</text>
      <view class="chat-nav__center">
        <text class="chat-nav__title">听刻</text>
        <text class="chat-nav__sub">正在对话</text>
      </view>
      <text class="chat-nav__more">•••</text>
    </view>

    <scroll-view class="chat-scroll" scroll-y :scroll-into-view="scrollAnchor" :scroll-with-animation="true">
      <view class="chat-list">
        <template v-for="msg in agentStore.messages" :key="msg.id">
          <view :id="'chat-' + msg.id" class="chat-msg" :class="msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--agent'">
            <view class="chat-msg__bubble">
              <text class="chat-msg__text">{{ msg.content }}</text>
              <!-- 单个 action 按钮 -->
              <view v-if="msg.action" class="chat-msg__action" @tap="onAction(msg.action)">
                <text>{{ msg.action.label }}</text>
              </view>
              <!-- 多个 action 按钮 -->
              <view v-if="msg.actions?.length" class="chat-msg__actions">
                <view v-for="(act, i) in msg.actions" :key="i" class="chat-msg__action" @tap="onAction(act)">
                  <text>{{ act.label }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 学习空间选项卡片 -->
          <view v-if="msg.role === 'agent' && msg.spaceOptions?.length" class="chat-courses">
            <view
              v-for="opt in msg.spaceOptions"
              :key="opt.spaceId"
              class="chat-course-card"
              @tap="onSpaceOptionTap(opt)"
            >
              <view class="chat-course-card__icon">{{ opt.icon || '📁' }}</view>
              <view class="chat-course-card__body">
                <text class="chat-course-card__name">{{ opt.spaceName }}</text>
                <text v-if="opt.description" class="chat-course-card__desc">{{ opt.description }}</text>
              </view>
              <text class="chat-course-card__arrow">›</text>
            </view>
          </view>

          <!-- 旧课程选项卡片（兼容） -->
          <view v-else-if="msg.role === 'agent' && msg.courseOptions?.length" class="chat-courses">
            <view
              v-for="opt in msg.courseOptions"
              :key="opt.subject"
              class="chat-course-card"
              @tap="onCourseOptionTap(opt)"
            >
              <view class="chat-course-card__icon">{{ opt.icon || '📚' }}</view>
              <view class="chat-course-card__body">
                <text class="chat-course-card__name">{{ opt.courseName }}</text>
                <text v-if="opt.description" class="chat-course-card__desc">{{ opt.description }}</text>
              </view>
              <text class="chat-course-card__arrow">›</text>
            </view>
          </view>

          <!-- Session 卡片列表 -->
          <view v-if="msg.role === 'agent' && msg.cards?.length" class="chat-cards">
            <view
              v-for="card in msg.cards"
              :key="card.id || card.title"
              class="chat-session-card"
              @tap="onCardTap(card)"
            >
              <view class="chat-session-card__header">
                <text class="chat-session-card__title">{{ card.title }}</text>
                <text v-if="card.status" class="chat-session-card__status" :class="statusClass(card.status)">{{ card.status }}</text>
              </view>
              <text v-if="card.subtitle" class="chat-session-card__sub">{{ card.subtitle }}</text>
              <text v-if="card.meta" class="chat-session-card__meta">{{ card.meta }}</text>
              <view v-if="card.action" class="chat-session-card__action" @tap.stop="onAction(card.action!)">
                <text>{{ card.action.label }}</text>
              </view>
            </view>
          </view>

          <!-- 新建课程输入请求 -->
          <view v-if="msg.role === 'agent' && msg.inputRequest" class="chat-input-request">
            <text class="chat-input-request__hint">{{ msg.inputRequest.placeholder }}</text>
          </view>
        </template>

        <view v-if="agentStore.isThinking" class="chat-msg chat-msg--agent">
          <view class="chat-msg__bubble">
            <view class="chat-dots">
              <view v-for="i in 3" :key="i" class="chat-dots__dot" :style="{ animationDelay: (i * 0.18) + 's' }" />
            </view>
          </view>
        </view>
        <view id="chat-bottom" class="chat-bottom-anchor" />
      </view>
    </scroll-view>

    <view class="chat-input-panel">
      <scroll-view scroll-x class="chat-quick" :show-scrollbar="false">
        <view class="chat-quick__inner">
          <view class="chat-chip" @tap="handleQuickCommand('ask_course_for_recording')"><text>◉</text><text>开始录音</text></view>
          <view class="chat-chip" @tap="handleQuickCommand('open_latest_summary')"><text>✦</text><text>AI总结</text></view>
          <view class="chat-chip" @tap="quickNavigate('/pages/materials/upload')"><text>↑</text><text>上传资料</text></view>
          <view class="chat-chip" @tap="handleQuickCommand('review_latest')"><text>▱</text><text>复习模式</text></view>
          <view class="chat-chip" @tap="handleQuickCommand('open_concept_map_latest')"><text>◎</text><text>知识图谱</text></view>
        </view>
      </scroll-view>

      <view class="chat-input">
        <view class="chat-input__icon">◌</view>
        <input
          class="chat-input__field"
          v-model="inputText"
          :placeholder="agentStore.pendingInput ? '请输入学习空间名称…' : '继续提问，或输入学习任务…'"
          confirm-type="send"
          @confirm="onSend"
        />
        <view class="chat-input__icon">＋</view>
        <view class="chat-input__send" :class="{ 'chat-input__send--on': inputText.trim() }" @tap="onSend">↑</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useAgentStore, type AgentAction, type AgentCard, type AgentCourseOption } from '@/stores/useAgentStore'
import type { AgentSpaceOption } from '@/utils/spaceOptions'

const agentStore = useAgentStore()
const inputText = ref('')
const scrollAnchor = ref('')

/** 标记是否已处理过 index 页预推的消息 */
let initialHandled = false

onMounted(async () => {
  if (agentStore.messages.length === 0) {
    agentStore.addAgentMessage('你好，我是听刻。你可以让我开始录音、总结课堂、上传资料或复习知识。')
    scrollToBottom()
    return
  }

  // 如果 index 页已经预处理了消息（如 askCourseForRecording），跳过
  if (agentStore.lastActionDispatched) {
    agentStore.lastActionDispatched = false
    scrollToBottom()
    return
  }

  // 检查最后一条消息是否是未处理的用户消息（从 index 页推送的）
  const lastMsg = agentStore.messages[agentStore.messages.length - 1]
  if (lastMsg?.role === 'user' && !agentStore.isThinking && !initialHandled) {
    initialHandled = true
    // 直接执行意图（消息已存在于 store，无需重复 push）
    await agentStore.executeIntent(lastMsg.content)
  }
  scrollToBottom()
})

function scrollToBottom() {
  scrollAnchor.value = ''
  nextTick(() => { scrollAnchor.value = 'chat-bottom' })
}

function safeBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { uni.navigateBack(); return }
  uni.switchTab({ url: '/pages/agent/index' })
}

async function onSend() {
  const text = inputText.value.trim()
  if (!text) { uni.showToast({ title: '请输入内容', icon: 'none' }); return }

  // 优先处理 pending input（新建课程名）
  if (agentStore.pendingInput) {
    agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: text, createdAt: Date.now() })
    inputText.value = ''
    scrollToBottom()
    await agentStore.handlePendingInput(text)
    scrollToBottom()
    setTimeout(scrollToBottom, 900)
    return
  }

  // 普通消息 → 意图分发
  await agentStore.sendMessage(text)
  inputText.value = ''
  scrollToBottom()
  setTimeout(scrollToBottom, 900)
}

function onSpaceOptionTap(opt: AgentSpaceOption) {
  if (opt.spaceId === '__new__') {
    agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: '新建学习空间', createdAt: Date.now() })
    agentStore.askNewCourseNameForRecording()
    scrollToBottom()
    setTimeout(scrollToBottom, 500)
    return
  }
  // 选择已有 Space → 创建 session → 跳转
  agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: opt.spaceName, createdAt: Date.now() })
  agentStore.startRecordingWithSpace(opt)
  scrollToBottom()
  setTimeout(scrollToBottom, 1200)
}

function onCourseOptionTap(opt: AgentCourseOption) {
  if (opt.subject === '__new__') {
    agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: '新建课程', createdAt: Date.now() })
    agentStore.askNewCourseNameForRecording()
    scrollToBottom()
    setTimeout(scrollToBottom, 500)
    return
  }
  // 选择已有课程 → 创建 session → 跳转
  agentStore.startRecordingWithCourse(opt)
  scrollToBottom()
  setTimeout(scrollToBottom, 1200)
}

function onAction(action: AgentAction) {
  if (action.type === 'navigate' && action.url) {
    uni.navigateTo({ url: action.url })
  } else if (action.type === 'switchTab' && action.url) {
    uni.switchTab({ url: action.url })
  } else if (action.type === 'command' && action.command) {
    agentStore.executeCommand(action.command)
    scrollToBottom()
    setTimeout(scrollToBottom, 900)
  }
}

function onCardTap(card: AgentCard) {
  if (card.action) onAction(card.action)
}

function statusClass(status: string): string {
  if (status.includes('完成')) return 'chat-session-card__status--done'
  if (status.includes('生成中')) return 'chat-session-card__status--processing'
  if (status.includes('失败')) return 'chat-session-card__status--failed'
  if (status.includes('录制')) return 'chat-session-card__status--recording'
  return ''
}

async function handleQuickCommand(command: string) {
  // 写入用户消息
  const labelMap: Record<string, string> = {
    ask_course_for_recording: '开始录音',
    open_latest_summary: '查看最近总结',
    review_latest: '复习最近课堂',
    open_concept_map_latest: '查看知识图谱',
    list_recent_sessions: '最近课堂',
  }
  const label = labelMap[command] || command
  agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: label, createdAt: Date.now() })
  scrollToBottom()
  await agentStore.executeCommand(command)
  scrollToBottom()
  setTimeout(scrollToBottom, 900)
}

function quickNavigate(url: string) {
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.chat-page { min-height: 100vh; background: #f7f8fa; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.chat-page { max-width: 430px; margin: 0 auto; }
/* #endif */

.chat-nav { height: calc(env(safe-area-inset-top) + 120rpx); padding: calc(env(safe-area-inset-top) + 32rpx) 32rpx 0; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; }
.chat-nav__back, .chat-nav__more { width: 88rpx; color: #071446; flex-shrink: 0; }
.chat-nav__back { font-size: 58rpx; line-height: 1; }
.chat-nav__more { text-align: right; font-size: 28rpx; letter-spacing: 4rpx; font-weight: 800; }
.chat-nav__center { display: flex; flex-direction: column; align-items: center; }
.chat-nav__title { font-size: 36rpx; color: #071446; font-weight: 800; }
.chat-nav__sub { margin-top: 8rpx; font-size: 24rpx; color: #6b7280; }

.chat-scroll { height: calc(100vh - env(safe-area-inset-top) - 120rpx); padding: 28rpx 32rpx 300rpx; box-sizing: border-box; }
.chat-list { min-height: 100%; }

.chat-msg { display: flex; margin-bottom: 22rpx; }
.chat-msg--agent { justify-content: flex-start; }
.chat-msg--user { justify-content: flex-end; }
.chat-msg__bubble { max-width: 78%; padding: 22rpx 26rpx; border-radius: 28rpx; background: #fff; border: 1rpx solid #eef0f3; box-shadow: 0 10rpx 24rpx rgba(15,23,42,0.05); box-sizing: border-box; }
.chat-msg--user .chat-msg__bubble { background: #2563eb; border-color: #2563eb; }
.chat-msg__text { font-size: 28rpx; color: #111827; line-height: 1.6; white-space: pre-wrap; }
.chat-msg--user .chat-msg__text { color: #fff; }

.chat-msg__action { margin-top: 12rpx; padding: 14rpx 20rpx; border-radius: 18rpx; background: #eef4ff; color: #2563eb; font-size: 24rpx; font-weight: 700; display: inline-block; }
.chat-msg__action:active { background: #dbeafe; }

.chat-msg__actions { margin-top: 12rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.chat-msg__actions .chat-msg__action { margin-top: 0; }

/* course option cards */
.chat-courses { margin: -4rpx 0 22rpx; display: flex; flex-direction: column; gap: 14rpx; }
.chat-course-card { display: flex; align-items: center; gap: 20rpx; padding: 22rpx 24rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 24rpx; box-shadow: 0 10rpx 24rpx rgba(15,23,42,0.05); }
.chat-course-card:active { transform: scale(0.98); background: #f8faff; }
.chat-course-card__icon { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #eef4ff; display: flex; align-items: center; justify-content: center; font-size: 30rpx; flex-shrink: 0; }
.chat-course-card__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.chat-course-card__name { font-size: 28rpx; color: #111827; font-weight: 700; }
.chat-course-card__desc { font-size: 22rpx; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-course-card__arrow { color: #9ca3af; font-size: 36rpx; flex-shrink: 0; }

/* session cards */
.chat-cards { margin: -4rpx 0 22rpx; display: flex; flex-direction: column; gap: 14rpx; }
.chat-session-card { padding: 22rpx 24rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 24rpx; box-shadow: 0 10rpx 24rpx rgba(15,23,42,0.05); }
.chat-session-card:active { background: #f8faff; }
.chat-session-card__header { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.chat-session-card__title { font-size: 28rpx; color: #111827; font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-session-card__status { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 999rpx; white-space: nowrap; }
.chat-session-card__status--done { background: #ecfdf5; color: #16a34a; }
.chat-session-card__status--processing { background: #f1edff; color: #6d5dfc; }
.chat-session-card__status--failed { background: #fef2f2; color: #ef4444; }
.chat-session-card__status--recording { background: #eef4ff; color: #2563eb; }
.chat-session-card__sub { margin-top: 8rpx; font-size: 22rpx; color: #6b7280; }
.chat-session-card__meta { margin-top: 4rpx; font-size: 22rpx; color: #9ca3af; }
.chat-session-card__action { margin-top: 14rpx; padding: 12rpx 18rpx; border-radius: 18rpx; background: #eef4ff; color: #2563eb; font-size: 24rpx; font-weight: 700; display: inline-block; }

/* input request hint */
.chat-input-request { margin: -4rpx 0 22rpx; }
.chat-input-request__hint { font-size: 24rpx; color: #6b7280; font-style: italic; }

.chat-dots { display: flex; gap: 8rpx; }
.chat-dots__dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #2563eb; animation: chatBlink 1.1s infinite ease-in-out; }
@keyframes chatBlink { 0%,100% { opacity:.25; transform:translateY(0); } 50% { opacity:1; transform:translateY(-3rpx); } }

.chat-bottom-anchor { height: 20rpx; }

.chat-input-panel { position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); width: 100%; max-width: 430px; padding: 16rpx 0 calc(18rpx + env(safe-area-inset-bottom)); background: rgba(247,248,250,.96); border-top: 1rpx solid #eef0f3; box-sizing: border-box; z-index: 100; }
.chat-quick { width: 100%; white-space: nowrap; margin-bottom: 14rpx; }
.chat-quick__inner { display: inline-flex; gap: 14rpx; padding: 0 32rpx; white-space: nowrap; }
.chat-chip { height: 60rpx; padding: 0 20rpx; display: inline-flex; align-items: center; gap: 10rpx; border-radius: 20rpx; background: #fff; border: 1rpx solid #e5e7eb; color: #111827; font-size: 24rpx; white-space: nowrap; box-shadow: 0 8rpx 18rpx rgba(15,23,42,.04); }
.chat-chip text:first-child { color: #2563eb; font-weight: 800; }

.chat-input { height: 82rpx; margin: 0 32rpx; padding: 0 12rpx 0 18rpx; display: flex; align-items: center; gap: 12rpx; border-radius: 28rpx; background: #fff; border: 1rpx solid #e5e7eb; box-shadow: 0 12rpx 30rpx rgba(15,23,42,.06); box-sizing: border-box; }
.chat-input__field { flex: 1; min-width: 0; height: 82rpx; font-size: 27rpx; color: #111827; }
.chat-input__icon, .chat-input__send { width: 54rpx; height: 54rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 25rpx; }
.chat-input__icon { background: #f3f6fb; color: #2563eb; }
.chat-input__send { background: #e5e7eb; color: #fff; font-weight: 800; }
.chat-input__send--on { background: #2563eb; }
</style>
