<template>
  <view class="pq-page">
    <view class="sub-nav">
      <view class="sub-nav__btn" @tap="safeBack">‹</view>
      <view class="sub-nav__center">
        <text class="sub-nav__title">拍题答疑</text>
      </view>
      <view class="sub-nav__right" />
    </view>

    <scroll-view scroll-y class="sub-scroll">
      <view class="intro-card">
        <text class="intro-card__title">错题解析助手</text>
        <text class="intro-card__desc">上传题目图片后，听刻会生成解析、关联知识点和复习建议。该功能将在下一阶段接入。</text>
      </view>

      <view class="upload-card" @tap="onUploadTap">
        <view class="upload-card__icon">□</view>
        <text class="upload-card__title">点击上传或拍摄题目</text>
        <text class="upload-card__hint">支持试题、错题、手写笔记截图</text>
      </view>

      <view class="empty-state">
        <text class="empty-state__text">拍题答疑功能将在下一阶段接入</text>
      </view>

      <view class="page-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
function safeBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/agent/index' })
}

function onUploadTap() {
  uni.showToast({ title: '拍题答疑功能将在下一阶段接入', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.pq-page { min-height: 100vh; background: #f7f8fa; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.pq-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.sub-nav { height: calc(env(safe-area-inset-top) + 120rpx); padding: calc(env(safe-area-inset-top) + 32rpx) 32rpx 0; display: flex; align-items: center; justify-content: center; box-sizing: border-box; position: relative; z-index: 20; }
.sub-nav__btn, .sub-nav__right { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; position: absolute; bottom: 0; }
.sub-nav__btn { left: 32rpx; color: #071446; font-size: 58rpx; line-height: 1; }
.sub-nav__right { right: 32rpx; }
.sub-nav__center { height: 88rpx; display: flex; align-items: center; justify-content: center; }
.sub-nav__title { font-size: 36rpx; color: #071446; font-weight: 800; }
.sub-scroll { height: calc(100vh - env(safe-area-inset-top) - 120rpx); padding: 28rpx 32rpx 0; box-sizing: border-box; }
.intro-card, .upload-card, .answer-card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; padding: 28rpx; box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, .06); box-sizing: border-box; margin-bottom: 24rpx; }
.intro-card__title, .answer-card__question { display: block; font-size: 32rpx; font-weight: 800; color: #111827; }
.intro-card__desc { display: block; margin-top: 10rpx; font-size: 24rpx; color: #6b7280; line-height: 1.55; }
.upload-card { min-height: 240rpx; border-style: dashed; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; }
.upload-card__icon { width: 72rpx; height: 72rpx; border-radius: 22rpx; background: #eef4ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.upload-card__title { font-size: 28rpx; color: #111827; font-weight: 800; }
.upload-card__hint { font-size: 24rpx; color: #9ca3af; }
.answer-card__question { padding-bottom: 20rpx; border-bottom: 1rpx solid #e5e7eb; }
.answer-card__block { margin-top: 20rpx; }
.answer-card__label { display: block; margin-bottom: 14rpx; font-size: 24rpx; color: #2563eb; font-weight: 800; }
.answer-row { display: flex; gap: 18rpx; margin-bottom: 14rpx; line-height: 1.5; }
.answer-row__key { width: 128rpx; flex-shrink: 0; color: #6b7280; font-size: 24rpx; }
.answer-row__value { flex: 1; color: #374151; font-size: 24rpx; }
.answer-row__value--green { color: #16a34a; font-weight: 800; }
.answer-row__value--blue { color: #2563eb; font-weight: 800; }
.empty-state { padding: 80rpx 40rpx; text-align: center; }
.empty-state__text { font-size: 28rpx; color: #9ca3af; }
.page-safe { height: calc(env(safe-area-inset-bottom) + 180rpx); }
</style>
