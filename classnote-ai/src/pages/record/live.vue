<template>
  <AppSubPage
    title=""
    subtitle=""
    :fixed-bottom="true"
    :fixed-bottom-height="300"
    :custom-back="true"
    @back="showLeaveConfirm = true"
  >
    <template #right>
      <view class="live-state">
        <view class="live-state__dot" :class="{ 'live-state__dot--paused': recordStore.isPaused }" />
        <text>实时</text>
      </view>
    </template>

    <view class="live-body">
      <view v-if="recordStore.deviceDisconnected" class="alert">
        <text class="alert__text">{{ t('record.earbudsDisconnected') }}</text>
      </view>

      <view class="metric-card">
        <view class="metric-card__cell">
          <text class="metric-card__icon">◷</text>
          <text class="metric-card__time">{{ formatTime(recordStore.duration) }}</text>
        </view>
        <view class="metric-card__divider" />
        <view class="metric-card__cell metric-card__cell--right">
          <text class="metric-card__label">准确率</text>
          <text class="metric-card__accuracy">{{ recordStore.accuracy }}%</text>
        </view>
      </view>

      <AppCard padding="sm" class="transcript-shell">
        <scroll-view scroll-y class="transcript-scroll" :scroll-top="scrollTop" :scroll-with-animation="true">
          <!-- Phase 11-B: App 真机录音提示 -->
          <view v-if="recordStore.isAppRuntime() && recordStore.isRecording" class="segments__waiting">
            <text class="segments__waiting-text">🎙 正在录音，结束后将自动生成转写和 AI 总结。</text>
          </view>
          <view v-else-if="recordStore.asrError" class="segments__waiting">
            <text class="segments__waiting-text" style="color: #ef4444;">{{ recordStore.asrError }}</text>
          </view>
          <view v-else-if="recordStore.micPermissionError" class="segments__waiting">
            <text class="segments__waiting-text">请允许麦克风权限后重试</text>
          </view>
          <view v-else-if="recordStore.asrConnecting" class="segments__waiting">
            <text class="segments__waiting-text">正在连接实时转写服务...</text>
            <view class="segments__waiting-dots">
              <view v-for="i in 3" :key="i" class="segments__waiting-dot" :style="{ animationDelay: (i * 0.2) + 's' }" />
            </view>
          </view>
          <view v-else-if="displaySegments.length === 0 && !recordStore.currentPartialTranscript" class="segments__waiting">
            <text class="segments__waiting-text">请开始讲话，听刻正在实时转写...</text>
            <view class="segments__waiting-dots">
              <view v-for="i in 3" :key="i" class="segments__waiting-dot" :style="{ animationDelay: (i * 0.2) + 's' }" />
            </view>
          </view>

          <view
            v-for="(seg, i) in displaySegments"
            :key="seg.id"
            class="segment"
            :class="{ 'segment--active': i === 1 || (i === displaySegments.length - 1 && recordStore.isRecording && !recordStore.isPaused) }"
          >
            <view class="segment__rail">
              <text class="segment__time">{{ formatTime(seg.time) }}</text>
              <view class="segment__dot" />
              <view v-if="i < displaySegments.length - 1" class="segment__line" />
            </view>
            <text class="segment__text">{{ seg.text }}</text>
          </view>

          <view v-if="recordStore.currentPartialTranscript" class="segment segment--active">
            <view class="segment__rail">
              <text class="segment__time">...</text>
              <view class="segment__dot" />
            </view>
            <text class="segment__text" style="opacity: 0.6;">{{ recordStore.currentPartialTranscript }}</text>
          </view>
        </scroll-view>
      </AppCard>
    </view>

    <template #fixedBottom>
      <view class="live-fixed">
        <view class="waveform" :class="{ 'waveform--paused': recordStore.isPaused }">
          <view
            v-for="(h, i) in barHeights"
            :key="i"
            class="waveform__bar"
            :class="{ 'waveform__bar--active': i >= 9 && i <= 14 }"
            :style="{ height: h + 'rpx', animationDelay: (i * 0.04) + 's' }"
          />
          <view class="waveform__cursor" />
        </view>

        <scroll-view scroll-x class="mark-scroll" :show-scrollbar="false">
          <view class="mark-scroll__row">
            <AppChip
              v-for="mt in markTypes"
              :key="mt"
              :label="markLabels[mt]"
              :icon="markMeta[mt].icon"
              :variant="markMeta[mt].variant"
              @tap="addMark(mt)"
            />
          </view>
        </scroll-view>

        <view class="bottom-bar">
          <view class="bottom-bar__side" @tap="showTimeline = true">
            <view class="bottom-bar__round">≡</view>
            <text class="bottom-bar__label">时间轴</text>
          </view>
          <view class="bottom-bar__center" @tap="showEndConfirm = true">
            <text class="bottom-bar__stop-icon">■</text>
            <text class="bottom-bar__stop-label">结束课堂</text>
          </view>
          <view class="bottom-bar__side" @tap="togglePause">
            <view class="bottom-bar__round">{{ recordStore.isPaused ? '▶' : 'Ⅱ' }}</view>
            <text class="bottom-bar__label">{{ recordStore.isPaused ? t('record.resume') : t('record.pause') }}</text>
          </view>
        </view>
      </view>
    </template>

    <TimelineSheet :visible="showTimeline" :marks="recordStore.marks" @close="showTimeline = false" @explain="onAIExplain" @play="onPlay" />

    <view v-if="showEndConfirm" class="confirm-mask" @tap="showEndConfirm = false">
      <view class="end-options" @tap.stop>
        <text class="end-options__title">{{ t('record.endClassOptionsTitle') }}</text>
        <text class="end-options__desc">{{ t('record.endClassOptionsDesc') }}</text>

        <view class="end-options__item" @tap.stop="showEndConfirm = false">
          <text class="end-options__item-icon">●</text>
          <view class="end-options__item-body">
            <text class="end-options__item-title">{{ t('record.continueRecording') }}</text>
          </view>
        </view>

        <view class="end-options__item" @tap.stop="handleSaveOnly">
          <text class="end-options__item-icon">▤</text>
          <view class="end-options__item-body">
            <text class="end-options__item-title">{{ t('record.saveRecordingOnly') }}</text>
            <text class="end-options__item-desc">{{ t('record.saveRecordingOnlyDesc') }}</text>
          </view>
        </view>

        <view class="end-options__item end-options__item--accent" @tap.stop="handleEndClass">
          <text class="end-options__item-icon">✓</text>
          <view class="end-options__item-body">
            <text class="end-options__item-title">{{ t('record.generateSummaryNow') }}</text>
            <text class="end-options__item-desc">{{ t('record.generateSummaryNowDesc') }}</text>
          </view>
        </view>

        <view class="end-options__cancel" @tap.stop="showEndConfirm = false">
          <text class="end-options__cancel-text">{{ t('common.cancel') }}</text>
        </view>
      </view>
    </view>

    <view v-if="showLeaveConfirm" class="confirm-mask" @tap="showLeaveConfirm = false">
      <view class="confirm-card" @tap.stop>
        <text class="confirm-card__title">{{ t('record.leaveTitle') }}</text>
        <text class="confirm-card__desc">{{ t('record.leaveContent') }}</text>
        <view class="confirm-card__actions">
          <view class="confirm-card__btn confirm-card__btn--danger" @tap.stop="handleLeaveAndAbandon">{{ t('record.leaveAbandon') }}</view>
          <view class="confirm-card__btn" @tap.stop="showLeaveConfirm = false">{{ t('record.leaveContinue') }}</view>
        </view>
      </view>
    </view>

    <ProcessingOverlay :visible="recordStore.processing" @done="onProcessingDone" />
  </AppSubPage>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useRecordStore } from '@/stores/useRecordStore'
