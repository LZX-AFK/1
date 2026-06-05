<template>
  <view class="sd-page">
    <view class="sd-nav">
      <text class="sd-nav__back" @tap="goBack">‹</text>
      <view class="sd-nav__title-wrap">
        <text class="sd-nav__title">{{ spaceName }}</text>
      </view>
      <text class="sd-nav__more" @tap="onMore">•••</text>
    </view>

    <scroll-view scroll-y class="sd-scroll">
      <!-- loading -->
      <view v-if="pageState === 'loading'" class="sd-skel-wrap">
        <view class="sd-skel sd-skel--summary" />
        <view class="sd-skel sd-skel--card" />
      </view>

      <!-- error -->
      <view v-else-if="pageState === 'error'" class="sd-error" @tap="fetchData">
        <text class="sd-error__title">加载失败</text>
        <text class="sd-error__retry">点击重试</text>
      </view>

      <view v-else class="sd-content">
        <!-- space summary card -->
        <view class="sd-summary">
          <view class="sd-summary__top">
            <view class="sd-summary__icon" :class="'sd-summary__icon--' + spaceType">{{ spaceIcon }}</view>
            <view class="sd-summary__body">
              <text class="sd-summary__name">{{ spaceName }}</text>
              <view class="sd-summary__tags">
                <text class="sd-summary__type-tag" :class="'sd-summary__type-tag--' + spaceType">{{ spaceTypeLabel }}</text>
                <text class="sd-summary__meta">{{ spaceSources.length }} 份资料 · {{ doneCount }} 已完成</text>
              </view>
            </view>
            <text class="sd-summary__pct">{{ progress }}%</text>
          </view>
          <view class="sd-summary__bar"><view class="sd-summary__fill" :style="{ width: progress + '%' }" /></view>
          <view class="sd-summary__stats">
            <text class="sd-summary__stat">{{ spaceSources.length }} 资料</text>
            <text class="sd-summary__stat">{{ doneCount }} 总结</text>
            <text class="sd-summary__stat">{{ totalMarkerCount }} 标记</text>
            <text class="sd-summary__stat">{{ reviewTaskTotal }} 复习任务</text>
          </view>
        </view>

        <!-- 4 tabs -->
        <view class="sd-tabs">
          <view v-for="tab in tabs" :key="tab.key" class="sd-tab" :class="{ 'sd-tab--active': activeTab === tab.key }" @tap="activeTab = tab.key">
            <text>{{ tab.label }}</text>
          </view>
        </view>

        <!-- ======== Tab: 概览 ======== -->
        <view v-if="activeTab === 'overview'">
          <!-- 空间摘要 -->
          <view class="sd-card">
            <text class="sd-card__title">学习概况</text>
            <view class="sd-card__rows">
              <view class="sd-card__row">
                <text class="sd-card__row-label">资料数量</text>
                <text class="sd-card__row-value">{{ spaceSources.length }} 份</text>
              </view>
              <view class="sd-card__row">
                <text class="sd-card__row-label">已完成总结</text>
                <text class="sd-card__row-value">{{ doneCount }} 篇</text>
              </view>
              <view class="sd-card__row">
                <text class="sd-card__row-label">复习任务</text>
                <text class="sd-card__row-value">{{ reviewTaskTotal }} 条</text>
              </view>
              <view class="sd-card__row">
                <text class="sd-card__row-label">最近更新</text>
                <text class="sd-card__row-value">{{ lastUpdateText }}</text>
              </view>
            </view>
          </view>

          <!-- Agent 建议 -->
          <view class="sd-card sd-card--advice">
            <text class="sd-card__title">💡 学习建议</text>
            <text class="sd-card__text">{{ agentAdvice }}</text>
          </view>

          <!-- 待处理标记（Phase 10-D） -->
          <view class="sd-card">
            <text class="sd-card__title">🔖 待处理标记</text>
            <text v-if="totalMarkerCount > 0" class="sd-card__text">该空间有 {{ totalMarkerCount }} 个待处理标记，你可以在对应资料中查看详情。</text>
            <text v-else class="sd-card__text" style="color: #9ca3af;">暂无待处理标记。</text>
          </view>

          <!-- 最近资料（前3个） -->
          <view v-if="spaceSources.length > 0" class="sd-card">
            <text class="sd-card__title">最近资料</text>
            <view v-for="src in spaceSources.slice(0, 3)" :key="src.id" class="sd-src-mini" @tap="onSourceTap(src)">
              <view class="sd-src-mini__left">
                <text class="sd-src-mini__icon">{{ sourceIcon(src.type) }}</text>
                <view class="sd-src-mini__info">
                  <text class="sd-src-mini__title">{{ src.title }}</text>
                  <text class="sd-src-mini__meta">{{ src.metaLabel }} · {{ formatDate(src.createdAt) }}</text>
                </view>
              </view>
              <text class="sd-src-mini__status" :class="'sd-src-mini__status--' + src.status">
                {{ src.status === 'done' ? '✓' : src.status === 'processing' ? '◌' : src.status === 'recording' ? '●' : '✕' }}
              </text>
            </view>
          </view>

          <!-- 快捷操作 -->
          <view class="sd-quick-row">
            <view class="sd-quick-btn" @tap="goUpload"><text>📎 上传资料</text></view>
            <view class="sd-quick-btn" @tap="goRecord"><text>🎙 开始录音</text></view>
            <view class="sd-quick-btn" @tap="goConceptMap"><text>🗺 知识图谱</text></view>
            <view class="sd-quick-btn" @tap="goReview"><text>📋 开始复习</text></view>
          </view>
        </view>

        <!-- ======== Tab: 资料 ======== -->
        <view v-if="activeTab === 'sources'">
          <view v-if="spaceSources.length === 0" class="sd-empty-tab">
            <text class="sd-empty-tab__icon">📂</text>
            <text class="sd-empty-tab__title">暂无学习资料</text>
            <text class="sd-empty-tab__desc">上传课堂音频、PDF 或开始录音后，资料会自动出现在这里。</text>
          </view>
          <view v-for="src in spaceSources" :key="src.id" class="sd-source" @tap="onSourceTap(src)">
            <view class="sd-source__head">
              <text class="sd-source__icon">{{ sourceIcon(src.type) }}</text>
              <view class="sd-source__info">
                <text class="sd-source__title">{{ src.title }}</text>
                <text class="sd-source__meta">
                  {{ src.metaLabel }}
                  <template v-if="src.duration"> · {{ formatDur(src.duration) }}</template>
                  <template v-if="src.pageCount"> · {{ src.pageCount }}页</template>
                  · {{ formatDate(src.createdAt) }}
                </text>
              </view>
              <text class="sd-source__status" :class="'sd-source__status--' + src.status">
                {{ statusLabel(src.status) }}
              </text>
            </view>
            <text v-if="src.summaryPreview" class="sd-source__preview">{{ src.summaryPreview }}</text>
            <view class="sd-source__footer">
              <text v-if="src.markerCount > 0" class="sd-source__badge">🔖 {{ src.markerCount }}</text>
              <text v-if="src.reviewTaskCount > 0" class="sd-source__badge">📋 {{ src.reviewTaskCount }}</text>
              <text v-if="src.keywordCount > 0" class="sd-source__badge">🏷 {{ src.keywordCount }}</text>
              <view class="sd-source__actions">
                <text v-if="src.status === 'done'" class="sd-source__action">查看详情 ›</text>
                <text class="sd-source__delete" @tap.stop="onDeleteSource(src)">删除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ======== Tab: 知识 ======== -->
        <view v-if="activeTab === 'knowledge'">
          <view v-if="!hasKnowledgeData" class="sd-empty-tab">
            <text class="sd-empty-tab__icon">🧠</text>
            <text class="sd-empty-tab__title">暂无知识数据</text>
            <text class="sd-empty-tab__desc">这个空间的知识结构会随着资料和课堂总结持续更新。</text>
            <view class="sd-empty-tab__btn" @tap="goConceptMap">查看知识图谱</view>
          </view>
          <template v-else>
            <!-- 关键词 chips -->
            <view v-if="allKeywords.length > 0" class="sd-card">
              <text class="sd-card__title">核心知识点</text>
              <view class="sd-kw-chips">
                <text v-for="kw in allKeywords" :key="kw" class="sd-kw-chip">{{ kw }}</text>
              </view>
            </view>
            <!-- 查看知识图谱 -->
            <view class="sd-card">
              <view class="sd-card__link" @tap="goConceptMap">
                <text class="sd-card__link-text">查看知识图谱 ›</text>
              </view>
            </view>
          </template>
        </view>

        <!-- ======== Tab: 复习 ======== -->
        <view v-if="activeTab === 'review'">
          <view v-if="!hasReviewData" class="sd-empty-tab">
            <text class="sd-empty-tab__icon">📋</text>
            <text class="sd-empty-tab__title">暂无复习任务</text>
            <text class="sd-empty-tab__desc">完成课堂总结或资料解析后，听刻会自动生成复习建议。</text>
            <view class="sd-empty-tab__btn" @tap="goReview">进入复习模式</view>
          </view>
          <template v-else>
            <view class="sd-card">
              <text class="sd-card__title">复习任务</text>
              <view v-for="task in reviewTasks" :key="task.id" class="sd-review-task">
                <view class="sd-review-task__cb" :class="{ 'sd-review-task__cb--done': task.completed }" @tap="toggleReview(task.id)">
                  <text v-if="task.completed">✓</text>
                </view>
                <view class="sd-review-task__body">
                  <text class="sd-review-task__title">{{ task.title }}</text>
                  <text v-if="task.source" class="sd-review-task__src">来源：{{ task.source }}</text>
                </view>
              </view>
            </view>
            <view class="sd-card">
              <view class="sd-card__link" @tap="goReview">
                <text class="sd-card__link-text">进入复习模式 ›</text>
              </view>
            </view>
          </template>
        </view>
      </view>

      <view class="sd-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getSessions, getSummary, deleteSession, type SessionListItem } from '@/services/sessionApi'
