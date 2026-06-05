<template>
  <view class="rv-page">
    <view class="rv-nav">
      <text class="rv-nav__back" @tap="safeBack">‹</text>
      <view class="rv-nav__center">
        <text class="rv-nav__title">复习模式</text>
        <text class="rv-nav__sub">{{ pageTitle }}</text>
      </view>
      <view class="rv-nav__right" />
    </view>

    <scroll-view scroll-y class="rv-scroll">
      <!-- loading -->
      <view v-if="state === 'loading'" class="rv-skel-wrap">
        <view class="rv-skel rv-skel--overview" />
        <view class="rv-skel rv-skel--task" />
        <view class="rv-skel rv-skel--task" />
      </view>

      <!-- error -->
      <view v-else-if="state === 'error'" class="rv-state" @tap="loadData">
        <text class="rv-state__icon">✕</text>
        <text class="rv-state__title">加载失败</text>
        <text class="rv-state__action">点击重试</text>
      </view>

      <!-- empty -->
      <view v-else-if="state === 'empty'" class="rv-state">
        <text class="rv-state__icon">📋</text>
        <text class="rv-state__title">暂无复习任务</text>
        <text class="rv-state__desc">完成 AI 总结后，听刻会自动生成复习建议。</text>
        <view class="rv-state__btn" @tap="goRecord">去录音</view>
      </view>

      <!-- normal -->
      <template v-else>
        <view class="rv-overview">
          <view class="rv-overview__left">
            <text class="rv-overview__label">今日复习</text>
            <text class="rv-overview__meta">{{ tasks.length }} 个任务 · 完成 {{ completionRate }}%</text>
            <view class="rv-overview__bar">
              <view class="rv-overview__fill" :style="{ width: completionRate + '%' }" />
            </view>
          </view>
          <text class="rv-overview__pct">{{ completionRate }}%</text>
        </view>

        <view v-for="task in tasks" :key="task.id" class="rv-task" :class="{ 'rv-task--done': task.completed }">
          <view class="rv-task__cb" :class="{ 'rv-task__cb--done': task.completed }" @tap="toggleTask(task.id)">
            <text v-if="task.completed">✓</text>
          </view>
          <view class="rv-task__body">
            <text class="rv-task__title">{{ task.title }}</text>
            <text v-if="task.desc" class="rv-task__desc">{{ task.desc }}</text>
            <view v-if="task.tags?.length" class="rv-task__tags">
              <text v-for="tag in task.tags" :key="tag" class="rv-task__tag">{{ tag }}</text>
            </view>
          </view>
        </view>

        <view class="rv-actions">
          <view class="rv-actions__btn rv-actions__btn--primary" @tap="onStartReview">开始复习</view>
          <view class="rv-actions__btn" @tap="loadData">刷新计划</view>
        </view>
      </template>

      <view class="rv-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSessions, getSummary } from '@/services/sessionApi'

interface Task { id: string; title: string; desc?: string; tags?: string[]; completed: boolean }

const courseKey = ref('')
const sessionId = ref('')
const courseName = ref('')
const docType = ref('')
const state = ref<'loading' | 'empty' | 'error' | 'normal'>('loading')
const tasks = ref<Task[]>([])

const pageTitle = computed(() => {
  // 文档类 session 显示"资料复习任务"
  if (docType.value) {
    const dt = docType.value.toLowerCase()
    if (dt === 'reading') return 'Reading 复习任务'
    if (dt === 'slides') return 'Lecture Slides 复习任务'
    return '资料复习任务'
  }
  return courseName.value || courseKey.value || '复习模式'
})
const completionRate = computed(() => {
  if (!tasks.value.length) return 0
  return Math.round((tasks.value.filter(t => t.completed).length / tasks.value.length) * 100)
})

async function loadData() {
  state.value = 'loading'
  try {
    let summary: Awaited<ReturnType<typeof getSummary>> | null = null

    if (sessionId.value) {
      summary = await getSummary(sessionId.value)
    } else if (courseKey.value) {
      const sessions = await getSessions()
      const doneSessions = sessions.filter(
        s => s.status === 'done' &&
          (s.subject || s.title || '').toLowerCase() === courseKey.value.toLowerCase(),
      )
      if (doneSessions.length > 0) {
        summary = await getSummary(doneSessions[0].id)
      }
    }

    if (!summary || summary.status !== 'done') {
      state.value = 'empty'
      return
    }

    // 文档类型检测
    docType.value = summary.documentType || ''

    const builtTasks: Task[] = []

    // 1. 优先使用 reviewTasks
    if (summary.reviewTasks?.length) {
      summary.reviewTasks.forEach((rt: string, i: number) => {
        builtTasks.push({ id: `rv-${i}`, title: rt, tags: ['复习'], completed: false })
      })
    }

    // 2. suggestions 作为补充
    if (summary.suggestions?.length && builtTasks.length < 8) {
      summary.suggestions.forEach((sg: string, i: number) => {
        builtTasks.push({ id: `sg-${i}`, title: sg, tags: ['建议'], completed: false })
      })
    }

    // 3. 从 keyPoints 生成复习任务
    if (builtTasks.length === 0) {
      const kp = Array.isArray(summary.keyPoints)
        ? summary.keyPoints as string[]
        : typeof summary.keyPoints === 'string'
          ? (() => { try { return JSON.parse(summary.keyPoints as string) } catch { return [] } })() as string[]
          : [] as string[]
      kp.slice(0, 5).forEach((point: string, i: number) => {
        builtTasks.push({ id: `kp-${i}`, title: `复习：${point}`, tags: ['知识点'], completed: false })
      })
    }

    if (builtTasks.length === 0) {
      state.value = 'empty'
      return
    }

    tasks.value = builtTasks
    state.value = 'normal'
  } catch (err) {
    console.warn('[review] loadData failed', err)
    state.value = 'error'
  }
}

