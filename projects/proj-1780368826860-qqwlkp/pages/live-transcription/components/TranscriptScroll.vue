<!--
  TranscriptScroll.vue — 实时字幕滚动组件
  显示已确认的转写段落 + 实时未确认字幕，自动滚动到底部
-->
<template>
  <scroll-view
    class="ts"
    scroll-y
    :scroll-top="scrollTo"
    :scroll-with-animation="true"
    :enhanced="true"
    :show-scrollbar="false"
  >
    <!-- 空状态：等待语音输入 -->
    <view v-if="!hasContent" class="ts__empty">
      <text class="ts__empty-icon">🎙️</text>
      <text class="ts__empty-title">Waiting for speech...</text>
      <text class="ts__empty-desc">
        Start speaking and the transcription will appear here in real-time
      </text>
    </view>

    <!-- 转写内容 -->
    <view v-else class="ts__content">
      <!-- 已确认的转写段落 -->
      <view
        v-for="(seg, idx) in segments"
        :key="idx"
        class="ts__segment"
        :class="{ 'ts__segment--final': seg.isFinal }"
      >
        <text class="ts__segment-time">{{ formatTime(seg.start) }}</text>
        <text class="ts__segment-text">{{ seg.text }}</text>
      </view>

      <!-- 实时未确认字幕 -->
      <view v-if="liveText" class="ts__segment ts__segment--live">
        <text class="ts__segment-time">{{ formatTime(liveTimestampMs) }}</text>
        <view class="ts__live-wrap">
          <text class="ts__segment-text ts__segment-text--live">{{ liveText }}</text>
          <view class="ts__cursor" />
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="ts__bottom-pad" />
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { TranscriptSegment } from '@/stores/session'

// ========== Props ==========
const props = defineProps<{
  /** 已确认的转写段落列表 */
  segments: TranscriptSegment[]
  /** 实时未确认字幕文本 */
  liveText: string
  /** 实时字幕的时间戳 */
  liveTimestampMs: number
}>()

// ========== Auto-scroll ==========
const scrollTo = ref(0)

/** 内容是否有可显示内容 */
const hasContent = computed(() => {
  return props.segments.length > 0 || props.liveText.length > 0
})

/** 自动滚动到底部（segments 或 liveText 变化时触发） */
watch(
  () => [props.segments.length, props.liveText],
  () => {
    nextTick(() => {
      // 使用一个很大的值触发 scroll-view 滚动到底部
      scrollTo.value = Date.now() + Math.random()
    })
  },
)

// ========== Helpers ==========

/** 格式化毫秒为 MM:SS 显示 */
function formatTime(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.ts {
  flex: 1;
  padding: 0 $spacing-lg;
}

/* ---- 空状态 ---- */
.ts__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: $spacing-md;
  padding: $spacing-xxl;
}

.ts__empty-icon {
  font-size: 80rpx;
  opacity: 0.6;
}

.ts__empty-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;
}

.ts__empty-desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  text-align: center;
  line-height: $line-height-relaxed;
  max-width: 480rpx;
}

/* ---- 转写内容 ---- */
.ts__content {
  padding-bottom: 120rpx;
}

.ts__segment {
  margin-bottom: $spacing-md;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-sm;
  transition: background-color $transition-fast;

  &--final {
    background-color: rgba($color-bg-elevated, 0.4);
  }

  &--live {
    background-color: rgba($color-primary, 0.06);
    border-left: 4rpx solid $color-primary;
  }
}

.ts__segment-time {
  display: block;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
  margin-bottom: 4rpx;
}

.ts__segment-text {
  display: block;
  font-size: $font-size-md;
  color: $color-text-primary;
  line-height: $line-height-relaxed;

  &--live {
    color: $color-primary-light;
  }
}

.ts__live-wrap {
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
}

.ts__cursor {
  width: 4rpx;
  height: $font-size-md;
  background-color: $color-primary;
  border-radius: 2rpx;
  animation: cursor-blink 1s steps(1) infinite;
  flex-shrink: 0;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.ts__bottom-pad {
  height: 32rpx;
}
</style>