import {
  groupSourcesBySpace,
  normalizeSource,
  sourceTypeLabel,
  getSpaceTypeLabel,
  getSpaceTypeIcon,
} from '@/utils/mapSessionToSpace'
import type { LearningSpace, LearningSource, SpaceType, SourceType, SourceStatus } from '@/types/space'

const pageState = ref<'loading' | 'normal' | 'error'>('loading')
const spaceId = ref('')
const spaceName = ref('')
const allSessions = ref<SessionListItem[]>([])
const activeTab = ref<'overview' | 'sources' | 'knowledge' | 'review'>('overview')

// 知识和复习数据
const allKeywords = ref<string[]>([])
const reviewTasks = ref<Array<{ id: string; title: string; completed: boolean; source?: string }>>([])

// --- 防重复请求 ---
let fetching = false
let lastFetchAt = 0

const tabs = [
  { key: 'overview' as const, label: '概览' },
  { key: 'sources' as const, label: '资料' },
  { key: 'knowledge' as const, label: '知识' },
  { key: 'review' as const, label: '复习' },
]

// 空间数据
const space = computed<LearningSpace | null>(() => {
  const spaces = groupSourcesBySpace(allSessions.value)
  // 精确匹配 spaceId
  return spaces.find(s => s.id === spaceId.value) || null
})

