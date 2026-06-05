<template>
  <view class="profile-page">
    <view class="profile-nav">
      <text class="profile-nav__title">我的</text>
    </view>

    <scroll-view scroll-y class="profile-scroll">
      <view class="user-card">
        <view class="user-card__top">
          <view class="user-card__avatar">听</view>
          <view class="user-card__info">
            <text class="user-card__name">听刻用户</text>
            <text class="user-card__role">{{ lp.major || '完善学习档案以获得个性化体验' }}</text>
          </view>
        </view>
        <view class="user-card__divider" />
        <view class="user-card__stats">
          <view class="user-card__stat">
            <text class="user-card__num">{{ courseCount }}</text>
            <text class="user-card__label">门课程</text>
          </view>
          <view class="user-card__sep" />
          <view class="user-card__stat">
            <text class="user-card__num">{{ sessionCount }}</text>
            <text class="user-card__label">节课堂</text>
          </view>
          <view class="user-card__sep" />
          <view class="user-card__stat">
            <text class="user-card__num">{{ summaryCount }}</text>
            <text class="user-card__label">篇 AI总结</text>
          </view>
        </view>
      </view>

      <view class="profile-card profile-card--archive" @tap="goLearningProfile">
        <view class="profile-card__head">
          <text class="profile-card__title">个性化学习档案</text>
          <text class="profile-card__action">完善档案 ›</text>
        </view>
        <view class="archive-progress">
          <text class="archive-progress__label">档案完成度</text>
          <view class="archive-progress__bar">
            <view class="archive-progress__fill" :style="{ width: lp.completionRate + '%' }" />
          </view>
          <text class="archive-progress__rate">{{ lp.completionRate }}%</text>
        </view>

        <view class="archive-row">
          <view class="archive-row__icon">◇</view>
          <text class="archive-row__label">当前阶段</text>
          <text class="archive-row__value">本科 / 考研准备</text>
          <text class="archive-row__arrow">›</text>
        </view>
        <view class="archive-row">
          <view class="archive-row__icon">A</view>
          <text class="archive-row__label">英语水平</text>
          <text class="archive-row__value">IELTS 7.0</text>
          <text class="archive-row__arrow">›</text>
        </view>
        <view class="archive-row archive-row--last">
          <view class="archive-row__icon">◎</view>
          <text class="archive-row__label">学习目标</text>
          <text class="archive-row__value archive-row__value--goal">期末考试 · 研究生入学考试 · 课堂理解</text>
          <text class="archive-row__arrow">›</text>
        </view>
      </view>

      <view class="profile-card">
        <text class="profile-card__title profile-card__title--solo">设置与偏好</text>
        <view class="setting-row" @tap="goSettings">
          <view class="setting-row__icon">♩</view>
          <text class="setting-row__label">录音设置</text>
          <text class="setting-row__arrow">›</text>
        </view>
        <view class="setting-row" @tap="onLangTap">
          <view class="setting-row__icon">◎</view>
          <text class="setting-row__label">App 语言</text>
          <text class="setting-row__value">{{ appLanguage === 'zh-CN' ? '中文' : 'English' }}</text>
          <text class="setting-row__arrow">›</text>
        </view>
        <view class="setting-row" @tap="goSettings">
          <view class="setting-row__icon">♬</view>
          <text class="setting-row__label">设备</text>
          <text class="setting-row__value">{{ deviceStore.state.connected ? deviceStore.state.deviceName : '未连接' }}</text>
          <text v-if="deviceStore.state.connected" class="setting-row__badge">已连接</text>
          <text class="setting-row__arrow">›</text>
        </view>
        <view class="setting-row setting-row--last" @tap="onToast('profile.helpFeedbackComingSoon')">
          <view class="setting-row__icon">?</view>
          <text class="setting-row__label">帮助与反馈</text>
          <text class="setting-row__arrow">›</text>
        </view>
      </view>

      <view class="profile-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useI18n } from 'vue-i18n'
import { getSessions } from '@/services/sessionApi'

const { t } = useI18n()
const userStore = useUserStore()
const deviceStore = useDeviceStore()

const appLanguage = computed(() => userStore.appLanguage)
const lp = computed(() => userStore.learningProfile)

const courseCount = ref(0)
const sessionCount = ref(0)
const summaryCount = ref(0)