import type { MarkType, TimelineMark } from '@/types'
import AppSubPage from '@/components/layout/AppSubPage.vue'
import AppCard from '@/components/layout/AppCard.vue'
import AppChip from '@/components/ui/AppChip.vue'
import TimelineSheet from './components/TimelineSheet.vue'
import ProcessingOverlay from './components/ProcessingOverlay.vue'

const { t } = useI18n()
const recordStore = useRecordStore()

const showTimeline = ref(false)
const showEndConfirm = ref(false)
const showLeaveConfirm = ref(false)
const scrollTop = ref(0)

const markTypes: MarkType[] = ['confusing', 'important', 'exam', 'question', 'review']
const markLabels: Record<MarkType, string> = {
  confusing: '没听懂',
  important: '重点',
  exam: '考点',
  question: '疑问',
  review: '复习',
}
const markMeta: Record<MarkType, { icon: string; variant: 'default' | 'primary' | 'warning' | 'success' }> = {
  confusing: { icon: '?', variant: 'primary' },
  important: { icon: '★', variant: 'warning' },
  exam: { icon: '◎', variant: 'primary' },
  question: { icon: '?', variant: 'default' },
  review: { icon: '▱', variant: 'success' },
}

const barHeights = ref<number[]>([14, 18, 12, 22, 34, 18, 40, 24, 28, 42, 56, 38, 46, 34, 60, 28, 22, 18, 14, 12, 18, 24, 16, 12])