const spaceSources = computed<LearningSource[]>(() => space.value?.sources || [])
const spaceType = computed<SpaceType>(() => space.value?.type || 'general')
const spaceTypeLabel = computed(() => getSpaceTypeLabel(spaceType.value))
const spaceIcon = computed(() => getSpaceTypeIcon(spaceType.value))
const doneCount = computed(() => spaceSources.value.filter(s => s.status === 'done').length)
const reviewTaskTotal = computed(() => reviewTasks.value.length)
const totalMarkerCount = computed(() => spaceSources.value.reduce((sum, s) => sum + (s.markerCount || 0), 0))
const progress = computed(() => {
  const total = spaceSources.value.length
  return total > 0 ? Math.round((doneCount.value / total) * 100) : 0
})

const lastUpdateText = computed(() => formatDate(space.value?.lastUpdatedAt))
const hasKnowledgeData = computed(() => allKeywords.value.length > 0)
const hasReviewData = computed(() => reviewTasks.value.length > 0)

const agentAdvice = computed(() => {
  const sources = spaceSources.value
  if (sources.length === 0) return '还没有学习资料。试试上传课堂音频、PDF 或开始录音吧。'
  const processing = sources.filter(s => s.status === 'processing')
  const failed = sources.filter(s => s.status === 'failed')
  const done = sources.filter(s => s.status === 'done')
  const parts: string[] = []
  if (processing.length > 0) parts.push(`有 ${processing.length} 份资料正在解析中，请稍后查看。`)
  if (failed.length > 0) parts.push(`有 ${failed.length} 份资料解析失败，可以重试。`)
  if (done.length > 0) parts.push(`已有 ${done.length} 份资料完成总结，可以查看知识结构或开始复习。`)
  return parts.join(' ') || '继续积累学习资料，知识库会越来越丰富。'
})

