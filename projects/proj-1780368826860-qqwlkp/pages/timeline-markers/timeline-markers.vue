<template>
  <view class="page">
    <!-- ===== 自定义导航栏 ===== -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @click="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">课堂时间轴</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- ===== 课程信息栏 ===== -->
    <view class="course-info-bar">
      <view class="course-info-content">
        <text class="course-name">{{ sessionStore.courseTitle || '本次课堂' }}</text>
        <view class="course-meta">
          <text class="course-duration">⏱ {{ formattedDuration }}</text>
          <text class="course-divider">·</text>
          <text class="course-markers">📌 {{ filteredMarkerCount }} 个标记</text>
        </view>
      </view>
      <!-- 回放状态提示 -->
      <view v-if="isPlaying" class="playback-badge" @click="stopPlayback">
        <view class="playback-dot" />
        <text class="playback-text">{{ playbackTimeFormatted }}</text>
        <text class="playback-stop">■ 停止</text>
      </view>
    </view>

    <!-- ===== 标记类型 Tab ===== -->
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text class="tab-dot" :style="{ color: tab.color }">●</text>
        <text class="tab-label">{{ tab.label }}</text>
        <text v-if="tab.count > 0" class="tab-count">{{ tab.count }}</text>
      </view>
    </view>

    <!-- ===== 主内容区 ===== -->
    <scroll-view class="timeline-scroll" scroll-y :scroll-top="scrollTop">
      <!-- 空状态 -->
      <view v-if="filteredSegments.length === 0" class="empty-state">
        <text class="empty-icon">🗂</text>
        <text class="empty-title">
          {{ activeTab === 'all' ? '暂无课堂记录' : '该分类暂无标记' }}
        </text>
        <text class="empty-hint">
          {{ activeTab === 'all' ? '完成一次课堂录音后，这里会显示时间轴' : '切换到「全部」查看所有记录' }}
        </text>
      </view>

      <!-- 时间轴段落 -->
      <view v-for="(seg, segIdx) in filteredSegments" :key="seg.startMs" class="timeline-segment">
        <!-- 时间标签 + 竖线 -->
        <view class="segment-timeline">
          <view class="segment-time-col">
            <text class="segment-time-label">{{ formatMs(seg.startMs) }}</text>
            <view class="timeline-line" :class="{ 'is-last': segIdx === filteredSegments.length - 1 }" />
          </view>

          <!-- 段落卡片 -->
          <view class="segment-card" :class="{ 'has-markers': seg.markers.length > 0 }">
            <!-- 转写摘要 -->
            <view class="segment-body">
              <text v-if="seg.texts.length > 0" class="segment-text">
                {{ seg.texts.join(' ') }}
              </text>
              <text v-else class="segment-text segment-text--empty">
                （此段暂无转写内容）
              </text>

              <!-- 标记点列表 -->
              <view v-if="seg.markers.length > 0" class="marker-dots">
                <view
                  v-for="marker in seg.markers"
                  :key="marker.id"
                  class="marker-chip"
                  :style="{ borderColor: getMarkerColor(marker.label) }"
                  @click="openMarkerDetail(marker)"
                >
                  <view class="marker-chip-dot" :style="{ background: getMarkerColor(marker.label) }" />
                  <text class="marker-chip-label">{{ getMarkerLabelText(marker.label) }}</text>
                  <text class="marker-chip-time">{{ formatMs(marker.timestampMs) }}</text>
                </view>
              </view>
            </view>

            <!-- 操作栏 -->
            <view class="segment-actions">
              <text class="segment-range">{{ formatMs(seg.startMs) }} – {{ formatMs(seg.endMs) }}</text>
              <view class="replay-btn" @click="replaySegment(seg)">
                <text class="replay-icon">▶</text>
                <text class="replay-text">回放</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer" />
    </scroll-view>

    <!-- ===== 固定底部操作栏 ===== -->
    <view class="fixed-bottom-bar">
      <button class="bottom-btn primary" @click="goToSummary">
        🤖 查看 AI 总结详情
      </button>
    </view>

    <!-- ===== 标记详情弹窗 ===== -->
    <view v-if="activeMarker" class="modal-overlay" @click.self="closeMarkerDetail">
      <view class="marker-modal">
        <!-- 弹窗头部 -->
        <view class="modal-header">
          <view
            class="modal-label-badge"
            :style="{ background: getMarkerColor(activeMarker.label) + '22', borderColor: getMarkerColor(activeMarker.label) }"
          >
            <view class="modal-label-dot" :style="{ background: getMarkerColor(activeMarker.label) }" />
            <text class="modal-label-text" :style="{ color: getMarkerColor(activeMarker.label) }">
              {{ getMarkerLabelText(activeMarker.label) }}
            </text>
          </view>
          <text class="modal-time">{{ formatMs(activeMarker.timestampMs) }}</text>
          <view class="modal-close" @click="closeMarkerDetail">
            <text class="modal-close-icon">✕</text>
          </view>
        </view>

        <!-- 笔记 -->
        <view v-if="activeMarker.note" class="modal-block">
          <text class="modal-block-label">📝 我的笔记</text>
          <text class="modal-block-text">{{ activeMarker.note }}</text>
        </view>

        <!-- AI 解析（MVP Mock） -->
        <view class="modal-block modal-ai-block">
          <text class="modal-block-label">🤖 AI 解析</text>
          <text class="modal-block-text modal-ai-text">
            {{ getAiExplanation(activeMarker) }}
          </text>
        </view>

        <!-- 回放按钮 -->
        <view class="modal-actions">
          <view class="modal-replay-btn" @click="replayMarker(activeMarker)">
            <text class="modal-replay-icon">▶</text>
            <text class="modal-replay-text">从此处回放</text>
          </view>
          <view class="modal-cancel-btn" @click="closeMarkerDetail">
            <text class="modal-cancel-text">关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSessionStore, type Marker, type TranscriptSegment, getMarkerLabelText } from '@/stores/session'

