<template>
  <view class="rc" @tap="handleClick">
    <view class="rc__header">
      <view class="rc__icon-wrap"><text class="rc__icon">🎙️</text></view>
      <view class="rc__info">
        <text v-if="showCourseName" class="rc__course">{{ recording?.courseName ?? '' }}</text>
        <text class="rc__date">{{ formatDate(recording?.date ?? '') }}</text>
      </view>
      <text class="rc__duration">{{ formatDuration(recording?.duration ?? 0) }}</text>
    </view>

    <view class="rc__stats">
      <view class="rc__stat">
        <text class="rc__stat-label">{{ $t('common.mark') }}</text>
        <text class="rc__stat-value">{{ recording?.markCount ?? 0 }}</text>
      </view>
      <view class="rc__stat">
        <text class="rc__stat-label">{{ $t('common.accuracy') }}</text>
        <text class="rc__stat-value rc__stat-value--green">{{ recording?.accuracy ?? 0 }}%</text>
      </view>
      <view class="rc__stat">
        <text class="rc__stat-label">{{ $t('common.summary') }}</text>
        <text class="rc__badge" :class="`rc__badge--${recording?.summaryStatus ?? 'processing'}`">
          {{ $t(`recordingCard.${recording?.summaryStatus ?? 'processing'}`) }}
        </text>
      </view>
    </view>

    <view class="rc__actions">
      <view class="rc__action" @tap.stop="emit('play', recording!)">
        <text class="rc__action-icon">▶</text>
        <text class="rc__action-text">{{ $t('common.play') }}</text>
      </view>
      <view class="rc__action" @tap.stop="emit('transcript', recording!)">
        <text class="rc__action-icon">📝</text>
        <text class="rc__action-text">{{ $t('common.transcript') }}</text>
      </view>
      <view class="rc__action" @tap.stop="emit('summary', recording!)">
        <text class="rc__action-icon">✨</text>
        <text class="rc__action-text">{{ $t('common.summary') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Recording } from '@/types'

withDefaults(defineProps<{
  recording: Recording | null
  showCourseName?: boolean
}>(), {
  showCourseName: false,
})

const emit = defineEmits<{
  (e: 'play', recording: Recording): void
  (e: 'transcript', recording: Recording): void
  (e: 'summary', recording: Recording): void
  (e: 'click', recording: Recording): void
}>()

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}min`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function handleClick() {
  // emit handled via @tap.stop on action buttons directly
}
</script>

<style lang="scss" scoped>
.rc {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: $bg-card;
  border-radius: $border-radius-xl;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  &:active { opacity: 0.7; }
}

.rc__header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.rc__icon-wrap {
  width: 56rpx; height: 56rpx;
  border-radius: $border-radius-md;
  background: $color-primary-light;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rc__icon { font-size: 28rpx; }

.rc__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.rc__course {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rc__date { font-size: $font-xs; color: $text-tertiary; }
.rc__duration { font-size: $font-sm; color: $text-secondary; flex-shrink: 0; }

.rc__stats {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-sm 0;
  border-top: 1rpx solid $border-color-light;
  border-bottom: 1rpx solid $border-color-light;
}

.rc__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  flex: 1;
}
.rc__stat-label { font-size: $font-xs; color: $text-tertiary; }
.rc__stat-value {
  font-size: $font-sm;
  font-weight: 600;
  color: $text-primary;
  &--green { color: $color-success; }
}

.rc__badge {
  font-size: $font-xs;
  padding: 2rpx 12rpx;
  border-radius: $border-radius-round;
  font-weight: 500;
  &--ready { color: $color-success; background: #D1FAE5; }
  &--processing { color: $color-info; background: #DBEAFE; }
  &--failed { color: $color-error; background: #FEE2E2; }
}

.rc__actions {
  display: flex;
  gap: $spacing-sm;
}

.rc__action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 14rpx 0;
  border-radius: $border-radius-md;
  background: $bg-page;
  &:active { opacity: 0.6; }
}
.rc__action-icon { font-size: $font-sm; }
.rc__action-text { font-size: $font-xs; color: $text-primary; font-weight: 500; }
</style>
