<template>
  <view
    class="dsb"
    :class="{ 'dsb--compact': compact, 'dsb--disconnected': !connected, 'dsb--clickable': clickable }"
    @tap="handleTap"
  >
    <view class="dsb__left">
      <view class="dsb__icon" :class="{ 'dsb__icon--on': connected }">
        <text class="dsb__icon-text">🎧</text>
      </view>
      <template v-if="!compact">
        <view class="dsb__info">
          <text class="dsb__label">
            {{ connected ? $t('device.connected') : $t('device.disconnected') }}
          </text>
          <text v-if="connected && mode" class="dsb__mode">{{ mode }}</text>
        </view>
      </template>
    </view>

    <view v-if="connected || !compact" class="dsb__right">
      <template v-if="connected">
        <view class="dsb__battery-icon" :class="batteryClass">
          <view class="dsb__battery-fill" :style="{ width: battery + '%' }" />
        </view>
        <text class="dsb__battery-text" :class="batteryClass">{{ battery }}%</text>
      </template>
      <text v-else class="dsb__battery-text dsb__battery-text--na">--</text>
      <text v-if="!compact && clickable" class="dsb__arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  connected: boolean
  battery: number
  mode: string
  compact?: boolean
  clickable?: boolean
}>(), {
  compact: false,
  clickable: false,
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const batteryClass = computed(() => {
  if (props.battery >= 60) return 'dsb__battery--high'
  if (props.battery >= 20) return 'dsb__battery--mid'
  return 'dsb__battery--low'
})

function handleTap() {
  if (props.clickable) emit('click')
}
</script>

<style lang="scss" scoped>
.dsb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md;
  background: $bg-card;
  border-radius: $border-radius-xl;
  border: 2rpx solid $border-color;
  min-height: 88rpx;
  box-sizing: border-box;

  &--compact {
    padding: $spacing-sm $spacing-md;
    min-height: 56rpx;
    border: none;
    background: transparent;
    border-radius: $border-radius-round;
  }
  &--disconnected { opacity: 0.55; }
  &--clickable:active { opacity: 0.7; }
}

.dsb__left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.dsb__icon {
  width: 44rpx; height: 44rpx;
  border-radius: $border-radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  &--on { background: #D1FAE5; }
}

.dsb__icon-text { font-size: 24rpx; }

.dsb__info {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.dsb__label {
  font-size: $font-md;
  color: $text-primary;
  font-weight: 500;
}

.dsb__mode {
  font-size: $font-xs;
  color: $color-success;
  background: #D1FAE5;
  padding: 2rpx 12rpx;
  border-radius: $border-radius-round;
  align-self: flex-start;
}

.dsb__right {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.dsb__battery-icon {
  width: 40rpx; height: 20rpx;
  border: 2rpx solid $border-color;
  border-radius: 4rpx;
  padding: 2rpx;
  position: relative;
  box-sizing: border-box;
  &::after {
    content: '';
    position: absolute;
    right: -5rpx; top: 50%;
    transform: translateY(-50%);
    width: 4rpx; height: 8rpx;
    background: $border-color;
    border-radius: 0 2rpx 2rpx 0;
  }
}

.dsb__battery-fill {
  height: 100%;
  border-radius: 2rpx;
  transition: width 0.3s;
}

.dsb__battery-text {
  font-size: $font-sm;
  font-weight: 500;
  &--na { color: $text-tertiary; }
}

.dsb__battery--high {
  .dsb__battery-fill { background: $color-success; }
  &.dsb__battery-text { color: $color-success; }
}
.dsb__battery--mid {
  .dsb__battery-fill { background: $color-warning; }
  &.dsb__battery-text { color: $color-warning; }
}
.dsb__battery--low {
  .dsb__battery-fill { background: $color-error; }
  &.dsb__battery-text { color: $color-error; }
}

.dsb__arrow {
  font-size: 36rpx;
  color: $text-tertiary;
}
</style>