const sessionStore = useSessionStore()

// ===== 系统信息 =====
const statusBarHeight = ref(20)
const scrollTop = ref(0)

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch {}
  initAudioContext()
})

onUnmounted(() => {
  destroyAudioContext()
})

// ===== 格式化工具 =====
function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const formattedDuration = computed(() => {
  const ms = sessionStore.recordingDurationMs
  if (ms <= 0) return '--:--'
  return formatMs(ms)
})

// ===== 标记颜色系统 =====
const MARKER_COLOR_MAP: Record<string, string> = {
  didnt_understand: '#FF6B6B',
  important: '#FFC107',
  exam_tip: '#6C63FF',
  question: '#448AFF',
  note: '#00D9A6',
}

function getMarkerColor(label: string): string {
  return MARKER_COLOR_MAP[label] || '#6E6E8A'
}

// ===== Tab 过滤 =====
type TabValue = 'all' | 'question' | 'important' | 'exam_tip' | 'didnt_understand'

const activeTab = ref<TabValue>('all')

const tabs = computed(() => [
  {
    value: 'all' as TabValue,
    label: '全部',
    color: '#B0B0C8',
    count: sessionStore.markers.length,
  },
  {
    value: 'question' as TabValue,
    label: '疑问',
    color: MARKER_COLOR_MAP.question,
    count: sessionStore.markers.filter((m) => m.label === 'question').length,
  },
  {
    value: 'important' as TabValue,
    label: '重点',
    color: MARKER_COLOR_MAP.important,
    count: sessionStore.markers.filter((m) => m.label === 'important').length,
  },
  {
    value: 'exam_tip' as TabValue,
    label: '考点',
    color: MARKER_COLOR_MAP.exam_tip,
    count: sessionStore.markers.filter((m) => m.label === 'exam_tip').length,
  },
  {
    value: 'didnt_understand' as TabValue,
    label: '没懂',
    color: MARKER_COLOR_MAP.didnt_understand,
    count: sessionStore.markers.filter((m) => m.label === 'didnt_understand').length,
  },
])

function switchTab(tab: TabValue) {
  activeTab.value = tab
  scrollTop.value = 0
}

const filteredMarkerCount = computed(() => {
  if (activeTab.value === 'all') return sessionStore.markers.length
  return sessionStore.markers.filter((m) => m.label === activeTab.value).length
})

// ===== 时间分段算法（30s/段） =====
const SEGMENT_DURATION_MS = 30_000

