<template>
  <view class="page">
    <!-- ===== 课程 Hero 卡片 ===== -->
    <view class="hero-card">
      <view class="hero-bg" />
      <view class="hero-content">
        <text class="hero-course-name">{{ sessionStore.courseTitle || '课堂总结' }}</text>
        <view class="hero-meta">
          <view class="hero-meta-item">
            <text class="hero-meta-icon">⏱</text>
            <text class="hero-meta-text">{{ formattedDuration }}</text>
          </view>
          <view class="hero-meta-divider" />
          <view class="hero-meta-item">
            <text class="hero-meta-icon">📌</text>
            <text class="hero-meta-text">{{ sessionStore.markerCount }} 个标记</text>
          </view>
        </view>
        <view class="hero-status-badge" :class="{ done: sessionStore.hasSummary }">
          <text>{{ sessionStore.hasSummary ? '✅ 总结完成' : '⏳ 生成中...' }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 骨架屏 Loading ===== -->
    <view v-if="sessionStore.isSummarizing" class="skeleton-area">
      <view class="skeleton-card">
        <view class="skeleton-line skeleton-title" />
        <view class="skeleton-line skeleton-text" />
        <view class="skeleton-line skeleton-text skeleton-text--short" />
        <view class="skeleton-line skeleton-text skeleton-text--medium" />
      </view>
      <view class="skeleton-card">
        <view class="skeleton-line skeleton-title" />
        <view class="skeleton-line skeleton-text" />
        <view class="skeleton-line skeleton-text" />
        <view class="skeleton-line skeleton-text skeleton-text--short" />
      </view>
      <view class="skeleton-card">
        <view class="skeleton-line skeleton-title" />
        <view class="skeleton-line skeleton-text" />
        <view class="skeleton-line skeleton-text skeleton-text--medium" />
      </view>
      <view class="skeleton-card">
        <view class="skeleton-line skeleton-title" />
        <view class="skeleton-line skeleton-text" />
        <view class="skeleton-line skeleton-text skeleton-text--short" />
      </view>
    </view>

    <!-- ===== 超时错误 ===== -->
    <view v-else-if="sessionStore.isSummaryTimeout" class="timeout-area">
      <view class="timeout-card">
        <text class="timeout-icon">⏰</text>
        <text class="timeout-title">总结生成超时</text>
        <text class="timeout-desc">
          AI 正在后台继续处理你的课堂内容，预计需要 1-2 分钟。你可以稍后在课程详情中查看完整总结。
        </text>
        <button class="retry-btn" @click="retryFetch">🔄 重新获取</button>
      </view>
    </view>

    <!-- ===== 错误状态（无 session） ===== -->
    <view v-else-if="!sessionStore.sessionId && !sessionStore.isSummarizing" class="timeout-area">
      <view class="timeout-card">
        <text class="timeout-icon">📭</text>
        <text class="timeout-title">暂无课堂记录</text>
        <text class="timeout-desc">请先完成一次课堂录音后再查看 AI 总结。</text>
        <button class="retry-btn" @click="goHome">🏠 返回首页</button>
      </view>
    </view>

    <!-- ===== 总结内容 ===== -->
    <view v-else-if="sessionStore.hasSummary" class="summary-content">
      <!-- Section 1: 课堂概览 -->
      <view class="section">
        <view class="section-header">
          <text class="section-icon">📋</text>
          <text class="section-title">课堂概览</text>
        </view>
        <text class="overview-text">{{ sessionStore.aiSummary!.overview }}</text>
      </view>

      <!-- Section 2: 核心知识点 -->
      <view class="section">
        <view class="section-header">
          <text class="section-icon">🔑</text>
          <text class="section-title">核心知识点</text>
          <text class="section-count">{{ sessionStore.aiSummary!.keyPoints.length }}</text>
        </view>
        <view class="key-points-list">
          <view
            v-for="(point, idx) in sessionStore.aiSummary!.keyPoints"
            :key="idx"
            class="key-point-card"
          >
            <view class="key-point-index">{{ idx + 1 }}</view>
            <view class="key-point-body">
              <text class="key-point-title">{{ point.title }}</text>
              <text class="key-point-desc">{{ point.content }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Section 3: 你标记的疑问 -->
      <view
        v-if="sessionStore.aiSummary!.followUpSections.length > 0"
        class="section"
      >
        <view class="section-header">
          <text class="section-icon">🔍</text>
          <text class="section-title">你标记的疑问</text>
          <text class="section-count accent">
            {{ sessionStore.aiSummary!.followUpSections.length }}
          </text>
        </view>
        <view class="follow-up-list">
          <view
            v-for="section in sessionStore.aiSummary!.followUpSections"
            :key="section.markerId"
            class="follow-up-card"
            :class="{ expanded: isExpanded(section.markerId) }"
            @click="toggleExpand(section.markerId)"
          >
            <!-- 折叠态 -->
            <view class="follow-up-collapsed">
              <view class="follow-up-badge">{{ section.markerLabel }}</view>
              <text class="follow-up-preview">{{ section.originalText }}</text>
              <text class="follow-up-arrow">{{ isExpanded(section.markerId) ? '▲' : '▼' }}</text>
            </view>

            <!-- 展开态 -->
            <view v-if="isExpanded(section.markerId)" class="follow-up-expanded">
              <view class="follow-up-divider" />

              <view class="follow-up-block">
                <text class="follow-up-block-label">📝 原文</text>
                <text class="follow-up-block-text">{{ section.originalText }}</text>
              </view>

              <view class="follow-up-block">
                <text class="follow-up-block-label">🤖 AI 延伸解析</text>
                <text class="follow-up-block-text ai-explain">{{ section.aiExplanation }}</text>
              </view>

              <view v-if="section.relatedTopics.length > 0" class="follow-up-block">
                <text class="follow-up-block-label">🏷 相关知识点</text>
                <view class="related-tags">
                  <text
                    v-for="(tag, tIdx) in section.relatedTopics"
                    :key="tIdx"
                    class="related-tag"
                  >
                    {{ tag }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空标记提示 -->
      <view v-else class="section">
        <view class="section-header">
          <text class="section-icon">🔍</text>
          <text class="section-title">你标记的疑问</text>
        </view>
        <view class="empty-markers">
          <text class="empty-markers-icon">📌</text>
          <text class="empty-markers-text">本次课堂没有添加标记</text>
          <text class="empty-markers-hint">下次录音时点击底部标记按钮，AI 会为你深入解析</text>
        </view>
      </view>

      <!-- Section 4: 学习建议 -->
      <view class="section">
        <view class="section-header">
          <text class="section-icon">💡</text>
          <text class="section-title">学习建议</text>
        </view>
        <text class="suggestions-text">{{ sessionStore.aiSummary!.suggestions }}</text>
      </view>

      <!-- 保存到知识库 -->
      <view class="save-section">
        <button
          class="save-btn"
          :disabled="sessionStore.isSavingToLibrary"
          @click="handleSave"
        >
          <text v-if="sessionStore.isSavingToLibrary" class="save-btn-text">保存中...</text>
          <text v-else class="save-btn-text">💾 保存到知识库</text>
        </button>
        <text class="save-hint">保存后可随时在知识库中查阅和搜索</text>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer" />
    </view>

    <!-- ===== 固定底部操作栏 ===== -->
    <view class="fixed-bottom-bar">
      <button class="bottom-btn secondary" @click="goToMarkers">
        📊 查看时间轴
      </button>
      <button class="bottom-btn primary" @click="goHome">
        🏠 返回首页
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'

const sessionStore = useSessionStore()

// ---- 标记卡片展开/收起 ----
const expandedMarkers = ref<Record<string, boolean>>({})

function isExpanded(markerId: string): boolean {
  return !!expandedMarkers.value[markerId]
}

function toggleExpand(markerId: string) {
  expandedMarkers.value[markerId] = !expandedMarkers.value[markerId]
}

// ---- 格式化时长 ----
const formattedDuration = computed(() => {
  const ms = sessionStore.recordingDurationMs
  if (ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

// ---- 生命周期 ----
onMounted(() => {
  // 进入页面自动开始轮询 AI 总结
  if (sessionStore.sessionId) {
    sessionStore.fetchSummary()
  }
})

onUnmounted(() => {
  // 离开页面时停止轮询
  sessionStore.stopSummaryPolling()
})

// ---- 操作方法 ----
function retryFetch() {
  sessionStore.stopSummaryPolling()
  sessionStore.fetchSummary()
}

async function handleSave() {
  if (sessionStore.isSavingToLibrary) return

  const success = await sessionStore.saveToLibrary()
  if (success) {
    uni.showToast({ title: '已保存到知识库', icon: 'success', duration: 2000 })
  } else {
    uni.showToast({ title: '保存失败，请重试', icon: 'none', duration: 2000 })
  }
}

function goToMarkers() {
  uni.navigateTo({ url: '/pages/timeline-markers/timeline-markers' })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
// ===================== 页面容器 =====================
.page {
  min-height: 100vh;
  background: $color-bg-primary;
  padding-bottom: calc(160rpx + $safe-area-bottom-env);
}

// ===================== Hero 卡片 =====================
.hero-card {
  position: relative;
  margin: $spacing-md $spacing-lg;
  border-radius: $radius-xl;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, $color-primary-dark 0%, $color-primary 40%, #8B6FFF 100%);
  opacity: 0.9;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: $spacing-xl $spacing-lg;
}

.hero-course-name {
  display: block;
  font-size: $font-size-xxl;
  font-weight: $font-weight-bold;
  color: #FFFFFF;
  margin-bottom: $spacing-md;
  line-height: $line-height-tight;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-md;
}

.hero-meta-item {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.hero-meta-icon {
  font-size: $font-size-md;
}

.hero-meta-text {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.85);
  font-family: $font-family-mono;
}

.hero-meta-divider {
  width: 2rpx;
  height: 24rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1rpx;
}

.hero-status-badge {
  align-self: flex-start;
  padding: 6rpx 20rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: $radius-round;
  border: 1px solid rgba(255, 255, 255, 0.25);

  text {
    font-size: $font-size-xs;
    color: rgba(255, 255, 255, 0.9);
  }

  &.done {
    background: rgba($color-secondary, 0.25);
    border-color: rgba($color-secondary, 0.4);

    text {
      color: $color-secondary-light;
    }
  }
}

// ===================== 骨架屏 =====================
.skeleton-area {
  padding: 0 $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.skeleton-card {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
}

.skeleton-line {
  height: 24rpx;
  background: $color-bg-elevated;
  border-radius: $radius-sm;
  margin-bottom: $spacing-sm;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 40%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 60%,
      transparent 100%
    );
    animation: shimmer 2s infinite;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.skeleton-title {
  height: 32rpx;
  width: 40%;
  margin-bottom: $spacing-md;
}

.skeleton-text {
  &--short {
    width: 60%;
  }

  &--medium {
    width: 80%;
  }
}

// ===================== 超时/错误 =====================
.timeout-area {
  padding: $spacing-xxl $spacing-lg;
  display: flex;
  justify-content: center;
}

.timeout-card {
  background: $color-bg-card;
  border-radius: $radius-xl;
  padding: $spacing-xxl $spacing-lg;
  text-align: center;
  width: 100%;
  max-width: 600rpx;
}

.timeout-icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: $spacing-md;
}

.timeout-title {
  display: block;
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-sm;
}

.timeout-desc {
  display: block;
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  line-height: $line-height-relaxed;
  margin-bottom: $spacing-lg;
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-sm $spacing-xl;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: #FFFFFF;
  border-radius: $radius-round;
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  border: none;
}

// ===================== 总结内容区 =====================
.summary-content {
  padding: 0 $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

// ===================== Section 通用 =====================
.section {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
}

.section-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.section-icon {
  font-size: $font-size-lg;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  flex: 1;
}

.section-count {
  font-size: $font-size-xs;
  color: $color-primary-light;
  background: rgba($color-primary, 0.15);
  padding: 4rpx 14rpx;
  border-radius: $radius-round;

  &.accent {
    color: $color-warning;
    background: rgba($color-warning, 0.15);
  }
}

// ===================== 课堂概览 =====================
.overview-text {
  font-size: $font-size-md;
  color: $color-text-secondary;
  line-height: $line-height-relaxed;
}

// ===================== 核心知识点 =====================
.key-points-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.key-point-card {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-elevated;
  border-radius: $radius-md;
  border-left: 4rpx solid $color-primary;
}

.key-point-index {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba($color-primary, 0.15);
  color: $color-primary-light;
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: $font-family-mono;
}

.key-point-body {
  flex: 1;
}

.key-point-title {
  display: block;
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.key-point-desc {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: $line-height-relaxed;
}

// ===================== 标记的疑问 =====================
.follow-up-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.follow-up-card {
  background: $color-bg-elevated;
  border-radius: $radius-md;
  border-left: 4rpx solid $color-warning;
  overflow: hidden;
  transition: all $transition-normal;
}

.follow-up-collapsed {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  cursor: pointer;
}

.follow-up-badge {
  flex-shrink: 0;
  font-size: $font-size-xs;
  color: $color-warning;
  background: rgba($color-warning, 0.12);
  padding: 4rpx 14rpx;
  border-radius: $radius-round;
  font-weight: $font-weight-medium;
}

.follow-up-preview {
  flex: 1;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-up-arrow {
  flex-shrink: 0;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.follow-up-expanded {
  padding: 0 $spacing-md $spacing-md;
}

.follow-up-divider {
  height: 1px;
  background: $color-border;
  margin-bottom: $spacing-md;
}

.follow-up-block {
  margin-bottom: $spacing-md;

  &:last-child {
    margin-bottom: 0;
  }
}

.follow-up-block-label {
  display: block;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.follow-up-block-text {
  display: block;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: $line-height-relaxed;

  &.ai-explain {
    color: $color-primary-light;
  }
}

.related-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-top: $spacing-xs;
}

.related-tag {
  font-size: $font-size-xs;
  color: $color-secondary;
  background: rgba($color-secondary, 0.1);
  padding: 4rpx 14rpx;
  border-radius: $radius-round;
  border: 1px solid rgba($color-secondary, 0.2);
}

// ===================== 空标记提示 =====================
.empty-markers {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl 0;
}

.empty-markers-icon {
  font-size: 64rpx;
  margin-bottom: $spacing-sm;
  opacity: 0.5;
}

.empty-markers-text {
  font-size: $font-size-md;
  color: $color-text-secondary;
  margin-bottom: $spacing-xs;
}

.empty-markers-hint {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

// ===================== 学习建议 =====================
.suggestions-text {
  font-size: $font-size-md;
  color: $color-text-secondary;
  line-height: $line-height-relaxed;
  white-space: pre-line;
}

// ===================== 保存按钮区 =====================
.save-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-md 0;
}

.save-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border-radius: $radius-round;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-glow-primary;

  &[disabled] {
    opacity: 0.6;
  }
}

.save-btn-text {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: #FFFFFF;
}

.save-hint {
  margin-top: $spacing-sm;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

// ===================== 底部留白 =====================
.bottom-spacer {
  height: 32rpx;
}

// ===================== 固定底部操作栏 =====================
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc($spacing-md + $safe-area-bottom-env);
  background: linear-gradient(transparent, $color-bg-primary 30%);
  display: flex;
  gap: $spacing-sm;
}

.bottom-btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-round;
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &.primary {
    background: linear-gradient(135deg, $color-primary, $color-primary-dark);
    color: #FFFFFF;
    box-shadow: $shadow-glow-primary;
  }

  &.secondary {
    background: $color-bg-elevated;
    color: $color-text-secondary;
    border: 1px solid $color-border;
  }
}
</style>
