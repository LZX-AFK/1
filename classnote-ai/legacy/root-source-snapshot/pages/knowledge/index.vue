<template>
  <view class="kb-page">
    <!-- Error -->
    <view v-if="pageState === 'error'" class="error-bar" @tap="fetchData">
      <text class="err-icon">⚠️</text>
      <text class="err-text">{{ t('common.error') }}</text>
      <text class="err-retry">{{ t('common.retry') }}</text>
    </view>

    <!-- Loading -->
    <scroll-view v-if="pageState === 'loading'" scroll-y class="kb-scroll">
      <view class="skel skel--hdr" />
      <view class="skel skel--search" />
      <view class="skel skel--row3" />
      <view class="skel skel--heading" />
      <view class="skel skel--big" />
      <view class="kb-safe" />
    </scroll-view>

    <!-- searchEmpty -->
    <view v-else-if="pageState === 'searchEmpty'" class="kb-empty-wrap">
      <view class="kb-search-row"><SearchBar v-model="searchQuery" :placeholder="t('knowledge.searchPlaceholderCourse')" @search="onSearch" /></view>
      <EmptyState icon="🔍" :title="t('knowledge.noResults')" :description="t('knowledge.noResultsDesc')" />
    </view>

    <!-- Empty -->
    <view v-else-if="pageState === 'empty'" class="kb-empty-wrap">
      <EmptyState icon="📚" :title="t('knowledge.emptyTitle')" :description="t('knowledge.emptyDesc')" />
    </view>

    <!-- Normal -->
    <scroll-view v-else scroll-y class="kb-scroll">
      <!-- M1: Header -->
      <view class="kb-hdr">
        <view class="kb-hdr__left">
          <text class="kb-hdr__title">{{ t('knowledge.title') }}</text>
          <text class="kb-hdr__sub">{{ t('knowledge.subtitleCourseSpace') }}</text>
        </view>
        <text class="kb-hdr__more" @tap="onManage">{{ t('common.more') }}</text>
      </view>

      <!-- M2: Search -->
      <view class="kb-search-row"><SearchBar v-model="searchQuery" :placeholder="t('knowledge.searchPlaceholderCourse')" @search="onSearch" /></view>

      <!-- M3: Progress Overview -->
      <view class="kb-section">
        <text class="kb-sec__title">{{ t('knowledge.progressOverview') }}</text>
        <view class="kb-progress-row">
          <view class="kb-prog__card kb-prog__card--green">
            <text class="kb-prog__label">{{ t('knowledge.weekLearning') }}</text>
            <text class="kb-prog__big">3 {{ t('knowledge.subClasses') }}</text>
            <text class="kb-prog__sub">4.8 {{ t('knowledge.subHours') }}</text>
          </view>
          <view class="kb-prog__card kb-prog__card--amber">
            <text class="kb-prog__label">{{ t('knowledge.toProcess') }}</text>
            <text class="kb-prog__big">6 {{ t('knowledge.subMarks') }}</text>
            <text class="kb-prog__sub">3 {{ t('knowledge.subWeakPoints') }}</text>
          </view>
          <view class="kb-prog__card kb-prog__card--purple">
            <text class="kb-prog__label">{{ t('knowledge.reviewProgress') }}</text>
            <text class="kb-prog__big">9 {{ t('knowledge.subReviewed') }}</text>
            <text class="kb-prog__sub">{{ t('knowledge.keepItUp') }}</text>
          </view>
        </view>
      </view>

      <!-- M4: Course Learning Space -->
      <view class="kb-section">
        <text class="kb-sec__title">{{ t('knowledge.courseSpace') }}</text>
        <view v-for="c in filteredCourses" :key="c.id" class="kb-course-card" @tap="onCourseTap(c)">
          <view class="kb-cc__top">
            <view class="kb-cc__icon">{{ c.icon }}</view>
            <view class="kb-cc__info">
              <text class="kb-cc__name">{{ c.name }}</text>
              <text class="kb-cc__meta">{{ c.instructor }} · {{ c.semester }}</text>
            </view>
            <text class="kb-cc__arrow">›</text>
          </view>
          <view class="kb-cc__progress">
            <view class="kb-cc__bar"><view class="kb-cc__bar-fill" :style="{ width: c.progress + '%' }" /></view>
            <text class="kb-cc__prog-label">{{ c.progress }}%</text>
          </view>
          <view class="kb-cc__stats">
            <text class="kb-cc__stat">{{ c.recordings }}{{ t('knowledge.statRecording') }}</text>
            <text class="kb-cc__stat">{{ c.notes }}{{ t('knowledge.statNotes') }}</text>
            <text class="kb-cc__stat">{{ c.marks }}{{ t('knowledge.statMarks') }}</text>
            <text class="kb-cc__stat">{{ c.terms }}{{ t('knowledge.statTerms') }}</text>
          </view>
          <view class="kb-cc__recent">
            <text class="kb-cc__recent-label">{{ t('knowledge.courseRecentPackage') }}：</text>
            <text class="kb-cc__recent-text">{{ c.recentPackage }}</text>
          </view>
          <view class="kb-cc__pending">
            <text class="kb-cc__pending-label">{{ t('knowledge.coursePendingHint') }}：</text>
            <text class="kb-cc__pending-text">{{ c.pending }}</text>
          </view>
        </view>
      </view>

      <view class="kb-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SearchBar from '@/components/SearchBar.vue'
