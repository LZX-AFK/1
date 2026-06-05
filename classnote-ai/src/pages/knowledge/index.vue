<template>
  <view class="kb-page">
    <scroll-view scroll-y class="kb-scroll">
      <view class="kb-nav">
        <view class="kb-title">
          <text class="kb-title__main">知识库</text>
          <text class="kb-title__sub">管理你的课程、资料、项目和复习任务</text>
        </view>
      </view>

      <!-- loading -->
      <view v-if="pageState === 'loading'" class="kb-loading">
        <view class="kb-skel kb-skel--overview" />
        <view class="kb-skel kb-skel--card" />
        <view class="kb-skel kb-skel--card" />
      </view>

      <!-- error -->
      <view v-else-if="pageState === 'error'" class="kb-error">
        <text class="kb-error__icon">✕</text>
        <text class="kb-error__title">知识库加载失败</text>
        <text v-if="runtimeEnv === 'public-demo'" class="kb-error__desc">公网后端连接失败，请检查部署服务是否在线。</text>
        <text v-else-if="runtimeEnv === 'lan-test'" class="kb-error__desc">当前为局域网测试环境，请确认手机和电脑在同一个 Wi-Fi，且后端已启动。</text>
        <text v-else class="kb-error__desc">后端连接失败，请确认后端服务已启动（npm start）。</text>
        <text class="kb-error__url">接口地址：{{ apiBaseUrl }}/api/sessions</text>
        <view class="kb-error__actions">
          <view class="kb-error__btn" @tap="onRetry">
            <text class="kb-error__retry">点击重试</text>
          </view>
          <view class="kb-error__btn kb-error__btn--outline" @tap="goSettings">
            <text class="kb-error__settings">修改服务器地址</text>
          </view>
        </view>
      </view>

      <!-- empty -->
      <view v-else-if="pageState === 'empty'" class="kb-empty-wrap">
        <view class="kb-empty-card">
          <text class="kb-empty-card__icon">📚</text>
          <text class="kb-empty-card__title">暂无学习空间</text>
          <text class="kb-empty-card__desc">完成一次录音、上传课堂音频或上传 Reading 后，内容会自动沉淀为学习空间。</text>
          <view class="kb-empty-card__btns">
            <view class="kb-empty-btn kb-empty-btn--primary" @tap="goRecord">
              <text>🎙</text><text>开始录音</text>
            </view>
            <view class="kb-empty-btn" @tap="goUpload">
              <text>📎</text><text>上传资料</text>
            </view>
          </view>
        </view>
      </view>

      <!-- normal: space cards -->
      <template v-else>
        <!-- 学习概览卡片 -->
        <view class="kb-overview">
          <view class="kb-stat">
            <view class="kb-stat__icon kb-stat__icon--blue">◇</view>
            <text class="kb-stat__label">学习空间</text>
            <view class="kb-stat__value"><text>{{ spaceCount }}</text><text>个</text></view>
          </view>
          <view class="kb-stat">
            <view class="kb-stat__icon kb-stat__icon--orange">□</view>
            <text class="kb-stat__label">资料数</text>
            <view class="kb-stat__value"><text>{{ sourceCount }}</text><text>份</text></view>
          </view>
          <view class="kb-stat">
            <view class="kb-stat__icon kb-stat__icon--green">✓</view>
            <text class="kb-stat__label">AI 总结</text>
            <view class="kb-stat__value"><text>{{ summaryCount }}</text><text>篇</text></view>
          </view>
        </view>

        <!-- 分类筛选 Tabs -->
        <view class="kb-filter">
          <view
            v-for="ft in filterTabs" :key="ft.key"
            class="kb-filter__tab"
            :class="{ 'kb-filter__tab--active': activeFilter === ft.key }"
            @tap="activeFilter = ft.key"
          >
            <text>{{ ft.label }}</text>
          </view>
        </view>

        <!-- section header -->
        <view class="kb-section-head">
          <text class="kb-section-title">学习空间</text>
          <text class="kb-section-count">{{ filteredSpaces.length }} 个</text>
        </view>

        <!-- space cards -->
        <view v-for="space in filteredSpaces" :key="space.id" class="kb-space" @tap="onSpaceTap(space)">
          <view class="kb-space__header">
            <view class="kb-space__icon-wrap" :class="'kb-space__icon-wrap--' + space.type">
              <text class="kb-space__icon">{{ spaceIcon(space.type) }}</text>
            </view>
            <view class="kb-space__info">
              <text class="kb-space__name">{{ space.name }}</text>
              <view class="kb-space__tags">
                <text class="kb-space__tag" :class="'kb-space__tag--' + space.type">{{ spaceTypeLabel(space.type) }}</text>
                <text class="kb-space__date">{{ formatLastDate(space.lastUpdatedAt) }}</text>
              </view>
            </view>
            <text class="kb-space__arrow">›</text>
          </view>

          <view class="kb-space__stats">
            <text class="kb-space__stat">{{ space.sourceCount }} 份资料</text>
            <text class="kb-space__stat">{{ space.summaryCount }} 篇总结</text>
            <text v-if="space.reviewTaskCount > 0" class="kb-space__stat kb-space__stat--review">{{ space.reviewTaskCount }} 待复习</text>
          </view>

          <view v-if="space.progress > 0" class="kb-space__progress">
            <view class="kb-space__bar"><view class="kb-space__fill" :style="{ width: space.progress + '%' }" /></view>
            <text class="kb-space__pct">{{ space.progress }}%</text>
          </view>

          <!-- 关键词 chips（最多3个） -->
          <view v-if="space.keywords && space.keywords.length > 0" class="kb-space__kw-row">
            <text v-for="kw in space.keywords.slice(0, 3)" :key="kw" class="kb-space__kw">{{ kw }}</text>
          </view>

          <!-- 最近 summary preview -->
          <text v-if="space.recentSummary" class="kb-space__preview">{{ space.recentSummary }}</text>
        </view>
      </template>

      <view class="kb-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getSessions, type SessionListItem } from '@/services/sessionApi'
