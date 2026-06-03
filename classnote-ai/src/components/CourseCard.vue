<template>
  <view class="course-card" @tap="$emit('tap')">
    <view class="course-card__color-bar" :style="{ background: course.color }" />
    <view class="course-card__body">
      <view class="course-card__header">
        <text class="course-card__icon">{{ course.icon }}</text>
        <view class="course-card__title-group">
          <text class="course-card__name">{{ course.name }}</text>
          <text class="course-card__sub">{{ course.instructor }} · {{ course.schedule }}</text>
        </view>
        <text class="course-card__arrow">›</text>
      </view>
      <view v-if="variant === 'full'" class="course-card__stats">
        <text class="course-card__stat">🎙️ {{ course.recordingCount }}</text>
        <text class="course-card__stat">📝 {{ course.noteCount }}</text>
        <text v-if="course.markCount > 0" class="course-card__stat course-card__stat--warn">⏳ {{ course.markCount }}</text>
        <text class="course-card__stat">📊 {{ course.accuracy }}%</text>
      </view>
      <view v-if="variant === 'summary'" class="course-card__summary">
        <text class="course-card__summary-text">{{ course.schedule }} · {{ course.instructor }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Course } from '@/types/index'

defineProps<{
  course: Course
  variant?: 'full' | 'compact' | 'summary'
}>()
defineEmits<{ (e: 'tap'): void }>()
</script>

<style scoped lang="scss">
.course-card {
  display: flex; flex-direction: row; background: $color-bg-card;
  border-radius: $radius-2xl; overflow: hidden; box-shadow: $shadow-sm;
  &__color-bar { width: 8rpx; flex-shrink: 0; }
  &__body { flex: 1; padding: $spacing-md $spacing-lg; }
  &__header { display: flex; align-items: center; gap: $spacing-sm; }
  &__icon { font-size: 40rpx; }
  &__title-group { flex: 1; display: flex; flex-direction: column; }
  &__name { font-size: $font-size-md; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__sub { font-size: $font-size-sm; color: $color-text-secondary; margin-top: 4rpx; }
  &__arrow { font-size: 40rpx; color: $color-text-tertiary; }
  &__stats { display: flex; flex-wrap: wrap; gap: $spacing-sm; margin-top: $spacing-sm; padding-top: $spacing-sm; border-top: 1rpx solid #F0F0F5; }
  &__stat { font-size: $font-size-sm; color: $color-text-secondary; &--warn { color: $color-warning; } }
  &__summary { margin-top: $spacing-xs; }
  &__summary-text { font-size: $font-size-sm; color: $color-text-secondary; }
}
</style>