interface TimelineSegment {
  startMs: number
  endMs: number
  texts: string[]
  markers: Marker[]
}

function buildSegments(): TimelineSegment[] {
  const allMarkers = sessionStore.markers
  const allTranscripts = sessionStore.transcripts

  if (allMarkers.length === 0 && allTranscripts.length === 0) return []

  // 计算时间跨度
  const maxMs = Math.max(
    sessionStore.recordingDurationMs,
    allMarkers.reduce((m, mk) => Math.max(m, mk.timestampMs), 0),
    allTranscripts.reduce((m, t) => Math.max(m, t.end), 0),
  )

  if (maxMs <= 0) return []

  const segCount = Math.ceil(maxMs / SEGMENT_DURATION_MS)
  const segs: TimelineSegment[] = []

  for (let i = 0; i < segCount; i++) {
    const startMs = i * SEGMENT_DURATION_MS
    const endMs = Math.min((i + 1) * SEGMENT_DURATION_MS, maxMs)

    const texts = allTranscripts
      .filter((t) => t.start >= startMs && t.start < endMs && t.isFinal)
      .map((t) => t.text)
      .filter(Boolean)

    const segMarkers = allMarkers.filter(
      (mk) => mk.timestampMs >= startMs && mk.timestampMs < endMs,
    )

    segs.push({ startMs, endMs, texts, markers: segMarkers })
  }

  return segs
}

const allSegments = computed<TimelineSegment[]>(() => buildSegments())

const filteredSegments = computed<TimelineSegment[]>(() => {
  if (activeTab.value === 'all') {
    return allSegments.value
  }
  return allSegments.value.filter((seg) =>
    seg.markers.some((m) => m.label === activeTab.value),
  )
})

// ===== InnerAudioContext 回放 =====
let audioCtx: UniApp.InnerAudioContext | null = null
const isPlaying = ref(false)
const playbackMs = ref(0)
let playbackTimer: ReturnType<typeof setInterval> | null = null

const playbackTimeFormatted = computed(() => formatMs(playbackMs.value))

function initAudioContext() {
  const audioUrl = sessionStore.currentSession?.audioUrl
  if (!audioUrl) return

  audioCtx = uni.createInnerAudioContext()
  audioCtx.src = audioUrl
  audioCtx.autoplay = false

  audioCtx.onTimeUpdate(() => {
    if (audioCtx) {
      playbackMs.value = Math.floor(audioCtx.currentTime * 1000)
    }
  })

  audioCtx.onEnded(() => {
    stopPlayback()
  })

  audioCtx.onError((err) => {
    console.warn('[Timeline] Audio error:', err)
    stopPlayback()
  })
}

function destroyAudioContext() {
  stopPlayback()
  if (audioCtx) {
    audioCtx.destroy()
    audioCtx = null
  }
}

function replaySegment(seg: TimelineSegment) {
  seekAndPlay(seg.startMs)
}

function replayMarker(marker: Marker) {
  seekAndPlay(marker.timestampMs)
  closeMarkerDetail()
}

function seekAndPlay(ms: number) {
  if (!audioCtx) {
    // MVP 降级：无音频文件时提示
    uni.showToast({
      title: `⏱ 跳转至 ${formatMs(ms)}（音频文件暂不可用）`,
      icon: 'none',
      duration: 2000,
    })
    return
  }

  const seekSec = ms / 1000
  audioCtx.seek(seekSec)
  audioCtx.play()
  isPlaying.value = true
  playbackMs.value = ms
}

function stopPlayback() {
  if (audioCtx) {
    audioCtx.pause()
  }
  isPlaying.value = false
  if (playbackTimer) {
    clearInterval(playbackTimer)
    playbackTimer = null
  }
}

// ===== 标记详情弹窗 =====
const activeMarker = ref<Marker | null>(null)

function openMarkerDetail(marker: Marker) {
  activeMarker.value = marker
}

function closeMarkerDetail() {
  activeMarker.value = null
}

