<template>
  <view class="note-card" @tap="$emit('tap')">
    <view class="note-card__header">
      <text v-if="showCourseName" class="note-card__course">{{ note.courseId }}</text>
      <text class="note-card__title">{{ note.title }}</text>
      <text class="note-card__arrow">›</text>
    </view>
    <text class="note-card__date">{{ note.date }} · {{ Math.floor(note.duration / 60) }} min</text>
    <view class="note-card__tags">
      <text v-for="tag in note.tags.slice(0, 3)" :key="tag" class="note-card__tag">{{ tag }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { AINote } from '@/types/index'

defineProps<{
  note: AINote
  showCourseName?: boolean
}>()
defineEmits<{ (e: 'tap'): void }>()
</script>

<style scoped lang="scss">
.note-card {
  background: $color-bg-card; border-radius: $radius-2xl; padding: $spacing-md $spacing-lg;
  box-shadow: $shadow-sm;
  &__header { display: flex; align-items: center; gap: $spacing-xs; margin-bottom: $spacing-xs; }
  &__course { font-size: $font-size-sm; color: $color-primary; font-weight: $font-weight-medium; }
  &__title { flex: 1; font-size: $font-size-md; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__arrow { font-size: 40rpx; color: $color-text-tertiary; }
  &__date { font-size: $font-size-sm; color: $color-text-secondary; }
  &__tags { display: flex; flex-wrap: wrap; gap: $spacing-xs; margin-top: $spacing-sm; }
  &__tag {
    font-size: $font-size-xs; color: $color-primary; background: #EEF2FF;
    border-radius: $radius-sm; padding: 4rpx 12rpx;
  }
}
</style>
