<template>
  <view class="home-page">
    <!-- ═══════════ 错误状态条 ═══════════ -->
    <view v-if="pageState === 'error'" class="error-bar" @tap="fetchHomeData">
      <text class="error-bar__icon">⚠️</text>
      <text class="error-bar__text">{{ t('home.error') }}</text>
      <text class="error-bar__retry">{{ t('common.retry') }}</text>
    </view>

    <!-- ═══════════ Loading 骨架屏 ═══════════ -->
    <scroll-view v-if="pageState === 'loading'" scroll-y class="page__scroll">
      <view class="skeleton skeleton--greeting" />
      <view class="skeleton skeleton--course" />
      <view class="skeleton skeleton--cta" />
      <view class="skeleton skeleton--heading" />
      <view class="skeleton skeleton--card" />
      <view class="skeleton skeleton--card" />
      <view class="skeleton skeleton--card" />
      <view class="skeleton skeleton--heading" />
      <view class="skeleton skeleton--grid" />
    </scroll-view>

    <!-- ═══════════ 正常内容 ═══════════ -->
    <scroll-view v-else-if="pageState === 'normal'" scroll-y class="page__scroll">
      <!-- ===== S1: 问候栏 ===== -->
      <view class="greeting-section">
        <view class="greeting-left">
          <text class="greeting-text">{{ greetingText }}, {{ userStore.displayName }} 👋</text>
          <text class="greeting-subtitle">{{ t('home.subtitle') }}</text>
        </view>
        <DeviceStatusBar
          :connected="deviceStore.isConnected"
          :battery="deviceStore.state.batteryLevel"
          :mode="deviceStore.state.ancEnabled ? 'ANC' : ''"
          compact
          clickable
          @click="goToProfile"
        />
      </view>

      <!-- ===== S2: 今日课程 ===== -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">{{ t('home.todayClass') }}</text>
          <text class="section__more" @tap="goToCourses">{{ t('common.viewAll') }} ›</text>
        </view>
        <template v-if="todayCourse">
          <view class="course-card" @tap="goToCourseDetail">
            <view class="course-card__time">
              <text class="course-card__time-top">{{ courseTimeLabel }}</text>
              <text class="course-card__time-bottom">{{ coursePeriodLabel }}</text>
            </view>
            <view class="course-card__divider" />
            <view class="course-card__body">
              <text class="course-card__name">{{ todayCourse.name }}</text>
              <view class="course-card__meta">
                <text class="course-card__meta-item">{{ todayCourse.instructor }}</text>
                <text class="course-card__dot">·</text>
                <text class="course-card__meta-item">{{ todayCourse.location }}</text>
              </view>
            </view>
            <text class="course-card__arrow">›</text>
          </view>
        </template>
        <template v-else>
          <EmptyState
            icon="📚"
            :title="t('home.emptyCourse')"
            :description="t('home.emptyCourseDesc')"
            :action-text="t('home.addCourse')"
            compact
            @action="goToCourses"
          />
        </template>
      </view>

      <!-- ===== S3: 开始录音 CTA ===== -->
      <view class="record-cta" @tap="goToRecordPrepare">
        <view class="record-cta__inner">
          <view class="record-cta__mic">
            <text class="record-cta__mic-dot">●</text>
          </view>
          <view class="record-cta__text">
            <text class="record-cta__title">{{ t('home.startRecording') }}</text>
            <text class="record-cta__subtitle">{{ t('home.recordingSubtitle') }}</text>
          </view>
          <text class="record-cta__arrow">›</text>
        </view>
      </view>

      <!-- ===== S4: 最近笔记 ===== -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">{{ t('home.recentNotes') }}</text>
          <text class="section__more" @tap="goToKnowledge">{{ t('common.viewAll') }} ›</text>
        </view>
        <template v-if="recentNotes.length">
          <view
            v-for="note in recentNotes"
            :key="note.id"
            class="section__card-spacer"
          >
            <NoteCard
              :note="note"
              :show-course-name="true"
              @click="goToNoteDetail"
            />
          </view>
        </template>
        <template v-else>
          <EmptyState
            icon="📝"
            :title="t('home.emptyNote')"
            :description="t('home.emptyNoteDesc')"
            compact
          />
        </template>
      </view>

      <!-- ===== S5: 快捷操作 ===== -->
      <view class="section">
        <text class="section__title">{{ t('home.quickActions') }}</text>
        <view class="quick-grid">
          <view class="quick-grid__item" @tap="goToCourses">
            <view class="quick-grid__icon quick-grid__icon--courses">
              <text class="quick-grid__icon-text">📖</text>
            </view>
            <text class="quick-grid__label">{{ t('home.quickAction.courses') }}</text>
          </view>
          <view class="quick-grid__item" @tap="goToKnowledge">
            <view class="quick-grid__icon quick-grid__icon--notes">
              <text class="quick-grid__icon-text">📝</text>
            </view>
            <text class="quick-grid__label">{{ t('home.quickAction.notes') }}</text>
          </view>
          <view class="quick-grid__item" @tap="goToKnowledge">
            <view class="quick-grid__icon quick-grid__icon--knowledge">
              <text class="quick-grid__icon-text">📚</text>
            </view>
            <text class="quick-grid__label">{{ t('home.quickAction.knowledgeBase') }}</text>
          </view>
          <view class="quick-grid__item" @tap="goToProfile">
            <view class="quick-grid__icon quick-grid__icon--profile">
              <text class="quick-grid__icon-text">👤</text>
            </view>
            <text class="quick-grid__label">{{ t('home.quickAction.profile') }}</text>
          </view>
        </view>
      </view>

      <!-- ===== S6: AI 学习提醒 ===== -->
      <view class="ai-reminder" @tap="goToReview">
        <view class="ai-reminder__header">
          <text class="ai-reminder__label">✨ {{ t('home.aiReminder') }}</text>
        </view>
        <text class="ai-reminder__body">
          {{ t('home.reminderText') }}
        </text>
        <text class="ai-reminder__suggestion">💡 {{ t('home.reminderAdvice') }}</text>
        <view class="ai-reminder__footer">
          <text class="ai-reminder__action">{{ t('home.reminderAction') }}</text>
          <text class="ai-reminder__arrow">›</text>
        </view>
      </view>

      <!-- ═══════════ 底部安全区 ═══════════ -->
      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/useUserStore'
