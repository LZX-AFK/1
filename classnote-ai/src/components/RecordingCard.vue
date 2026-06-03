<template>
  <view class="rec-card" @tap="$emit('tap')">
    <view class="rec-card__header">
      <text class="rec-card__icon">🎙️</text>
      <view class="rec-card__info">
        <text class="rec-card__title">{{ recording.title }}</text>
        <text class="rec-card__meta">{{ recording.date }} · {{ Math.floor(recording.duration / 60) }} min</text>
        <text class="rec-card__meta">{{ recording.markCount }} marks · {{ t('record.accuracy') }} {{ recording.accuracy }}%</text>
      </view>
      <view :class="['rec-card__badge', `status-${recording.status}`]">
        <text class="rec-card__badge-text">{{ recording.status }}</text>
      </view>
    </view>
    <view class="rec-card__actions">
      <view class="rec-card__btn" @tap.stop="$emit('play')"><text>▶ Play</text></view>
      <view class="rec-card__btn" @tap.stop="$emit('transcript')"><text>📄 Transcript</text></view>
      <view class="rec-card__btn rec-card__btn--primary" @tap.stop="$emit('summary')"><text>📝 Notes →</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Recording } from '@/types/index'

defineProps<{ recording: Recording }>()
defineEmits<{ (e: 'tap'): void; (e: 'play'): void; (e: 'transcript'): void; (e: 'summary'): void }>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
.rec-card {
  background: $color-bg-card; border-radius: $radius-2xl; padding: $spacing-md $spacing-lg;
  box-shadow: $shadow-sm;
  &__header { display: flex; align-items: flex-start; gap: $spacing-sm; }
  &__icon { font-size: 40rpx; }
  &__info { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
  &__title { font-size: $font-size-md; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__meta { font-size: $font-size-sm; color: $color-text-secondary; }
  &__badge { padding: 4rpx 12rpx; border-radius: $radius-sm; &.status-done { background: #D1FAE5; } &.status-processing { background: #DBEAFE; } }
  &__badge-text { font-size: $font-size-xs; }
  &__actions { display: flex; gap: $spacing-sm; margin-top: $spacing-sm; padding-top: $spacing-sm; border-top: 1rpx solid #F0F0F5; }
  &__btn {
    padding: $spacing-xs $spacing-md; border-radius: $radius-md;
    background: #F3F4F6; font-size: $font-size-sm; color: $color-text-secondary;
    &--primary { background: #EEF2FF; color: $color-primary; }
  }
}
</style>
