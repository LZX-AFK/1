<template>
  <view class="ck-page">
    <!-- Loading -->
    <scroll-view v-if="pageState === 'loading'" scroll-y class="ck-scroll">
      <view class="skel skel--nav" />
      <view class="skel skel--header" />
      <view class="skel skel--search" />
      <view class="skel skel--tabs" />
      <view class="skel skel--card" />
      <view class="skel skel--card" />
      <view class="skel skel--card" />
      <view class="ck-safe" />
    </scroll-view>

    <!-- Error -->
    <view v-else-if="pageState === 'error'" class="ck-err" @tap="fetchData">
      <text class="ck-err__icon">⚠️</text>
      <text class="ck-err__text">{{ t('common.error') }}</text>
      <text class="ck-err__retry">{{ t('common.retry') }}</text>
    </view>

    <!-- Normal -->
    <scroll-view v-else scroll-y class="ck-scroll">
      <!-- Nav -->
      <view class="ck-nav">
        <text class="ck-nav__back" @tap="goBack">← {{ t('common.back') }}</text>
        <text class="ck-nav__more" @tap="onMore">{{ t('common.more') }}</text>
      </view>
      <view class="ck-nav-info">
        <text class="ck-nav__title">{{ t('knowledge.courseSpaceTitle', { course: '生物学 101' }) }}</text>
        <text class="ck-nav__sub">张教授 · 2026 Spring</text>
      </view>

      <!-- Header stats -->
      <view class="ck-header">
        <view class="ck-header__stats">
          <view class="ck-hs__item"><text class="ck-hs__val">8</text><text class="ck-hs__lbl">{{ t('knowledge.statRecording') }}</text></view>
          <view class="ck-hs__item"><text class="ck-hs__val">21</text><text class="ck-hs__lbl">{{ t('knowledge.statNotes') }}</text></view>
          <view class="ck-hs__item"><text class="ck-hs__val">12</text><text class="ck-hs__lbl">{{ t('knowledge.statMarks') }}</text></view>
          <view class="ck-hs__item"><text class="ck-hs__val">5</text><text class="ck-hs__lbl">{{ t('knowledge.statTerms') }}</text></view>
          <view class="ck-hs__item"><text class="ck-hs__val ck-hs__val--amber">3</text><text class="ck-hs__lbl">{{ t('knowledge.coursePendingHint') }}</text></view>
        </view>
        <view class="ck-header__prog">
          <view class="ck-hp__bar"><view class="ck-hp__fill" :style="{ width: '80%' }" /></view>
          <text class="ck-hp__pct">{{ t('knowledge.courseProgress') }} 80%</text>
        </view>
        <text class="ck-header__focus">{{ t('knowledge.thisWeekFocus') }}：Cell Division / DNA Replication / Mitosis vs Meiosis</text>
      </view>

      <!-- Search -->
      <view class="ck-search"><SearchBar v-model="searchQuery" :placeholder="t('knowledge.searchInCourse')" @search="onSearch" /></view>

      <!-- Tabs: lessons / concepts / review only -->
      <view class="ck-tabs">
        <view v-for="tab in tabs" :key="tab.key" class="ck-tab" :class="{ 'ck-tab--active': activeTab === tab.key }" @tap="activeTab = tab.key">
          <text class="ck-tab__text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- Tab: Lessons -->
      <view v-if="activeTab === 'lessons'" class="ck-content">
        <view v-for="lp in lessonPackages" :key="lp.id" class="ck-pkg-card" @tap="goToPackage(lp.id)">
          <view class="ck-pkg__head">
            <text class="ck-pkg__date">{{ lp.date }}</text>
            <text class="ck-pkg__course">{{ lp.courseName }}</text>
          </view>
          <view class="ck-pkg__tags">
            <text v-for="tag in lp.includes" :key="tag" class="ck-pkg__tag">{{ tag }}</text>
          </view>
          <text class="ck-pkg__meta">{{ lp.duration }} · {{ lp.marks }} {{ t('common.mark') }} · {{ lp.accuracy }}% {{ t('common.accuracy') }}</text>
          <view class="ck-pkg__status" :class="'ck-pkg__status--' + lp.statusType">
            <text class="ck-pkg__stext">{{ lp.statusText }}</text>
          </view>
        </view>
      </view>

      <!-- Tab: Concepts -->
      <view v-if="activeTab === 'concepts'" class="ck-content">
        <view v-for="concept in concepts" :key="concept.id" class="ck-concept-card">
          <view class="ck-cpt__head">
            <view class="ck-cpt__names">
              <text class="ck-cpt__name">{{ concept.name }}</text>
              <text class="ck-cpt__namezh">{{ concept.nameZh }}</text>
            </view>
            <text class="ck-cpt__badge" :class="'ck-cpt__badge--' + concept.badgeKey">{{ concept.badgeLabel }}</text>
          </view>
          <view class="ck-cpt__row">
            <text class="ck-cpt__albl">{{ t('knowledge.conceptAppearsIn') }}</text>
            <view class="ck-cpt__class-tags">
              <text v-for="c in concept.classes" :key="c" class="ck-cpt__class-tag">{{ c }}</text>
            </view>
          </view>
          <view class="ck-cpt__row">
            <text class="ck-cpt__albl">{{ t('knowledge.relatedConcepts') }}</text>
            <view class="ck-cpt__tags">
              <text v-for="tag in concept.related" :key="tag" class="ck-cpt__tag">{{ tag }}</text>
            </view>
          </view>
          <view class="ck-cpt__row">
            <text class="ck-cpt__albl">{{ t('knowledge.conceptMaterials') }}</text>
            <text class="ck-cpt__atext">{{ concept.materials }}</text>
          </view>
          <view class="ck-cpt__action" @tap.stop="onViewRelated(concept)">
            <text class="ck-cpt__btn">{{ t('knowledge.viewRelated') }} ›</text>
          </view>
        </view>
      </view>

      <!-- Tab: Review -->
      <view v-if="activeTab === 'review'" class="ck-content">
        <view v-for="item in reviewItems" :key="item.id" class="ck-ri">
          <view class="ck-ri__dot" :class="'ck-ri__dot--' + item.typeKey" />
          <view class="ck-ri__body">
            <text class="ck-ri__title">{{ item.title }}</text>
            <view class="ck-ri__meta">
              <text class="ck-ri__type" :class="'ck-ri__type--' + item.typeKey">{{ item.typeLabel }}</text>
              <text class="ck-ri__src">{{ t('knowledge.reviewSource') }}{{ item.source }}</text>
            </view>
          </view>
          <text class="ck-ri__action" @tap="onStartReview">{{ t('knowledge.goToReview') }}</text>
        </view>
        <view class="ck-rev-btn" @tap="onStartReview">
          <text class="ck-rev-btn__text">{{ t('knowledge.startReview') }}</text>
        </view>
      </view>

      <view class="ck-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SearchBar from '@/components/SearchBar.vue'

