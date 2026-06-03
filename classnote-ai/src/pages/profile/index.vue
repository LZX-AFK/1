<template>
  <view class="page">
    <view class="navbar">
      <text class="navbar-title">{{ t('profile.title') }}</text>
    </view>
    <view class="content">
      <text class="placeholder">Phase 1: 个人页 UI</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background-color: $color-bg-page; }
.navbar { padding: 88rpx $spacing-lg $spacing-md; background: $color-bg-card; }
.navbar-title { font-size: $font-size-xl; font-weight: $font-weight-semibold; color: $color-text-primary; }
.content { padding: $spacing-lg; }
.placeholder { color: $color-text-tertiary; font-size: $font-size-md; }
</style>