function getAiExplanation(marker: Marker): string {
  const explanations: Record<string, string> = {
    didnt_understand:
      '这个知识点是课程的一个难点。建议课后查阅教材的相关章节，或与同学讨论交流。如果仍有疑惑，可以在下次课后向教授请教——通常这类问题课后面对面讨论更容易理解。',
    important:
      '你标记的这个重点内容在课程体系中占有重要地位。建议在笔记中将其单独整理，并与前后章节的知识建立关联，形成系统性的理解框架。',
    exam_tip:
      '考点提示！教授在此处的讲解方式通常预示着这是考试中的高频考点。建议重点理解其定义、性质和应用场景，并准备相关的练习题进行巩固。',
    question:
      '你的疑问很有价值，说明你在主动思考。这个问题可能涉及到课程的核心逻辑，建议将其记录下来，在复习时专门针对这个疑问查阅资料，往往能够加深对整个知识体系的理解。',
    note:
      '你记录的这个笔记内容是课堂中的重要信息点。建议将其整合到系统性的笔记框架中，并在复习时与相关知识点进行对照参考。',
  }
  return explanations[marker.label] || '请结合上下文和课堂内容深入理解这个知识点。'
}

// ===== 导航 =====
function goBack() {
  uni.navigateBack({ delta: 1 })
}

function goToSummary() {
  uni.navigateTo({ url: '/pages/ai-summary/ai-summary' })
}
</script>

<style lang="scss" scoped>
// ===================== 页面容器 =====================
.page {
  min-height: 100vh;
  background: $color-bg-primary;
  display: flex;
  flex-direction: column;
}

// ===================== 自定义导航栏 =====================
.nav-bar {
  background: $color-bg-primary;
  position: sticky;
  top: 0;
  z-index: $z-index-sticky;
}

.nav-inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 $spacing-md;
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 52rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  line-height: 1;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.nav-placeholder {
  width: 64rpx;
}

// ===================== 课程信息栏 =====================
.course-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  background: $color-bg-secondary;
  border-bottom: 1px solid $color-border;
}

.course-info-content {
  flex: 1;
  overflow: hidden;
}

.course-name {
  display: block;
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6rpx;
}

.course-meta {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.course-duration,
.course-markers {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
}

.course-divider {
  font-size: $font-size-xs;
  color: $color-text-disabled;
}

.playback-badge {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  background: rgba($color-secondary, 0.12);
  border: 1px solid rgba($color-secondary, 0.25);
  border-radius: $radius-round;
  padding: 8rpx 16rpx;
  flex-shrink: 0;
  margin-left: $spacing-md;
}

.playback-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: $color-secondary;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.playback-text {
  font-size: $font-size-xs;
  color: $color-secondary;
  font-family: $font-family-mono;
}

.playback-stop {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-left: 4rpx;
}

// ===================== Tab 栏 =====================
.tab-bar {
  display: flex;
  background: $color-bg-secondary;
  border-bottom: 1px solid $color-border;
  overflow-x: auto;
  padding: 0 $spacing-sm;

  &::-webkit-scrollbar {
    display: none;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: $spacing-sm $spacing-md;
  white-space: nowrap;
  position: relative;
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 4rpx;
    background: $color-primary;
    border-radius: 2rpx;
    transition: width $transition-normal;
  }

  &.active {
    .tab-label {
      color: $color-text-primary;
      font-weight: $font-weight-semibold;
    }

    &::after {
      width: 60%;
    }
  }
}

.tab-dot {
  font-size: $font-size-xs;
  line-height: 1;
}

.tab-label {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  transition: color $transition-fast;
}

.tab-count {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  background: $color-bg-elevated;
  padding: 2rpx 10rpx;
  border-radius: $radius-round;
  min-width: 32rpx;
  text-align: center;
}

.tab-item.active .tab-count {
  background: rgba($color-primary, 0.15);
  color: $color-primary-light;
}

// ===================== 时间轴滚动区 =====================
.timeline-scroll {
  flex: 1;
  overflow: hidden;
  padding: $spacing-md $spacing-lg 0;
}

// ===================== 空状态 =====================
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0 80rpx;
}

.empty-icon {
  font-size: 96rpx;
  opacity: 0.5;
  margin-bottom: $spacing-md;
}

.empty-title {
  font-size: $font-size-lg;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.empty-hint {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  text-align: center;
  padding: 0 $spacing-xl;
  line-height: $line-height-relaxed;
}

// ===================== 时间轴段落 =====================
.timeline-segment {
  margin-bottom: 0;
}

.segment-timeline {
  display: flex;
  gap: $spacing-md;
}

.segment-time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 88rpx;
  flex-shrink: 0;
}

