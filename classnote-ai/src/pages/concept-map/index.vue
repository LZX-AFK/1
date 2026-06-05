<template>
  <view class="cm-page">
    <view class="cm-nav">
      <text class="cm-nav__back" @tap="safeBack">‹</text>
      <view class="cm-nav__center">
        <text class="cm-nav__title">知识点图谱</text>
        <text class="cm-nav__sub">{{ pageTitle }}</text>
      </view>
      <view class="cm-nav__right" />
    </view>

    <scroll-view scroll-y class="cm-scroll">
      <!-- loading -->
      <view v-if="state === 'loading'" class="cm-skel-wrap">
        <view class="cm-skel cm-skel--info" />
        <view class="cm-skel cm-skel--graph" />
        <view class="cm-skel cm-skel--detail" />
      </view>

      <!-- error -->
      <view v-else-if="state === 'error'" class="cm-state" @tap="loadData">
        <text class="cm-state__icon">✕</text>
        <text class="cm-state__title">加载失败</text>
        <text class="cm-state__action">点击重试</text>
      </view>

      <!-- empty -->
      <view v-else-if="state === 'empty'" class="cm-state">
        <text class="cm-state__icon">◈</text>
        <text class="cm-state__title">暂无知识点图谱</text>
        <text class="cm-state__desc">完成课堂总结后，知识点会自动生成。</text>
      </view>

      <!-- normal -->
      <template v-else>
        <view class="cm-info-card">
          <text class="cm-info-card__title">{{ rootLabel }}</text>
          <text class="cm-info-card__meta">{{ keywordNodes.length }} 个关键词 · {{ termNodes.length }} 个术语 · {{ keyPoints.length }} 个知识点{{ hasMindMap ? ' · 知识结构' : '' }}</text>
        </view>

        <!-- mindMap tree (优先展示) -->
        <view v-if="hasMindMap" class="cm-section">
          <text class="cm-section__title">知识结构</text>
          <view v-for="(node, idx) in mindMapData" :key="idx" class="cm-tree-root">
            <text class="cm-tree-root__name">{{ node.name }}</text>
            <view v-if="node.children && node.children.length > 0" class="cm-tree-children">
              <view v-for="(child, ci) in node.children" :key="ci" class="cm-tree-l1">
                <view class="cm-tree-l1__bar" />
                <view class="cm-tree-l1__content">
                  <text class="cm-tree-l1__name">{{ child.name }}</text>
                  <view v-if="child.children && child.children.length > 0" class="cm-tree-l2-wrap">
                    <view v-for="(gc, gi) in child.children" :key="gi" class="cm-tree-l2">
                      <view class="cm-tree-l2__dot" />
                      <text class="cm-tree-l2__name">{{ gc.name }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- keyword chips (mindMap 为空时的 fallback) -->
        <view class="cm-section">
          <text class="cm-section__title">关键词</text>
          <view class="cm-chips">
            <view
              v-for="kw in keywordNodes"
              :key="kw"
              class="cm-chip"
              :class="{ 'cm-chip--active': selected === kw }"
              @tap="selected = selected === kw ? '' : kw"
            >
              <text>{{ kw }}</text>
            </view>
          </view>
        </view>

        <!-- key points -->
        <view v-if="keyPoints.length > 0" class="cm-section">
          <text class="cm-section__title">核心知识点</text>
          <view v-for="(pt, i) in keyPoints" :key="i" class="cm-point">
            <view class="cm-point__dot" />
            <text class="cm-point__text">{{ pt }}</text>
          </view>
        </view>

        <!-- terms -->
        <view v-if="termNodes.length > 0" class="cm-section">
          <text class="cm-section__title">专业术语</text>
          <view
            v-for="term in termNodes"
            :key="term.term"
            class="cm-term"
            :class="{ 'cm-term--active': selected === term.term }"
            @tap="selected = selected === term.term ? '' : term.term"
          >
            <view class="cm-term__head">
              <text class="cm-term__name">{{ term.term }}</text>
              <text class="cm-term__arrow">{{ selected === term.term ? '▾' : '›' }}</text>
            </view>
            <text v-if="selected === term.term" class="cm-term__expl">{{ term.explanation }}</text>
          </view>
        </view>

        <!-- selected keyword detail -->
        <view v-if="selected && !termNodes.find(t => t.term === selected)" class="cm-detail-card">
          <text class="cm-detail-card__kw">{{ selected }}</text>
          <text class="cm-detail-card__related">该关键词来自本节课 AI 总结</text>
          <view class="cm-detail-card__btn" @tap="goSummary">查看相关总结 ›</view>
        </view>
      </template>

      <view class="cm-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSessions, getSummary } from '@/services/sessionApi'

const courseKey = ref('')
const sessionId = ref('')
const courseName = ref('')
const state = ref<'loading' | 'empty' | 'error' | 'normal'>('loading')
const keywordNodes = ref<string[]>([])
const termNodes = ref<Array<{ term: string; explanation: string }>>([])
const keyPoints = ref<string[]>([])
const mindMapData = ref<Array<{ name: string; children?: Array<{ name: string; children?: Array<{ name: string }> }> }>>([])
const hasMindMap = ref(false)
const summaryId = ref('')
const selected = ref('')
const documentType = ref('')

const pageTitle = computed(() => {
  // 文档类 session 显示"资料知识结构"
  if (documentType.value) {
    const dt = documentType.value.toLowerCase()
    if (dt === 'reading') return 'Reading 知识结构'
    if (dt === 'slides') return 'Lecture Slides 知识结构'
    return '资料知识结构'
  }
  return courseName.value || courseKey.value || '知识图谱'
})
const rootLabel = computed(() => courseName.value || courseKey.value || '本节课')

async function loadData() {
  state.value = 'loading'
  try {
    let summary: Awaited<ReturnType<typeof getSummary>> | null = null

    if (sessionId.value) {
      summary = await getSummary(sessionId.value)
      summaryId.value = sessionId.value
    } else if (courseKey.value) {
      const sessions = await getSessions()
      const doneSessions = sessions.filter(
        s => s.status === 'done' &&
          (s.subject || s.title || '').toLowerCase() === courseKey.value.toLowerCase(),
      )
      if (doneSessions.length > 0) {
        summary = await getSummary(doneSessions[0].id)
        summaryId.value = doneSessions[0].id
      }
    }

    if (!summary || summary.status !== 'done' || (!summary.keywords?.length && !summary.keyPoints)) {
      state.value = 'empty'
      return
    }

    // 文档类型检测
    documentType.value = summary.documentType || ''

    const kw = summary.keywords || []
    const kp = Array.isArray(summary.keyPoints)
      ? summary.keyPoints
      : typeof summary.keyPoints === 'string'
        ? (() => { try { return JSON.parse(summary.keyPoints as string) } catch { return [] } })()
        : []
    const terms = summary.terms || []
    const mm = summary.mindMap || []

    // Phase 7-F Hotfix: 优先使用 mindMap
    if (Array.isArray(mm) && mm.length > 0 && mm[0]?.name) {
      mindMapData.value = mm
      hasMindMap.value = true
    } else {
      mindMapData.value = []
      hasMindMap.value = false
    }

    keywordNodes.value = kw.slice(0, 8)
    keyPoints.value = kp.slice(0, 6)
    termNodes.value = terms.slice(0, 6)

    if (kw.length === 0 && kp.length === 0 && terms.length === 0 && !hasMindMap.value) {
      state.value = 'empty'
      return
    }

    state.value = 'normal'
  } catch (err) {
    console.warn('[concept-map] loadData failed', err)
    state.value = 'error'
  }
}

function safeBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { uni.navigateBack(); return }
  if (courseKey.value) {
    uni.redirectTo({ url: `/pages/knowledge/course?courseId=${encodeURIComponent(courseKey.value)}&courseName=${encodeURIComponent(courseName.value)}` })
    return
  }
  uni.switchTab({ url: '/pages/knowledge/index' })
}