const { t } = useI18n()
const pageState = ref<'loading' | 'normal' | 'error'>('loading')
const activeTab = ref('lessons')
const searchQuery = ref('')

const tabs = [
  { key: 'lessons', label: t('knowledge.courseLessons') },
  { key: 'concepts', label: t('knowledge.courseConcepts') },
  { key: 'review', label: t('knowledge.courseReview') },
]

const lessonPackages = [
  { id: 'pk1', date: '5月28日 · 细胞分裂课堂', courseName: '生物学 101', includes: ['录音', '原文', '时间轴', 'AI总结', '考点', '术语'], duration: '52分钟', marks: 6, accuracy: 95, statusType: 'done', statusText: t('knowledge.lessonComplete') },
  { id: 'pk2', date: '5月26日 · 遗传学基础课堂', courseName: '生物学 101', includes: ['录音', '原文', 'AI总结', '标记'], duration: '48分钟', marks: 3, accuracy: 96, statusType: 'pending', statusText: t('knowledge.packagePending', { n: '2' }) },
  { id: 'pk3', date: '5月21日 · DNA复制课堂', courseName: '生物学 101', includes: ['录音', '原文', 'AI总结'], duration: '50分钟', marks: 5, accuracy: 94, statusType: 'saved', statusText: t('knowledge.packageSaved') },
]

const concepts = [
  { id: 'cp1', name: 'Cell Cycle', nameZh: '细胞周期', badgeLabel: '核心概念', badgeKey: 'core', classes: ['5月28日 · 细胞分裂', '5月21日 · DNA复制'], related: ['DNA replication', 'Mitosis', 'Cytokinesis'], materials: '2 篇 AI总结 · 3 个标记 · 1 个考点' },
  { id: 'cp2', name: 'Mitosis', nameZh: '有丝分裂', badgeLabel: '高频考点', badgeKey: 'exam', classes: ['5月28日 · 细胞分裂'], related: ['chromosome', 'cytokinesis', 'meiosis'], materials: '1 篇 AI总结 · 4 个标记 · 2 个术语' },
  { id: 'cp3', name: 'DNA replication', nameZh: 'DNA复制', badgeLabel: '易混点', badgeKey: 'confusing', classes: ['5月28日 · 细胞分裂', '5月26日 · 遗传学基础'], related: ['S phase', 'chromosome', 'cell cycle'], materials: '2 篇 AI总结 · 1 个考点' },
]

