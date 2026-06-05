<template>
  <view class="page">
    <view class="p-nav">
      <text class="p-nav__title">{{ $t('profile.title') }}</text>
    </view>

    <!-- M1: Hero -->
    <view class="p-card p-card--hero">
      <view class="p-avatar">澈</view>
      <view class="p-hero__info">
        <text class="p-hero__name">澈 苏</text>
        <text class="p-hero__role">{{ $t('profile.overseasStudent') }}</text>
        <text class="p-hero__major">Biology / Computer Science</text>
      </view>
      <view class="p-hero__stats">
        <text class="p-hero__stat-text">4 {{ $t('profile.statCourses') }} · 26 {{ $t('profile.statLessons') }} · 21 {{ $t('profile.statSummaries') }}</text>
      </view>
    </view>

    <!-- M2: 个性化学习档案 -->
    <view class="p-section">
      <text class="p-section__title">{{ $t('profile.personalizedArchive') }}</text>
      <view class="p-card p-card--archive" @click="goLearningProfile">
        <text class="p-arc__subtitle">{{ $t('profile.archiveDesc') }}</text>
        <view class="p-arc__progress">
          <view class="p-arc__bar"><view class="p-arc__fill" :style="{ width: lp.completionRate + '%' }" /></view>
          <text class="p-arc__rate">{{ $t('profile.completionRate') }} {{ lp.completionRate }}%</text>
        </view>
        <view class="p-arc__rows">
          <view class="p-arc__row"><text class="p-arc__label">{{ $t('profile.stage') }}</text><text class="p-arc__val">{{ lp.stage }}</text></view>
          <view class="p-arc__row"><text class="p-arc__label">{{ $t('profile.englishLevel') }}</text><text class="p-arc__val">{{ lp.englishLevel }}</text></view>
          <view class="p-arc__row p-arc__row--last"><text class="p-arc__label">{{ $t('profile.studyGoal') }}</text><text class="p-arc__val">{{ lpGoalsText }}</text></view>
        </view>
        <view class="p-arc__action"><text class="p-arc__action-text">{{ $t('profile.perfectArchive') }}</text><text class="p-arc__arrow">›</text></view>
      </view>
    </view>

    <!-- M3: 课程个性化预览 -->
    <view class="p-section">
      <text class="p-section__title">{{ $t('profile.coursePersonalization') }}</text>
      <view class="p-card p-card--courses">
        <view class="p-crs" v-for="c in coursePreviewList" :key="c.id" @click="onToast('profile.coursePrefComingSoon')">
          <text class="p-crs__name">{{ c.name }}</text>
          <text class="p-crs__label">{{ $t('profile.coursePrefLabel') }}：</text>
          <view class="p-crs__tags">
            <text class="p-tag-sm" v-for="t in c.tags" :key="t">{{ t }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- M4: App 语言 -->
    <view class="p-section">
      <text class="p-section__title">{{ $t('profile.appLanguage') }}</text>
      <view class="p-card">
        <view class="p-row p-row--last" @click="onLangTap"><text class="p-row__label">{{ $t('profile.language') }}</text><text class="p-row__value">{{ appLanguage === 'zh-CN' ? '中文' : 'English' }}</text><text class="p-row__arrow">›</text></view>
      </view>
    </view>

    <!-- M5: 设备 -->
    <view class="p-section">
      <text class="p-section__title">{{ $t('profile.device') }}</text>
      <view class="p-card">
        <view class="p-row"><text class="p-row__label">{{ device.state.deviceName }}</text><view class="p-tag p-tag--green">{{ $t('device.connected') }}</view></view>
        <view class="p-row p-row--last">
          <text class="p-row__label">{{ $t('device.battery') }} {{ device.state.batteryLevel }}% · {{ device.state.ancEnabled ? $t('profile.ancEnabled') : $t('profile.ancDisabled') }}</text>
          <text class="p-row__arrow" @click="onToast('profile.deviceManageComingSoon')">›</text>
        </view>
      </view>
    </view>

    <!-- M6: 底部设置 -->
    <view class="p-section">
      <view class="p-card">
        <view class="p-row" @click="onToast('profile.helpFeedbackComingSoon')"><text class="p-row__label">{{ $t('profile.helpFeedback') }}</text></view>
        <view class="p-row p-row--last" @click="onToast('profile.privacyDataComingSoon')"><text class="p-row__label">{{ $t('profile.privacyData') }}</text></view>
      </view>
    </view>

    <view class="p-safe" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()
const device = useDeviceStore()

const appLanguage = computed(() => userStore.appLanguage)
const lp = computed(() => userStore.learningProfile)

const lpGoalsText = computed(() => lp.value.goals.map((g: string) => t('profile.goal_' + g)).join(' · '))

const coursePreviewList = reactive([
  { id: 'biology-101', name: '生物学 101', tags: ['考点优先', '术语解释', '机制流程'] },
  { id: 'java-prog', name: 'Java Programming', tags: ['概念理解', '代码示例', '面试题'] },
  { id: 'chem-201', name: '化学 201', tags: ['概念对比', '易错点', '公式推导'] },
])

function goLearningProfile() {
  uni.navigateTo({ url: '/pages/profile/learning-profile' })
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
.page { min-height: 100vh; background-color: $bg-page; }
.p-nav { padding: calc($safe-top + 20rpx) $spacing-md $spacing-sm; }
.p-nav__title { font-size: $font-2xl; font-weight: 700; color: $text-primary; }

/* Hero */
.p-card--hero { display: flex; flex-direction: column; align-items: center; padding: $spacing-xl $spacing-md $spacing-lg; margin: 0 $spacing-md $spacing-md; background: $bg-card; border-radius: $border-radius-xl; box-shadow: 0 2rpx 16rpx rgba(0,0,0,.04); }
.p-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: $color-primary; color: #fff; font-size: $font-xl; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-bottom: $spacing-sm; }
.p-hero__name { font-size: $font-xl; font-weight: 700; color: $text-primary; }
.p-hero__role { font-size: $font-sm; color: $text-secondary; margin-top: 4rpx; }
.p-hero__major { font-size: $font-sm; color: $color-primary; margin-top: 4rpx; font-weight: 500; }
.p-hero__stats { margin-top: $spacing-md; padding-top: $spacing-md; border-top: 1rpx solid $border-color-light; width: 100%; text-align: center; }
.p-hero__stat-text { font-size: $font-sm; color: $text-secondary; }

/* Sections */
.p-section { margin: 0 $spacing-md $spacing-md; }
.p-section__title { font-size: $font-sm; font-weight: 600; color: $text-secondary; margin-bottom: $spacing-sm; padding-left: 4rpx; }
.p-card { background: $bg-card; border-radius: $border-radius-lg; overflow: hidden; }

/* Rows */
.p-row { display: flex; align-items: center; padding: $spacing-md; border-bottom: 1rpx solid $border-color-light; min-height: $touch-min; }
.p-row--last { border-bottom: none; }
.p-row__label { font-size: $font-md; color: $text-primary; flex: 1; }
.p-row__value { font-size: $font-md; color: $text-secondary; margin-left: auto; margin-right: $spacing-sm; }
.p-row__arrow { font-size: $font-lg; color: $text-tertiary; }

/* Archive card */
.p-card--archive { padding: $spacing-md $spacing-md $spacing-sm; margin: 0; }
.p-arc__subtitle { font-size: $font-sm; color: $text-tertiary; display: block; margin-bottom: $spacing-sm; }
.p-arc__progress { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-sm; }
.p-arc__bar { flex: 1; height: 12rpx; background: $border-color; border-radius: 6rpx; overflow: hidden; }
.p-arc__fill { height: 100%; background: $color-primary; border-radius: 6rpx; transition: width .3s; }
.p-arc__rate { font-size: $font-xs; color: $color-primary; font-weight: 600; white-space: nowrap; }
.p-arc__rows { margin-top: $spacing-xs; }
.p-arc__row { display: flex; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid $border-color-light; }
.p-arc__row--last { border-bottom: none; }
.p-arc__label { font-size: $font-sm; color: $text-tertiary; width: 140rpx; flex-shrink: 0; }
.p-arc__val { font-size: $font-sm; color: $text-primary; }
.p-arc__action { display: flex; align-items: center; justify-content: center; padding: $spacing-sm 0 4rpx; margin-top: $spacing-xs; }
.p-arc__action-text { font-size: $font-md; color: $color-primary; font-weight: 500; }
.p-arc__arrow { font-size: $font-lg; color: $color-primary; margin-left: 4rpx; }

/* Course preview */
.p-card--courses { padding: 0; }
.p-crs { padding: $spacing-md; border-top: 1rpx solid $border-color-light; }
.p-crs:first-child { border-top: none; }
.p-crs__name { font-size: $font-md; font-weight: 600; color: $text-primary; display: block; margin-bottom: 8rpx; }
.p-crs__label { font-size: $font-sm; color: $text-tertiary; }
.p-crs__tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 8rpx; }
.p-tag-sm { font-size: $font-xs; color: $color-primary; background: $color-primary-light; padding: 4rpx 16rpx; border-radius: $border-radius-round; }

/* Tags */
.p-tag { font-size: $font-sm; padding: 4rpx 16rpx; border-radius: $border-radius-round; margin-left: auto; }
.p-tag--green { background: #ECFDF5; color: $color-success; }

.p-safe { height: calc($safe-bottom + 120rpx); }
</style>
