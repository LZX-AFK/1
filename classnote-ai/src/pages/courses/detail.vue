<template>
  <view class="page">
    <view class="safe-top" />
    <view class="navbar">
      <text class="navbar__back" @tap="uni.navigateBack()">‹</text>
      <text class="navbar__title">{{ course?.name || t('courseDetail.title') }}</text>
      <view class="navbar__placeholder" />
    </view>

    <!-- 课程信息头 -->
    <view v-if="course" class="course-header">
      <view class="course-header__color" :style="{ background: course.color }" />
      <view class="course-header__info">
        <text class="course-header__name">{{ course.icon }} {{ course.name }}</text>
        <text class="course-header__sub">{{ course.instructor }} · {{ course.schedule }}</text>
        <text class="course-header__sub">{{ course.semester }}</text>
        <view class="course-header__stats">
          <text class="course-header__stat">🎙️ {{ course.recordingCount }}</text>
          <text class="course-header__stat">📝 {{ course.noteCount }}</text>
          <text class="course-header__stat">📊 {{ course.accuracy }}%</text>
        </view>
      </view>
    </view>

    <!-- Tab 栏 -->
    <view class="tabs">
      <view
        v-for="(tab, i) in tabs"
        :key="tab"
        :class="['tab', activeTab === i ? 'tab--active' : '']"
        @tap="activeTab = i"
      >
        <text>{{ tab }}</text>
      </view>
    </view>

    <!-- Tab 内容 -->
    <scroll-view scroll-y class="scroll">
      <!-- Sessions Tab -->
      <view v-if="activeTab === 0" class="tab-content">
        <view class="list">
          <RecordingCard
            v-for="r in mockRecordings"
            :key="r.id"
            :recording="r"
            @tap="uni.navigateTo({ url: '/pages/record/summary' })"
            @play="uni.showToast({ title: 'Mock 播放', icon: 'none' })"
            @transcript="uni.showToast({ title: '转写文本', icon: 'none' })"
            @summary="uni.navigateTo({ url: '/pages/record/summary' })"
          />
        </view>
      </view>

      <!-- Notes Tab -->
      <view v-if="activeTab === 1" class="tab-content">
        <view class="list">
          <NoteCard
            v-for="n in mockNotes"
            :key="n.id"
            :note="n"
            @tap="uni.navigateTo({ url: '/pages/record/summary' })"
          />
        </view>
      </view>

      <!-- Mistakes Tab -->
      <view v-if="activeTab === 2" class="tab-content">
        <EmptyState message="还没有错题" cta-text="Coming Soon" />
      </view>

      <!-- Review Tab -->
      <view v-if="activeTab === 3" class="tab-content">
        <view class="review-card">
          <text class="review-card__title">📋 Today's Review Plan</text>
          <view v-for="(task, i) in reviewTasks" :key="i" class="review-task" @tap="task.done = !task.done">
            <text class="review-task__check">{{ task.done ? '☑' : '☐' }}</text>
            <text :class="['review-task__text', task.done ? 'review-task__text--done' : '']">{{ task.text }}</text>
          </view>
          <view class="review-weak">
            <text class="review-weak__label">🟡 Weak point: Genetic Expression</text>
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useCourseStore } from '@/stores/useCourseStore'
import type { Recording, AINote } from '@/types/index'

const { t } = useI18n()
const courseStore = useCourseStore()
const { courses } = storeToRefs(courseStore)

const courseId = ref('')
const activeTab = ref(0)

onLoad((query) => {
  courseId.value = query?.id || ''
  courseStore.selectCourse(courseId.value)
})

const course = computed(() => courses.value.find(c => c.id === courseId.value))
const tabs = [t('courseDetail.recordings'), t('courseDetail.notes'), t('courseDetail.mistakes'), t('courseDetail.review')]

const mockRecordings: Recording[] = [
  { id: 'rec-001', courseId: 'course-001', title: 'Cell Division', date: '2026-05-28', duration: 3120, accuracy: 95, markCount: 4, noteCount: 1, status: 'done' },
  { id: 'rec-002', courseId: 'course-001', title: 'Mitosis Deep Dive', date: '2026-05-21', duration: 2700, accuracy: 92, markCount: 2, noteCount: 1, status: 'done' },
]

const mockNotes: AINote[] = [
  {
    id: 'note-001', recordingId: 'rec-001', courseId: 'course-001',
    title: 'Cell Division Overview', date: '2026-05-28', duration: 3120,
    structuredNotes: [], keyPoints: ['Mitosis phases', 'Meiosis difference'],
    marks: [], personalized: { insight: '', terms: [], suggestions: [] },
    tags: ['mitosis', 'meiosis'],
  },
]

const reviewTasks = ref([
  { text: 'Review Cell Division (10 min)', done: false },
  { text: '5 flashcards', done: false },
  { text: 'Replay 2 marked moments', done: false },
])
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: $color-bg-page; display: flex; flex-direction: column; }
.safe-top { height: var(--status-bar-height, 44px); }
.safe-bottom { height: calc(120rpx + env(safe-area-inset-bottom)); }
.navbar {
  display: flex; align-items: center; padding: $spacing-sm $spacing-lg; background: $color-bg-card;
  &__back { font-size: 60rpx; color: $color-primary; margin-right: $spacing-sm; line-height: 1; }
  &__title { flex: 1; font-size: $font-size-xl; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__placeholder { width: 60rpx; }
}
.course-header {
  background: $color-bg-card; display: flex; padding: $spacing-lg;
  border-bottom: 1rpx solid #F0F0F5;
  &__color { width: 8rpx; border-radius: 4rpx; flex-shrink: 0; margin-right: $spacing-md; }
  &__info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
  &__name { font-size: $font-size-2xl; font-weight: $font-weight-bold; color: $color-text-primary; }
  &__sub { font-size: $font-size-sm; color: $color-text-secondary; }
  &__stats { display: flex; flex-wrap: wrap; gap: $spacing-md; margin-top: $spacing-xs; }
  &__stat { font-size: $font-size-sm; color: $color-text-secondary; }
}
.tabs { display: flex; background: $color-bg-card; border-bottom: 1rpx solid #F0F0F5; }
.tab {
  flex: 1; height: 88rpx; display: flex; align-items: center; justify-content: center;
  font-size: $font-size-sm; color: $color-text-secondary; position: relative;
  &--active { color: $color-primary; font-weight: $font-weight-semibold;
    &::after { content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 4rpx; background: $color-primary; border-radius: 2rpx; }
  }
}
.scroll { flex: 1; }
.tab-content { padding: $spacing-lg; }
.list { display: flex; flex-direction: column; gap: $spacing-md; }
.review-card {
  background: $color-bg-card; border-radius: $radius-2xl; padding: $spacing-lg;
  &__title { font-size: $font-size-lg; font-weight: $font-weight-semibold; color: $color-text-primary; margin-bottom: $spacing-md; display: block; }
}
.review-task {
  display: flex; align-items: center; gap: $spacing-sm; padding: $spacing-sm 0;
  &__check { font-size: 36rpx; color: $color-primary; }
  &__text { font-size: $font-size-md; color: $color-text-primary; &--done { color: $color-text-tertiary; text-decoration: line-through; } }
}
.review-weak { margin-top: $spacing-md; padding: $spacing-sm $spacing-md; background: #FEF3C7; border-radius: $radius-md; }
.review-weak__label { font-size: $font-size-sm; color: $color-warning; }
</style>
