<template>
  <view :class="['ai-sec', highlighted ? 'ai-sec--highlighted' : '', accent ? 'ai-sec--accent' : '']">
    <view class="ai-sec__header" @tap="collapsible && (open = !open)">
      <view class="ai-sec__title-row">
        <text class="ai-sec__icon">{{ icon }}</text>
        <text class="ai-sec__title">{{ title }}</text>
      </view>
      <text v-if="collapsible" class="ai-sec__chevron">{{ open ? '▲' : '▼' }}</text>
    </view>
    <view v-if="!collapsible || open" class="ai-sec__body">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  icon: string
  collapsible?: boolean
  defaultOpen?: boolean
  highlighted?: boolean
  accent?: boolean
}>()

const open = ref(props.defaultOpen !== false)
</script>

<style scoped lang="scss">
.ai-sec {
  background: $color-bg-card; border-radius: $radius-2xl; overflow: hidden; margin-bottom: $spacing-md;
  &--highlighted { border-left: 6rpx solid $color-primary; }
  &--accent { border-left: 6rpx solid $color-accent; background: $color-accent-light; }
  &__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: $spacing-md $spacing-lg;
    border-bottom: 1rpx solid #F0F0F5;
  }
  &__title-row { display: flex; align-items: center; gap: $spacing-sm; }
  &__icon { font-size: 36rpx; }
  &__title { font-size: $font-size-lg; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__chevron { font-size: 24rpx; color: $color-text-tertiary; }
  &__body { padding: $spacing-md $spacing-lg; }
}
</style>