function formatDate(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffH = diffMs / 3600000
    if (diffH < 1) return '刚刚'
    if (diffH < 24) return `${Math.floor(diffH)}小时前`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch { return '' }
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60)
  return m > 0 ? `${m}min` : `${sec}s`
}

function sourceIcon(type: SourceType): string {
  const map: Record<string, string> = {
    recording: '🎙', audio: '🎵', video: '🎬', pdf: '📄',
    reading: '📖', slides: '📊', document: '📝', note: '📓',
    mistake: '❌', link: '🔗', unknown: '📁',
  }
  return map[type] || '📁'
}

function statusLabel(status: SourceStatus): string {
  const map: Record<string, string> = {
    done: '已完成', processing: '生成中', recording: '录制中', failed: '失败', pending: '待处理', saved: '已保存',
  }
  return map[status] || '未知'
}

async function fetchData(options?: { silent?: boolean }) {
  const silent = options?.silent === true
  const now = Date.now()

  if (now - lastFetchAt < 800) return
  if (fetching) return

  fetching = true
  lastFetchAt = now

  if (!silent) pageState.value = 'loading'

  try {
    const data = await getSessions() || []
    allSessions.value = data

    // 从 done sessions 聚合知识和复习数据
    await aggregateKnowledgeAndReview(data)

    pageState.value = 'normal'
  } catch (err) {
    console.warn('[space-detail] fetchSessions failed', err)
    if (silent && allSessions.value.length > 0) {
      // keep old data
    } else if (!silent || allSessions.value.length === 0) {
      pageState.value = 'error'
    }
  } finally {
    fetching = false
  }
}

/** 从 done sessions 的 summary 中聚合知识和复习数据 */
async function aggregateKnowledgeAndReview(sessions: SessionListItem[]) {
  const kwSet = new Set<string>()
  const tasks: Array<{ id: string; title: string; completed: boolean; source?: string }> = []

  // 只取属于当前空间的 done sessions
  const doneSessions = sessions.filter(s => {
    if (s.status !== 'done') return false
    const normalized = normalizeSource(s)
    return normalized.spaceId === spaceId.value
  })

  // 取最近 5 个 session 的 summary（避免太多请求）
  for (const s of doneSessions.slice(0, 5)) {
    try {
      const summary = await getSummary(s.id)
      if (summary.keywords?.length) {
        summary.keywords.forEach(kw => kwSet.add(kw))
      }
      if (summary.reviewTasks?.length) {
        summary.reviewTasks.forEach((rt: string, i: number) => {
          tasks.push({ id: `${s.id}-rv-${i}`, title: rt, completed: false, source: s.title })
        })
      }
      // 补充 source 的 summaryPreview
      const source = spaceSources.value.find(src => src.id === s.id)
      if (source && !source.summaryPreview && summary.content) {
        source.summaryPreview = summary.content.slice(0, 80) + '...'
      }
    } catch {
      // summary 可能还没生成，跳过
    }
  }

  allKeywords.value = Array.from(kwSet).slice(0, 20)
  reviewTasks.value = tasks.slice(0, 10)
}

function onSourceTap(src: LearningSource) {
  if (src.status === 'done') {
    uni.navigateTo({
      url: `/pages/record/summary?sessionId=${src.id}&from=knowledge&spaceId=${encodeURIComponent(spaceId.value)}&spaceName=${encodeURIComponent(spaceName.value)}&sourceType=${encodeURIComponent(src.source || src.type)}&sourceTitle=${encodeURIComponent(src.title)}`,
    })
  } else if (src.status === 'saved') {
    uni.showToast({ title: '该录音已保存，尚未生成 AI 总结', icon: 'none' })
  } else if (src.status === 'processing') {
    uni.showToast({ title: '正在解析中，请稍后查看', icon: 'none' })
  } else if (src.status === 'recording') {
    uni.showToast({ title: '仍在录制中', icon: 'none' })
  } else {
    uni.showToast({ title: '处理失败，可稍后重试', icon: 'none' })
  }
}

function toggleReview(id: string) {
  const task = reviewTasks.value.find(t => t.id === id)
  if (task) task.completed = !task.completed
}