import EmptyState from '@/components/EmptyState.vue'

const { t } = useI18n()
const pageState = ref<'loading' | 'normal' | 'searchEmpty' | 'empty' | 'error'>('loading')
const searchQuery = ref('')

interface CourseCardData { id: string; icon: string; name: string; instructor: string; semester: string; recordings: number; notes: number; marks: number; terms: number; progress: number; recentPackage: string; pending: string }
const courses: CourseCardData[] = [
  { id: 'c1', icon: '🧬', name: '生物学 101', instructor: '张教授', semester: '2026 Spring', recordings: 8, notes: 21, marks: 12, terms: 5, progress: 80, recentPackage: '5月28日 · 细胞分裂课堂', pending: '2 个没听懂标记 · 1 个考点待复习' },
  { id: 'c2', icon: '⚗️', name: '化学 201', instructor: '陈教授', semester: '2026 Spring', recordings: 6, notes: 15, marks: 4, terms: 3, progress: 65, recentPackage: '5月27日 · 化学键课堂', pending: '1 个重点标记 · 2 个术语待复习' },
  { id: 'c3', icon: '⚡', name: '物理学 101', instructor: '王教授', semester: '2026 Spring', recordings: 10, notes: 28, marks: 8, terms: 6, progress: 72, recentPackage: '5月26日 · 运动学公式整理', pending: '2 个考点待复习' },
  { id: 'c4', icon: '🧠', name: '心理学 101', instructor: '李教授', semester: '2026 Spring', recordings: 4, notes: 9, marks: 2, terms: 2, progress: 45, recentPackage: '认知心理学课堂笔记', pending: '资料较少，建议继续积累' },
]

const filteredCourses = computed(() => {
  if (!searchQuery.value) return courses
  const q = searchQuery.value.toLowerCase()
  return courses.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.instructor.includes(q) ||
    c.recentPackage.includes(q) ||
    c.pending.includes(q)
  )
})

async function fetchData() { pageState.value = 'loading'; await new Promise<void>(r => setTimeout(r, 500)); pageState.value = 'normal' }
function onManage() { uni.showToast({ title: t('knowledge.managementComingSoon'), icon: 'none' }) }
function onSearch() {
  if (!searchQuery.value) { pageState.value = 'normal'; return }
  if (!filteredCourses.value.length) { pageState.value = 'searchEmpty' }
}
function onCourseTap(_c: CourseCardData) { uni.navigateTo({ url: '/pages/knowledge/course?id=biology-101' }) }

onMounted(() => { fetchData() })
</script>