function toggleTask(id: string) {
  const task = tasks.value.find(t => t.id === id)
  if (task) task.completed = !task.completed
}

function safeBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { uni.navigateBack(); return }
  if (courseKey.value) {
    uni.redirectTo({ url: `/pages/knowledge/course?courseId=${encodeURIComponent(courseKey.value)}&courseName=${encodeURIComponent(courseName.value)}` })
    return
  }
  uni.switchTab({ url: '/pages/agent/index' })
}

function goRecord() {
  uni.switchTab({ url: '/pages/agent/index' })
}

function onStartReview() {
  uni.showToast({ title: '已开始复习，请逐项完成', icon: 'none' })
}

onLoad((query) => {
  // 兼容 spaceId/spaceName 和旧 courseId/courseName
  courseKey.value = query?.spaceId ? decodeURIComponent(query.spaceId) : (query?.courseId ? decodeURIComponent(query.courseId) : '')
  courseName.value = query?.spaceName ? decodeURIComponent(query.spaceName) : (query?.courseName ? decodeURIComponent(query.courseName) : '')
  sessionId.value = query?.sessionId ? decodeURIComponent(query.sessionId) : ''
})

onMounted(() => { loadData() })
</script>

<style lang="scss" scoped>
.rv-page { min-height: 100vh; background: #FAFAF5; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.rv-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.rv-nav { position: relative; z-index: 10; height: calc(env(safe-area-inset-top) + 120rpx); padding: calc(env(safe-area-inset-top) + 28rpx) 32rpx 20rpx; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; }
.rv-nav__back, .rv-nav__right { width: 88rpx; flex-shrink: 0; }
.rv-nav__back { font-size: 58rpx; color: #071446; line-height: 1; cursor: pointer; }
.rv-nav__center { display: flex; flex-direction: column; align-items: center; }
.rv-nav__title { font-size: 36rpx; color: #071446; font-weight: 800; }
.rv-nav__sub { margin-top: 8rpx; font-size: 24rpx; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300rpx; }
.rv-scroll { height: calc(100vh - env(safe-area-inset-top) - 120rpx); padding: 28rpx 32rpx 0; box-sizing: border-box; }

.rv-overview { background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; box-shadow: 0 14rpx 34rpx rgba(15,23,42,.06); padding: 30rpx; display: flex; align-items: center; gap: 24rpx; margin-bottom: 24rpx; }
.rv-overview__left { flex: 1; min-width: 0; }
.rv-overview__label { display: block; font-size: 32rpx; color: #111827; font-weight: 800; }
.rv-overview__meta { display: block; margin-top: 8rpx; font-size: 24rpx; color: #6b7280; }
.rv-overview__bar { height: 10rpx; margin-top: 18rpx; border-radius: 999rpx; background: #e5e7eb; overflow: hidden; }
.rv-overview__fill { height: 100%; border-radius: 999rpx; background: #2563eb; transition: width .25s; }
.rv-overview__pct { color: #2563eb; font-size: 42rpx; font-weight: 800; }

.rv-task { display: flex; gap: 18rpx; padding: 24rpx; margin-bottom: 18rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; box-shadow: 0 14rpx 34rpx rgba(15,23,42,.06); }
.rv-task--done { opacity: .58; }
.rv-task__cb { width: 42rpx; height: 42rpx; border-radius: 12rpx; border: 2rpx solid #cbd5e1; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; box-sizing: border-box; cursor: pointer; }
.rv-task__cb--done { background: #2563eb; border-color: #2563eb; }
.rv-task__body { flex: 1; min-width: 0; }
.rv-task__title { display: block; font-size: 28rpx; color: #111827; font-weight: 700; line-height: 1.45; }
.rv-task__desc { display: block; margin-top: 8rpx; font-size: 24rpx; color: #6b7280; }
.rv-task__tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.rv-task__tag { padding: 6rpx 14rpx; border-radius: 999rpx; background: #eef4ff; color: #2563eb; font-size: 21rpx; }

.rv-actions { display: flex; gap: 16rpx; margin-top: 28rpx; }
.rv-actions__btn { flex: 1; min-height: 78rpx; border-radius: 24rpx; background: #fff; color: #4b5563; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; box-shadow: 0 10rpx 24rpx rgba(15,23,42,.05); cursor: pointer; }
.rv-actions__btn--primary { background: #2563eb; color: #fff; }

.rv-state { margin: 60rpx 0; text-align: center; }
.rv-state__icon { display: block; font-size: 60rpx; margin-bottom: 20rpx; }
.rv-state__title { display: block; font-size: 32rpx; color: #111827; font-weight: 700; margin-bottom: 12rpx; }
.rv-state__desc { display: block; font-size: 26rpx; color: #6b7280; line-height: 1.6; padding: 0 32rpx; margin-bottom: 28rpx; }
.rv-state__action { display: block; font-size: 26rpx; color: #2563eb; }
.rv-state__btn { display: inline-flex; padding: 18rpx 40rpx; border-radius: 999rpx; background: #2563eb; color: #fff; font-size: 26rpx; font-weight: 700; }

.rv-skel-wrap { }
.rv-skel { border-radius: 28rpx; background: linear-gradient(90deg,#eef0f3 25%,#f7f8fa 50%,#eef0f3 75%); background-size: 200% 100%; animation: rvShimmer 1.4s infinite; margin-bottom: 18rpx; }
.rv-skel--overview { height: 160rpx; }
.rv-skel--task { height: 120rpx; }
@keyframes rvShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.rv-safe { height: calc(env(safe-area-inset-bottom) + 180rpx); }
</style>
