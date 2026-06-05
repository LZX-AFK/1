<template>
  <view class="app-tab-page">
    <view class="app-tab-page__header">
      <slot name="header" />
    </view>
    <scroll-view scroll-y class="app-tab-page__scroll" :scroll-into-view="scrollIntoView" :scroll-with-animation="scrollWithAnimation" :show-scrollbar="false">
      <view class="app-tab-page__content">
        <slot />
        <view class="app-tab-page__safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  scrollIntoView?: string
  scrollWithAnimation?: boolean
}>(), {
  scrollIntoView: '',
  scrollWithAnimation: true,
})
</script>

<style lang="scss" scoped>
.app-tab-page {
  min-height: 100vh;
  background: #f6f7f9;
  color: #111827;
  overflow: hidden;
  box-sizing: border-box;
}

/* #ifdef H5 */
.app-tab-page {
  max-width: 430px;
  margin: 0 auto;
}
/* #endif */

.app-tab-page__header {
  height: calc(env(safe-area-inset-top) + 136rpx);
  padding: calc(env(safe-area-inset-top) + 64rpx) 32rpx 0;
  box-sizing: border-box;
}

.app-tab-page__scroll {
  height: calc(100vh - env(safe-area-inset-top) - 136rpx);
  box-sizing: border-box;
}

.app-tab-page__content {
  box-sizing: border-box;
}

.app-tab-page__safe {
  height: calc(env(safe-area-inset-bottom) + 180rpx);
}
</style>