import { useCourseStore } from '@/stores/useCourseStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import DeviceStatusBar from '@/components/DeviceStatusBar.vue'
import NoteCard from '@/components/NoteCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { Course, AINote } from '@/types'

const { t } = useI18n()
const userStore = useUserStore()
const courseStore = useCourseStore()
const deviceStore = useDeviceStore()

// --- 页面状态 ---
const pageState = ref<'loading' | 'normal' | 'error'>('loading')

// --- 时态问候 ---
const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return t('home.morning')
  if (hour >= 12 && hour < 18) return t('home.afternoon')
  return t('home.evening')
})

// --- 课程时间（从 schedule 解析） ---
const courseTimeLabel = computed(() => {
  const s = todayCourse.value?.schedule ?? ''
  // "上午 10:00" → "10:00"
  const m = s.match(/(\d{1,2}:\d{2})/)
  return m ? m[1] : '10:00'
})

const coursePeriodLabel = computed(() => {
  const s = todayCourse.value?.schedule ?? ''
  return s.includes('上午') ? '上午' : s.includes('下午') ? '下午' : '上午'
})

// --- 今日课程 ---
const todayCourse = computed<Course | null>(() =>
  courseStore.courses.length ? courseStore.courses[0] : null
)

// --- 最近笔记 ---
const recentNotes = computed<AINote[]>(() => courseStore.aiNotes.slice(0, 3))

// --- 数据加载 ---
async function fetchHomeData() {
  pageState.value = 'loading'
  try {
    await new Promise<void>((resolve) => {
      setTimeout(() => { resolve() }, 600)
    })
    pageState.value = 'normal'
  } catch {
    pageState.value = 'error'
  }
}

// --- 导航 ---
function goToProfile() { uni.switchTab({ url: '/pages/profile/index' }) }
function goToCourses() { uni.switchTab({ url: '/pages/courses/index' }) }
function goToKnowledge() { uni.switchTab({ url: '/pages/knowledge/index' }) }
function goToRecordPrepare() {
  uni.switchTab({
    url: '/pages/record/prepare',
    success: () => { console.log('[Home] switch to record prepare success') },
    fail: (err: any) => {
      console.error('[Home] switch to record prepare failed:', err)
      uni.showToast({ title: '无法进入录音页', icon: 'none' })
    }
  })
}
function goToCourseDetail() { uni.navigateTo({ url: '/pages/courses/detail?id=c1' }) }
function goToNoteDetail(note: AINote) { uni.navigateTo({ url: `/pages/record/summary?id=${note.id}` }) }
function goToReview() { uni.navigateTo({ url: '/pages/courses/detail?id=c1&tab=review' }) }

onMounted(() => { fetchHomeData() })
</script>

<style lang="scss" scoped>
// ============ 页面基底（符合规范） ============
.home-page {
  min-height: 100vh;
  background: #F3F4F6;
  padding: 32rpx;
  padding-top: calc(48rpx + env(safe-area-inset-top));
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-x: hidden;
}

