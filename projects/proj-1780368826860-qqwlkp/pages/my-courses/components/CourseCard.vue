<template>
  <view
    class="course-card"
    :style="cardStyle"
    @click="handleClick"
  >
    <!-- 左侧色块 -->
    <view class="course-card__color-bar" :style="colorBarStyle" />

    <!-- 课程信息 -->
    <view class="course-card__body">
      <view class="course-card__header">
        <text class="course-card__name">{{ course.name }}</text>
        <text class="course-card__arrow">›</text>
      </view>

      <view class="course-card__meta">
        <view class="course-card__tag" :style="tagStyle">
          <text class="course-card__tag-text">{{ subjectLabel }}</text>
        </view>
        <text class="course-card__instructor">{{ course.instructor }}</text>
      </view>

      <view class="course-card__stats">
        <view class="course-card__stat">
          <text class="stat-value">{{ course.completedSessions }}/{{ course.totalSessions }}</text>
          <text class="stat-label">已完成课时</text>
        </view>
        <view class="course-card__stat">
          <text class="stat-value stat-value--accent">{{ course.pendingReviews }}</text>
          <text class="stat-label">待复习</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Course } from '@/types/course'
import { SUBJECT_LABELS, COURSE_COLORS, COURSE_COLORS_BG } from '@/types/course'

const props = defineProps<{
  course: Course
}>()

const emit = defineEmits<{
  click: [course: Course]
}>()

/** 学科中文标签 */
const subjectLabel = computed(() => {
  return SUBJECT_LABELS[props.course.subject] || props.course.subject
})

/** 主题颜色 */
const themeColor = computed(() => {
  return COURSE_COLORS[props.course.color] || '#6C63FF'
})

const themeBgColor = computed(() => {
  return COURSE_COLORS_BG[props.course.color] || '#2D2B5E'
})

/** 卡片整体样式 */
const cardStyle = computed(() => ({
  backgroundColor: '#1A1A2E',
  borderColor: `${themeColor.value}20`,
}))

/** 左侧色条样式 */
const colorBarStyle = computed(() => ({
  backgroundColor: themeColor.value,
}))

/** 标签样式 */
const tagStyle = computed(() => ({
  backgroundColor: themeBgColor.value,
  color: themeColor.value,
  borderColor: `${themeColor.value}40`,
}))

function handleClick() {
  emit('click', props.course)
}
</script>

<style lang="scss" scoped>
.course-card {
  position: relative;
  display: flex;
  border-radius: $radius-lg;
  border-width: 1rpx;
  border-style: solid;
  overflow: hidden;
  box-shadow: $shadow-sm;
  transition: transform $transition-fast, box-shadow $transition-fast;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-md;
  }

  &__color-bar {
    width: 8rpx;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__name {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    line-height: $line-height-tight;
    flex: 1;
  }

  &__arrow {
    font-size: $font-size-xxl;
    color: $color-text-tertiary;
    font-weight: $font-weight-bold;
    margin-left: $spacing-sm;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__tag {
    padding: 4rpx 16rpx;
    border-radius: $radius-round;
    border-width: 1rpx;
    border-style: solid;
  }

  &__tag-text {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
  }

  &__instructor {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  &__stats {
    display: flex;
    gap: $spacing-xl;
    margin-top: $spacing-xs;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 2rpx;
  }
}

.stat-value {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;

  &--accent {
    color: $color-accent;
  }
}

.stat-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}
</style>
