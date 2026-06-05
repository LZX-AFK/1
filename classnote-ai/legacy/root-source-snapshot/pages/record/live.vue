<template>
  <view class="live-page">
    <!-- M1: 顶部导航 -->
    <view class="nav">
      <text class="nav__end" @click="showEndConfirm = true">{{ t('record.end') }}</text>
      <text class="nav__title">{{ recordStore.courseName }}</text>
      <view class="nav__status">
        <view class="nav__dot" :class="{ 'nav__dot--paused': recordStore.isPaused }" />
        <text class="nav__status-text">{{ t('record.realTime') }} · {{ recordStore.formatDuration(recordStore.duration) }}</text>
        <text class="nav__accuracy">{{ t('record.accuracy') }} {{ recordStore.accuracy }}%</text>
      </view>
    </view>

    <!-- M2: 设备断开提示 -->
    <view v-if="recordStore.deviceDisconnected" class="alert">
      <text class="alert__text">⚠ {{ t('record.earbudsDisconnected') }}</text>
    </view>

    <!-- M3: 实时转写段落 -->
    <scroll-view class="segments" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view v-if="visibleSegments.length === 0" class="segments__waiting">
        <text class="segments__waiting-text">{{ t('record.waitingSpeech') }}</text>
        <view class="segments__waiting-dots">
          <view class="segments__waiting-dot" v-for="i in 3" :key="i" :style="{ animationDelay: (i * 0.2) + 's' }" />
        </view>
      </view>
      <view v-for="(seg, i) in visibleSegments" :key="seg.id" class="segment" :class="{ 'segment--active': i === visibleSegments.length - 1 && recordStore.isRecording && !recordStore.isPaused }">
        <text class="segment__time">{{ formatTime(seg.time) }}</text>
        <text class="segment__text">{{ seg.text }}</text>
      </view>
    </scroll-view>

    <!-- M4: 音频波形 -->
    <view class="waveform" :class="{ 'waveform--paused': recordStore.isPaused }">
      <view v-for="i in 20" :key="i" class="waveform__bar" :style="{ height: barHeights[i-1] + 'rpx', animationDelay: (i * 0.06) + 's' }" />
    </view>

    <!-- M5: 标记按钮 -->
    <scroll-view class="mark-btns" scroll-x>
      <view class="mark-btns__row">
        <text v-for="mt in markTypes" :key="mt"
          class="mark-btns__btn" :class="'mark-btns__btn--' + mt"
          @click="addMark(mt)">{{ t('mark.' + mt) }}</text>
      </view>
    </scroll-view>

    <!-- M6: 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-bar__side" @click="showTimeline = true">
        <text class="bottom-bar__tl-label">⏱ {{ t('record.timeline') }}</text>
      </view>
      <view class="bottom-bar__center" @click="showEndConfirm = true">
        <view class="bottom-bar__stop-btn">■</view>
        <text class="bottom-bar__stop-label">{{ t('record.endClass') }}</text>
      </view>
      <view class="bottom-bar__side" @click="togglePause">
        <text class="bottom-bar__pause-label">{{ recordStore.isPaused ? t('record.resume') : t('record.pause') }}</text>
      </view>
    </view>

    <!-- M7: 时间轴 BottomSheet -->
    <TimelineSheet :visible="showTimeline" :marks="recordStore.marks"
      @close="showTimeline = false" @explain="onAIExplain" @play="onPlay" />

    <!-- M8: 结束确认弹窗 -->
    <view v-if="showEndConfirm" class="confirm-mask" @click="showEndConfirm = false">
      <view class="confirm-card" @click.stop>
        <text class="confirm-card__title">{{ t('record.confirmEndTitle') }}</text>
        <text class="confirm-card__desc">{{ t('record.confirmEndContent') }}</text>
        <view class="confirm-card__actions">
          <view class="confirm-card__btn" @tap.stop="showEndConfirm = false">{{ t('common.cancel') }}</view>
          <view class="confirm-card__btn confirm-card__btn--danger" @tap.stop="handleEndClass">{{ t('common.confirm') }}</view>
        </view>
      </view>
    </view>

    <!-- M9: 离开确认弹窗（系统返回拦截） -->
    <view v-if="showLeaveConfirm" class="confirm-mask" @click="showLeaveConfirm = false">
      <view class="confirm-card" @click.stop>
        <text class="confirm-card__title">{{ t('record.leaveTitle') }}</text>
        <text class="confirm-card__desc">{{ t('record.leaveContent') }}</text>
        <view class="confirm-card__actions">
          <view class="confirm-card__btn confirm-card__btn--danger" @tap.stop="handleLeaveAndAbandon">{{ t('record.leaveAbandon') }}</view>
          <view class="confirm-card__btn" @tap.stop="showLeaveConfirm = false">{{ t('record.leaveContinue') }}</view>
        </view>
      </view>
    </view>

    <!-- M10: AI 处理 Overlay -->
    <ProcessingOverlay :visible="recordStore.processing" @done="onProcessingDone" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useRecordStore } from '@/stores/useRecordStore'
