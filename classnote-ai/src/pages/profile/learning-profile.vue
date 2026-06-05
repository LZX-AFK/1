<template>
  <view class="lp-page">
    <view class="lp-nav">
      <text class="lp-nav__back" @tap="goBack">‹</text>
      <view class="lp-nav__center">
        <text class="lp-nav__title">个性化学习档案</text>
      </view>
      <view class="lp-nav__right" />
    </view>

    <scroll-view scroll-y class="lp-scroll">
      <view class="lp-card lp-card--progress">
        <view class="lp-progress__head">
          <text class="lp-card__title">档案完成度</text>
          <text class="lp-progress__rate">{{ lp.completionRate }}%</text>
        </view>
        <view class="lp-progress__bar"><view class="lp-progress__fill" :style="{ width: lp.completionRate + '%' }" /></view>
        <text class="lp-progress__hint">{{ $t('profile.completionHint') }}</text>
      </view>

      <view class="lp-card">
        <text class="lp-card__title">基础档案</text>
        <view class="lp-row" @tap="onEditToast"><text class="lp-row__label">主修专业</text><text class="lp-row__value">{{ lp.major }}</text><text class="lp-row__arrow">›</text></view>
        <view class="lp-row" @tap="onEditToast"><text class="lp-row__label">第二专业</text><text class="lp-row__value">{{ lp.secondMajor }}</text><text class="lp-row__arrow">›</text></view>
        <view class="lp-row" @tap="onEditToast"><text class="lp-row__label">当前阶段</text><text class="lp-row__value">{{ lp.stage || '未设置' }}</text><text class="lp-row__arrow">›</text></view>
        <view class="lp-row lp-row--last" @tap="onEditToast"><text class="lp-row__label">英语水平</text><text class="lp-row__value">{{ lp.englishLevel || '未设置' }}</text><text class="lp-row__arrow">›</text></view>
      </view>

      <view class="lp-section">
        <text class="lp-section__title">学习目标</text>
        <view class="lp-tags">
          <view v-for="g in goalOptions" :key="g.key" class="lp-tag" :class="{ 'lp-tag--active': lp.goals.includes(g.key) }" @tap="userStore.toggleLearningGoal(g.key)">
            {{ $t('profile.goal_' + g.key) }}
          </view>
        </view>
      </view>

      <view class="lp-section">
        <text class="lp-section__title">AI总结偏好</text>
        <view class="lp-tags">
          <view v-for="p in summaryOptions" :key="p.key" class="lp-tag" :class="{ 'lp-tag--active': lp.summaryPreferences.includes(p.key) }" @tap="userStore.toggleSummaryPreference(p.key)">
            {{ $t('profile.summary_' + p.key) }}
          </view>
        </view>
      </view>

      <view class="lp-section">
        <text class="lp-section__title">解释深度</text>
        <view class="lp-segments">
          <view v-for="d in depthOptions" :key="d.key" class="lp-seg" :class="{ 'lp-seg--active': lp.explanationDepth === d.key }" @tap="userStore.setExplanationDepth(d.key)">
            {{ $t('profile.depth_' + d.key) }}
          </view>
        </view>
      </view>

      <view class="lp-section">
        <text class="lp-section__title">课程个性化</text>
        <view class="lp-card lp-card--course" v-for="course in courseList" :key="course.id">
          <text class="lp-course__name">{{ course.name }}</text>
          <view class="lp-tags lp-tags--small">
            <view
              v-for="opt in course.options"
              :key="opt.key"
              class="lp-tag lp-tag--small"
              :class="{ 'lp-tag--active': (lp.coursePreferences[course.id] || []).includes(opt.key) }"
              @tap="userStore.toggleCoursePreference(course.id, opt.key)"
            >
              {{ $t('profile.cpref_' + opt.key) }}
            </view>
          </view>
        </view>
      </view>

      <view class="lp-bottom-save" @tap="onSave">
        <text>保存学习档案</text>
      </view>

      <view class="lp-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()
const lp = computed(() => userStore.learningProfile)

const goalOptions = reactive([
  { key: 'classUnderstanding' },
  { key: 'finalExam' },
  { key: 'gradExam' },
  { key: 'interviewPrep' },
  { key: 'projectPractice' },
  { key: 'paperReading' },
])

const summaryOptions = reactive([
  { key: 'structuredNotes' },
  { key: 'examFirst' },
  { key: 'detailedExplanation' },
  { key: 'quickNotes' },
  { key: 'keepTermsEnglish' },
  { key: 'bilingualExplanation' },
])