/* #ifdef H5 */
.home-page {
  max-width: 430px;
  margin: 0 auto;
}
/* #endif */

.page__scroll {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
}

.bottom-safe {
  height: 32rpx;
}

// ============ 错误条 ============
.error-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 32rpx;
  background: #FEF2F2;
  border-bottom: 2rpx solid #FECACA;
  &:active { opacity: 0.7; }
}
.error-bar__icon { font-size: 28rpx; }
.error-bar__text { font-size: 24rpx; color: #DC2626; flex: 1; }
.error-bar__retry { font-size: 24rpx; color: #4F46E5; font-weight: 600; }

// ============ 骨架屏 ============
.skeleton {
  background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.skeleton--greeting { height: 88rpx; }
.skeleton--course { height: 140rpx; }
.skeleton--cta { height: 160rpx; }
.skeleton--heading { height: 40rpx; width: 180rpx; }
.skeleton--card { height: 130rpx; }
.skeleton--grid { height: 180rpx; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ============ S1: 问候栏 ============
.greeting-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20rpx;
  padding-bottom: 24rpx;
  gap: 16rpx;
}
.greeting-left {
  flex: 1;
  min-width: 0;
}
.greeting-text {
  font-size: 40rpx;
  font-weight: 700;
  color: #1F2937;
  display: block;
}
.greeting-subtitle {
  font-size: 24rpx;
  color: #6B7280;
  display: block;
  margin-top: 4rpx;
}

// ============ Section 通用 ============
.section {
  margin-top: 24rpx;
}
.section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.section__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2937;
}
.section__more {
  font-size: 24rpx;
  color: #4F46E5;
  &:active { opacity: 0.7; }
}
.section__card-spacer {
  margin-bottom: 16rpx;
}

// ============ S2: 今日课程卡片 ============
.course-card {
  display: flex;
  align-items: center;
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
  gap: 24rpx;
  &:active { opacity: 0.7; }
}
.course-card__time {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  background: #EEF2FF;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.course-card__time-top {
  font-size: 32rpx;
  font-weight: 700;
  color: #4F46E5;
}
.course-card__time-bottom {
  font-size: 24rpx;
  color: #4F46E5;
  margin-top: 4rpx;
}
.course-card__divider {
  width: 2rpx;
  height: 80rpx;
  background: #E5E7EB;
  flex-shrink: 0;
}
.course-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.course-card__name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2937;
}
.course-card__meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-wrap: wrap;
}
.course-card__meta-item {
  font-size: 24rpx;
  color: #6B7280;
}
.course-card__dot {
  font-size: 20rpx;
  color: #9CA3AF;
}
.course-card__arrow {
  font-size: 36rpx;
  color: #9CA3AF;
  flex-shrink: 0;
}

// ============ S3: 录音 CTA ============
.record-cta {
  margin-top: 24rpx;
  border-radius: 24rpx;
  background: #4F46E5;
  &:active { opacity: 0.9; }
}
.record-cta__inner {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 40rpx 32rpx;
}
.record-cta__mic {
  width: 80rpx;
  height: 80rpx;
  border-radius: 9999rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.record-cta__mic-dot {
  font-size: 32rpx;
  color: #EF4444;
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.record-cta__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.record-cta__title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.record-cta__subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
}
.record-cta__arrow {
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

// ============ S5: 快捷操作网格 ============
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.quick-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  &:active { opacity: 0.7; }
}
.quick-grid__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  &--courses { background: #EEF2FF; }
  &--notes { background: #FEF3C7; }
  &--knowledge { background: #D1FAE5; }
  &--profile { background: #F3E8FF; }
}
.quick-grid__icon-text { font-size: 40rpx; }
.quick-grid__label {
  font-size: 24rpx;
  color: #6B7280;
  text-align: center;
}

// ============ S6: AI 学习提醒 ============
.ai-reminder {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%);
  border: 2rpx solid #DDD6FE;
  &:active { opacity: 0.8; }
}
.ai-reminder__header { margin-bottom: 16rpx; }
.ai-reminder__label { font-size: 24rpx; color: #4F46E5; font-weight: 600; }
.ai-reminder__body { font-size: 28rpx; color: #1F2937; line-height: 1.6; }
.ai-reminder__keyword { color: #4F46E5; font-weight: 600; }
.ai-reminder__suggestion { display: block; font-size: 24rpx; color: #6B7280; margin-top: 16rpx; }
.ai-reminder__footer {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 4rpx; margin-top: 24rpx; padding-top: 16rpx;
  border-top: 1rpx solid #DDD6FE;
}
.ai-reminder__action { font-size: 24rpx; color: #4F46E5; font-weight: 600; }
.ai-reminder__arrow { font-size: 28rpx; color: #4F46E5; }
</style>
