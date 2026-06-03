<template>
  <view class="tm" @tap="expanded = !expanded">
    <view class="tm__row">
      <view :class="['tm__dot', `tm__dot--${mark.type}`]" />
      <view class="tm__content">
        <text class="tm__time">{{ formatTime(mark.timestamp) }}</text>
        <text :class="['tm__type', `tm__type--${mark.type}`]">{{ typeLabel[mark.type] }}</text>
        <text class="tm__excerpt" :number-of-lines="2">{{ mark.excerpt }}</text>
      </view>
    </view>
    <view v-if="showActions || expanded" class="tm__actions">
      <view class="tm__btn" @tap.stop="$emit('explain')"><text>💡 AI Explain</text></view>
      <view class="tm__btn" @tap.stop="$emit('play')"><text>▶ Play</text></view>
      <view class="tm__btn" @tap.stop="$emit('review')"><text>📌 Review</text></view>
    </view>
    <text v-if="expanded && mark.aiExplanation" class="tm__ai-text">{{ mark.aiExplanation }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TimelineMarkItem } from '@/types/index'

defineProps<{ mark: TimelineMarkItem; showActions?: boolean }>()
defineEmits<{ (e: 'explain'): void; (e: 'play'): void; (e: 'review'): void }>()

const expanded = ref(false)

const typeLabel: Record<string, string> = {
  unclear: '❓ Confusing',
  keypoint: '⭐ Key Point',
  examPoint: '📝 Exam',
  question: '💬 Question',
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
</script>

<style scoped lang="scss">
.tm {
  background: $color-bg-card; border-radius: $radius-lg; padding: $spacing-md $spacing-lg;
  &__row { display: flex; align-items: flex-start; gap: $spacing-sm; }
  &__dot {
    width: 20rpx; height: 20rpx; border-radius: 50%; flex-shrink: 0; margin-top: 8rpx;
    &--unclear { background: $color-warning; }
    &--keypoint { background: $color-error; }
    &--examPoint { background: $color-success; }
    &--question { background: $color-info; }
  }
  &__content { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
  &__time { font-size: $font-size-sm; color: $color-text-tertiary; }
  &__type { font-size: $font-size-sm; font-weight: $font-weight-medium; }
  &__type--unclear { color: $color-warning; }
  &__type--keypoint { color: $color-error; }
  &__type--examPoint { color: $color-success; }
  &__type--question { color: $color-info; }
  &__excerpt { font-size: $font-size-sm; color: $color-text-secondary; line-height: $line-height-normal; }
  &__actions { display: flex; gap: $spacing-sm; margin-top: $spacing-sm; flex-wrap: wrap; }
  &__btn {
    padding: 8rpx 20rpx; border-radius: $radius-round; background: #F3F4F6;
    font-size: $font-size-xs; color: $color-text-secondary;
  }
  &__ai-text {
    margin-top: $spacing-sm; font-size: $font-size-sm; color: $color-primary;
    background: #EEF2FF; padding: $spacing-sm; border-radius: $radius-md; line-height: $line-height-normal;
  }
}
</style>