import type { MarkType, TimelineMark } from '@/types'
import TimelineSheet from './components/TimelineSheet.vue'
import ProcessingOverlay from './components/ProcessingOverlay.vue'

const { t } = useI18n()
const recordStore = useRecordStore()

// --- 本地 UI 状态 ---
const showTimeline = ref(false)
const showEndConfirm = ref(false)
const showLeaveConfirm = ref(false)
const scrollTop = ref(0)

// --- 标记类型列表 ---
const markTypes: MarkType[] = ['confusing', 'important', 'exam', 'question', 'review']

// --- 波形随机高度 ---
const barHeights = ref<number[]>(Array.from({ length: 20 }, () => 12 + Math.floor(Math.random() * 48)))

// --- 可见转写段落（切片到 currentSegmentIndex）---
const visibleSegments = computed(() =>
  recordStore.transcriptSegments.slice(0, recordStore.currentSegmentIndex)
)

// --- 计时器 ---
let durationTimer: ReturnType<typeof setInterval> | null = null
let segmentTimer: ReturnType<typeof setInterval> | null = null

function startTimers() {
  if (!durationTimer) {
    durationTimer = setInterval(() => {
      if (recordStore.isRecording && !recordStore.isPaused) {
        recordStore.duration++
      }
    }, 1000)
  }
  if (!segmentTimer) {
    segmentTimer = setInterval(() => {
      if (recordStore.isRecording && !recordStore.isPaused) {
        if (recordStore.currentSegmentIndex < recordStore.transcriptSegments.length) {
          recordStore.currentSegmentIndex++
          nextTick(() => { scrollTop.value = 99999 })
        }
      }
    }, 2500)
  }
}

function stopTimers() {
  if (durationTimer) { clearInterval(durationTimer); durationTimer = null }
  if (segmentTimer) { clearInterval(segmentTimer); segmentTimer = null }
}

// --- 暂停/继续 ---
function togglePause() {
  if (recordStore.isPaused) {
    recordStore.resumeRecording()
  } else {
    recordStore.pauseRecording()
  }
}

// --- 添加标记 ---
function addMark(type: MarkType) {
  recordStore.addMark(type, t('mark.' + type))
  uni.showToast({ title: t('record.markAdded'), icon: 'none', duration: 1200 })
}

// --- 时间轴交互 ---
function onAIExplain(_m: TimelineMark) {
  uni.showToast({ title: t('record.aiExplainLater'), icon: 'none', duration: 1500 })
}
function onPlay(_m: TimelineMark) {
  uni.showToast({ title: t('record.playbackComingSoon'), icon: 'none', duration: 1500 })
}

// --- 结束课堂 ---
function handleEndClass() {
  showEndConfirm.value = false
  stopTimers()
  recordStore.endRecording()
}

function onProcessingDone() {
  recordStore.processing = false
  uni.navigateTo({ url: '/pages/record/summary?id=mock-summary-001' })
}

// --- 系统返回拦截 ---
function handleLeaveAndAbandon() {
  showLeaveConfirm.value = false
  stopTimers()
  if (recordStore.isRecording) {
    recordStore.pauseRecording()
  }
  // 回到录音准备 Tab，不依赖不确定的页面栈
  uni.switchTab({ url: '/pages/record/prepare' })
}

onBackPress(() => {
  if (showEndConfirm.value) return true
  showLeaveConfirm.value = true
  return true
})

// --- 格式化 ---
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// --- 生命周期 ---
onMounted(() => {
  if (!recordStore.isRecording) {
    recordStore.startMockRecording()
  }
  startTimers()
})

onUnmounted(() => {
  stopTimers()
})
</script>

<style lang="scss" scoped>
.live-page {
  min-height: 100vh; background: #111827; padding: 0 0 0 0;
  display: flex; flex-direction: column; overflow-x: hidden;
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
}