function goBack() {
  uni.navigateBack({ fail() { uni.switchTab({ url: '/pages/knowledge/index' }) } })
}

function onMore() {
  uni.showActionSheet({
    itemList: ['删除学习空间'],
    success(res) {
      if (res.tapIndex === 0) confirmDeleteSpace()
    },
  })
}

/** 删除单个 Source */
function onDeleteSource(src) {
  uni.showModal({
    title: '删除资料',
    content: '删除后将移除该资料、转写、总结和标记，是否继续？',
    confirmText: '删除',
    confirmColor: '#EF4444',
    success(res) {
      if (res.confirm) doDeleteSource(src.id)
    },
  })
}

async function doDeleteSource(sourceId) {
  try {
    await deleteSession(sourceId)
    uni.showToast({ title: '已删除', icon: 'success' })
    fetchData({ silent: false })
  } catch (err) {
    console.warn('[space-detail] deleteSource failed', err)
    uni.showToast({ title: '删除失败，请稍后重试', icon: 'none' })
  }
}

/** 删除整个 Space（删除该 Space 下所有 sessions） */
function confirmDeleteSpace() {
  uni.showModal({
    title: '删除学习空间',
    content: '将删除该空间下的所有资料、总结、标记和复习内容，此操作不可恢复，是否继续？',
    confirmText: '删除',
    confirmColor: '#EF4444',
    success(res) {
      if (res.confirm) doDeleteSpace()
    },
  })
}

