<template>
  <view class="page">
    <!-- Nav -->
    <view class="lp-nav">
      <view class="lp-nav__back" @click="goBack"><text class="lp-nav__arrow">←</text><text>{{ $t('common.back') }}</text></view>
      <text class="lp-nav__title">{{ $t('profile.personalizedArchive') }}</text>
      <text class="lp-nav__subtitle">{{ $t('profile.archiveSubtitle') }}</text>
    </view>

    <!-- 完成度 -->
    <view class="lp-section">
      <view class="lp-card">
        <view class="lp-row"><text class="lp-row__label">{{ $t('profile.completionRate') }}</text><text class="lp-row__val lp-row__val--primary">{{ lp.completionRate }}%</text></view>
        <view class="lp-bar"><view class="lp-bar__fill" :style="{ width: lp.completionRate + '%' }" /></view>
        <text class="lp-hint">{{ $t('profile.completionHint') }}</text>
      </view>
    </view>

    <!-- 基础档案 -->
    <view class="lp-section">
      <text class="lp-section__title">{{ $t('profile.basicProfile') }}</text>
      <view class="lp-card">
        <view class="lp-row" @click="onEditToast"><text class="lp-row__label">{{ $t('profile.major') }}</text><text class="lp-row__val">{{ lp.major }}</text></view>
        <view class="lp-row" @click="onEditToast"><text class="lp-row__label">{{ $t('profile.secondMajor') }}</text><text class="lp-row__val">{{ lp.secondMajor }}</text></view>
        <view class="lp-row" @click="onEditToast"><text class="lp-row__label">{{ $t('profile.stage') }}</text><text class="lp-row__val">{{ lp.stage }}</text></view>
        <view class="lp-row" @click="onEditToast"><text class="lp-row__label">{{ $t('profile.nativeLanguage') }}</text><text class="lp-row__val">{{ lp.nativeLanguage }}</text></view>
        <view class="lp-row lp-row--last" @click="onEditToast"><text class="lp-row__label">{{ $t('profile.englishLevel') }}</text><text class="lp-row__val">{{ lp.englishLevel }}</text></view>
      </view>
    </view>

    <!-- 学习目标 -->
    <view class="lp-section">
      <text class="lp-section__title">{{ $t('profile.learningGoals') }}</text>
      <view class="lp-tags">
        <view
          v-for="g in goalOptions" :key="g.key"
          class="lp-tag"
          :class="{ 'lp-tag--active': lp.goals.includes(g.key) }"
          @click="userStore.toggleLearningGoal(g.key)"
        >{{ $t('profile.goal_' + g.key) }}</view>
      </view>
    </view>

    <!-- AI 总结偏好 -->
    <view class="lp-section">
      <text class="lp-section__title">{{ $t('profile.summaryPreferences') }}</text>
      <view class="lp-tags">
        <view
          v-for="p in summaryOptions" :key="p.key"
          class="lp-tag"
          :class="{ 'lp-tag--active': lp.summaryPreferences.includes(p.key) }"
          @click="userStore.toggleSummaryPreference(p.key)"
        >{{ $t('profile.summary_' + p.key) }}</view>
      </view>
    </view>

    <!-- 解释深度 -->
    <view class="lp-section">
      <text class="lp-section__title">{{ $t('profile.explanationDepth') }}</text>
      <view class="lp-segments">
        <view
          v-for="d in depthOptions" :key="d.key"
          class="lp-seg"
          :class="{ 'lp-seg--active': lp.explanationDepth === d.key }"
          @click="userStore.setExplanationDepth(d.key)"
        >{{ $t('profile.depth_' + d.key) }}</view>
      </view>
    </view>

    <!-- 课程个性化 -->
    <view class="lp-section">
      <text class="lp-section__title">{{ $t('profile.coursePersonalization') }}</text>
      <view class="lp-card" v-for="c in courseList" :key="c.id">
        <text class="lp-crs__name">{{ c.name }}</text>
        <view class="lp-tags lp-tags--sm">
          <view
            v-for="opt in c.options" :key="opt.key"
            class="lp-tag lp-tag--sm-item"
            :class="{ 'lp-tag--active': (lp.coursePreferences[c.id] || []).includes(opt.key) }"
            @click="userStore.toggleCoursePreference(c.id, opt.key)"
          >{{ $t('profile.cpref_' + opt.key) }}</view>
        </view>
      </view>
    </view>

    <!-- 保存 -->
    <view class="lp-save" @click="onSave">
      <text class="lp-save__text">{{ $t('profile.saveArchive') }}</text>
    </view>

    <view class="lp-safe" />
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
  { key: 'classUnderstanding' }, { key: 'finalExam' }, { key: 'gradExam' },
  { key: 'interviewPrep' }, { key: 'projectPractice' }, { key: 'paperReading' },
])