// --- 导航 ---
.nav { padding: calc(env(safe-area-inset-top) + 60rpx) 32rpx 16rpx; }
.nav__end { font-size: 28rpx; color: #EF4444; }
.nav__title { font-size: 36rpx; font-weight: 700; color: #fff; display: block; margin-top: 12rpx; }
.nav__status { display: flex; align-items: center; gap: 12rpx; margin-top: 12rpx; }
.nav__dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #EF4444; flex-shrink: 0; }
.nav__dot--paused { background: #9CA3AF; }
.nav__status-text { font-size: 24rpx; color: #D1D5DB; }
.nav__accuracy { font-size: 24rpx; color: #10B981; }

// --- 设备断开 ---
.alert { margin: 0 32rpx 16rpx; padding: 20rpx 24rpx; background: rgba(239,68,68,0.15); border-radius: 12rpx; border: 1px solid rgba(239,68,68,0.3); }
.alert__text { font-size: 26rpx; color: #FCA5A5; }

// --- 转写区 ---
.segments { flex: 1; padding: 0 32rpx; max-height: 600rpx; }
.segments__waiting { padding: 80rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.segments__waiting-text { font-size: 28rpx; color: #6B7280; }
.segments__waiting-dots { display: flex; gap: 12rpx; }
.segments__waiting-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #4F46E5; animation: waitingPulse 1.2s infinite; }
@keyframes waitingPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.segment { padding: 20rpx 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.segment--active { background: rgba(79,70,229,0.08); border-left: 4rpx solid #4F46E5; padding-left: 28rpx; margin-left: -32rpx; border-radius: 0 8rpx 8rpx 0; }
.segment__time { font-size: 22rpx; color: #6B7280; font-family: monospace; margin-bottom: 6rpx; display: block; }
.segment__text { font-size: 28rpx; color: #E5E7EB; line-height: 1.7; }

// --- 波形 ---
.waveform { display: flex; align-items: flex-end; justify-content: center; gap: 6rpx; padding: 24rpx 32rpx; height: 80rpx; }
.waveform__bar { width: 8rpx; background: #4F46E5; border-radius: 4rpx; animation: waveAnim 0.8s ease-in-out infinite alternate; }
.waveform--paused .waveform__bar { animation-play-state: paused; background: #374151; }
@keyframes waveAnim {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

// --- 标记按钮 ---
.mark-btns { padding: 8rpx 32rpx; }
.mark-btns__row { display: flex; gap: 16rpx; white-space: nowrap; }
.mark-btns__btn { font-size: 24rpx; padding: 12rpx 20rpx; border-radius: 9999rpx; color: #fff; flex-shrink: 0; }
.mark-btns__btn--confusing { background: rgba(245,158,11,0.2); border: 1px solid rgba(245,158,11,0.4); }
.mark-btns__btn--important { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); }
.mark-btns__btn--exam { background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.4); }
.mark-btns__btn--question { background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4); }
.mark-btns__btn--review { background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.4); }

// --- 底部操作栏 ---
.bottom-bar { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 40rpx; position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: #1A1F2E; border-top: 1px solid rgba(255,255,255,0.06); box-sizing: border-box; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); z-index: 100; }
.bottom-bar__side { padding: 12rpx 16rpx; display: flex; align-items: center; }
.bottom-bar__tl-label { font-size: 26rpx; color: #D1D5DB; }
.bottom-bar__pause-label { font-size: 26rpx; color: #818CF8; }
.bottom-bar__center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 220rpx; min-height: 150rpx; padding: 16rpx 32rpx; }
.bottom-bar__stop-btn { width: 96rpx; height: 96rpx; border-radius: 50%; background: #EF4444; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 40rpx; }
.bottom-bar__stop-label { font-size: 20rpx; color: #6B7280; margin-top: 4rpx; }

// --- 结束/离开确认弹窗 ---
.confirm-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1500; display: flex; align-items: center; justify-content: center; }
.confirm-card { width: calc(100% - 96rpx); max-width: 380px; background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx; display: flex; flex-direction: column; align-items: center; }
.confirm-card__title { font-size: 32rpx; font-weight: 700; color: #1F2937; margin-bottom: 8rpx; }
.confirm-card__desc { font-size: 26rpx; color: #6B7280; text-align: center; margin-bottom: 32rpx; line-height: 1.6; }
.confirm-card__actions { display: flex; gap: 16rpx; width: 100%; }
.confirm-card__btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 12rpx; font-size: 28rpx; color: #6B7280; background: #F3F4F6; }
.confirm-card__btn--danger { background: #EF4444; color: #fff; }
</style>
