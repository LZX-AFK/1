<template>
  <AppTabPage :scroll-into-view="scrollAnchor" :scroll-with-animation="true">
    <template #header>
      <view class="home-header">
        <view class="home-menu" aria-label="menu">
          <view class="home-menu__line" />
          <view class="home-menu__line" />
          <view class="home-menu__line" />
        </view>
        <view class="device-pill">
          <text class="device-pill__icon">♪</text>
          <text class="device-pill__text">{{ deviceLabel }}</text>
        </view>
      </view>
    </template>

    <view class="brand-block">
      <view class="brand-logo">
        <view class="brand-logo__dot" />
        <view class="brand-logo__bar brand-logo__bar--sm" />
        <view class="brand-logo__bar brand-logo__bar--md" />
        <view class="brand-logo__bar brand-logo__bar--lg" />
        <view class="brand-logo__bar brand-logo__bar--md" />
        <view class="brand-logo__dot" />
      </view>
      <text class="brand-block__title">听刻</text>
      <text class="brand-block__subtitle">更懂你的学习伙伴</text>
    </view>

    <scroll-view scroll-x class="quick-scroll" :show-scrollbar="false">
      <view class="quick-scroll__inner">
        <AppChip v-for="item in quickActions" :key="item.key" :icon="item.icon" :label="item.label" @tap="handleQuick(item)" />
      </view>
    </scroll-view>

    <view class="home-section">
      <AppCard padding="md">
        <view class="composer">
          <textarea
            class="composer__input"
            v-model="inputText"
            placeholder="发消息或按住说话"
            :maxlength="300"
            :auto-height="false"
            :adjust-position="true"
          />

          <view v-if="agentStore.isThinking" class="thinking">
            <view v-for="i in 3" :key="i" class="thinking__dot" :style="{ animationDelay: (i * 0.18) + 's' }" />
          </view>

          <view class="composer-tools">
            <view class="tool-btn tool-btn--select">
              <text>对话</text><text class="tool-btn__chev">⌄</text>
            </view>
            <view class="tool-btn tool-btn--select">
              <text class="tool-btn__globe">◎</text><text>DS 快速</text><text class="tool-btn__chev">⌄</text>
            </view>
            <view class="tool-btn tool-btn--circle">@</view>
            <view class="composer-tools__split" />
            <view class="tool-btn tool-btn--circle tool-btn--voice">◌</view>
            <view class="tool-btn tool-btn--circle" @tap.stop="openMoreTools">+</view>
            <view class="send-btn" :class="{ 'send-btn--active': inputText.trim() }" @tap="onSend">↑</view>
          </view>
        </view>
      </AppCard>
    </view>

    <view v-if="recentTasks.length > 0" class="home-section home-section--tasks">
      <AppCard padding="md">
        <view class="tasks-head">
          <text class="section-title">最近任务</text>
          <text class="tasks-head__all" @tap="viewAllTasks">查看全部 ›</text>
        </view>
        <view v-for="task in recentTasks" :key="task.id" class="task-row" :class="{ 'task-row--last': task === recentTasks[recentTasks.length - 1] }" @tap="onTaskTap(task)">
          <view class="task-row__icon" :class="'task-row__icon--' + task.theme">{{ task.icon }}</view>
          <text class="task-row__name">{{ task.title }}</text>
          <text class="task-row__status" :class="{ 'task-row__status--active': task.active }">{{ task.status }}</text>
          <text class="task-row__arrow">›</text>
        </view>
      </AppCard>
    </view>

    <view id="ag-bottom" />
  </AppTabPage>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useAgentStore, type AgentAction } from '@/stores/useAgentStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { getSessions } from '@/services/sessionApi'
import AppTabPage from '@/components/layout/AppTabPage.vue'
import AppCard from '@/components/layout/AppCard.vue'
import AppChip from '@/components/ui/AppChip.vue'
import type { SessionListItem } from '@/services/sessionApi'

interface QuickAction {
  key: string
  icon: string
  label: string
}

const agentStore = useAgentStore()
const deviceStore = useDeviceStore()
const inputText = ref('')
const scrollAnchor = ref('')
const recentTasks = ref<Array<{ id: string; icon: string; title: string; status: string; active: boolean; theme: string; sessionId?: string }>>([])