const reviewItems = [
  { id: 'ri1', title: '回看 00:23:12 的 metaphase 标记', typeLabel: t('knowledge.reviewTypeConfusing'), typeKey: 'confusing', source: '5月28日 · 细胞分裂课堂' },
  { id: 'ri2', title: '复习 G2 checkpoint', typeLabel: t('knowledge.reviewTypeWeak'), typeKey: 'weak', source: '细胞分裂课堂' },
  { id: 'ri3', title: '对比 mitosis / meiosis', typeLabel: t('knowledge.reviewTypeExam'), typeKey: 'exam', source: '5月28日 · 细胞分裂课堂' },
  { id: 'ri4', title: '复习 5 个专业术语', typeLabel: t('knowledge.reviewTypeTerms'), typeKey: 'terms', source: '本课程词库' },
]

async function fetchData() { pageState.value = 'loading'; await new Promise<void>(r => setTimeout(r, 400)); pageState.value = 'normal' }
function goBack() { uni.navigateBack() }
function onMore() { uni.showToast({ title: t('knowledge.managementComingSoon'), icon: 'none' }) }
function onSearch() {}
function goToPackage(_id: string) { uni.navigateTo({ url: '/pages/record/summary?id=mock-summary-001' }) }
function onViewRelated(_c: typeof concepts[0]) { uni.showToast({ title: t('knowledge.conceptRelatedComingSoon'), icon: 'none' }) }
function onStartReview() { uni.showToast({ title: t('knowledge.reviewModeComingSoon'), icon: 'none' }) }

onMounted(() => { fetchData() })
</script>