.segment-time-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
  margin-bottom: $spacing-xs;
  white-space: nowrap;
}

.timeline-line {
  flex: 1;
  width: 2rpx;
  background: linear-gradient($color-border, $color-border-light);
  min-height: 48rpx;

  &.is-last {
    background: linear-gradient($color-border, transparent);
  }
}

// ===================== 段落卡片 =====================
.segment-card {
  flex: 1;
  background: $color-bg-card;
  border-radius: $radius-lg;
  margin-bottom: $spacing-md;
  overflow: hidden;
  border: 1px solid transparent;
  transition: border-color $transition-fast;

  &.has-markers {
    border-color: rgba($color-primary, 0.2);
  }
}

.segment-body {
  padding: $spacing-md $spacing-md $spacing-sm;
}

.segment-text {
  display: block;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: $line-height-relaxed;
  margin-bottom: $spacing-sm;

  &--empty {
    color: $color-text-disabled;
    font-style: italic;
  }
}

// ===================== 标记 Chip =====================
.marker-dots {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-top: $spacing-xs;
}

.marker-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx;
  border-radius: $radius-round;
  border: 1px solid;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  active-background: $color-bg-elevated;
}

.marker-chip-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.marker-chip-label {
  font-size: $font-size-xs;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.marker-chip-time {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
}

// ===================== 段落操作栏 =====================
.segment-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xs $spacing-md $spacing-sm;
  border-top: 1px solid $color-divider;
}

.segment-range {
  font-size: $font-size-xs;
  color: $color-text-disabled;
  font-family: $font-family-mono;
}

.replay-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 20rpx;
  background: rgba($color-primary, 0.1);
  border: 1px solid rgba($color-primary, 0.25);
  border-radius: $radius-round;
  cursor: pointer;
}

.replay-icon {
  font-size: $font-size-xs;
  color: $color-primary-light;
}

.replay-text {
  font-size: $font-size-xs;
  color: $color-primary-light;
  font-weight: $font-weight-medium;
}

// ===================== 底部留白 =====================
.bottom-spacer {
  height: 160rpx;
}

// ===================== 固定底部操作栏 =====================
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc($spacing-md + $safe-area-bottom-env);
  background: linear-gradient(transparent, $color-bg-primary 30%);
}

.bottom-btn {
  width: 100%;
  height: 96rpx;
  border-radius: $radius-round;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &.primary {
    background: linear-gradient(135deg, $color-primary, $color-primary-dark);
    color: #FFFFFF;
    box-shadow: $shadow-glow-primary;
  }
}

// ===================== 标记详情弹窗 =====================
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: $z-index-modal;
  display: flex;
  align-items: flex-end;
}

.marker-modal {
  width: 100%;
  background: $color-bg-secondary;
  border-radius: $radius-xl $radius-xl 0 0;
  padding: $spacing-lg;
  padding-bottom: calc($spacing-lg + $safe-area-bottom-env);
  animation: slide-up $transition-normal;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
}

.modal-label-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: $radius-round;
  border: 1px solid;
}

.modal-label-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.modal-label-text {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
}

.modal-time {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
  flex: 1;
}

.modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-bg-elevated;
  border-radius: 50%;
}

.modal-close-icon {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.modal-block {
  background: $color-bg-card;
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
}

.modal-ai-block {
  border-left: 4rpx solid $color-primary;
}

.modal-block-label {
  display: block;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.modal-block-text {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: $line-height-relaxed;
}

.modal-ai-text {
  color: $color-primary-light;
}

.modal-actions {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-md;
}

.modal-replay-btn {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
  box-shadow: $shadow-glow-primary;
}

.modal-replay-icon {
  font-size: $font-size-md;
  color: #FFFFFF;
}

.modal-replay-text {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: #FFFFFF;
}

.modal-cancel-btn {
  height: 88rpx;
  padding: 0 $spacing-xl;
  background: $color-bg-elevated;
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid $color-border;
}

.modal-cancel-text {
  font-size: $font-size-md;
  color: $color-text-secondary;
}
</style>