async function doDeleteSpace() {
  const sources = spaceSources.value
  if (sources.length === 0) {
    uni.switchTab({ url: '/pages/knowledge/index' })
    return
  }
  let failed = 0
  for (const src of sources) {
    try {
      await deleteSession(src.id)
    } catch {
      failed++
    }
  }
  if (failed > 0) {
    uni.showToast({ title: `部分资料删除失败（${failed}）`, icon: 'none' })
    fetchData({ silent: false })
  } else {
    uni.showToast({ title: '学习空间已删除', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/knowledge/index' }), 800)
  }
}

function goUpload() {
  uni.navigateTo({ url: '/pages/materials/upload' })
}

function goRecord() {
  uni.switchTab({ url: '/pages/agent/index' })
}

function goConceptMap() {
  uni.navigateTo({
    url: `/pages/concept-map/index?spaceId=${encodeURIComponent(spaceId.value)}&spaceName=${encodeURIComponent(spaceName.value)}`,
  })
}

function goReview() {
  uni.navigateTo({
    url: `/pages/review/index?spaceId=${encodeURIComponent(spaceId.value)}&spaceName=${encodeURIComponent(spaceName.value)}`,
  })
}

onLoad((query) => {
  spaceId.value = query?.spaceId ? decodeURIComponent(query.spaceId) : (query?.courseId ? decodeURIComponent(query.courseId) : '')
  spaceName.value = query?.spaceName ? decodeURIComponent(query.spaceName) : (query?.courseName ? decodeURIComponent(query.courseName) : '学习空间')
  fetchData()
})

onShow(() => {
  if (spaceId.value) {
    fetchData({ silent: true })
  }
})
</script>

<style lang="scss" scoped>
.sd-page { min-height: 100vh; background: #FAFAF5; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.sd-page { max-width: 430px; margin: 0 auto; }
/* #endif */

.sd-nav {
  position: relative; z-index: 10;
  height: calc(env(safe-area-inset-top) + 120rpx);
  padding: calc(env(safe-area-inset-top) + 28rpx) 32rpx 20rpx;
  display: flex; align-items: center; justify-content: space-between; gap: 18rpx;
  box-sizing: border-box;
}
.sd-nav__back, .sd-nav__more { width: 88rpx; color: #071446; font-size: 50rpx; line-height: 1; min-height: 56rpx; display: flex; align-items: center; cursor: pointer; }
.sd-nav__more { text-align: right; font-size: 28rpx; letter-spacing: 4rpx; font-weight: 800; }
.sd-nav__title-wrap { display: flex; flex-direction: column; align-items: center; }
.sd-nav__title { font-size: 38rpx; color: #071446; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400rpx; }

.sd-scroll { height: calc(100vh - env(safe-area-inset-top) - 120rpx); padding: 0 32rpx; box-sizing: border-box; }

/* summary card */
.sd-summary { background: #fff; border: 1rpx solid #eef0f3; border-radius: 32rpx; box-shadow: 0 14rpx 34rpx rgba(15,23,42,0.06); padding: 28rpx; margin-top: 28rpx; margin-bottom: 26rpx; }
.sd-summary__top { display: flex; align-items: center; gap: 22rpx; }
.sd-summary__icon { width: 96rpx; height: 96rpx; border-radius: 24rpx; font-size: 40rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sd-summary__icon--course { background: #eef4ff; }
.sd-summary__icon--general { background: #f3e8ff; }
.sd-summary__icon--project { background: #dcfce7; }
.sd-summary__icon--exam { background: #fef3c7; }
.sd-summary__icon--topic { background: #e0e7ff; }
.sd-summary__icon--portfolio { background: #ffe4e6; }
.sd-summary__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.sd-summary__name { font-size: 34rpx; color: #071446; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-summary__tags { display: flex; align-items: center; gap: 12rpx; }
.sd-summary__type-tag { padding: 4rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 600; }
.sd-summary__type-tag--course { background: #eef4ff; color: #2563eb; }
.sd-summary__type-tag--general { background: #f3e8ff; color: #7c3aed; }
.sd-summary__type-tag--project { background: #dcfce7; color: #16a34a; }
.sd-summary__type-tag--exam { background: #fef3c7; color: #d97706; }
.sd-summary__type-tag--topic { background: #e0e7ff; color: #4f46e5; }
.sd-summary__type-tag--portfolio { background: #ffe4e6; color: #e11d48; }
.sd-summary__meta { font-size: 22rpx; color: #9ca3af; }
.sd-summary__pct { font-size: 30rpx; color: #2563eb; font-weight: 800; }
.sd-summary__bar { height: 10rpx; background: #e5e7eb; border-radius: 999rpx; overflow: hidden; margin: 24rpx 0 20rpx; }
.sd-summary__fill { height: 100%; background: #2f6bff; border-radius: 999rpx; }
.sd-summary__stats { display: flex; gap: 12rpx; flex-wrap: wrap; }
.sd-summary__stat { padding: 8rpx 16rpx; border-radius: 999rpx; background: #f3f6fb; color: #4b5563; font-size: 22rpx; }

/* tabs */
.sd-tabs { display: flex; gap: 8rpx; padding: 8rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 24rpx; margin-bottom: 24rpx; }
.sd-tab { flex: 1; height: 58rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; color: #6b7280; font-size: 26rpx; }
.sd-tab--active { background: #eef4ff; color: #2563eb; font-weight: 700; }

/* cards */
.sd-card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; box-shadow: 0 10rpx 24rpx rgba(15,23,42,0.04); padding: 28rpx; margin-bottom: 20rpx; }
.sd-card--advice { background: #fffbf0; border-color: #fef3c7; }
.sd-card__title { display: block; font-size: 30rpx; color: #071446; font-weight: 700; margin-bottom: 18rpx; }
.sd-card__text { display: block; font-size: 26rpx; color: #4b5563; line-height: 1.6; }
.sd-card__rows { display: flex; flex-direction: column; gap: 14rpx; }
.sd-card__row { display: flex; justify-content: space-between; align-items: center; }
.sd-card__row-label { font-size: 26rpx; color: #6b7280; }
.sd-card__row-value { font-size: 26rpx; color: #111827; font-weight: 600; }
.sd-card__link { display: flex; align-items: center; justify-content: center; padding: 16rpx 0; }
.sd-card__link-text { font-size: 28rpx; color: #2563eb; font-weight: 600; }

/* mini source cards in overview */
.sd-src-mini { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid #f3f4f6; }
.sd-src-mini:last-child { border-bottom: none; }
.sd-src-mini__left { flex: 1; display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.sd-src-mini__icon { font-size: 32rpx; flex-shrink: 0; }
.sd-src-mini__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.sd-src-mini__title { font-size: 28rpx; color: #111827; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-src-mini__meta { font-size: 22rpx; color: #9ca3af; }
.sd-src-mini__status { font-size: 24rpx; flex-shrink: 0; }
.sd-src-mini__status--done { color: #16a34a; }
.sd-src-mini__status--processing { color: #f97316; }
.sd-src-mini__status--recording { color: #dc2626; }
.sd-src-mini__status--failed { color: #dc2626; }

/* quick actions */
.sd-quick-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 20rpx; }
.sd-quick-btn { padding: 20rpx 16rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 24rpx; text-align: center; font-size: 26rpx; color: #4b5563; }
.sd-quick-btn:active { background: #f3f4f6; }

/* source cards (资料 Tab) */
.sd-source { background: #fff; border: 1rpx solid #eef0f3; border-radius: 32rpx; box-shadow: 0 14rpx 34rpx rgba(15,23,42,0.06); padding: 28rpx; margin-bottom: 24rpx; }
.sd-source:active { transform: scale(0.99); }
.sd-source__head { display: flex; align-items: flex-start; gap: 18rpx; }
.sd-source__icon { font-size: 36rpx; flex-shrink: 0; margin-top: 4rpx; }
.sd-source__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.sd-source__title { font-size: 30rpx; color: #111827; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-source__meta { font-size: 24rpx; color: #6b7280; }
.sd-source__status { padding: 6rpx 14rpx; border-radius: 999rpx; font-size: 22rpx; flex-shrink: 0; }
.sd-source__status--done { background: #dcfce7; color: #16a34a; }
.sd-source__status--processing { background: #fff7ed; color: #f97316; }
.sd-source__status--recording { background: #fee2e2; color: #dc2626; }
.sd-source__status--failed { background: #fee2e2; color: #dc2626; }
.sd-source__status--pending { background: #f3f4f6; color: #6b7280; }
.sd-source__preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 14rpx; font-size: 24rpx; color: #6b7280; line-height: 1.5; }
.sd-source__footer { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; flex-wrap: wrap; }
.sd-source__badge { font-size: 22rpx; color: #6b7280; }
.sd-source__actions { margin-left: auto; display: flex; align-items: center; gap: 16rpx; }
.sd-source__action { font-size: 24rpx; color: #2563eb; font-weight: 600; }
.sd-source__delete { font-size: 22rpx; color: #ef4444; font-weight: 600; }

/* keyword chips */
.sd-kw-chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.sd-kw-chip { padding: 8rpx 20rpx; border-radius: 999rpx; background: #eef4ff; color: #2563eb; font-size: 24rpx; }

/* review tasks */
.sd-review-task { display: flex; gap: 16rpx; align-items: flex-start; padding: 16rpx 0; border-bottom: 1rpx solid #f3f4f6; }
.sd-review-task:last-child { border-bottom: none; }
.sd-review-task__cb { width: 44rpx; height: 44rpx; border-radius: 12rpx; border: 2rpx solid #d1d5db; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sd-review-task__cb--done { background: #2563eb; border-color: #2563eb; color: #fff; }
.sd-review-task__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.sd-review-task__title { font-size: 28rpx; color: #111827; line-height: 1.5; }
.sd-review-task__src { font-size: 22rpx; color: #9ca3af; }

/* empty tab */
.sd-empty-tab { padding: 60rpx 32rpx; text-align: center; }
.sd-empty-tab__icon { display: block; font-size: 56rpx; margin-bottom: 20rpx; }
.sd-empty-tab__title { display: block; font-size: 30rpx; color: #111827; font-weight: 700; margin-bottom: 12rpx; }
.sd-empty-tab__desc { display: block; font-size: 26rpx; color: #6b7280; line-height: 1.6; margin-bottom: 28rpx; }
.sd-empty-tab__btn { display: inline-block; padding: 16rpx 36rpx; border-radius: 999rpx; background: #4F46E5; color: #fff; font-size: 26rpx; }

/* error */
.sd-error { margin-top: 32rpx; padding: 60rpx 32rpx; background: #fff; border-radius: 28rpx; text-align: center; }
.sd-error__title { display: block; font-size: 30rpx; font-weight: 700; color: #111827; margin-bottom: 12rpx; }
.sd-error__retry { display: block; font-size: 24rpx; color: #2563eb; }

/* skel */
.sd-skel-wrap { padding-top: 4rpx; }
.sd-skel { border-radius: 28rpx; background: linear-gradient(90deg, #eef0f3 25%, #f7f8fa 50%, #eef0f3 75%); background-size: 200% 100%; margin-bottom: 24rpx; animation: sdShimmer 1.4s infinite; }
.sd-skel--summary { height: 230rpx; }
.sd-skel--card { height: 180rpx; }
@keyframes sdShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.sd-safe { height: calc(env(safe-area-inset-bottom) + 180rpx); }
</style>
