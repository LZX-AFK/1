<template>
  <view class="tm" :class="{ 'tm--compact': compact }" @tap="handleClick">
    <!-- 左侧时间轴指示器 -->
    <view class="tm__indicator">
      <view class="tm__dot" :class="`tm__dot--${mark?.type ?? 'important'}`" />
      <view v-if="!compact" class="tm__line" />
    </view>

    <!-- 内容区 -->
    <view class="tm__content">
      <view class="tm__meta">
        <text class="tm__time">{{ formatTime(mark?.time ?? 0) }}</text>
        <text class="tm__type-badge" :class="`tm__type-badge--${mark?.type ?? 'important'}`">
          {{ $t(`mark.${mark?.type ?? 'important'}`) }}
        </text>
      </view>

      <text class="tm__label">{{ mark?.label ?? '' }}</text>

      <text v-if="mark?.aiExplanation" class="tm__explanation">{{ mark.aiExplanation }}</text>

      <view v-if="showActions" class="tm__actions">
        <view class="tm__action" @tap.stop="emit('explain', mark!)">
          <text class="tm__action-text">{{ $t('common.aiExplain') }}</text>
        </view>
        <view v-if="mark?.hasPlayback" class="tm__action" @tap.stop="emit('play', mark!)">
          <text class="tm__action-text">▶ {{ $t('common.play') }}</text>
        </view>
        <view class="tm__action tm__action--primary" @tap.stop="emit('review', mark!)">
          <text class="tm__action-text">{{ $t('common.addReview') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { TimelineMark as TimelineMarkType } from '@/types'

withDefaults(defineProps<{
  mark: TimelineMarkType | null
  showActions?: boolean
  compact?: boolean
}>(), {
  showActions: false,
  compact: false,
})

const emit = defineEmits<{
  (e: 'explain', mark: TimelineMarkType): void
  (e: 'play', mark: TimelineMarkType): void
  (e: 'review', mark: TimelineMarkType): void
  (e: 'click', mark: TimelineMarkType): void
}>()

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function handleClick() {
  // individual click handlers on children via .stop
}
</script>

<style lang="scss" scoped>
.tm {
  display: flex;
  gap: $spacing-sm;
  &--compact { gap: $spacing-xs; }
}

.tm__indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40rpx;
  flex-shrink: 0;
}

.tm__dot {
  width: 20rpx; height: 20rpx;
  border-radius: $border-radius-round;
  margin-top: 8rpx;
  flex-shrink: 0;
  &--confusing { background: $color-warning; }
  &--important { background: $color-error; }
  &--exam { background: $color-success; }
  &--question { background: $color-info; }
  &--review { background: $color-accent; }
}

.tm__line {
  width: 2rpx;
  flex: 1;
  min-height: 40rpx;
  background: $border-color;
  margin-top: 8rpx;
}

.tm__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding-bottom: $spacing-md;
  min-width: 0;
}
.tm--compact .tm__content { padding-bottom: $spacing-sm; gap: 4rpx; }

.tm__meta {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.tm__time {
  font-size: $font-sm;
  color: $text-tertiary;
  font-family: monospace;
}

.tm__type-badge {
  font-size: $font-xs;
  padding: 2rpx 12rpx;
  border-radius: $border-radius-round;
  font-weight: 500;
  &--confusing { color: $color-warning; background: #FEF3C7; }
  &--important { color: $color-error; background: #FEE2E2; }
  &--exam { color: $color-success; background: #D1FAE5; }
  &--question { color: $color-info; background: #DBEAFE; }
  &--review { color: $color-accent; background: $color-accent-light; }
}

.tm__label {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
}

.tm__explanation {
  font-size: $font-sm;
  color: $text-secondary;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tm__actions {
  display: flex;
  gap: $spacing-sm;
  margin-top: 4rpx;
}

.tm__action {
  padding: 10rpx 20rpx;
  border-radius: $border-radius-round;
  background: $bg-page;
  border: 2rpx solid $border-color;
  &:active { opacity: 0.6; }
  &--primary { background: $color-primary-light; border-color: $color-primary-light; }
}

.tm__action-text {
  font-size: $font-xs;
  color: $text-primary;
  font-weight: 500;
}
.tm__action--primary .tm__action-text { color: $color-primary; }
</style>