const displaySegments = computed(() => {
  return recordStore.transcriptSegments.slice(-8)
})

let durationTimer: ReturnType<typeof setInterval> | null = null

onLoad((query) => {
  const sessionId = query?.sessionId
  // Phase 11-B: App 模式 sessionId 可能是 'app-recording-pending'
  if (sessionId && sessionId !== 'app-recording-pending') {
    recordStore.currentSessionId = sessionId
  } else if (recordStore.isAppRuntime()) {
    // App 模式：不需要预创建的 sessionId
    console.log('[live] App mode: no pre-created session, will upload file later')
  } else if (!recordStore.currentSessionId) {
    uni.showToast({ title: '课堂会话不存在', icon: 'none' })
    setTimeout(() => uni.switchTab({ url: '/pages/agent/index' }), 1000)
  }
})

function startTimers() {
  if (!durationTimer) {
    durationTimer = setInterval(() => {
      if (recordStore.isRecording && !recordStore.isPaused) recordStore.duration++
    }, 1000)
  }
}

function stopTimers() {
  if (durationTimer) { clearInterval(durationTimer); durationTimer = null }
}

function togglePause() {
  if (recordStore.isPaused) recordStore.resumeRecording()
  else recordStore.pauseRecording()
}

function addMark(type: MarkType) {
  // Phase 11-B: App 真机文件录音模式下标记暂不支持
  if (recordStore.isAppRuntime()) {
    uni.showToast({ title: '真机文件录音模式下标记将在下一阶段接入', icon: 'none' })
    return
  }
  // Phase 10-D: 获取最近转写段落作为 contextText
  const segments = recordStore.transcriptSegments
  const contextText = segments.length > 0 ? segments[segments.length - 1].text : ''
  recordStore.addRemoteMarker(type, t('mark.' + type), { contextText })
  uni.showToast({ title: `已标记「${markLabels[type]}」`, icon: 'none', duration: 1200 })
}

function onAIExplain(_m: TimelineMark) {
  uni.showToast({ title: t('record.aiExplainLater'), icon: 'none', duration: 1500 })
}

function onPlay(_m: TimelineMark) {
  uni.showToast({ title: t('record.playbackComingSoon'), icon: 'none', duration: 1500 })
}

function handleEndClass() {
  showEndConfirm.value = false
  stopTimers()
  recordStore.endRecording()
}

function onProcessingDone() {
  // Phase 11-B Hotfix: App 文件录音模式由 uploadAppRecording 直接导航，不走这里
  if (recordStore.isAppUploading) {
    return
  }
  recordStore.processing = false

  // 有错误时不跳转 summary，显示 Toast
  if (recordStore.summaryError) {
    const errorMap: Record<string, string> = {
      TRANSCRIPT_EMPTY: '当前没有可用于总结的转写内容，请确认实时转写已成功识别',
      DEEPSEEK_NOT_CONFIGURED: 'DeepSeek API Key 未配置，请检查后端环境变量',
      DEEPSEEK_PROCESS_FAILED: 'DeepSeek 总结生成失败，请稍后重试',
      AI_SERVICE_UNAVAILABLE: 'AI 总结服务未启动，请检查后端 AI service',
      SUMMARY_TIMEOUT: 'AI 总结生成超时，请稍后重试',
      SESSION_MISSING: '课堂会话不存在',
      BACKEND_CORS: '后端连接失败，请检查后端服务',
    }
    const msg = errorMap[recordStore.summaryError] || `总结失败: ${recordStore.summaryError}`
    uni.showToast({ title: msg, icon: 'none', duration: 3000 })
    return
  }

  const sid = recordStore.currentSessionId
  const url = sid ? `/pages/record/summary?sessionId=${sid}&from=record` : '/pages/record/summary?from=record'
  uni.navigateTo({ url })
}