const depthOptions = reactive([
  { key: 'basicExplanation' },
  { key: 'standardClass' },
  { key: 'advancedExpansion' },
])

// 课程个性化列表（从后端 sessions 动态获取，暂为空）
const courseList = reactive<Array<{ id: string; name: string; options: Array<{ key: string }> }>>([])

function goBack() {
  uni.navigateBack({ fail() { uni.switchTab({ url: '/pages/profile/index' }) } })
}

function onEditToast() {
  uni.showToast({ title: t('profile.editComingSoon'), icon: 'none' })
}

function onSave() {
  userStore.saveLearningProfile()
  uni.showToast({ title: t('profile.archiveSaved'), icon: 'none' })
}
</script>

<style lang="scss" scoped>
.lp-page {
  min-height: 100vh;
  background: #f7f8fa;
  color: #111827;
  overflow: hidden;
}

/* #ifdef H5 */
.lp-page { max-width: 430px; margin: 0 auto; }
/* #endif */

.lp-nav {
  height: calc(env(safe-area-inset-top) + 136rpx);
  padding: calc(env(safe-area-inset-top) + 64rpx) 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  box-sizing: border-box;
}

.lp-nav__back,
.lp-nav__right {
  width: 88rpx;
  color: #071446;
  flex-shrink: 0;
}

.lp-nav__back {
  font-size: 56rpx;
  line-height: 1;
}

.lp-nav__center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.lp-nav__title {
  font-size: 40rpx;
  color: #071446;
  font-weight: 800;
}

.lp-scroll {
  height: calc(100vh - env(safe-area-inset-top) - 136rpx);
  padding: 0 32rpx;
  box-sizing: border-box;
}

.lp-card {
  padding: 30rpx;
  margin-bottom: 28rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 32rpx;
  box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}

.lp-card--progress {
  margin-top: 28rpx;
}

.lp-card--course {
  margin-bottom: 20rpx;
}

.lp-card__title,
.lp-section__title {
  display: block;
  font-size: 30rpx;
  color: #111827;
  font-weight: 800;
  margin-bottom: 22rpx;
}

.lp-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lp-progress__head .lp-card__title {
  margin-bottom: 0;
}

.lp-progress__rate {
  font-size: 32rpx;
  color: #2563eb;
  font-weight: 800;
}

.lp-progress__bar {
  height: 12rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: #e5eaf3;
  margin: 26rpx 0 16rpx;
}

.lp-progress__fill {
  height: 100%;
  background: #2f6bff;
  border-radius: 999rpx;
}

.lp-progress__hint {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.5;
}

.lp-row {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  border-bottom: 1rpx solid #eef0f3;
}

.lp-row--last {
  border-bottom: none;
}

.lp-row__label {
  font-size: 27rpx;
  color: #111827;
  flex-shrink: 0;
}

.lp-row__value {
  flex: 1;
  min-width: 0;
  text-align: right;
  color: #4b5563;
  font-size: 26rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lp-row__arrow {
  color: #9ca3af;
  font-size: 36rpx;
}

.lp-section {
  margin-bottom: 30rpx;
}

.lp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.lp-tags--small {
  margin-top: 18rpx;
}

.lp-tag {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid #e5e7eb;
  color: #4b5563;
  font-size: 25rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.04);
}

.lp-tag--small {
  padding: 10rpx 18rpx;
  font-size: 23rpx;
}

.lp-tag--active {
  background: #eef4ff;
  border-color: #c7d8ff;
  color: #2563eb;
  font-weight: 700;
}

.lp-segments {
  display: flex;
  gap: 10rpx;
  padding: 8rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.05);
}

.lp-seg {
  flex: 1;
  min-height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 18rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.25;
}

.lp-seg--active {
  background: #eef4ff;
  color: #2563eb;
  font-weight: 700;
}

.lp-course__name {
  display: block;
  font-size: 28rpx;
  color: #111827;
  font-weight: 800;
}

.lp-bottom-save {
  height: 88rpx;
  margin: 34rpx 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: #2563eb;
  color: #ffffff;
  font-size: 29rpx;
  font-weight: 700;
  box-shadow: 0 14rpx 30rpx rgba(37, 99, 235, 0.22);
}

.lp-safe {
  height: calc(env(safe-area-inset-bottom) + 80rpx);
}
</style>