<style lang="scss" scoped>
.ck-page { min-height: 100vh; background: #F3F4F6; padding: 32rpx; padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); box-sizing: border-box; overflow-x: hidden; }
/* #ifdef H5 */
.ck-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.ck-scroll { width: 100%; height: 100vh; box-sizing: border-box; }
.ck-safe { height: 32rpx; }

// Skeleton
.skel { background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 24rpx; margin-bottom: 24rpx; }
.skel--nav { height: 100rpx; }
.skel--header { height: 200rpx; }
.skel--search { height: 80rpx; }
.skel--tabs { height: 64rpx; }
.skel--card { height: 160rpx; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

// Error
.ck-err { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 32rpx; background: #FEF2F2; border-bottom: 2rpx solid #FECACA; margin: -32rpx -32rpx 0; &:active { opacity: 0.7; } }
.ck-err__icon { font-size: 28rpx; }
.ck-err__text { font-size: 24rpx; color: #DC2626; flex: 1; }
.ck-err__retry { font-size: 24rpx; color: #4F46E5; font-weight: 600; }

// Nav
.ck-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.ck-nav__back { font-size: 28rpx; color: #4F46E5; font-weight: 600; &:active { opacity: 0.7; } }
.ck-nav__more { font-size: 28rpx; color: #6B7280; &:active { opacity: 0.7; } }
.ck-nav-info { margin-bottom: 28rpx; }
.ck-nav__title { font-size: 40rpx; font-weight: 700; color: #1F2937; display: block; }
.ck-nav__sub { font-size: 24rpx; color: #6B7280; display: block; margin-top: 6rpx; }

// Header
.ck-header { background: #FFFFFF; border-radius: 24rpx; padding: 28rpx 24rpx; margin-bottom: 24rpx; box-sizing: border-box; }
.ck-header__stats { display: flex; justify-content: space-around; margin-bottom: 20rpx; }
.ck-hs__item { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.ck-hs__val { font-size: 32rpx; font-weight: 700; color: #1F2937; }
.ck-hs__val--amber { color: #F59E0B; }
.ck-hs__lbl { font-size: 20rpx; color: #9CA3AF; }
.ck-header__prog { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.ck-hp__bar { flex: 1; height: 10rpx; background: #E5E7EB; border-radius: 9999rpx; overflow: hidden; }
.ck-hp__fill { height: 100%; background: #4F46E5; border-radius: 9999rpx; }
.ck-hp__pct { font-size: 24rpx; color: #4F46E5; font-weight: 600; flex-shrink: 0; }
.ck-header__focus { font-size: 24rpx; color: #6B7280; line-height: 1.5; display: block; }

// Search
.ck-search { margin-bottom: 24rpx; }

// Tabs
.ck-tabs { display: flex; gap: 0; margin-bottom: 24rpx; background: #FFFFFF; border-radius: 20rpx; padding: 6rpx; }
.ck-tab { flex: 1; padding: 16rpx 0; text-align: center; border-radius: 16rpx; &:active { opacity: 0.7; } }
.ck-tab--active { background: #4F46E5; .ck-tab__text { color: #FFFFFF; font-weight: 600; } }
.ck-tab__text { font-size: 26rpx; color: #6B7280; font-weight: 500; }

// Content
.ck-content { }

// Lesson packages
.ck-pkg-card { background: #FFFFFF; border-radius: 24rpx; padding: 24rpx; margin-bottom: 16rpx; box-sizing: border-box; &:active { opacity: 0.7; } }
.ck-pkg__head { display: flex; flex-direction: column; gap: 4rpx; }
.ck-pkg__date { font-size: 28rpx; font-weight: 600; color: #1F2937; }
.ck-pkg__course { font-size: 24rpx; color: #4F46E5; }
.ck-pkg__tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 16rpx; }
.ck-pkg__tag { font-size: 22rpx; color: #4F46E5; background: #EEF2FF; border-radius: 8rpx; padding: 4rpx 12rpx; }
.ck-pkg__meta { font-size: 24rpx; color: #6B7280; display: block; margin-top: 12rpx; }
.ck-pkg__status { margin-top: 12rpx; padding: 8rpx 16rpx; border-radius: 12rpx; display: inline-block; }
.ck-pkg__status--done { background: #ECFDF5; .ck-pkg__stext { color: #059669; } }
.ck-pkg__status--pending { background: #FEF3C7; .ck-pkg__stext { color: #D97706; } }
.ck-pkg__status--saved { background: #EEF2FF; .ck-pkg__stext { color: #4F46E5; } }
.ck-pkg__stext { font-size: 22rpx; font-weight: 600; }

// Concept cards
.ck-concept-card { background: #FFFFFF; border-radius: 24rpx; padding: 24rpx; margin-bottom: 20rpx; box-sizing: border-box; }
.ck-cpt__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12rpx; margin-bottom: 16rpx; }
.ck-cpt__names { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.ck-cpt__name { font-size: 30rpx; font-weight: 700; color: #1F2937; }
.ck-cpt__namezh { font-size: 22rpx; color: #9CA3AF; }
.ck-cpt__badge { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 8rpx; flex-shrink: 0; }
.ck-cpt__badge--core { background: #EEF2FF; color: #4F46E5; }
.ck-cpt__badge--exam { background: #FEF3C7; color: #D97706; }
.ck-cpt__badge--confusing { background: #FCE7F3; color: #DB2777; }
.ck-cpt__row { display: flex; align-items: flex-start; gap: 8rpx; margin-top: 12rpx; }
.ck-cpt__albl { font-size: 22rpx; color: #9CA3AF; flex-shrink: 0; min-width: 70rpx; }
.ck-cpt__atext { font-size: 24rpx; color: #4B5563; line-height: 1.5; flex: 1; }
.ck-cpt__class-tags { display: flex; flex-wrap: wrap; gap: 8rpx; flex: 1; }
.ck-cpt__class-tag { font-size: 22rpx; color: #374151; background: #F3F4F6; border-radius: 8rpx; padding: 4rpx 12rpx; }
.ck-cpt__tags { display: flex; flex-wrap: wrap; gap: 8rpx; flex: 1; }
.ck-cpt__tag { font-size: 22rpx; color: #7C3AED; background: #F3E8FF; border-radius: 8rpx; padding: 4rpx 12rpx; }
.ck-cpt__action { margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #F3F4F6; }
.ck-cpt__btn { font-size: 24rpx; color: #4F46E5; font-weight: 600; }

// Review items
.ck-ri { background: #FFFFFF; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; display: flex; align-items: center; gap: 16rpx; box-sizing: border-box; }
.ck-ri__dot { width: 16rpx; height: 16rpx; border-radius: 50%; flex-shrink: 0; }
.ck-ri__dot--confusing { background: #EF4444; }
.ck-ri__dot--weak { background: #F59E0B; }
.ck-ri__dot--exam { background: #8B5CF6; }
.ck-ri__dot--terms { background: #3B82F6; }
.ck-ri__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.ck-ri__title { font-size: 26rpx; font-weight: 600; color: #1F2937; line-height: 1.4; }
.ck-ri__meta { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.ck-ri__type { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; font-weight: 600; flex-shrink: 0; }
.ck-ri__type--confusing { background: #FEF2F2; color: #EF4444; }
.ck-ri__type--weak { background: #FEF3C7; color: #D97706; }
.ck-ri__type--exam { background: #F3E8FF; color: #7C3AED; }
.ck-ri__type--terms { background: #EFF6FF; color: #3B82F6; }
.ck-ri__src { font-size: 22rpx; color: #9CA3AF; }
.ck-ri__action { font-size: 24rpx; color: #4F46E5; font-weight: 600; flex-shrink: 0; &:active { opacity: 0.7; } }

// Review button
.ck-rev-btn { margin-top: 8rpx; background: #4F46E5; border-radius: 16rpx; padding: 24rpx; text-align: center; &:active { opacity: 0.8; } }
.ck-rev-btn__text { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
</style>