const deviceLabel = computed(() => {
  if (deviceStore.isConnected) return `电量 ${deviceStore.batteryDisplay}`
  return '未连接'
})

const quickActions: QuickAction[] = [
  { key: 'record', icon: '◉', label: '开始录音' },
  { key: 'summary', icon: '✦', label: 'AI总结' },
  { key: 'upload', icon: '↑', label: '上传资料' },
  { key: 'photo', icon: '□', label: '拍题答疑' },
  { key: 'review', icon: '▱', label: '复习模式' },
]

onMounted(() => {
  if (agentStore.messages.length === 0) {
    agentStore.addAgentMessage('你好，我是听刻。你可以让我开始录音、总结课堂、上传资料或复习知识。')
  }
  loadRecentTasks()
})

async function loadRecentTasks() {
  try {
    const sessions = await getSessions()
    const sorted = sessions
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 3)

    recentTasks.value = sorted.map(s => {
      const st = normalizeStatus(s.status)
      const title = s.title || s.subject || '未命名课堂'
      if (st === 'done') return { id: s.id, icon: '✦', title, status: '查看总结', active: true, theme: 'blue', sessionId: s.id }
      if (st === 'processing') return { id: s.id, icon: '◌', title, status: '生成中', active: false, theme: 'violet' }
      if (st === 'failed') return { id: s.id, icon: '⚠', title, status: '失败', active: false, theme: 'violet' }
      if (st === 'saved') return { id: s.id, icon: '💾', title, status: '已保存', active: false, theme: 'green' }
      return { id: s.id, icon: '◉', title, status: '录制中', active: true, theme: 'green' }
    })
  } catch {
    recentTasks.value = []
  }
}

function normalizeStatus(raw: string): 'recording' | 'processing' | 'done' | 'failed' | 'saved' {
  switch (raw) {
    case 'recording': case 'active': return 'recording'
    case 'saved': return 'saved'
    case 'summarizing': case 'processing': case 'pending': return 'processing'
    case 'done': case 'completed': case 'success': return 'done'
    case 'failed': case 'error': default: return 'failed'
  }
}

function scrollToBottom() {
  scrollAnchor.value = ''
  nextTick(() => { scrollAnchor.value = 'ag-bottom' })
}

function onSend() {
  const text = inputText.value.trim()
  if (!text) {
    uni.showToast({ title: '请输入学习任务', icon: 'none' })
    return
  }
  // 写入消息后跳转 chat 页处理
  agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: text, createdAt: Date.now() })
  inputText.value = ''
  uni.navigateTo({ url: '/pages/agent/chat' })
  // chat 页 onMounted 会处理意图
}

function onTaskTap(task: { sessionId?: string; active: boolean }) {
  if (task.sessionId && task.active) {
    uni.navigateTo({ url: `/pages/record/summary?sessionId=${task.sessionId}&from=agent` })
  }
}

function viewAllTasks() {
  uni.switchTab({ url: '/pages/knowledge/index' })
}

async function handleQuick(item: QuickAction) {
  if (item.key === 'record') {
    // 写入用户消息，跳转 chat，让 chat 处理课程选择
    agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: '开始录音', createdAt: Date.now() })
    agentStore.lastActionDispatched = true
    agentStore.askCourseForRecording()
    uni.navigateTo({ url: '/pages/agent/chat' })
    return
  }

  if (item.key === 'summary') {
    agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: 'AI总结', createdAt: Date.now() })
    // lastActionDispatched = false, chat 页 onMounted 会 sendMessage 处理
    uni.navigateTo({ url: '/pages/agent/chat' })
    return
  }

  if (item.key === 'upload') {
    uni.navigateTo({ url: '/pages/materials/upload' })
    return
  }

  if (item.key === 'photo') {
    uni.showToast({ title: '拍题答疑将在下一阶段接入', icon: 'none' })
    return
  }

  if (item.key === 'review') {
    agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: '复习模式', createdAt: Date.now() })
    uni.navigateTo({ url: '/pages/agent/chat' })
    return
  }
}