async function handleSaveOnly() {
  showEndConfirm.value = false
  stopTimers()
  await recordStore.saveRecordingOnly()
  uni.showToast({ title: '录音已保存，可稍后生成总结', icon: 'success', duration: 1500 })
  setTimeout(() => {
    // Phase 10-E: 尝试回到 Space Detail，否则回知识库
    const spaceId = recordStore.config.courseId || ''
    const spaceName = recordStore.courseName || ''
    if (spaceId) {
      uni.redirectTo({ url: `/pages/knowledge/course?spaceId=${encodeURIComponent(spaceId)}&spaceName=${encodeURIComponent(spaceName)}` })
    } else {
      uni.switchTab({ url: '/pages/knowledge/index' })
    }
  }, 800)
}

function handleLeaveAndAbandon() {
  showLeaveConfirm.value = false
  stopTimers()
  if (recordStore.isRecording) recordStore.pauseRecording()
  uni.switchTab({ url: '/pages/agent/index' })
}

onBackPress(() => {
  if (showEndConfirm.value) return true
  showLeaveConfirm.value = true
  return true
})

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

onMounted(() => {
  if (!recordStore.isRecording) recordStore.startRecording()
  startTimers()

  // Phase 11-B: App 真机用 uni.getRecorderManager，H5 用 WebAudio + WebSocket
  if (recordStore.isAppRuntime()) {
    recordStore.startAppRecording()
  } else if (recordStore.currentSessionId) {
    recordStore.startAsrStreaming(recordStore.currentSessionId)
  }
})

onUnmounted(() => { stopTimers() })
</script>

<style lang="scss" scoped>
.live-state {
  min-width: 96rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10rpx;
  font-size: 26rpx;
  color: #111827;
  white-space: nowrap;
}

.live-state__dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #2563eb;
}