import { getApiBaseUrl } from '@/services/api'
import { RUNTIME_ENVIRONMENT } from '@/config/runtime'
import {
  groupSourcesBySpace,
  getSpaceTypeLabel,
  getSpaceTypeIcon,
} from '@/utils/mapSessionToSpace'
import type { LearningSpace, SpaceType } from '@/types/space'

const pageState = ref<'loading' | 'normal' | 'empty' | 'error'>('loading')
const sessions = ref<SessionListItem[]>([])
const activeFilter = ref<string>('all')
const apiBaseUrl = getApiBaseUrl()
const runtimeEnv = RUNTIME_ENVIRONMENT

// --- 防重复请求 ---
let fetching = false
let lastFetchAt = 0
let hasMounted = false

const spaces = computed<LearningSpace[]>(() => groupSourcesBySpace(sessions.value))

const filterTabs = computed(() => [
  { key: 'all', label: '全部' },
  { key: 'course', label: '课程' },
  { key: 'general', label: '资料' },
  { key: 'project', label: '项目' },
  { key: 'exam', label: '考试' },
  { key: 'topic', label: '主题' },
])

const filteredSpaces = computed(() => {
  if (activeFilter.value === 'all') return spaces.value
  return spaces.value.filter(s => s.type === activeFilter.value)
})

const spaceCount = computed(() => spaces.value.length)
const sourceCount = computed(() => sessions.value.length)
const summaryCount = computed(() => sessions.value.filter(s => s.status === 'done').length)

function spaceIcon(type: SpaceType): string {
  return getSpaceTypeIcon(type)
}

function spaceTypeLabel(type: SpaceType): string {
  return getSpaceTypeLabel(type)
}

function formatLastDate(iso?: string): string {
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
  } catch {
    return ''
  }
}

async function fetchData(options?: { silent?: boolean; force?: boolean }) {
  const silent = options?.silent === true
  const force = options?.force === true
  const now = Date.now()

  if (fetching && !force) return
  if (!force && now - lastFetchAt < 800) return

  fetching = true
  lastFetchAt = now

  if (!silent) {
    pageState.value = 'loading'
  }

  try {
    const data = await getSessions()
    sessions.value = data || []
    pageState.value = sessions.value.length > 0 ? 'normal' : 'empty'
  } catch (err) {
    console.warn('[knowledge] fetchSessions failed', err)
    if (silent && sessions.value.length > 0) {
      console.warn('[knowledge] silent refresh failed, keeping old data')
    } else if (!silent || sessions.value.length === 0) {
      sessions.value = []
      pageState.value = 'error'
    }
  } finally {
    fetching = false
  }
}