function goSummary() {
  if (summaryId.value) {
    uni.navigateTo({ url: `/pages/record/summary?sessionId=${summaryId.value}&from=knowledge` })
  } else {
    uni.showToast({ title: '请先完成一节课堂总结', icon: 'none' })
  }
}

onLoad((query) => {
  // 兼容 spaceId/spaceName 和旧 courseId/courseName
  courseKey.value = query?.spaceId ? decodeURIComponent(query.spaceId) : (query?.courseId ? decodeURIComponent(query.courseId) : '')
  courseName.value = query?.spaceName ? decodeURIComponent(query.spaceName) : (query?.courseName ? decodeURIComponent(query.courseName) : '')
  sessionId.value = query?.sessionId ? decodeURIComponent(query.sessionId) : ''
})

onMounted(() => { loadData() })
</script>

<style lang="scss" scoped>
.cm-page { min-height: 100vh; background: #FAFAF5; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.cm-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.cm-nav { position: relative; z-index: 10; height: calc(env(safe-area-inset-top) + 120rpx); padding: calc(env(safe-area-inset-top) + 28rpx) 32rpx 20rpx; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; }
.cm-nav__back, .cm-nav__right { width: 88rpx; flex-shrink: 0; }
.cm-nav__back { font-size: 58rpx; color: #071446; line-height: 1; cursor: pointer; }
.cm-nav__center { display: flex; flex-direction: column; align-items: center; }
.cm-nav__title { font-size: 36rpx; color: #071446; font-weight: 800; }
.cm-nav__sub { margin-top: 8rpx; font-size: 24rpx; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300rpx; }
.cm-scroll { height: calc(100vh - env(safe-area-inset-top) - 120rpx); padding: 24rpx 32rpx 0; box-sizing: border-box; }

.cm-info-card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; box-shadow: 0 14rpx 34rpx rgba(15,23,42,.06); padding: 28rpx; margin-bottom: 24rpx; }
.cm-info-card__title { display: block; font-size: 34rpx; color: #071446; font-weight: 800; margin-bottom: 10rpx; }
.cm-info-card__meta { font-size: 24rpx; color: #6b7280; }

.cm-section { margin-bottom: 24rpx; }
.cm-section__title { display: block; font-size: 26rpx; color: #6b7280; margin-bottom: 16rpx; font-weight: 600; }

.cm-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }

/* mindMap tree */
.cm-tree-root { background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 22rpx 24rpx; margin-bottom: 12rpx; }
.cm-tree-root__name { display: block; font-size: 30rpx; color: #111827; font-weight: 800; margin-bottom: 12rpx; }
.cm-tree-children { padding-left: 8rpx; }
.cm-tree-l1 { display: flex; gap: 0; margin-bottom: 8rpx; }
.cm-tree-l1__bar { width: 4rpx; background: #c7d8ff; border-radius: 2rpx; flex-shrink: 0; margin-right: 18rpx; }
.cm-tree-l1__content { flex: 1; }
.cm-tree-l1__name { display: block; font-size: 28rpx; color: #2563eb; font-weight: 700; margin-bottom: 8rpx; }
.cm-tree-l2-wrap { padding-left: 12rpx; }
.cm-tree-l2 { display: flex; align-items: center; gap: 10rpx; margin-bottom: 6rpx; }
.cm-tree-l2__dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #93b4ff; flex-shrink: 0; }
.cm-tree-l2__name { font-size: 26rpx; color: #4b5563; line-height: 1.5; }
.cm-chip { padding: 12rpx 22rpx; border-radius: 999rpx; background: #fff; border: 1rpx solid #dbe4f0; color: #4b5563; font-size: 26rpx; box-shadow: 0 8rpx 20rpx rgba(15,23,42,.04); cursor: pointer; }
.cm-chip--active { background: #eef4ff; border-color: #2563eb; color: #2563eb; font-weight: 700; }

.cm-point { display: flex; align-items: flex-start; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; margin-bottom: 12rpx; }
.cm-point__dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #2563eb; flex-shrink: 0; margin-top: 10rpx; }
.cm-point__text { flex: 1; font-size: 27rpx; color: #111827; line-height: 1.5; }

.cm-term { background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 22rpx 24rpx; margin-bottom: 12rpx; cursor: pointer; }
.cm-term--active { border-color: #2563eb; background: #f8fbff; }
.cm-term__head { display: flex; align-items: center; justify-content: space-between; }
.cm-term__name { font-size: 28rpx; color: #111827; font-weight: 700; }
.cm-term__arrow { font-size: 28rpx; color: #9ca3af; }
.cm-term__expl { display: block; margin-top: 14rpx; font-size: 26rpx; color: #4b5563; line-height: 1.5; padding: 16rpx; background: #f3f6fb; border-radius: 14rpx; }

.cm-detail-card { background: #eef4ff; border: 1rpx solid #bfdbfe; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.cm-detail-card__kw { display: block; font-size: 32rpx; color: #2563eb; font-weight: 800; margin-bottom: 10rpx; }
.cm-detail-card__related { display: block; font-size: 24rpx; color: #6b7280; margin-bottom: 18rpx; }
.cm-detail-card__btn { font-size: 27rpx; color: #2563eb; font-weight: 700; }

.cm-state { margin-top: 60rpx; text-align: center; }
.cm-state__icon { display: block; font-size: 60rpx; margin-bottom: 20rpx; }
.cm-state__title { display: block; font-size: 32rpx; color: #111827; font-weight: 700; margin-bottom: 12rpx; }
.cm-state__desc { display: block; font-size: 26rpx; color: #6b7280; line-height: 1.6; padding: 0 32rpx; }
.cm-state__action { display: block; margin-top: 20rpx; font-size: 26rpx; color: #2563eb; }

.cm-skel-wrap { }
.cm-skel { border-radius: 28rpx; background: linear-gradient(90deg,#eef0f3 25%,#f7f8fa 50%,#eef0f3 75%); background-size: 200% 100%; animation: cmShimmer 1.4s infinite; margin-bottom: 24rpx; }
.cm-skel--info { height: 120rpx; }
.cm-skel--graph { height: 300rpx; }
.cm-skel--detail { height: 160rpx; }
@keyframes cmShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.cm-safe { height: calc(env(safe-area-inset-bottom) + 180rpx); }
</style>
