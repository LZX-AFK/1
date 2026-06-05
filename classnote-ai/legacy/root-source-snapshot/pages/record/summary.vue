<template>
  <view class="sp">
    <!-- M1: Navigation -->
    <view class="sp__nav">
      <text class="sp__nav-back" @click="goHome">{{ t('summary.done') }}</text>
      <text class="sp__nav-title">{{ t('summary.title') }}</text>
      <text class="sp__nav-more" @click="handleMore">⋯</text>
    </view>

    <!-- Loading -->
    <template v-if="status === 'loading'">
      <view class="sk sk--hero" />
      <view class="sk sk--tabs" />
      <view class="sk sk--card" />
      <view class="sk sk--card" style="height: 120rpx;" />
    </template>

    <!-- Error -->
    <view v-else-if="status === 'error'" class="sp__err">
      <text class="sp__err-text">{{ t('summary.error') }}</text>
      <text class="sp__err-retry" @click="loadData">{{ t('common.retry') }}</text>
    </view>

    <!-- NoData -->
    <view v-else-if="status === 'noData'" class="sp__empty">
      <text class="sp__empty-icon">📝</text>
      <text class="sp__empty-title">{{ t('summary.noData') }}</text>
      <text class="sp__empty-desc">{{ t('summary.noDataDesc') }}</text>
    </view>

    <!-- Normal: 7-Tab Workspace -->
    <template v-else>
      <!-- M2: Summary Hero -->
      <view class="sp__hero">
        <text class="sp__hero-info">{{ classInfoText }}</text>
        <view class="sp__hero-flow">
          <text class="sp__hero-flow-label">{{ t('summary.classFlow') }}</text>
          <text class="sp__hero-flow-text">{{ summary.classFlow }}</text>
        </view>
        <text class="sp__hero-oneline">{{ summary.oneSentenceSummary }}</text>
      </view>

      <!-- M3: Tab Bar (7 tabs, horizontal scroll) -->
      <scroll-view scroll-x class="sp__tabs" :show-scrollbar="false">
        <view class="sp__tabs-inner">
          <view
            v-for="tab in tabs" :key="tab"
            class="sp__tab"
            :class="{ 'sp__tab--active': currentTab === tab }"
            @click="currentTab = tab"
          >
            <text class="sp__tab-text">{{ t('summary.' + tab) }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- M4: Tab Content Area -->
      <!-- ======================== Tab 1: 总览 ======================== -->
      <view v-if="currentTab === 'overview'" class="sp__content">
        <view class="card">
          <view class="card-hd">
            <text class="card-hd-icon">💡</text>
            <text class="card-hd-title">{{ t('summary.youNeedToMaster') }}</text>
          </view>
          <view v-for="(point, idx) in summary.keyPoints" :key="idx" class="om-item">
            <view class="om-num">{{ idx + 1 }}</view>
            <text class="om-text">{{ point }}</text>
          </view>
        </view>

        <view class="card card--personalized">
          <view class="card-hd">
            <text class="card-hd-icon">✨</text>
            <text class="card-hd-title">{{ t('summary.personalizedForYou') }}</text>
          </view>
          <view v-for="(item, idx) in summary.personalizedItems" :key="idx" class="op-item">
            <text class="op-emoji">{{ idx === 0 ? '📚' : idx === 1 ? '📖' : '🔗' }}</text>
            <text class="op-text">{{ item.text }}</text>
          </view>
        </view>

        <view class="card">
          <view class="card-hd">
            <text class="card-hd-icon">✅</text>
            <text class="card-hd-title">{{ t('summary.todayReviewTasks') }}</text>
          </view>
          <view v-for="task in summary.reviewTasks" :key="task.id" class="or-item" @click="handleToggleTask(task.id)">
            <view class="or-cb" :class="{ 'or-cb--done': task.completed }">
              <text v-if="task.completed" class="or-cb-check">✓</text>
            </view>
            <text class="or-text" :class="{ 'or-text--done': task.completed }">{{ task.title }}</text>
          </view>
        </view>
      </view>

      <!-- ======================== Tab 2: 原文（完整转写文稿） ======================== -->
      <view v-if="currentTab === 'transcript'" class="sp__content">
        <view class="st-bar">
          <input class="st-bar__input" v-model="transcriptQuery" :placeholder="t('summary.transcript_searchPlaceholder')" />
          <view class="st-bar__toggle" :class="{ 'st-bar__toggle--on': marksOnly }" @click="marksOnly = !marksOnly">
            <text class="st-bar__toggle-text">{{ t('summary.transcript_onlyMarks') }}</text>
          </view>
        </view>
        <view class="st-actions">
          <text class="st-actions__btn" @click="handleCopy">{{ t('summary.transcript_copy') }}</text>
          <text class="st-actions__btn" @click="handleExport">{{ t('summary.transcript_export') }}</text>
        </view>
        <!-- 原文块：文档阅读器风格，长文本 -->
        <view v-for="(block, idx) in filteredTranscriptBlocks" :key="idx" class="card doc-block">
          <view class="doc-block__hd" @click="toggleBlock(idx)">
            <view class="doc-block__header-left">
              <text class="doc-block__time">{{ block.timeRange }}</text>
              <text v-if="block.hasMarks" class="doc-block__mark-tag">{{ t('summary.transcript_hasMarks') }}</text>
            </view>
            <text class="doc-block__title">{{ block.title }}</text>
            <text class="doc-block__chevron">{{ expandedBlocks.has(idx) ? '收起 ▲' : '展开全文 ▼' }}</text>
          </view>
          <view v-if="expandedBlocks.has(idx)" class="doc-block__body">
            <text class="doc-block__text">{{ block.text }}</text>
          </view>
        </view>
        <view v-if="filteredTranscriptBlocks.length === 0" class="st-empty">
          <text class="st-empty__text">{{ t('summary.transcript_noMatch') }}</text>
        </view>
      </view>

      <!-- ======================== Tab 3: 时间轴（课堂讲授路径复盘） ======================== -->
      <view v-if="currentTab === 'timeline'" class="sp__content">
        <view class="tl-track">
          <view v-for="(item, idx) in summary.lectureTimeline" :key="idx" class="tl-node">
            <!-- 时间线左侧：竖线 + 圆点 -->
            <view class="tl-node__rail">
              <view class="tl-node__dot" :class="{ 'tl-node__dot--first': idx === 0, 'tl-node__dot--last': idx === summary.lectureTimeline.length - 1 }" />
              <view v-if="idx < summary.lectureTimeline.length - 1" class="tl-node__line" />
            </view>
            <!-- 时间线右侧：内容卡片 -->
            <view class="tl-node__card">
              <view class="tl-node__card-hd">
                <text class="tl-node__time">{{ item.timeRange }}</text>
                <text class="tl-node__title">{{ item.title }}</text>
              </view>
              <view class="tl-node__section">
                <text class="tl-node__section-label">{{ t('summary.timeline_whatTaught') }}</text>
                <text class="tl-node__section-text">{{ item.whatTaught }}</text>
              </view>
              <view class="tl-node__section tl-node__section--emphasis">
                <text class="tl-node__section-label">{{ t('summary.timeline_emphasis') }}</text>
                <text class="tl-node__section-text tl-node__section-text--emphasis">{{ item.teacherEmphasis }}</text>
              </view>
              <view class="tl-node__section">
                <text class="tl-node__section-label">{{ t('summary.timeline_relatedMarks') }}</text>
                <text class="tl-node__section-text tl-node__section-text--marks">{{ item.relatedMarks }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ======================== Tab 4: 总结 ======================== -->
      <view v-if="currentTab === 'summary'" class="sp__content">
        <view
          v-for="topic in summary.structuredSummary" :key="topic.title"
          class="card sss-item"
        >
          <text class="sss-item__title">{{ topic.title }}</text>
          <view class="sss-item__core">
            <text class="sss-item__label">{{ t('summary.summary_coreConcept') }}</text>
            <text class="sss-item__core-text">{{ topic.coreConcept }}</text>
          </view>
          <view class="sss-item__points">
            <text class="sss-item__label">{{ t('summary.summary_understanding') }}</text>
            <view v-for="(bp, bi) in topic.bulletPoints" :key="bi" class="sss-item__bp">
              <text class="sss-item__bp-dot">•</text>
              <text class="sss-item__bp-text">{{ bp }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ======================== Tab 5: 考点 ======================== -->
      <view v-if="currentTab === 'exam'" class="sp__content">
        <!-- High-Frequency -->
        <view class="card">
          <view class="card-hd">
            <text class="card-hd-icon">🎯</text>
            <text class="card-hd-title">{{ t('summary.highFrequencyExamPoints') }}</text>
          </view>
          <view v-for="(item, idx) in summary.examFocusItems" :key="idx" class="se-item">
            <text class="se-num">{{ idx + 1 }}.</text>
            <text class="se-text">{{ item }}</text>
          </view>
        </view>

        <!-- Question Types -->
        <view class="card">
          <view class="card-hd">
            <text class="card-hd-icon">📝</text>
            <text class="card-hd-title">{{ t('summary.possibleQuestionTypes') }}</text>
          </view>
          <view v-for="(qt, idx) in summary.questionTypes" :key="idx" class="qtype-item">
            <view class="qtype-item__hd">
              <text class="qtype-item__type">{{ qt.type }}</text>
              <text class="qtype-item__prob">{{ t('summary.exam_probability') }}: {{ 60 + idx * 20 }}%</text>
            </view>
            <text class="qtype-item__desc">{{ qt.description }}</text>
          </view>
        </view>

        <!-- Common Mistakes -->
        <view class="card">
          <view class="card-hd">
            <text class="card-hd-icon">⚠️</text>
            <text class="card-hd-title">{{ t('summary.commonMistakes') }}</text>
          </view>
          <view v-for="(cm, idx) in summary.commonMistakes" :key="idx" class="scm-item">
            <text class="scm-item__dot">!</text>
            <text class="scm-item__text">{{ cm.text }}</text>
          </view>
        </view>
      </view>

      <!-- ======================== Tab 6: 术语 ======================== -->
      <view v-if="currentTab === 'terms'" class="sp__content sterms-grid">
        <view v-for="term in summary.terms" :key="term.term" class="card sterm-card">
          <view class="sterm-card__hd">
            <text class="sterm-card__en">{{ term.term }}</text>
            <text class="sterm-card__zh">{{ term.chinese }}</text>
          </view>
          <text class="sterm-card__expl">{{ term.explanation }}</text>
          <view class="sterm-card__related">
            <text class="sterm-card__related-label">{{ t('summary.relatedConcepts') }}: </text>
            <text class="sterm-card__related-text">{{ term.relatedConcepts }}</text>
          </view>
          <view v-if="term.confusingWith" class="sterm-card__confusing">
            <text class="sterm-card__confusing-label">{{ t('summary.confusingWith') }}: </text>
            <text class="sterm-card__confusing-text">{{ term.confusingWith }}</text>
          </view>
          <view class="sterm-card__action" @click="handleAddGlossary(term.term)">
            <text class="sterm-card__action-text" :class="{ 'sterm-card__action-text--added': addedTerms.has(term.term) }">
              {{ addedTerms.has(term.term) ? t('summary.addedGlossary') : '📥 ' + t('summary.addToGlossary') }}
            </text>
          </view>
        </view>
      </view>

      <!-- ======================== Tab 7: 复习 ======================== -->
      <view v-if="currentTab === 'review'" class="sp__content">
        <view class="card">
          <view class="card-hd">
            <text class="card-hd-icon">📋</text>
            <text class="card-hd-title">{{ t('summary.reviewPlan') }}</text>
          </view>
          <view class="sr-meta">
            <text class="sr-meta__time">⏱ {{ reviewEstimatedTime }}</text>
            <text class="sr-meta__rate">{{ reviewCompleteRate }}</text>
          </view>

          <view v-for="(step, si) in summary.reviewPlan.steps" :key="si" class="sr-step">
            <text class="sr-step__title">{{ t('summary.review_step' + (si + 1)) }}</text>
            <view v-for="task in step.tasks" :key="task.id" class="sr-task" @click="handleToggleReviewPlanTask(task.id)">
              <view class="or-cb" :class="{ 'or-cb--done': task.completed }">
                <text v-if="task.completed" class="or-cb-check">✓</text>
              </view>
              <text class="or-text" :class="{ 'or-text--done': task.completed }">{{ task.title }}</text>
            </view>
          </view>

          <view class="sr-start-btn" @click="handleStartReview">
            <text class="sr-start-btn__text">{{ reviewStartText }}</text>
          </view>
        </view>
      </view>

      <!-- M5: Footer Actions -->
      <view class="sp__footer">
        <view class="sp__footer-btn" @click="handleShare">
          <text>{{ t('summary.share') }}</text>
        </view>
        <view class="sp__footer-btn" @click="handleSaveToKB">
          <text>{{ t('summary.saveToKnowledgeBase') }}</text>
        </view>
        <view class="sp__footer-btn sp__footer-btn--primary" @click="handleAddNote">
          <text>{{ t('summary.addNote') }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordStore } from '@/stores/useRecordStore'

const { t } = useI18n()
const store = useRecordStore()

// --- safeT: 命名占位符兜底 + 正则替换兜底 ---
function safeT(key: string, params: Record<string, any>, fallback: Record<string, any>): string {
  const merged: Record<string, any> = { ...fallback }
  for (const k of Object.keys(params)) {
    const v = params[k]
    merged[k] = v !== undefined && v !== null && v !== '' ? v : fallback[k]
  }
  const raw = t(key, merged)
  // 兜底：vue-i18n 的命名插值在某些平台（如 App）可能不生效，手动替换残余 {xxx}
  return String(raw).replace(/\{(\w+)\}/g, (_: string, name: string) => {
    const value = merged[name]
    return value === undefined || value === null || value === '' ? '' : String(value)
  })
}

type Status = 'loading' | 'normal' | 'noData' | 'error'
type MarkFilter = 'all' | 'confusing' | 'important' | 'exam' | 'question' | 'review'

const status = ref<Status>('loading')

// 7 tabs
const tabs = ['overview', 'transcript', 'timeline', 'summary', 'exam', 'terms', 'review'] as const
const currentTab = ref<typeof tabs[number]>('overview')

// --- State ---
// Marks filter
const markFilter = ref<MarkFilter>('all')
// Expanded marks (for AI explanation)
const expandedMarks = ref(new Set<string>())
// Glossary
const addedTerms = ref(new Set<string>())
// Transcript
const transcriptQuery = ref('')
const marksOnly = ref(false)
const expandedBlocks = ref(new Set<number>())

// --- Computed ---
const summary = computed(() => store.summaryResult)

const classInfoText = computed(() => {
  const s = summary.value
  return safeT('summary.classInfo',
    {
      course: s.courseName,
      date: s.date,
      duration: Math.floor((s.duration || 0) / 60),
      marks: s.markCount,
      accuracy: s.accuracy,
    },
    {
      course: '生物学 101',
      date: '今天',
      duration: 0,
      marks: 0,
      accuracy: '--',
    }
  )
})

const markFilters = computed<MarkFilter[]>(() => ['all', 'confusing', 'important', 'exam', 'question', 'review'])

const filteredMarks = computed(() => {
  if (markFilter.value === 'all') return summary.value.timelineMarks
  return summary.value.timelineMarks.filter((m) => m.type === markFilter.value)
})

const filteredTranscriptBlocks = computed(() => {
  let blocks = summary.value.transcriptBlocks
  if (marksOnly.value) blocks = blocks.filter((b) => b.hasMarks)
  if (transcriptQuery.value) {
    const q = transcriptQuery.value.toLowerCase()
    blocks = blocks.filter((b) => b.text.toLowerCase().includes(q) || b.title.toLowerCase().includes(q))
  }
  return blocks
})

// --- Review tab safeT computed ---
const reviewEstimatedTime = computed(() =>
  safeT('summary.estimatedTime', { minutes: summary.value.reviewPlan?.estimatedMinutes }, { minutes: 0 })
)
const reviewCompleteRate = computed(() =>
  safeT('summary.completeRate', { rate: summary.value.reviewPlan?.completionRate }, { rate: '80%' })
)
const reviewStartText = computed(() =>
  safeT('summary.startReview', { minutes: summary.value.reviewPlan?.estimatedMinutes }, { minutes: 0 })
)

// --- Methods ---
function loadData() {
  status.value = 'loading'
  setTimeout(() => {
    status.value = summary.value.courseName ? 'normal' : 'noData'
  }, 400)
}

function goHome() { uni.switchTab({ url: '/pages/home/index' }) }
function handleMore() { uni.showToast({ title: t('summary.moreComingSoon'), icon: 'none' }) }

function handleToggleTask(id: string) { store.toggleSummaryReviewTask(id) }

// Marks tab
function toggleMark(id: string) {
  if (expandedMarks.value.has(id)) {
    expandedMarks.value.delete(id)
  } else {
    expandedMarks.value = new Set([...expandedMarks.value, id])
  }
  expandedMarks.value = new Set(expandedMarks.value)
}

function formatMarkTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Transcript tab
function toggleBlock(idx: number) {
  if (expandedBlocks.value.has(idx)) {
    expandedBlocks.value.delete(idx)
  } else {
    expandedBlocks.value = new Set([...expandedBlocks.value, idx])
  }
  expandedBlocks.value = new Set(expandedBlocks.value)
}

function handleCopy() {
  const text = summary.value.transcriptBlocks.map((b) => b.text).join('\n\n')
  uni.setClipboardData({ data: text })
  uni.showToast({ title: '已复制', icon: 'none' })
}

function handleExport() {
  uni.showToast({ title: '导出功能即将开放', icon: 'none' })
}

// Glossary
function handleAddGlossary(term: string) {
  if (addedTerms.value.has(term)) return
  addedTerms.value = new Set([...addedTerms.value, term])
  uni.showToast({ title: t('summary.addedGlossary'), icon: 'none' })
}

// Review tab
function handleToggleReviewPlanTask(id: string) { store.toggleReviewPlanTask(id) }
function handleStartReview() {
  uni.showToast({ title: t('summary.reviewModeComingSoon'), icon: 'none' })
}

// Footer
function handleShare() { uni.showToast({ title: t('summary.shareComingSoon'), icon: 'none' }) }
function handleSaveToKB() { uni.showToast({ title: t('summary.savedToKB'), icon: 'none' }) }
function handleAddNote() { uni.showToast({ title: t('summary.addNoteComingSoon'), icon: 'none' }) }

onMounted(() => { loadData() })
</script>

<style lang="scss" scoped>
// --- Variables ---
$color-primary: #4F46E5;
$color-bg: #F3F4F6;
$color-white: #FFFFFF;
$color-text: #1F2937;
$color-text-secondary: #6B7280;
$color-text-muted: #9CA3AF;
$color-border: #E5E7EB;
$color-personalized-bg: #F5F3FF;
$color-personalized-line: #8B5CF6;
$radius-sm: 12rpx;
$radius-md: 16rpx;
$radius-lg: 20rpx;
$spacing-sm: 12rpx;
$spacing-md: 16rpx;
$spacing-lg: 24rpx;

.sp {
  min-height: 100vh;
  background: $color-bg;
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
}

// --- Navigation ---
.sp__nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  padding-top: calc($spacing-md + env(safe-area-inset-top));
  background: $color-white;
}
.sp__nav-back { font-size: 28rpx; color: $color-primary; }
.sp__nav-title { font-size: 34rpx; font-weight: 700; color: $color-text; }
.sp__nav-more { font-size: 36rpx; color: $color-text-secondary; }

// --- Hero ---
.sp__hero {
  background: linear-gradient(135deg, $color-primary, #7C3AED);
  padding: $spacing-lg; margin: $spacing-md;
  border-radius: $radius-lg; color: #FFFFFF;
}
.sp__hero-info { font-size: 24rpx; opacity: 0.85; }
.sp__hero-flow {
  display: flex; align-items: center; gap: $spacing-sm;
  margin-top: $spacing-md; padding: $spacing-sm 0;
  border-top: 1rpx solid rgba(255,255,255,0.2);
  border-bottom: 1rpx solid rgba(255,255,255,0.2);
}
.sp__hero-flow-label { font-size: 22rpx; opacity: 0.7; }
.sp__hero-flow-text { font-size: 26rpx; font-weight: 600; }
.sp__hero-oneline { font-size: 24rpx; opacity: 0.8; margin-top: $spacing-sm; }

// --- Tabs ---
.sp__tabs {
  white-space: nowrap; padding: 0 $spacing-md;
  background: $color-white; border-bottom: 1rpx solid $color-border;
}
.sp__tabs-inner { display: flex; gap: 8rpx; padding: $spacing-sm 0; }
.sp__tab {
  padding: 10rpx 24rpx; border-radius: 20rpx; font-size: 26rpx;
  color: $color-text-secondary; background: $color-bg;
  flex-shrink: 0;
}
.sp__tab--active { color: $color-white; background: $color-primary; font-weight: 600; }

// --- Content ---
.sp__content { padding: $spacing-md; }
.card {
  background: $color-white; border-radius: $radius-md;
  padding: $spacing-lg; margin-bottom: $spacing-md;
}
.card--personalized {
  background: $color-personalized-bg;
  border-left: 6rpx solid $color-personalized-line;
}
.card-hd { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-md; }
.card-hd-icon { font-size: 28rpx; }
.card-hd-title { font-size: 30rpx; font-weight: 700; color: $color-text; }

// --- Overview ---
.om-item { display: flex; align-items: flex-start; gap: $spacing-sm; margin-bottom: $spacing-sm; }
.om-num {
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: $color-primary; color: #FFFFFF; font-size: 22rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.om-text { font-size: 28rpx; color: $color-text; line-height: 1.6; }
.op-item { display: flex; gap: $spacing-sm; margin-bottom: $spacing-sm; }
.op-emoji { font-size: 26rpx; flex-shrink: 0; }
.op-text { font-size: 26rpx; color: $color-text; line-height: 1.5; }
.or-item { display: flex; align-items: center; gap: $spacing-sm; padding: 10rpx 0; }
.or-cb {
  width: 40rpx; height: 40rpx; border-radius: 8rpx;
  border: 2rpx solid $color-border; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.or-cb--done { background: $color-primary; border-color: $color-primary; }
.or-cb-check { color: #FFFFFF; font-size: 24rpx; font-weight: 700; }
.or-text { font-size: 28rpx; color: $color-text; }
.or-text--done { text-decoration: line-through; color: $color-text-muted; }

// --- Transcript (文档阅读器风格) ---
.st-bar { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-sm; }
.st-bar__input {
  flex: 1; height: 64rpx; border-radius: $radius-sm;
  background: $color-white; padding: 0 $spacing-md; font-size: 26rpx; border: 1rpx solid $color-border;
}
.st-bar__toggle { padding: 10rpx $spacing-md; border-radius: $radius-sm; background: $color-bg; font-size: 24rpx; color: $color-text-secondary; }
.st-bar__toggle--on { background: $color-primary; color: #FFFFFF; }
.st-actions { display: flex; gap: $spacing-lg; margin-bottom: $spacing-md; padding-left: 4rpx; }
.st-actions__btn { font-size: 24rpx; color: $color-primary; }
.doc-block {
  background: $color-white; border-radius: $radius-md;
  padding: $spacing-lg; margin-bottom: $spacing-md;
  border-left: none;
}
.doc-block__hd { }
.doc-block__header-left { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.doc-block__time { font-size: 22rpx; color: $color-text-muted; font-family: monospace; }
.doc-block__mark-tag {
  font-size: 20rpx; color: #EF4444; background: #FEF2F2;
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.doc-block__title { font-size: 28rpx; font-weight: 600; color: $color-text; display: block; margin-bottom: 6rpx; }
.doc-block__chevron { font-size: 22rpx; color: $color-primary; display: block; text-align: right; margin-top: 8rpx; }
.doc-block__body { margin-top: $spacing-md; padding-top: $spacing-md; border-top: 1rpx solid $color-border; }
.doc-block__text {
  font-size: 28rpx; color: $color-text; line-height: 1.9;
  font-family: 'Georgia', 'Times New Roman', serif;
  text-align: justify;
}
.st-empty { text-align: center; padding: 80rpx 0; color: $color-text-muted; font-size: 26rpx; }

// --- Timeline (垂直时间线) ---
.tl-track { padding: 0 0 0 4rpx; }
.tl-node { display: flex; gap: 20rpx; position: relative; }
.tl-node__rail {
  width: 48rpx; display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
}
.tl-node__dot {
  width: 20rpx; height: 20rpx; border-radius: 50%; background: $color-primary;
  border: 4rpx solid #DDD6FE; flex-shrink: 0; margin-top: 24rpx;
}
.tl-node__dot--first { background: #7C3AED; border-color: #C4B5FD; width: 24rpx; height: 24rpx; }
.tl-node__dot--last { background: #6366F1; }
.tl-node__line {
  width: 3rpx; flex: 1; background: linear-gradient(to bottom, $color-primary, #DDD6FE);
  margin: 6rpx 0; min-height: 40rpx;
}
.tl-node__card {
  flex: 1; min-width: 0; background: $color-white; border-radius: $radius-md;
  padding: $spacing-lg; margin-bottom: $spacing-md; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.tl-node__card-hd {
  display: flex; align-items: center; gap: $spacing-sm;
  margin-bottom: $spacing-md; padding-bottom: $spacing-sm;
  border-bottom: 2rpx solid #EEF2FF;
}
.tl-node__time { font-size: 24rpx; color: $color-primary; font-weight: 700; font-family: monospace; }
.tl-node__title { font-size: 28rpx; font-weight: 700; color: $color-text; }
.tl-node__section { margin-top: 14rpx; }
.tl-node__section--emphasis {
  background: #FFFBEB; border-radius: $radius-sm; padding: $spacing-sm $spacing-md;
  border-left: 4rpx solid #F59E0B;
}
.tl-node__section-label { font-size: 22rpx; color: $color-text-muted; display: block; margin-bottom: 4rpx; }
.tl-node__section-text { font-size: 26rpx; color: $color-text; line-height: 1.6; display: block; }
.tl-node__section-text--emphasis { color: #92400E; font-weight: 500; }
.tl-node__section-text--marks { font-size: 24rpx; color: #6366F1; }

// --- Summary ---
.sss-item { padding: $spacing-lg; }
.sss-item__title { font-size: 30rpx; font-weight: 700; color: $color-text; display: block; margin-bottom: $spacing-md; }
.sss-item__core { margin-bottom: $spacing-md; padding: $spacing-md; background: #F0FDF4; border-radius: $radius-sm; }
.sss-item__label { font-size: 22rpx; color: $color-text-muted; display: block; margin-bottom: 4rpx; }
.sss-item__core-text { font-size: 26rpx; color: $color-text; line-height: 1.6; }
.sss-item__points { margin-top: $spacing-sm; }
.sss-item__bp { display: flex; gap: $spacing-sm; margin-bottom: 6rpx; padding-left: $spacing-sm; }
.sss-item__bp-dot { font-size: 24rpx; color: $color-primary; flex-shrink: 0; }
.sss-item__bp-text { font-size: 26rpx; color: $color-text; line-height: 1.5; }

// --- Exam ---
.se-item { display: flex; gap: $spacing-sm; margin-bottom: 10rpx; }
.se-num { font-size: 26rpx; color: $color-primary; font-weight: 600; flex-shrink: 0; }
.se-text { font-size: 26rpx; color: $color-text; line-height: 1.5; }
.qtype-item { padding: $spacing-md 0; border-bottom: 1rpx solid $color-border; }
.qtype-item:last-child { border-bottom: none; }
.qtype-item__hd { display: flex; justify-content: space-between; margin-bottom: 6rpx; }
.qtype-item__type { font-size: 26rpx; font-weight: 600; color: $color-text; }
.qtype-item__prob { font-size: 22rpx; color: $color-text-muted; }
.qtype-item__desc { font-size: 24rpx; color: $color-text-secondary; }
.scm-item { display: flex; gap: $spacing-sm; margin-bottom: 10rpx; }
.scm-item__dot {
  width: 32rpx; height: 32rpx; border-radius: 50%;
  background: #FEF3C7; color: #D97706; font-size: 20rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.scm-item__text { font-size: 26rpx; color: $color-text; }

// --- Terms Grid ---
.sterms-grid { display: flex; flex-direction: column; gap: $spacing-md; }
.sterm-card { padding: $spacing-lg; }
.sterm-card__hd { display: flex; align-items: baseline; gap: $spacing-sm; margin-bottom: $spacing-sm; }
.sterm-card__en { font-size: 32rpx; font-weight: 700; color: $color-primary; }
.sterm-card__zh { font-size: 24rpx; color: $color-text-muted; }
.sterm-card__expl { font-size: 26rpx; color: $color-text; line-height: 1.5; display: block; margin-bottom: $spacing-sm; }
.sterm-card__related { margin-bottom: 4rpx; }
.sterm-card__related-label { font-size: 22rpx; color: $color-text-muted; }
.sterm-card__related-text { font-size: 24rpx; color: $color-text-secondary; }
.sterm-card__confusing { margin-bottom: $spacing-sm; }
.sterm-card__confusing-label { font-size: 22rpx; color: #D97706; }
.sterm-card__confusing-text { font-size: 24rpx; color: $color-text-secondary; }
.sterm-card__action { margin-top: $spacing-sm; padding: $spacing-sm 0; border-top: 1rpx solid $color-border; }
.sterm-card__action-text { font-size: 24rpx; color: $color-primary; }
.sterm-card__action-text--added { color: #10B981; }

// --- Review ---
.sr-meta { display: flex; justify-content: space-between; padding: $spacing-sm 0 $spacing-md; border-bottom: 1rpx solid $color-border; margin-bottom: $spacing-md; }
.sr-meta__time { font-size: 26rpx; color: $color-text-secondary; }
.sr-meta__rate { font-size: 24rpx; color: $color-primary; }
.sr-step { margin-bottom: $spacing-md; }
.sr-step__title { font-size: 26rpx; font-weight: 700; color: $color-text; display: block; margin-bottom: $spacing-sm; }
.sr-task { display: flex; align-items: center; gap: $spacing-sm; padding: 8rpx 0 8rpx $spacing-sm; }
.sr-start-btn {
  margin-top: $spacing-lg; padding: 24rpx; border-radius: $radius-md;
  background: linear-gradient(135deg, $color-primary, #7C3AED);
  display: flex; align-items: center; justify-content: center;
}
.sr-start-btn__text { font-size: 30rpx; font-weight: 700; color: #FFFFFF; }

// --- Footer ---
.sp__footer {
  display: flex; gap: $spacing-md; padding: $spacing-lg;
  background: $color-white; border-top: 1rpx solid $color-border;
}
.sp__footer-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 20rpx 0; border-radius: $radius-sm;
  background: $color-bg; font-size: 26rpx; color: $color-text-secondary;
}
.sp__footer-btn--primary { background: $color-primary; color: #FFFFFF; }

// --- Skeleton ---
.sk { background: $color-bg; border-radius: $radius-md; margin: $spacing-md; animation: shimmer 1.6s infinite; }
.sk--hero { height: 160rpx; margin-top: 0; }
.sk--tabs { height: 64rpx; width: 60%; }
.sk--card { height: 200rpx; }
@keyframes shimmer {
  0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; }
}

// --- Error / Empty ---
.sp__err {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 120rpx $spacing-lg; gap: $spacing-md;
}
.sp__err-text { font-size: 28rpx; color: #EF4444; }
.sp__err-retry { font-size: 26rpx; color: $color-primary; font-weight: 600; }
.sp__empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 160rpx $spacing-lg; gap: $spacing-md;
}
.sp__empty-icon { font-size: 64rpx; }
.sp__empty-title { font-size: 30rpx; font-weight: 600; color: $color-text; }
.sp__empty-desc { font-size: 26rpx; color: $color-text-secondary; text-align: center; }
</style>
