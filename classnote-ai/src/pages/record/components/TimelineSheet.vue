<template>
  <view v-if="visible" class="mask" @click="close">
    <view class="sheet" @click.stop>
      <view class="sheet__header">
        <text class="sheet__title">{{ $t('record.timeline') }}</text>
        <text class="sheet__close" @click="close">✕</text>
      </view>
      <scroll-view class="sheet__list" scroll-y>
        <view v-if="!marks || marks.length === 0" class="sheet__empty">
          <text class="sheet__empty-text">{{ $t('summary.noMarks') }}</text>
        </view>
        <view v-for="m in marks" :key="m.id" class="sheet__item">
          <view class="sheet__item-head">
            <view class="sheet__item-dot" :class="'sheet__item-dot--' + m.type" />
            <text class="sheet__item-time">{{ formatTime(m.time) }}</text>
            <text class="sheet__item-type">{{ $t('mark.' + m.type) }}</text>
          </view>
          <text class="sheet__item-label">{{ m.label }}</text>
          <view class="sheet__item-actions">
            <text class="sheet__item-btn" @click="onAIExplain(m)">{{ $t('common.aiExplain') }}</text>
            <text class="sheet__item-btn sheet__item-btn--accent" @click="onPlay(m)">{{ $t('common.play') }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { TimelineMark } from '@/types'

defineProps<{
  visible: boolean
  marks: TimelineMark[]
}>()

const emit = defineEmits<{
  close: []
  explain: [mark: TimelineMark]
  play: [mark: TimelineMark]
}>()

function close() { emit('close') }
function onAIExplain(m: TimelineMark) { emit('explain', m) }
function onPlay(m: TimelineMark) { emit('play', m) }

// 统一 hh:mm:ss，与实时转写页顶部计时器保持一致
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: flex-end; justify-content: center;
}
.sheet {
  width: 100%; max-width: 430px; max-height: 60vh;
  background: #1F2937; border-radius: 24rpx 24rpx 0 0;
  display: flex; flex-direction: column;
}
.sheet__header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 32rpx 32rpx 16rpx;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.sheet__title { font-size: 32rpx; font-weight: 700; color: #fff; }
.sheet__close { font-size: 36rpx; color: #9CA3AF; padding: 8rpx; }
.sheet__list { padding: 8rpx 32rpx 32rpx; max-height: 50vh; }
.sheet__empty { padding: 64rpx 0; text-align: center; }
.sheet__empty-text { font-size: 28rpx; color: #6B7280; }
.sheet__item {
  padding: 24rpx 0; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sheet__item-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.sheet__item-dot {
  width: 16rpx; height: 16rpx; border-radius: 50%; flex-shrink: 0;
}
.sheet__item-dot--confusing { background: #F59E0B; }
.sheet__item-dot--important  { background: #EF4444; }
.sheet__item-dot--exam       { background: #10B981; }
.sheet__item-dot--question   { background: #3B82F6; }
.sheet__item-dot--review     { background: #8B5CF6; }
.sheet__item-time { font-size: 24rpx; color: #9CA3AF; font-family: monospace; }
.sheet__item-type { font-size: 24rpx; color: #D1D5DB; }
.sheet__item-label { font-size: 26rpx; color: #E5E7EB; margin-bottom: 12rpx; }
.sheet__item-actions { display: flex; gap: 16rpx; }
.sheet__item-btn {
  font-size: 24rpx; color: #818CF8; padding: 8rpx 16rpx;
  border-radius: 8rpx; border: 1px solid rgba(129,140,248,0.3);
}
.sheet__item-btn--accent { color: #A78BFA; border-color: rgba(167,139,250,0.3); }
</style>
