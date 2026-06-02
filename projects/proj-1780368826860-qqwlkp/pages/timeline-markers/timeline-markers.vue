<template>
  <view class="page">
    <view class="header">
      <text class="page-title">时间轴标记</text>
      <text class="page-subtitle">共 {{ sessionStore.markerCount }} 个标记</text>
    </view>

    <scroll-view v-if="sessionStore.markerCount > 0" class="marker-list" scroll-y>
      <view
        v-for="marker in sessionStore.markers"
        :key="marker.id"
        class="marker-item"
      >
        <view class="marker-dot" :class="marker.label" />
        <view class="marker-content">
          <view class="marker-header">
            <text class="marker-tag">{{ labelMap[marker.label] || marker.label }}</text>
            <text class="marker-time">{{ formatTime(marker.timestampMs) }}</text>
          </view>
          <text v-if="marker.note" class="marker-note">{{ marker.note }}</text>
          <view class="marker-actions">
            <text class="action-text" @click="viewDetail(marker.id)">
              查看详情 →
            </text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-else class="empty-area">
      <text class="empty-text">暂无标记</text>
      <text class="empty-hint">在课堂上点击标记按钮，记录重要时刻</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useSessionStore } from '@/stores/session'

const sessionStore = useSessionStore()

const labelMap: Record<string, string> = {
  didnt_understand: '❓ 没懂',
  important: '⭐ 重点',
  exam_tip: '📝 考点',
  question: '💬 疑问',
  note: '📌 笔记',
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function viewDetail(markerId: string) {
  // TODO: 跳转到标记详情页 (P14)
  console.log('查看标记详情:', markerId)
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $spacing-lg;
}

.header {
  padding: $spacing-md 0;
  margin-bottom: $spacing-lg;
}

.page-title {
  display: block;
  font-size: $font-size-xxl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.page-subtitle {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  margin-top: $spacing-xs;
}

.marker-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.marker-item {
  display: flex;
  gap: $spacing-md;
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-md;
}

.marker-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-top: 8rpx;
  flex-shrink: 0;

  &.didnt_understand { background-color: $color-accent; }
  &.important { background-color: $color-warning; }
  &.exam_tip { background-color: $color-primary; }
  &.question { background-color: $color-info; }
  &.note { background-color: $color-secondary; }
}

.marker-content {
  flex: 1;
}

.marker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-xs;
}

.marker-tag {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.marker-time {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
}

.marker-note {
  display: block;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.marker-actions {
  display: flex;
  justify-content: flex-end;
}

.action-text {
  font-size: $font-size-sm;
  color: $color-primary;
}

.empty-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: $font-size-lg;
  color: $color-text-tertiary;
  margin-bottom: $spacing-sm;
}

.empty-hint {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}
</style>
