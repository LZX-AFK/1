<template>
  <view class="app-sub-page" :class="{ 'app-sub-page--fixed': fixedBottom }">
    <view class="app-sub-page__nav">
      <AppNavBar :title="title" :subtitle="subtitle" :show-back="showBack" @back="handleBack">
        <template #right>
          <slot name="right">
            <text v-if="rightText" class="app-sub-page__right-text">{{ rightText }}</text>
            <text v-else-if="rightIcon" class="app-sub-page__right-icon">{{ rightIcon }}</text>
          </slot>
        </template>
      </AppNavBar>
    </view>

    <scroll-view scroll-y class="app-sub-page__scroll" :style="scrollStyle" :scroll-top="scrollTop" :scroll-with-animation="scrollWithAnimation" :show-scrollbar="false">
      <view class="app-sub-page__content">
        <slot />
      </view>
    </scroll-view>

    <view v-if="fixedBottom" class="app-sub-page__fixed" :style="fixedStyle">
      <slot name="fixedBottom" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppNavBar from './AppNavBar.vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  showBack?: boolean
  rightText?: string
  rightIcon?: string
  fixedBottom?: boolean
  fixedBottomHeight?: number
  fallbackUrl?: string
  fallbackType?: 'switchTab' | 'redirectTo'
  customBack?: boolean
  scrollTop?: number
  scrollWithAnimation?: boolean
}>(), {
  subtitle: '',
  showBack: true,
  rightText: '',
  rightIcon: '',
  fixedBottom: false,
  fixedBottomHeight: 0,
  fallbackUrl: '/pages/agent/index',
  fallbackType: 'switchTab',
  customBack: false,
  scrollTop: 0,
  scrollWithAnimation: true,
})

const emit = defineEmits<{ back: [] }>()

const scrollStyle = computed(() => ({
  paddingBottom: props.fixedBottom ? `calc(${props.fixedBottomHeight}rpx + env(safe-area-inset-bottom) + 32rpx)` : '0',
}))

const fixedStyle = computed(() => ({
  minHeight: `${props.fixedBottomHeight}rpx`,
}))

function handleBack() {
  if (props.customBack) {
    emit('back')
    return
  }

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }

  if (props.fallbackType === 'switchTab') {
    uni.switchTab({ url: props.fallbackUrl })
  } else {
    uni.redirectTo({ url: props.fallbackUrl })
  }
}
</script>

<style lang="scss" scoped>
.app-sub-page {
  min-height: 100vh;
  background: #f6f7f9;
  color: #111827;
  overflow: hidden;
  box-sizing: border-box;
}

/* #ifdef H5 */
.app-sub-page {
  max-width: 430px;
  margin: 0 auto;
}
/* #endif */

.app-sub-page__nav {
  height: calc(env(safe-area-inset-top) + 136rpx);
  padding: calc(env(safe-area-inset-top) + 64rpx) 32rpx 0;
  box-sizing: border-box;
  position: relative;
  z-index: 20;
}

.app-sub-page__scroll {
  height: calc(100vh - env(safe-area-inset-top) - 136rpx);
  padding: 28rpx 32rpx 0;
  box-sizing: border-box;
}

.app-sub-page__content {
  min-height: 100%;
  box-sizing: border-box;
}

.app-sub-page__fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 32rpx calc(env(safe-area-inset-bottom) + 18rpx);
  background: rgba(246, 247, 249, 0.96);
  box-shadow: 0 -14rpx 34rpx rgba(15, 23, 42, 0.08);
  box-sizing: border-box;
  z-index: 30;
}

/* #ifdef H5 */
.app-sub-page__fixed {
  left: 50%;
  width: 430px;
  transform: translateX(-50%);
}
/* #endif */

.app-sub-page__right-text,
.app-sub-page__right-icon {
  font-size: 26rpx;
  color: #111827;
}
</style>