.live-state__dot--paused { background: #9ca3af; }

.live-body {
  height: calc(100vh - env(safe-area-inset-top) - 136rpx - 28rpx - 300rpx - env(safe-area-inset-bottom));
  min-height: 560rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  box-sizing: border-box;
}

.alert {
  padding: 18rpx 24rpx;
  background: #fff7ed;
  border: 1rpx solid #fed7aa;
  border-radius: 20rpx;
}

.alert__text { font-size: 24rpx; color: #f97316; }

.metric-card {
  height: 116rpx;
  padding: 0 36rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 24rpx;
  background: #071744;
  box-shadow: 0 16rpx 36rpx rgba(7, 23, 68, 0.18);
  box-sizing: border-box;
  flex-shrink: 0;
}

.metric-card__cell {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.metric-card__cell--right { justify-content: flex-end; }
.metric-card__icon { color: #b8c5dd; font-size: 40rpx; }
.metric-card__time { color: #ffffff; font-size: 40rpx; font-weight: 800; letter-spacing: 1rpx; }
.metric-card__label { color: #c9d5ee; font-size: 26rpx; white-space: nowrap; }
.metric-card__accuracy { color: #93c5fd; font-size: 42rpx; font-weight: 800; }

.metric-card__divider {
  width: 1rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.24);
  margin: 0 26rpx;
}

.transcript-shell {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.transcript-scroll {
  height: 100%;
  box-sizing: border-box;
}

.segments__waiting {
  min-height: 360rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}

.segments__waiting-text {
  color: #6b7280;
  font-size: 26rpx;
}

.segments__waiting-dots {
  display: flex;
  gap: 10rpx;
}

.segments__waiting-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #2563eb;
  animation: pulse 1s infinite ease-in-out;
}

.segment {
  display: flex;
  gap: 24rpx;
  padding: 28rpx 4rpx;
  border-bottom: 1rpx solid #eef0f3;
}

.segment:last-child {
  border-bottom: 0;
}

.segment__rail {
  width: 128rpx;
  flex-shrink: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.segment__time {
  width: 128rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.2;
  text-align: center;
}

.segment--active .segment__time {
  color: #2563eb;
}

.segment__dot {
  width: 13rpx;
  height: 13rpx;
  margin-top: 20rpx;
  border-radius: 50%;
  background: #cbd5e1;
}

.segment--active .segment__dot {
  background: #2563eb;
}

.segment__line {
  width: 2rpx;
  height: 96rpx;
  margin-top: 6rpx;
  background: #dbe4f0;
}

.segment__text {
  flex: 1;
  min-width: 0;
  color: #111827;
  font-size: 30rpx;
  line-height: 1.85;
}

.live-fixed {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.waveform {
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  position: relative;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.05);
}

.waveform__bar {
  width: 5rpx;
  border-radius: 999rpx;
  background: #d7e0ef;
  animation: wave 1.2s infinite ease-in-out;
}

.waveform--paused .waveform__bar {
  animation-play-state: paused;
  opacity: 0.6;
}

.waveform__bar--active {
  background: #2563eb;
}

.waveform__cursor {
  position: absolute;
  left: 67%;
  top: 14rpx;
  bottom: 14rpx;
  width: 4rpx;
  border-radius: 999rpx;
  background: #2563eb;
}

.mark-scroll {
  width: 100%;
  white-space: nowrap;
}

.mark-scroll__row {
  display: inline-flex;
  gap: 16rpx;
  white-space: nowrap;
}

.bottom-bar {
  min-height: 92rpx;
  border-radius: 28rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 12rpx 20rpx;
  box-sizing: border-box;
}

.bottom-bar__side {
  width: 132rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: #071446;
  flex-shrink: 0;
}

.bottom-bar__round {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  border: 2rpx solid #071446;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 800;
}

.bottom-bar__label {
  font-size: 26rpx;
  white-space: nowrap;
}

.bottom-bar__center {
  flex: 1;
  min-height: 72rpx;
  border-radius: 999rpx;
  background: #2563eb;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  font-size: 28rpx;
  font-weight: 800;
  box-shadow: 0 14rpx 30rpx rgba(37, 99, 235, 0.22);
}

.bottom-bar__stop-icon {
  font-size: 20rpx;
}

.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.38);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 80;
}

.end-options,
.confirm-card {
  width: 100%;
  padding: 30rpx 32rpx calc(env(safe-area-inset-bottom) + 28rpx);
  border-radius: 34rpx 34rpx 0 0;
  background: #ffffff;
  box-sizing: border-box;
}

/* #ifdef H5 */
.end-options,
.confirm-card {
  max-width: 430px;
}
/* #endif */

.end-options__title,
.confirm-card__title {
  display: block;
  color: #111827;
  font-size: 34rpx;
  font-weight: 800;
}

.end-options__desc,
.confirm-card__desc {
  display: block;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 25rpx;
  line-height: 1.5;
}

.end-options__item {
  margin-top: 20rpx;
  padding: 22rpx;
  border: 1rpx solid #eef0f3;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.end-options__item--accent {
  border-color: #bfdbfe;
  background: #eef4ff;
}

.end-options__item-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 18rpx;
  background: #f7f8fa;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.end-options__item-body {
  flex: 1;
  min-width: 0;
}

.end-options__item-title {
  display: block;
  color: #111827;
  font-size: 28rpx;
  font-weight: 800;
}

.end-options__item-desc {
  display: block;
  margin-top: 6rpx;
  color: #6b7280;
  font-size: 23rpx;
}

.end-options__cancel {
  margin-top: 20rpx;
  height: 78rpx;
  border-radius: 24rpx;
  background: #f7f8fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.end-options__cancel-text {
  color: #6b7280;
  font-size: 27rpx;
  font-weight: 800;
}

.confirm-card__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.confirm-card__btn {
  flex: 1;
  height: 78rpx;
  border-radius: 24rpx;
  background: #f7f8fa;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27rpx;
  font-weight: 800;
}

.confirm-card__btn--danger {
  background: #fee2e2;
  color: #dc2626;
}

@keyframes pulse {
  0%, 100% { opacity: .35; transform: scale(.9); }
  50% { opacity: 1; transform: scale(1.1); }
}

@keyframes wave {
  0%, 100% { transform: scaleY(.72); }
  50% { transform: scaleY(1.12); }
}
</style>
