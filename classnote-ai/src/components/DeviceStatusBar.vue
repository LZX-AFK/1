<template>
  <view :class="['device-bar', compact ? 'compact' : 'full']" @tap="$emit('tap')">
    <view class="device-bar__left">
      <text :class="['device-bar__icon', device.connected ? 'on' : 'off']">🎧</text>
      <view class="device-bar__info">
        <text class="device-bar__name">
          {{ device.connected ? device.name : t('device.disconnected') }}
        </text>
        <text v-if="!compact" :class="['device-bar__sub', !device.connected ? 'err' : '']">
          {{ device.connected ? `${t('device.battery')} ${device.battery}% · ${device.ancEnabled ? t('device.anc') : ''}` : t('device.disconnected') }}
        </text>
      </view>
    </view>
    <view class="device-bar__right">
      <text v-if="compact && device.connected" class="device-bar__pct">{{ device.battery }}%</text>
      <view :class="['device-bar__dot', device.connected ? 'dot-on' : 'dot-off']" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/useDeviceStore'

defineProps<{ compact?: boolean }>()
defineEmits<{ (e: 'tap'): void }>()

const { t } = useI18n()
const { device } = storeToRefs(useDeviceStore())
</script>

<style scoped lang="scss">
.device-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: $color-bg-card; border-radius: $radius-lg;
  &.full { padding: $spacing-md $spacing-lg; }
  &.compact { padding: $spacing-xs $spacing-sm; border-radius: $radius-md; background: transparent; }
  &__left { display: flex; align-items: center; gap: $spacing-sm; }
  &__icon { font-size: 40rpx; &.off { opacity: 0.35; } }
  &__info { display: flex; flex-direction: column; }
  &__name { font-size: $font-size-sm; font-weight: $font-weight-medium; color: $color-text-primary; line-height: 1.4; }
  &__sub { font-size: $font-size-xs; color: $color-text-secondary; &.err { color: $color-error; } }
  &__right { display: flex; align-items: center; gap: $spacing-xs; }
  &__pct { font-size: $font-size-xs; color: $color-text-secondary; }
  &__dot {
    width: 16rpx; height: 16rpx; border-radius: 50%;
    &.dot-on { background: $color-success; }
    &.dot-off { background: $color-error; }
  }
}
</style>
