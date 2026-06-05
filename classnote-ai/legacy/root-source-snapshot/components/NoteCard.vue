<template>
  <view class="nc" :class="{ 'nc--compact': compact }" @tap="handleTap">
    <view class="nc__body">
      <view class="nc__header">
        <view class="nc__title-row">
          <text v-if="showCourseName && note?.courseName" class="nc__course">{{ note.courseName }}</text>
          <text v-if="showCourseName && note?.courseName" class="nc__separator">·</text>
          <text class="nc__title">{{ note?.title ?? '' }}</text>
        </view>
        <text class="nc__arrow">›</text>
      </view>

      <text class="nc__summary" :class="{ 'nc__summary--compact': compact }">{{ note?.summary ?? '' }}</text>

      <view v-if="displayTags.length" class="nc__tags">
        <text v-for="tag in displayTags" :key="tag" class="nc__tag">{{ tag }}</text>
        <text v-if="(note?.tags?.length ?? 0) > 3" class="nc__tag-more">+{{ (note?.tags?.length ?? 0) - 3 }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AINote } from '@/types'

const props = withDefaults(defineProps<{
  note: AINote | null
  showCourseName?: boolean
  compact?: boolean
}>(), {
  showCourseName: false,
  compact: false,
})

const emit = defineEmits<{
  (e: 'click', note: AINote): void
}>()

const displayTags = computed(() => (props.note?.tags ?? []).slice(0, 3))

function handleTap() {
  if (props.note) emit('click', props.note)
}
</script>

<style lang="scss" scoped>
.nc {
  display: flex;
  background: $bg-card;
  border-radius: $border-radius-xl;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  &:active { opacity: 0.7; }
  &--compact { box-shadow: none; border: 2rpx solid $border-color; }
}

.nc__body {
  flex: 1;
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}
.nc--compact .nc__body { padding: $spacing-sm $spacing-md; gap: 6rpx; }

.nc__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.nc__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6rpx;
  flex: 1;
  min-width: 0;
}

.nc__course {
  font-size: $font-xs;
  color: $color-primary;
  font-weight: 500;
  flex-shrink: 0;
}
.nc__separator { font-size: $font-xs; color: $text-tertiary; }

.nc__title {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nc__arrow {
  font-size: 36rpx;
  color: $text-tertiary;
  line-height: 1;
  flex-shrink: 0;
  margin-left: $spacing-sm;
}

.nc__summary {
  font-size: $font-sm;
  color: $text-secondary;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  &--compact { -webkit-line-clamp: 2; }
}

.nc__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 2rpx;
}

.nc__tag {
  font-size: $font-xs;
  color: $color-primary;
  background: $color-primary-light;
  padding: 2rpx 14rpx;
  border-radius: $border-radius-round;
}

.nc__tag-more {
  font-size: $font-xs;
  color: $text-tertiary;
  padding: 2rpx 14rpx;
}
</style>