onMounted(async () => {
  try {
    const sessions = await getSessions()
    sessionCount.value = sessions.length
    summaryCount.value = sessions.filter((s: any) => s.status === 'done').length
    const subjects = new Set(sessions.map((s: any) => s.subject || s.title).filter(Boolean))
    courseCount.value = subjects.size
  } catch {
    // 静默失败
  }
})

function goLearningProfile() {
  uni.navigateTo({ url: '/pages/profile/learning-profile' })
}

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/index' })
}

function onLangTap() {
  uni.showActionSheet({
    itemList: ['中文', 'English'],
    success(res) {
      const lang = res.tapIndex === 0 ? 'zh-CN' : 'en'
      userStore.setAppLanguage(lang)
      uni.showToast({ title: t('profile.langSwitchToast'), icon: 'none' })
    },
  })
}

function onToast(key: string) {
  uni.showToast({ title: t(key), icon: 'none' })
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: #f7f8fa;
  color: #111827;
  overflow: hidden;
}

/* #ifdef H5 */
.profile-page { max-width: 430px; margin: 0 auto; }
/* #endif */

.profile-nav {
  height: calc(env(safe-area-inset-top) + 136rpx);
  padding: calc(env(safe-area-inset-top) + 64rpx) 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.profile-nav__title {
  font-size: 40rpx;
  font-weight: 800;
  color: #071446;
}

.profile-scroll {
  height: calc(100vh - env(safe-area-inset-top) - 136rpx);
  padding: 0 32rpx;
  box-sizing: border-box;
}

.user-card,
.profile-card {
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 28rpx;
  box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}

.user-card {
  padding: 38rpx 34rpx 32rpx;
  margin-bottom: 30rpx;
}

.user-card__top {
  display: flex;
  align-items: center;
  gap: 34rpx;
}

.user-card__avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #eef2f8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #071446;
  font-size: 58rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.user-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.user-card__name {
  font-size: 42rpx;
  color: #071446;
  font-weight: 800;
}

.user-card__role {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.45;
}

.user-card__divider {
  height: 1rpx;
  background: #e5e7eb;
  margin: 36rpx 0 26rpx;
}

.user-card__stats {
  display: flex;
  align-items: center;
}

.user-card__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.user-card__num {
  font-size: 36rpx;
  color: #071446;
  font-weight: 700;
}

.user-card__label {
  font-size: 24rpx;
  color: #4b5563;
}

.user-card__sep {
  width: 1rpx;
  height: 54rpx;
  background: #e5e7eb;
}

.profile-card {
  padding: 30rpx 32rpx;
  margin-bottom: 28rpx;
}

.profile-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 28rpx;
}

.profile-card__title {
  font-size: 32rpx;
  color: #111827;
  font-weight: 800;
}

.profile-card__title--solo {
  display: block;
  margin-bottom: 22rpx;
}

.profile-card__action {
  font-size: 24rpx;
  color: #2563eb;
}

.archive-progress {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.archive-progress__label {
  font-size: 26rpx;
  color: #4b5563;
}

.archive-progress__bar {
  height: 12rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: #e8edf6;
}

.archive-progress__fill {
  height: 100%;
  border-radius: 999rpx;
  background: #2f6bff;
}

.archive-progress__rate {
  color: #2563eb;
  font-size: 28rpx;
  font-weight: 700;
}

.archive-row,
.setting-row {
  min-height: 94rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  border-bottom: 1rpx solid #eef0f3;
}

.archive-row--last,
.setting-row--last {
  border-bottom: none;
}

.archive-row__icon,
.setting-row__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #eef4ff;
  color: #2563eb;
  font-size: 26rpx;
  font-weight: 700;
}

.archive-row__label,
.setting-row__label {
  font-size: 28rpx;
  color: #111827;
  flex-shrink: 0;
}

.archive-row__value,
.setting-row__value {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 26rpx;
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-row__value--goal {
  max-width: 330rpx;
}

.archive-row__arrow,
.setting-row__arrow {
  color: #9ca3af;
  font-size: 38rpx;
  flex-shrink: 0;
}

.setting-row__label {
  flex: 1;
}

.setting-row__badge {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #dcfce7;
  color: #16a34a;
  font-size: 22rpx;
  flex-shrink: 0;
}

.profile-safe {
  height: calc(env(safe-area-inset-bottom) + 240rpx);
}
</style>
