<template>
  <view class="app-card" :class="[`app-card--${padding}`, { 'app-card--clickable': clickable, 'app-card--shadow': shadow }]">
    <slot />
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  padding?: 'sm' | 'md' | 'lg'
  clickable?: boolean
  shadow?: boolean
}>(), {
  padding: 'md',
  clickable: false,
  shadow: true,
})
</script>

<style lang="scss" scoped>
.app-card {
  width: 100%;
  background: #ffffff;
  border: 1rpx solid rgba(229, 231, 235, 0.8);
  border-radius: 28rpx;
  box-sizing: border-box;
}

.app-card--shadow {
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.06);
}

.app-card--sm { padding: 20rpx; }
.app-card--md { padding: 28rpx; }
.app-card--lg { padding: 34rpx; }

.app-card--clickable:active {
  opacity: 0.76;
}
</style>