const summaryOptions = reactive([
  { key: 'structuredNotes' }, { key: 'examFirst' }, { key: 'detailedExplanation' },
  { key: 'quickNotes' }, { key: 'keepTermsEnglish' }, { key: 'bilingualExplanation' },
])

const depthOptions = reactive([
  { key: 'basicExplanation' }, { key: 'standardClass' }, { key: 'advancedExpansion' },
])

const courseList = reactive([
  {
    id: 'biology-101',
    name: '生物学 101',
    options: [
      { key: 'examFirst' }, { key: 'termExplanation' }, { key: 'mechanismFlow' },
      { key: 'chartUnderstanding' }, { key: 'confusingConcepts' },
    ],
  },
  {
    id: 'java-prog',
    name: 'Java Programming',
    options: [
      { key: 'conceptFirst' }, { key: 'codeExamples' }, { key: 'interviewQuestions' },
      { key: 'projectPractice' }, { key: 'debugThinking' },
    ],
  },
  {
    id: 'chem-201',
    name: '化学 201',
    options: [
      { key: 'conceptCompare' }, { key: 'commonMistakes' }, { key: 'formulaDerivation' },
      { key: 'experimentalPhenomena' }, { key: 'molecularStructure' },
    ],
  },
])

function goBack() {
  uni.navigateBack()
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
.page { min-height: 100vh; background-color: $bg-page; }

/* Nav */
.lp-nav { padding: calc($safe-top + 20rpx) $spacing-md $spacing-sm; }
.lp-nav__back { display: flex; align-items: center; gap: 8rpx; font-size: $font-md; color: $text-secondary; margin-bottom: $spacing-sm; }
.lp-nav__arrow { font-size: $font-lg; }
.lp-nav__title { font-size: $font-2xl; font-weight: 700; color: $text-primary; display: block; }
.lp-nav__subtitle { font-size: $font-sm; color: $text-tertiary; display: block; margin-top: 8rpx; }

/* Section */
.lp-section { margin: 0 $spacing-md $spacing-md; }
.lp-section__title { font-size: $font-sm; font-weight: 600; color: $text-secondary; margin-bottom: $spacing-sm; padding-left: 4rpx; }
.lp-card { background: $bg-card; border-radius: $border-radius-lg; padding: $spacing-md; margin-bottom: $spacing-sm; }

/* Rows */
.lp-row { display: flex; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid $border-color-light; }
.lp-row--last { border-bottom: none; }
.lp-row__label { font-size: $font-md; color: $text-primary; flex-shrink: 0; }
.lp-row__val { font-size: $font-md; color: $text-secondary; margin-left: auto; }
.lp-row__val--primary { color: $color-primary; font-weight: 600; }

/* Progress bar */
.lp-bar { height: 12rpx; background: $border-color; border-radius: 6rpx; overflow: hidden; margin-top: $spacing-sm; }
.lp-bar__fill { height: 100%; background: $color-primary; border-radius: 6rpx; transition: width .3s; }
.lp-hint { font-size: $font-xs; color: $text-tertiary; display: block; margin-top: $spacing-sm; }

/* Tags */
.lp-tags { display: flex; flex-wrap: wrap; gap: $spacing-sm; }
.lp-tag { font-size: $font-sm; color: $text-secondary; background: $border-color-light; padding: 12rpx $spacing-md; border-radius: $border-radius-round; transition: all .2s; }
.lp-tag--active { background: $color-primary-light; color: $color-primary; font-weight: 500; }
.lp-tags--sm { margin-top: $spacing-sm; }
.lp-tag--sm-item { font-size: $font-xs; padding: 8rpx $spacing-sm; }

/* Segments */
.lp-segments { display: flex; border-radius: $border-radius-lg; overflow: hidden; }
.lp-seg { flex: 1; text-align: center; font-size: $font-sm; color: $text-secondary; background: $bg-card; padding: $spacing-sm 0; border: 2rpx solid $border-color; }
.lp-seg:first-child { border-radius: $border-radius-lg 0 0 $border-radius-lg; }
.lp-seg:last-child { border-radius: 0 $border-radius-lg $border-radius-lg 0; }
.lp-seg--active { border-color: $color-primary; color: $color-primary; font-weight: 500; background: $color-primary-light; }

/* Course name */
.lp-crs__name { font-size: $font-md; font-weight: 600; color: $text-primary; display: block; }

/* Save button */
.lp-save { display: flex; align-items: center; justify-content: center; margin: $spacing-lg $spacing-md; height: 96rpx; background: $color-primary; border-radius: $border-radius-xl; }
.lp-save__text { font-size: $font-lg; color: #fff; font-weight: 600; }

.lp-safe { height: calc($safe-bottom + 120rpx); }
</style>
