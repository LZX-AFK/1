<template>
  <view class="page">
    <view class="safe-top" />
    <!-- 顶部问候栏 -->
    <view class="header">
      <view class="header__left">
        <text class="header__greeting">{{ greeting }}, {{ profile.name.split(' ')[0] || profile.name }}</text>
        <text class="header__date">{{ todayStr }}</text>
      </view>
      <view class="header__right" @tap="uni.switchTab({ url: '/pages/profile/index' })">
        <DeviceStatusBar :compact="true" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 录音大按钮 -->
      <view class="start-btn" @tap="goRecord">
        <text class="start-btn__icon">🎙️</text>
        <text class="start-btn__label">{{ t('home.startRecording') }}</text>
        <text class="start-btn__sub">Classroom Mode</text>
      </view>

      <!-- 今日课程 -->
      <view v-if="todayCourses.length" class="section">
        <view class="section__header">
          <text class="section__title">{{ t('home.todayClass') }}</text>
          <text class="section__more" @tap="uni.switchTab({ url: '/pages/courses/index' })">{{ t('home.viewAll') }}</text>
        </view>
        <view class="section__list">
          <CourseCard
            v-for="c in todayCourses"
            :key="c.id"
            :course="c"
            variant="summary"
            @tap="goCourseDetail(c.id)"
          />
        </view>
      </view>

      <!-- 最近笔记 -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">{{ t('home.recentNotes') }}</text>
          <text class="section__more" @tap="uni.switchTab({ url: '/pages/knowledge/index' })">{{ t('home.viewAll') }}</text>
        </view>
        <view v-if="mockNotes.length" class="section__list">
          <NoteCard
            v-for="note in mockNotes"
            :key="note.id"
            :note="note"
            :show-course-name="true"
            @tap="uni.navigateTo({ url: '/pages/record/summary' })"
          />
        </view>
        <EmptyState v-else message="还没有课堂笔记，开始你的第一堂课吧" />
      </view>

      <!-- AI 学习提醒 -->
      <view class="reminder">
        <text class="reminder__icon">💡</text>
        <view class="reminder__text">
          <text class="reminder__title">{{ t('home.aiReminder') }}</text>
          <text class="reminder__body">你最近多次标记了 Genetic Expression，建议今天复习 12 分钟</text>
        </view>
        <text class="reminder__cta" @tap="uni.switchTab({ url: '/pages/knowledge/index' })">→</text>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useCourseStore } from '@/stores/useCourseStore'
import { useUserStore } from '@/stores/useUserStore'
import type { AINote } from '@/types/index'

const { t } = useI18n()
const { courses } = storeToRefs(useCourseStore())
const { profile } = storeToRefs(useUserStore())

const now = new Date()
const hour = now.getHours()
const greeting = computed(() => {
  if (hour < 12) return t('home.greeting.morning')
  if (hour < 18) return t('home.greeting.afternoon')
  return t('home.greeting.evening')
})
const todayStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

const todayCourses = computed(() => courses.value.slice(0, 2))

const mockNotes: AINote[] = [
  {
    id: 'note-001', recordingId: 'rec-001', courseId: '生物学 101',
    title: 'Cell Division Overview', date: '2026-05-28',
    duration: 3120, structuredNotes: [], keyPoints: ['Mitosis vs Meiosis'],
    marks: [], personalized: { insight: '', terms: [], suggestions: [] },
    tags: ['mitosis', 'chromosome', 'cell cycle'],
  },
  {
    id: 'note-002', recordingId: 'rec-002', courseId: '化学 201',
    title: 'Organic Reactions', date: '2026-05-27',
    duration: 2700, structuredNotes: [], keyPoints: [],
    marks: [], personalized: { insight: '', terms: [], suggestions: [] },
    tags: ['organic', 'reaction', 'catalyst'],
  },
]

function goRecord() {
  uni.navigateTo({ url: '/pages/record/prepare' })
}
function goCourseDetail(id: string) {
  uni.navigateTo({ url: `/pages/courses/detail?id=${id}` })
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: $color-bg-page; display: flex; flex-direction: column; }
.safe-top { height: var(--status-bar-height, 44px); }
.safe-bottom { height: calc(120rpx + env(safe-area-inset-bottom)); }
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-sm $spacing-lg $spacing-md; background: $color-bg-card;
  &__left { display: flex; flex-direction: column; }
  &__greeting { font-size: $font-size-2xl; font-weight: $font-weight-bold; color: $color-text-primary; }
  &__date { font-size: $font-size-sm; color: $color-text-secondary; margin-top: 4rpx; }
}
.scroll { flex: 1; }
.start-btn {
  margin: $spacing-lg; background: $color-primary; border-radius: $radius-2xl;
  padding: $spacing-xl $spacing-lg; display: flex; flex-direction: column; align-items: center;
  box-shadow: $shadow-glow-primary;
  &__icon { font-size: 80rpx; }
  &__label { font-size: $font-size-xl; font-weight: $font-weight-bold; color: #fff; margin-top: $spacing-sm; }
  &__sub { font-size: $font-size-sm; color: rgba(255,255,255,0.7); margin-top: 4rpx; }
}
.section {
  margin: 0 $spacing-lg $spacing-lg;
  &__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: $spacing-md; }
  &__title { font-size: $font-size-lg; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__more { font-size: $font-size-sm; color: $color-primary; }
  &__list { display: flex; flex-direction: column; gap: $spacing-md; }
}
.reminder {
  margin: 0 $spacing-lg $spacing-lg; background: #EEF2FF; border-radius: $radius-2xl;
  padding: $spacing-md $spacing-lg; display: flex; align-items: center; gap: $spacing-sm;
  &__icon { font-size: 40rpx; }
  &__text { flex: 1; display: flex; flex-direction: column; }
  &__title { font-size: $font-size-sm; font-weight: $font-weight-semibold; color: $color-primary; }
  &__body { font-size: $font-size-sm; color: $color-text-secondary; margin-top: 4rpx; line-height: $line-height-normal; }
  &__cta { font-size: 48rpx; color: $color-primary; }
}
</style>
