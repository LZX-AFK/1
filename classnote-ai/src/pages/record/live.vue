<template>
  <view class="page">
    <view class="safe-top" />

    <!-- WS 状态横幅 -->
    <view v-if="wsStatus === 'reconnecting'" class="ws-banner ws-banner--warn">
      <text class="ws-banner__icon">⟳</text>
      <text class="ws-banner__text">连接中断，正在重连（第{{ wsRetryCount }}次）...</text>
    </view>
    <view v-else-if="wsStatus === 'disconnected'" class="ws-banner ws-banner--error">
      <text class="ws-banner__icon">⚠</text>
      <text class="ws-banner__text">服务不可用，录音已本地保存</text>
    </view>

    <!-- 顶部状态栏 -->
    <view class="topbar">
      <view class="topbar__left">
        <text class="topbar__course">{{ config?.courseId || 'Biology 101' }}</text>
        <view :class="['topbar__status', status === 'recording' ? 'topbar__status--live' : '']">
          <text class="topbar__status-dot" v-if="status === 'recording'">●</text>
          <text class="topbar__status-text">{{ status === 'recording' ? t('record.realtime') : t('record.pause') }}</text>
        </view>
      </view>
      <view class="topbar__right">
        <text class="topbar__device">🎧</text>
        <text class="topbar__timer">{{ timerStr }}</text>
      </view>
    </view>

    <!-- 准确率条 -->
    <view class="accuracy-bar">
      <text class="accuracy-bar__label">{{ t('record.accuracy') }}</text>
      <view class="accuracy-bar__track">
        <view class="accuracy-bar__fill" :style="{ width: `${accuracy}%` }" />
      </view>
      <text class="accuracy-bar__value">{{ accuracy }}%</text>
    </view>

    <!-- 转写文本区 -->
    <scroll-view scroll-y class="transcript" :scroll-into-view="scrollIntoId" scroll-with-animation>
      <view class="transcript__inner">
        <view
          v-for="(seg, i) in transcript"
          :key="i"
          :id="`seg-${i}`"
          :class="['seg', i === transcript.length - 1 ? 'seg--current' : '']"
        >
          <text class="seg__time">{{ formatTime(seg.timestamp) }}</text>
          <text class="seg__text">{{ seg.text }}</text>
        </view>
        <view id="seg-typing" v-if="status === 'recording'" class="seg seg--typing">
          <text class="seg__cursor">▎</text>
          <text class="seg__typing-text">正在识别...</text>
        </view>
        <!-- 空状态 -->
        <view v-if="transcript.length === 0 && status !== 'recording'" class="transcript__empty">
          <text class="transcript__empty-icon">🎙</text>
          <text class="transcript__empty-text">开始录音后转写内容将显示在这里</text>
        </view>
      </view>
    </scroll-view>

    <!-- 标记按钮栏 -->
    <scroll-view scroll-x class="mark-scroll">
      <view class="mark-list">
        <view
          v-for="m in markTypes"
          :key="m.key"
          :class="['mark-chip', lastMark === m.key ? 'mark-chip--active' : '']"
          @tap="addMark(m.key)"
        >
          <text class="mark-chip__icon">{{ m.icon }}</text>
          <text class="mark-chip__label">{{ m.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view class="footer__btn footer__btn--pause" @tap="togglePause">
        <text>{{ status === 'paused' ? '▶ ' + t('record.resume') : '⏸ ' + t('record.pause') }}</text>
      </view>
      <view class="footer__btn footer__btn--end" @tap="confirmEnd">
        <text>⏹ {{ t('record.stopRecording') }}</text>
      </view>
      <view class="footer__safe" />
    </view>

    <!-- 时间轴 BottomSheet -->
    <view v-if="showTimeline" class="sheet-mask sheet-mask--visible" @tap="showTimeline = false">
      <view class="sheet" @tap.stop>
        <view class="sheet__handle" />
        <view class="sheet__header">
          <text class="sheet__title">⏱ Timeline</text>
          <text class="sheet__close" @tap="showTimeline = false">✕</text>
        </view>
        <scroll-view scroll-y class="sheet__scroll">
          <view v-if="marks.length === 0" class="sheet__empty"><text>还没有标记</text></view>
          <TimelineMark
            v-for="m in marks"
            :key="m.id"
            :mark="m"
            :show-actions="true"
            @explain="mockExplain(m)"
            @play="uni.showToast({ title: 'Mock 播放', icon: 'none' })"
            @review="uni.showToast({ title: '已标记复习', icon: 'success' })"
          />
        </scroll-view>
      </view>
    </view>

    <!-- 时间轴入口 FAB -->
    <view class="timeline-fab" @tap="showTimeline = true">
      <text class="timeline-fab__icon">⏱</text>
      <text v-if="marks.length" class="timeline-fab__badge">{{ marks.length }}</text>
    </view>

    <!-- 确认结束弹窗 -->
    <view v-if="showEndConfirm" class="confirm-mask confirm-mask--visible">
      <view class="confirm">
        <text class="confirm__title">确定结束本次课堂？</text>
        <text class="confirm__sub">已记录 {{ transcript.length }} 条转写，{{ marks.length }} 个标记</text>
        <view class="confirm__btns">
          <view class="confirm__btn confirm__btn--cancel" @tap="showEndConfirm = false"><text>{{ t('common.cancel') }}</text></view>
          <view class="confirm__btn confirm__btn--ok" @tap="endClass"><text>结束课堂</text></view>
        </view>
      </view>
    </view>

    <!-- Processing Overlay -->
    <view v-if="processing" class="processing">
      <text class="processing__icon">✨</text>
      <text class="processing__title">AI 正在整理你的课堂...</text>
      <view class="processing__steps">
        <view v-for="(step, i) in processingSteps" :key="i" class="processing__step">
          <text class="processing__step-text">{{ step.label }}</text>
          <text :class="['processing__step-icon', step.done ? 'done' : step.active ? 'active' : '']">
            {{ step.done ? '✓' : step.active ? '⟳' : '⏳' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onShow, onHide } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useRecordStore } from '@/stores/useRecordStore'
import type { MarkType, TimelineMarkItem } from '@/types/index'

const { t } = useI18n()
const recordStore = useRecordStore()
const { status, config, elapsed, accuracy, transcript, marks, wsStatus, wsRetryCount } = storeToRefs(recordStore)

const showTimeline = ref(false)
const showEndConfirm = ref(false)
const processing = ref(false)
const lastMark = ref<string>('')

// 用 scroll-into-view 替代 scroll-top，避免长列表卡顿
const scrollIntoId = computed(() => {
  if (status.value === 'recording') return 'seg-typing'
  const len = transcript.value.length
  return len > 0 ? `seg-${len - 1}` : ''
})

const markTypes = [
  { key: 'unclear', icon: '❓', label: 'Confusing' },
  { key: 'keypoint', icon: '⭐', label: 'Important' },
  { key: 'examPoint', icon: '📝', label: 'Exam' },
  { key: 'question', icon: '💬', label: 'Question' },
]

const timerStr = computed(() => {
  const h = Math.floor(elapsed.value / 3600)
  const m = Math.floor((elapsed.value % 3600) / 60)
  const s = elapsed.value % 60
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
})

// ── 计时器 ──────────────────────────────────────────────────────
let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
  if (timer) return
  timer = setInterval(() => {
    if (status.value === 'recording') elapsed.value++
  }, 1000)
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

// ── App 生命周期：切后台/切前台 ──────────────────────────────────
let isBackground = false

onHide(() => {
  isBackground = true
  stopTimer()
  // WS 保持运行，后台网络仍可重连
})

onShow(() => {
  if (!isBackground) return
  isBackground = false
  if (status.value === 'recording') {
    startTimer()
    // 若 WS 已断开，切回前台立即触发重连
    if (wsStatus.value !== 'connected') {
      recordStore.resumeWs()
    }
  }
})

// ── 网络变化：WiFi↔4G 切换后触发重连 ────────────────────────────
const handleNetworkChange = (res: { isConnected: boolean }) => {
  if (res.isConnected && status.value === 'recording') {
    if (wsStatus.value === 'reconnecting' || wsStatus.value === 'disconnected') {
      recordStore.resumeWs()
    }
  }
}
uni.onNetworkStatusChange(handleNetworkChange)

// ── 来电中断：录音自动暂停/恢复 ─────────────────────────────────
// #ifdef APP-PLUS
try {
  plus.globalEvent.addEventListener('pause', () => {
    if (status.value === 'recording') {
      recordStore.pauseRecording()
      stopTimer()
    }
  })
  plus.globalEvent.addEventListener('resume', () => {
    if (status.value === 'paused') {
      recordStore.resumeRecording()
      startTimer()
    }
  })
} catch {}
// #endif

onUnmounted(() => {
  stopTimer()
  uni.offNetworkStatusChange(handleNetworkChange)
})

startTimer()

// ── 录音控制 ─────────────────────────────────────────────────────
function togglePause() {
  if (status.value === 'recording') {
    recordStore.pauseRecording()
    stopTimer()
  } else if (status.value === 'paused') {
    recordStore.resumeRecording()
    startTimer()
  }
}

// 防抖：防止连击标记
let markCooldown = false
function addMark(type: string) {
  if (markCooldown) return
  markCooldown = true
  const excerpts = transcript.value
  const excerpt = excerpts.length ? excerpts[excerpts.length - 1].text.slice(0, 50) : '（无转写内容）'
  recordStore.addMark(type as MarkType, excerpt)
  lastMark.value = type
  uni.showToast({ title: '已标记', icon: 'none', duration: 800 })
  setTimeout(() => { lastMark.value = ''; markCooldown = false }, 1000)
}

// 防抖：防止重复点击结束
let endCooldown = false
function confirmEnd() {
  if (endCooldown) return
  endCooldown = true
  showEndConfirm.value = true
  setTimeout(() => { endCooldown = false }, 500)
}

function endClass() {
  showEndConfirm.value = false
  processing.value = true
  stopTimer()
  startProcessing()
}

const processingSteps = ref([
  { label: '正在保存录音...', done: false, active: true },
  { label: '正在生成 AI 总结...', done: false, active: false },
  { label: '正在整理时间轴标记...', done: false, active: false },
  { label: '正在识别重点知识点...', done: false, active: false },
  { label: '正在个性化分析...', done: false, active: false },
])

function startProcessing() {
  let step = 0
  const advance = () => {
    if (step > 0) processingSteps.value[step - 1].done = true
    if (step < processingSteps.value.length) {
      processingSteps.value[step].active = true
      step++
      setTimeout(advance, 1200)
    } else {
      processingSteps.value[step - 1].done = true
      // 启动 AI 总结轮询（最长 90s）
      recordStore.startSummaryPolling('mock-session', () => {})
      setTimeout(() => {
        processing.value = false
        recordStore.stopRecording()
        uni.redirectTo({ url: '/pages/record/summary' })
      }, 500)
    }
  }
  advance()
}

function mockExplain(mark: TimelineMarkItem) {
  uni.showToast({ title: '加载 AI 解析...', icon: 'none' })
  setTimeout(() => {
    mark.aiExplanation = 'AI 解析：这是一个关于细胞分裂的重要概念，在考试中经常出现。'
  }, 1000)
}

function formatTime(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
</script>

<style scoped lang="scss">
.page { height: 100vh; background: $color-bg-card; display: flex; flex-direction: column; overflow: hidden; }
.safe-top { height: var(--status-bar-height, 44px); }

// WS 状态横幅
.ws-banner {
  display: flex; align-items: center; gap: $spacing-xs;
  padding: $spacing-xs $spacing-lg; font-size: $font-size-sm;
  &--warn { background: #FEF3C7; color: #92400E; }
  &--error { background: #FEE2E2; color: #991B1B; }
  &__icon { font-size: 24rpx; }
  &__text { flex: 1; }
}

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-sm $spacing-lg; background: $color-bg-card; border-bottom: 1rpx solid #F0F0F5;
  &__left { display: flex; align-items: center; gap: $spacing-sm; }
  &__course { font-size: $font-size-md; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__status { display: flex; align-items: center; gap: 4rpx; padding: 4rpx 12rpx; border-radius: $radius-round; background: #F3F4F6; &--live { background: #D1FAE5; } }
  &__status-dot { font-size: 16rpx; color: $color-success; }
  &__status-text { font-size: $font-size-xs; color: $color-text-secondary; }
  &__right { display: flex; align-items: center; gap: $spacing-sm; }
  &__device { font-size: 32rpx; }
  &__timer { font-size: $font-size-xl; font-weight: $font-weight-bold; color: $color-text-primary; font-variant-numeric: tabular-nums; }
}
.accuracy-bar {
  display: flex; align-items: center; gap: $spacing-sm; padding: $spacing-xs $spacing-lg;
  background: $color-bg-card; border-bottom: 1rpx solid #F0F0F5;
  &__label { font-size: $font-size-xs; color: $color-text-tertiary; }
  &__track { flex: 1; height: 8rpx; background: #F3F4F6; border-radius: 4rpx; overflow: hidden; }
  &__fill { height: 100%; background: $color-success; border-radius: 4rpx; transition: width 0.5s; }
  &__value { font-size: $font-size-xs; color: $color-success; font-weight: $font-weight-medium; }
}
.transcript { flex: 1; background: $color-bg-page; }
.transcript__inner { padding: $spacing-md $spacing-lg; display: flex; flex-direction: column; gap: $spacing-md; min-height: 200rpx; }
.transcript__empty {
  display: flex; flex-direction: column; align-items: center; padding: $spacing-xl 0;
  &-icon { font-size: 80rpx; margin-bottom: $spacing-md; }
  &-text { font-size: $font-size-md; color: $color-text-tertiary; }
}
.seg {
  background: $color-bg-card; border-radius: $radius-lg; padding: $spacing-sm $spacing-md;
  &--current { background: #EEF2FF; border-left: 4rpx solid $color-primary; }
  &--typing { display: flex; align-items: center; gap: $spacing-xs; }
  &__time { font-size: $font-size-xs; color: $color-text-tertiary; display: block; margin-bottom: 4rpx; }
  &__text { font-size: $font-size-md; color: $color-text-primary; line-height: $line-height-relaxed; }
  &__cursor { font-size: $font-size-xl; color: $color-primary; animation: blink 1s step-end infinite; }
  &__typing-text { font-size: $font-size-sm; color: $color-text-tertiary; }
}
@keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
.mark-scroll { background: $color-bg-card; border-top: 1rpx solid #F0F0F5; }
.mark-list { display: flex; gap: $spacing-sm; padding: $spacing-sm $spacing-lg; }
.mark-chip {
  display: flex; align-items: center; gap: $spacing-xs; padding: $spacing-xs $spacing-md;
  border-radius: $radius-round; background: #F3F4F6; border: 2rpx solid transparent; flex-shrink: 0;
  &--active { background: #EEF2FF; border-color: $color-primary; }
  &__icon { font-size: 28rpx; }
  &__label { font-size: $font-size-sm; color: $color-text-primary; white-space: nowrap; }
}
.footer {
  display: flex; gap: $spacing-md; padding: $spacing-sm $spacing-lg;
  background: $color-bg-card; border-top: 1rpx solid #F0F0F5;
  &__btn {
    flex: 1; height: 96rpx; border-radius: $radius-lg; display: flex; align-items: center; justify-content: center;
    font-size: $font-size-md; font-weight: $font-weight-medium;
    &--pause { background: #EEF2FF; color: $color-primary; }
    &--end { background: #FEE2E2; color: $color-error; }
  }
  &__safe { height: env(safe-area-inset-bottom); }
}
.timeline-fab {
  position: fixed; right: 32rpx; bottom: 180rpx; width: 96rpx; height: 96rpx;
  background: $color-bg-card; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  box-shadow: $shadow-lg; z-index: 10;
  &__icon { font-size: 40rpx; }
  &__badge {
    position: absolute; top: 0; right: 0; width: 36rpx; height: 36rpx; border-radius: 50%;
    background: $color-error; color: #fff; font-size: $font-size-xs; display: flex; align-items: center; justify-content: center;
  }
}
.sheet-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; display: flex; align-items: flex-end;
  background: rgba(0,0,0,0); transition: background $transition-normal;
  &--visible { background: rgba(0,0,0,0.4); }
}
.sheet {
  width: 100%; background: $color-bg-card; border-radius: $radius-2xl $radius-2xl 0 0;
  padding: $spacing-md $spacing-lg; max-height: 60vh; display: flex; flex-direction: column;
  transform: translateY(100%); transition: transform $transition-normal;
  .sheet-mask--visible & { transform: translateY(0); }
  &__handle { width: 80rpx; height: 8rpx; background: #E5E7EB; border-radius: 4rpx; margin: 0 auto $spacing-md; }
  &__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: $spacing-md; }
  &__title { font-size: $font-size-xl; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__close { font-size: 36rpx; color: $color-text-tertiary; }
  &__scroll { flex: 1; }
  &__empty { padding: $spacing-xl; text-align: center; color: $color-text-tertiary; font-size: $font-size-md; }
}
.confirm-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0); transition: background $transition-normal;
  &--visible { background: rgba(0,0,0,0.5); }
}
.confirm {
  width: 600rpx; background: $color-bg-card; border-radius: $radius-2xl; padding: $spacing-xl $spacing-lg;
  transform: scale(0.9); opacity: 0; transition: transform $transition-normal, opacity $transition-normal;
  .confirm-mask--visible & { transform: scale(1); opacity: 1; }
  &__title { font-size: $font-size-xl; font-weight: $font-weight-bold; color: $color-text-primary; text-align: center; display: block; }
  &__sub { font-size: $font-size-sm; color: $color-text-secondary; text-align: center; display: block; margin-top: $spacing-sm; }
  &__btns { display: flex; gap: $spacing-md; margin-top: $spacing-xl; }
  &__btn {
    flex: 1; height: 88rpx; border-radius: $radius-lg; display: flex; align-items: center; justify-content: center;
    font-size: $font-size-md; font-weight: $font-weight-medium;
    &--cancel { background: #F3F4F6; color: $color-text-secondary; }
    &--ok { background: $color-error; color: #fff; }
  }
}
.processing {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: $color-bg-card; z-index: 300;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: $spacing-lg;
  &__icon { font-size: 120rpx; }
  &__title { font-size: $font-size-2xl; font-weight: $font-weight-bold; color: $color-text-primary; }
  &__steps { display: flex; flex-direction: column; gap: $spacing-md; width: 560rpx; }
  &__step { display: flex; align-items: center; justify-content: space-between; }
  &__step-text { font-size: $font-size-md; color: $color-text-secondary; }
  &__step-icon { font-size: $font-size-lg; &.done { color: $color-success; } &.active { color: $color-info; } }
}
</style>
