<template>
  <view class="page">
    <!-- Logo + 标题区 -->
    <view class="hero">
      <text class="hero__logo">ClassNote AI</text>
      <text class="hero__tagline">把每一堂课，变成你的专属笔记</text>
    </view>

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="quick-card" @click="goToRecording">
        <text class="quick-card__icon">🎙️</text>
        <view class="quick-card__text">
          <text class="quick-card__title">开始新课堂</text>
          <text class="quick-card__desc">实时录音转写，AI 自动生成笔记</text>
        </view>
        <text class="quick-card__arrow">›</text>
      </view>

      <view class="quick-card" @click="goToCourses">
        <text class="quick-card__icon">📚</text>
        <view class="quick-card__text">
          <text class="quick-card__title">我的课程</text>
          <text class="quick-card__desc">查看课程列表与历史记录</text>
        </view>
        <text class="quick-card__arrow">›</text>
      </view>
    </view>

    <!-- 最近课堂占位 -->
    <view class="recent-section">
      <text class="section-title">最近课堂</text>
      <view class="empty-hint">
        <text class="empty-hint__text">暂无课堂记录</text>
        <text class="empty-hint__sub">开始你的第一堂课吧</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useSessionStore } from '@/stores/session'

const sessionStore = useSessionStore()

function goToRecording() {
  sessionStore.resetSession()
  uni.navigateTo({ url: '/pages/prepare-recording/prepare-recording' })
}

function goToCourses() {
  uni.switchTab({ url: '/pages/my-courses/my-courses' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $spacing-xl $spacing-lg;
  display: flex;
  flex-direction: column;
}

/* ---- Hero ---- */
.hero {
  margin-bottom: $spacing-xl;
  padding-top: $spacing-lg;
}

.hero__logo {
  display: block;
  font-size: $font-size-title;
  font-weight: $font-weight-bold;
  color: $color-primary;
  margin-bottom: $spacing-xs;
}

.hero__tagline {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

/* ---- Quick Actions ---- */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  margin-bottom: $spacing-xxl;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-sm;
  transition: transform $transition-fast;

  &:active {
    transform: scale(0.98);
  }

  &__icon {
    font-size: 48rpx;
  }

  &__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
  }

  &__arrow {
    font-size: $font-size-xxl;
    color: $color-text-tertiary;
  }
}

/* ---- Recent ---- */
.recent-section {
  flex: 1;
}

.section-title {
  display: block;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  margin-bottom: $spacing-lg;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  gap: $spacing-sm;
}

.empty-hint__text {
  font-size: $font-size-lg;
  color: $color-text-secondary;
}

.empty-hint__sub {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}
</style>
