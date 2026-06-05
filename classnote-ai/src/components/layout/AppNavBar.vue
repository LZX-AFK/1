<template>
  <view class="app-nav">
    <view class="app-nav__left">
      <slot name="left">
        <view v-if="showBack" class="app-nav__btn" @tap="$emit('back')">‹</view>
        <view v-else-if="showMenu" class="app-nav__menu">
          <view class="app-nav__menu-line" />
          <view class="app-nav__menu-line" />
          <view class="app-nav__menu-line" />
        </view>
      </slot>
    </view>

    <view v-if="title || subtitle" class="app-nav__center">
      <text v-if="title" class="app-nav__title">{{ title }}</text>
      <text v-if="subtitle" class="app-nav__subtitle">{{ subtitle }}</text>
    </view>

    <view class="app-nav__right">
      <slot name="right">
        <view v-if="rightPillText" class="app-nav__pill">
          <text v-if="rightIcon" class="app-nav__pill-icon">{{ rightIcon }}</text>
          <text>{{ rightPillText }}</text>
        </view>
        <text v-else-if="rightText" class="app-nav__right-text">{{ rightText }}</text>
        <text v-else-if="rightIcon" class="app-nav__right-icon">{{ rightIcon }}</text>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  subtitle?: string
  showBack?: boolean
  showMenu?: boolean
  rightText?: string
  rightIcon?: string
  rightPillText?: string
}>(), {
  title: '',
  subtitle: '',
  showBack: false,
  showMenu: false,
  rightText: '',
  rightIcon: '',
  rightPillText: '',
})

defineEmits<{ back: [] }>()
</script>

<style lang="scss" scoped>
.app-nav {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
}

.app-nav__left,
.app-nav__right {
  position: absolute;
  top: 0;
  width: 104rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  z-index: 2;
}

.app-nav__left {
  left: 0;
  justify-content: flex-start;
}

.app-nav__right {
  right: 0;
  justify-content: flex-end;
}

.app-nav__btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #071446;
  font-size: 58rpx;
  line-height: 1;
}

.app-nav__menu {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10rpx;
}

.app-nav__menu-line {
  width: 46rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: #111827;
}

.app-nav__center {
  max-width: calc(100% - 220rpx);
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.app-nav__title {
  color: #071446;
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
}

.app-nav__subtitle {
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}

.app-nav__pill {
  min-height: 56rpx;
  padding: 0 18rpx;
  border: 1rpx solid #d8dde8;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #111827;
  font-size: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.04);
  white-space: nowrap;
}

.app-nav__right-text,
.app-nav__right-icon {
  color: #111827;
  font-size: 26rpx;
  white-space: nowrap;
}
</style>
