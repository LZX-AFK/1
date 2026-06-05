<template>
  <view class="cc" :class="[`cc--${variant}`]" @tap="handleTap">
    <view v-if="variant !== 'summary'" class="cc__accent" />
    <view class="cc__body">
      <view class="cc__header">
        <text class="cc__name" :class="[`cc__name--${variant}`]">{{ course?.name ?? '' }}</text>
        <text v-if="showArrow" class="cc__arrow">›</text>
      </view>

      <template v-if="variant === 'full'">
        <text class="cc__instructor">{{ course?.instructor ?? '' }}</text>
        <text class="cc__schedule">{{ course?.schedule ?? '' }}</text>
        <view class="cc__stats">
          <text class="cc__stat">{{ course?.totalRecordings ?? 0 }} {{ $t('common.recording') }}</text>
          <text class="cc__dot">·</text>
          <text class="cc__stat">{{ course?.totalNotes ?? 0 }} {{ $t('common.note') }}</text>
        </view>
      </template>

      <template v-if="variant === 'compact'">
        <view class="cc__stats">
          <text class="cc__stat">{{ course?.totalRecordings ?? 0 }} {{ $t('common.recording') }}</text>
          <text class="cc__dot">·</text>
          <text class="cc__stat">{{ course?.totalNotes ?? 0 }} {{ $t('common.note') }}</text>
        </view>
      </template>

      <template v-if="variant === 'summary'">
        <text class="cc__schedule">{{ course?.schedule ?? '' }}</text>
        <text class="cc__instructor">{{ course?.instructor ?? '' }}</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Course } from '@/types'

const props = withDefaults(defineProps<{
  course: Course | null
  variant?: 'full' | 'compact' | 'summary'
  showArrow?: boolean
}>(), {
  variant: 'full',
  showArrow: true,
})

const emit = defineEmits<{
  (e: 'click', course: Course): void
}>()

function handleTap() {
  if (props.course) emit('click', props.course)
}
</script>

<style lang="scss" scoped>
.cc {
  display: flex;
  background: $bg-card;
  border-radius: $border-radius-xl;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  &:active { opacity: 0.7; }

  &--compact { min-height: auto; }
  &--summary { border: 2rpx solid $border-color; box-shadow: none; }
}

.cc__accent {
  width: 8rpx;
  min-height: 100%;
  background: $color-primary;
  flex-shrink: 0;
}

.cc__body {
  flex: 1;
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.cc--compact .cc__body { padding: $spacing-sm $spacing-md; gap: 4rpx; }
.cc--summary .cc__body { padding: $spacing-sm $spacing-md; gap: 2rpx; }

.cc__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.cc__name {
  font-weight: 600;
  color: $text-primary;
  flex: 1;
  &--full { font-size: $font-lg; }
  &--compact { font-size: $font-md; }
  &--summary { font-size: $font-md; }
}

.cc__arrow {
  font-size: 36rpx;
  color: $text-tertiary;
  line-height: 1;
  flex-shrink: 0;
}

.cc__instructor { font-size: $font-sm; color: $text-secondary; }
.cc__schedule { font-size: $font-xs; color: $text-tertiary; }

.cc__stats {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 4rpx;
}
.cc__stat { font-size: $font-xs; color: $text-secondary; }
.cc__dot { color: $text-tertiary; font-size: $font-xs; }
</style>