<style lang="scss" scoped>
.kb-page { min-height: 100vh; background: #F3F4F6; padding: 32rpx; padding-top: calc(48rpx + env(safe-area-inset-top)); padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); box-sizing: border-box; overflow-x: hidden; }
/* #ifdef H5 */
.kb-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.kb-scroll { width: 100%; height: 100vh; box-sizing: border-box; }
.kb-safe { height: 32rpx; }
.kb-empty-wrap { padding: 32rpx; }
.kb-search-row { width: 100%; }

// Error
.error-bar { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 32rpx; background: #FEF2F2; border-bottom: 2rpx solid #FECACA; margin: -32rpx -32rpx 0; &:active { opacity: 0.7; } }
.err-icon { font-size: 28rpx; }
.err-text { font-size: 24rpx; color: #DC2626; flex: 1; }
.err-retry { font-size: 24rpx; color: #4F46E5; font-weight: 600; }

// Skeleton
.skel { background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 24rpx; margin-bottom: 24rpx; }
.skel--hdr { height: 100rpx; }
.skel--search { height: 80rpx; }
.skel--row3 { height: 180rpx; }
.skel--heading { height: 36rpx; width: 200rpx; }
.skel--big { height: 280rpx; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

// M1: Header
.kb-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; margin-bottom: 24rpx; }
.kb-hdr__left { flex: 1; min-width: 0; }
.kb-hdr__title { font-size: 40rpx; font-weight: 700; color: #1F2937; display: block; }
.kb-hdr__sub { font-size: 24rpx; color: #6B7280; display: block; margin-top: 6rpx; line-height: 1.5; }
.kb-hdr__more { font-size: 24rpx; color: #4F46E5; flex-shrink: 0; padding: 8rpx 0; &:active { opacity: 0.7; } }

.kb-search-row { margin-bottom: 28rpx; }
.kb-section { margin-bottom: 32rpx; }
.kb-sec__title { font-size: 32rpx; font-weight: 600; color: #1F2937; display: block; margin-bottom: 16rpx; }

// M3: Progress Overview
.kb-progress-row { display: flex; gap: 16rpx; }
.kb-prog__card { flex: 1; min-width: 0; background: #FFFFFF; border-radius: 20rpx; padding: 24rpx 16rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; text-align: center; }
.kb-prog__card--green { border-top: 6rpx solid #10B981; }
.kb-prog__card--amber { border-top: 6rpx solid #F59E0B; }
.kb-prog__card--purple { border-top: 6rpx solid #8B5CF6; }
.kb-prog__label { font-size: 24rpx; font-weight: 600; color: #374151; }
.kb-prog__big { font-size: 32rpx; font-weight: 700; color: #1F2937; }
.kb-prog__sub { font-size: 20rpx; color: #6B7280; line-height: 1.5; }

// M4: Course Learning Space
.kb-course-card { background: #FFFFFF; border-radius: 24rpx; padding: 24rpx; margin-bottom: 16rpx; box-sizing: border-box; &:active { opacity: 0.7; } }
.kb-cc__top { display: flex; align-items: center; gap: 16rpx; }
.kb-cc__icon { font-size: 40rpx; flex-shrink: 0; }
.kb-cc__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.kb-cc__name { font-size: 32rpx; font-weight: 700; color: #1F2937; }
.kb-cc__meta { font-size: 24rpx; color: #6B7280; }
.kb-cc__arrow { font-size: 36rpx; color: #9CA3AF; flex-shrink: 0; }
.kb-cc__progress { display: flex; align-items: center; gap: 16rpx; margin-top: 20rpx; }
.kb-cc__bar { flex: 1; height: 10rpx; background: #E5E7EB; border-radius: 9999rpx; overflow: hidden; }
.kb-cc__bar-fill { height: 100%; background: #4F46E5; border-radius: 9999rpx; }
.kb-cc__prog-label { font-size: 24rpx; color: #4F46E5; font-weight: 600; flex-shrink: 0; }
.kb-cc__stats { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.kb-cc__stat { font-size: 22rpx; color: #4B5563; background: #F3F4F6; border-radius: 8rpx; padding: 6rpx 16rpx; }
.kb-cc__recent { margin-top: 16rpx; display: flex; align-items: baseline; }
.kb-cc__recent-label { font-size: 24rpx; color: #9CA3AF; flex-shrink: 0; }
.kb-cc__recent-text { font-size: 24rpx; color: #6B7280; }
.kb-cc__pending { margin-top: 10rpx; display: flex; align-items: baseline; }
.kb-cc__pending-label { font-size: 24rpx; color: #9CA3AF; flex-shrink: 0; }
.kb-cc__pending-text { font-size: 24rpx; color: #F59E0B; }
</style>