function onRetry() {
  fetchData({ force: true })
}

function onSpaceTap(space: LearningSpace) {
  uni.navigateTo({
    url: `/pages/knowledge/course?spaceId=${encodeURIComponent(space.id)}&spaceName=${encodeURIComponent(space.name)}`,
  })
}

function goRecord() {
  uni.switchTab({ url: '/pages/agent/index' })
}

function goUpload() {
  uni.navigateTo({ url: '/pages/materials/upload' })
}

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/index' })
}

onMounted(() => {
  hasMounted = true
  fetchData()
})

onShow(() => {
  if (hasMounted) {
    fetchData({ silent: true })
  }
})
</script>

<style lang="scss" scoped>
.kb-page { min-height: 100vh; background: #FAFAF5; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.kb-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.kb-scroll { height: 100vh; box-sizing: border-box; }

.kb-nav {
  height: calc(env(safe-area-inset-top) + 136rpx);
  padding: calc(env(safe-area-inset-top) + 72rpx) 32rpx 0;
  box-sizing: border-box;
}
.kb-title { display: flex; flex-direction: column; gap: 4rpx; }
.kb-title__main { font-size: 44rpx; color: #071446; font-weight: 800; }
.kb-title__sub { font-size: 24rpx; color: #6b7280; }

/* overview stats */
.kb-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; padding: 0 32rpx; margin-bottom: 28rpx; }
.kb-stat { min-height: 206rpx; padding: 24rpx 12rpx 22rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; box-shadow: 0 12rpx 30rpx rgba(15,23,42,0.05); box-sizing: border-box; }
.kb-stat__icon { width: 72rpx; height: 72rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 700; margin-bottom: 20rpx; }
.kb-stat__icon--blue { background: #eef4ff; color: #2563eb; }
.kb-stat__icon--orange { background: #fff4e8; color: #f97316; }
.kb-stat__icon--green { background: #ecfdf5; color: #16a34a; }
.kb-stat__label { font-size: 24rpx; color: #6b7280; margin-bottom: 10rpx; }
.kb-stat__value { display: flex; align-items: baseline; gap: 8rpx; color: #071446; }
.kb-stat__value text:first-child { font-size: 46rpx; font-weight: 800; }
.kb-stat__value text:last-child { font-size: 22rpx; color: #6b7280; }

/* filter tabs */
.kb-filter { display: flex; gap: 12rpx; padding: 0 32rpx; margin-bottom: 28rpx; overflow-x: auto; white-space: nowrap; }
.kb-filter__tab { flex-shrink: 0; padding: 12rpx 24rpx; border-radius: 999rpx; background: #f3f4f6; color: #6b7280; font-size: 24rpx; }
.kb-filter__tab--active { background: #eef4ff; color: #2563eb; font-weight: 600; }

/* section header */
.kb-section-head { padding: 0 32rpx; margin-bottom: 20rpx; display: flex; align-items: center; justify-content: space-between; }
.kb-section-title { font-size: 34rpx; color: #111827; font-weight: 700; }
.kb-section-count { font-size: 24rpx; color: #6b7280; }

/* space card */
.kb-space { margin: 0 32rpx 28rpx; padding: 28rpx 24rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 34rpx; box-shadow: 0 14rpx 34rpx rgba(15,23,42,0.06); box-sizing: border-box; }
.kb-space:active { transform: scale(0.99); }
.kb-space__header { display: flex; align-items: center; gap: 20rpx; }
.kb-space__icon-wrap { width: 100rpx; height: 100rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kb-space__icon-wrap--course { background: linear-gradient(135deg, #dbeafe, #eff6ff); }
.kb-space__icon-wrap--general { background: linear-gradient(135deg, #f3e8ff, #faf5ff); }
.kb-space__icon-wrap--project { background: linear-gradient(135deg, #dcfce7, #f0fdf4); }
.kb-space__icon-wrap--exam { background: linear-gradient(135deg, #fef3c7, #fefce8); }
.kb-space__icon-wrap--topic { background: linear-gradient(135deg, #e0e7ff, #eef2ff); }
.kb-space__icon-wrap--portfolio { background: linear-gradient(135deg, #ffe4e6, #fff1f2); }
.kb-space__icon { font-size: 40rpx; }
.kb-space__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.kb-space__name { font-size: 34rpx; color: #071446; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-space__tags { display: flex; align-items: center; gap: 12rpx; }
.kb-space__tag { padding: 4rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 600; }
.kb-space__tag--course { background: #eef4ff; color: #2563eb; }
.kb-space__tag--general { background: #f3e8ff; color: #7c3aed; }
.kb-space__tag--project { background: #dcfce7; color: #16a34a; }
.kb-space__tag--exam { background: #fef3c7; color: #d97706; }
.kb-space__tag--topic { background: #e0e7ff; color: #4f46e5; }
.kb-space__tag--portfolio { background: #ffe4e6; color: #e11d48; }
.kb-space__date { font-size: 22rpx; color: #9ca3af; }
.kb-space__arrow { color: #9ca3af; font-size: 40rpx; line-height: 1; }

.kb-space__stats { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 18rpx; }
.kb-space__stat { padding: 6rpx 14rpx; border-radius: 999rpx; font-size: 22rpx; background: #f3f6fb; color: #4b5563; }
.kb-space__stat--review { background: #fff7ed; color: #f97316; }

.kb-space__progress { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.kb-space__bar { flex: 1; height: 10rpx; background: #e5e7eb; border-radius: 999rpx; overflow: hidden; }
.kb-space__fill { height: 100%; border-radius: 999rpx; background: #2f6bff; }
.kb-space__pct { font-size: 22rpx; color: #6b7280; }

.kb-space__kw-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.kb-space__kw { padding: 4rpx 14rpx; border-radius: 999rpx; background: #f0f4ff; color: #4f46e5; font-size: 20rpx; }

.kb-space__preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 14rpx; font-size: 24rpx; color: #6b7280; line-height: 1.5; }

/* empty state */
.kb-empty-wrap { padding: 0 32rpx; }
.kb-empty-card { padding: 60rpx 32rpx; background: #fff; border-radius: 28rpx; text-align: center; margin-top: 32rpx; }
.kb-empty-card__icon { display: block; font-size: 60rpx; margin-bottom: 24rpx; }
.kb-empty-card__title { display: block; font-size: 32rpx; color: #111827; font-weight: 700; margin-bottom: 12rpx; }
.kb-empty-card__desc { display: block; font-size: 26rpx; color: #6b7280; line-height: 1.6; margin-bottom: 36rpx; }
.kb-empty-card__btns { display: flex; gap: 20rpx; justify-content: center; }
.kb-empty-btn { display: flex; align-items: center; gap: 10rpx; padding: 18rpx 28rpx; border-radius: 999rpx; background: #f3f4f6; color: #4b5563; font-size: 26rpx; }
.kb-empty-btn--primary { background: #4F46E5; color: #fff; }

/* error */
.kb-error { margin: 32rpx; padding: 60rpx 32rpx; background: #fff; border-radius: 28rpx; text-align: center; }
.kb-error__icon { display: block; font-size: 48rpx; margin-bottom: 16rpx; }
.kb-error__title { display: block; font-size: 30rpx; color: #111827; font-weight: 700; margin-bottom: 8rpx; }
.kb-error__desc { display: block; font-size: 24rpx; color: #6b7280; margin-bottom: 12rpx; }
.kb-error__url { display: block; font-size: 22rpx; color: #9ca3af; margin-bottom: 28rpx; word-break: break-all; }
.kb-error__actions { display: flex; gap: 20rpx; justify-content: center; }
.kb-error__btn { display: inline-flex; align-items: center; padding: 16rpx 40rpx; background: #4F46E5; border-radius: 999rpx; }
.kb-error__btn--outline { background: transparent; border: 2rpx solid #4F46E5; }
.kb-error__retry { font-size: 26rpx; color: #fff; font-weight: 600; }
.kb-error__settings { font-size: 26rpx; color: #4F46E5; font-weight: 600; }

/* loading */
.kb-loading { padding: 0 32rpx; }
.kb-skel { border-radius: 28rpx; background: linear-gradient(90deg, #eef0f3 25%, #f7f8fa 50%, #eef0f3 75%); background-size: 200% 100%; animation: kbShimmer 1.4s infinite; margin-bottom: 24rpx; }
.kb-skel--overview { height: 206rpx; }
.kb-skel--card { height: 260rpx; }
@keyframes kbShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.kb-safe { height: calc(env(safe-area-inset-bottom) + 220rpx); }
</style>