function openMoreTools() {
  uni.showActionSheet({
    itemList: ['上传资料', '拍题答疑', '复习模式'],
    success(res) {
      if (res.tapIndex === 0) uni.navigateTo({ url: '/pages/materials/upload' })
      else if (res.tapIndex === 1) uni.showToast({ title: '拍题答疑将在下一阶段接入', icon: 'none' })
      else {
        agentStore.messages.push({ id: `u${Date.now()}`, role: 'user', content: '复习模式', createdAt: Date.now() })
        agentStore.lastActionDispatched = false
        uni.navigateTo({ url: '/pages/agent/chat' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.home-header {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home-menu {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10rpx;
}

.home-menu__line {
  width: 46rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: #111827;
}

.device-pill {
  height: 56rpx;
  padding: 0 18rpx;
  border: 1rpx solid #d8dde8;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.04);
}

.device-pill__icon,
.device-pill__text {
  font-size: 24rpx;
  color: #111827;
  white-space: nowrap;
}

.brand-block {
  height: 330rpx;
  padding: 10rpx 32rpx 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 18rpx;
  filter: drop-shadow(0 14rpx 30rpx rgba(37, 99, 235, 0.18));
}

.brand-logo__bar {
  width: 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, #5b7cff, #2563eb);
}

.brand-logo__bar--sm { height: 66rpx; opacity: 0.78; }
.brand-logo__bar--md { height: 84rpx; opacity: 0.86; }
.brand-logo__bar--lg { height: 112rpx; }

.brand-logo__dot {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: #315cf6;
}

.brand-block__title {
  font-size: 66rpx;
  line-height: 1;
  color: #071446;
  font-weight: 800;
}

.brand-block__subtitle {
  margin-top: 18rpx;
  color: #7b8190;
  font-size: 26rpx;
}

.quick-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 24rpx;
}

.quick-scroll__inner {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 32rpx;
  white-space: nowrap;
}

.home-section {
  padding: 0 32rpx;
  box-sizing: border-box;
}

.home-section--tasks {
  margin-top: 32rpx;
}

.composer {
  min-height: 246rpx;
  display: flex;
  flex-direction: column;
}

.composer__input {
  flex: 1;
  width: 100%;
  min-height: 136rpx;
  max-height: 150rpx;
  color: #111827;
  font-size: 30rpx;
  line-height: 1.5;
}

.composer__input::placeholder {
  color: #9ca3af;
}

.composer__action {
  align-self: flex-start;
  margin-bottom: 12rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eef4ff;
  color: #2563eb;
  font-size: 24rpx;
}

.thinking {
  display: flex;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.thinking__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #2563eb;
  animation: thinking 1s infinite ease-in-out;
}

.composer-tools {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.tool-btn {
  height: 58rpx;
  padding: 0 18rpx;
  border: 1rpx solid #e5e7eb;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #111827;
  font-size: 24rpx;
  background: #fff;
  box-sizing: border-box;
  white-space: nowrap;
  flex-shrink: 0;
}

.tool-btn--select { min-width: 104rpx; }
.tool-btn--select:nth-child(2) { min-width: 150rpx; }
.tool-btn--circle { width: 58rpx; padding: 0; font-weight: 800; }
.tool-btn--voice { color: #2563eb; border-color: #bfdbfe; }
.tool-btn__globe { color: #4b5563; }
.tool-btn__chev { color: #6b7280; font-size: 20rpx; }

.composer-tools__split {
  flex: 1;
  min-width: 8rpx;
}

.send-btn {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: #edf0f5;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.send-btn--active {
  background: #2563eb;
  color: #fff;
}

.tasks-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title {
  color: #071446;
  font-size: 32rpx;
  font-weight: 800;
}

.tasks-head__all {
  color: #6b7280;
  font-size: 24rpx;
}

.task-row {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  border-bottom: 1rpx solid #eef0f3;
}

.task-row--last {
  border-bottom: 0;
}

.task-row__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  flex-shrink: 0;
}

.task-row__icon--blue { background: #eef4ff; color: #2563eb; }
.task-row__icon--green { background: #ecfdf5; color: #16a34a; }
.task-row__icon--violet { background: #f1edff; color: #6d5dfc; }

.task-row__name {
  flex: 1;
  min-width: 0;
  color: #111827;
  font-size: 27rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-row__status {
  color: #6b7280;
  font-size: 24rpx;
  white-space: nowrap;
}

.task-row__status--active {
  color: #2563eb;
}

.task-row__arrow {
  color: #9ca3af;
  font-size: 32rpx;
}

@keyframes thinking {
  0%, 100% { opacity: .35; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4rpx); }
}
</style>
