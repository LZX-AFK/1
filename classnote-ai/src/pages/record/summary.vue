<template>
  <view class="page">
    <view class="safe-top" />
    <view class="navbar">
      <text class="navbar__back" @tap="uni.navigateBack()">‹</text>
      <text class="navbar__title">{{ t('summary.title') }}</text>
      <view class="navbar__placeholder" />
    </view>

    <!-- 骨架屏：首次进入时短暂展示 -->
    <view v-if="isLoading" class="skeleton">
      <view class="skeleton__bar skeleton__bar--wide" />
      <view class="skeleton__card">
        <view class="skeleton__line" />
        <view class="skeleton__line skeleton__line--short" />
        <view class="skeleton__line" />
      </view>
      <view class="skeleton__card">
        <view class="skeleton__line skeleton__line--short" />
        <view class="skeleton__line" />
      </view>
    </view>

    <scroll-view v-else scroll-y class="scroll content-fade-in">
      <!-- 总结超时通知 -->
      <view v-if="summaryTimedOut" class="timeout-banner">
        <text class="timeout-banner__icon">⏱</text>
        <text class="timeout-banner__text">AI 总结生成超时，以下为本地缓存内容，稍后可刷新重试。</text>
      </view>
      <!-- 本地保存通知 -->
      <view v-if="localSaved" class="saved-banner">
        <text class="saved-banner__icon">💾</text>
        <text class="saved-banner__text">录音已离线保存，网络恢复后将自动上传。</text>
      </view>
      <!-- 录音信息条 -->
      <view class="info-bar">
        <text class="info-bar__text">{{ formatDuration(elapsed) }} · {{ marks.length || 4 }} marks · Accuracy: {{ accuracy }}%</text>
      </view>

      <!-- 课堂总结 -->
      <AISummarySection title="课堂总结" icon="📋" :default-open="true" class="section">
        <text class="summary-text">本节课主要讲解了细胞分裂的基本过程，重点包括有丝分裂各阶段的特征与减数分裂的关键步骤，以及两种分裂方式的本质区别。</text>
      </AISummarySection>

      <!-- 结构化笔记 -->
      <AISummarySection title="结构化笔记" icon="📌" :default-open="true" class="section">
        <view v-for="topic in mockTopics" :key="topic.title" class="topic">
          <text class="topic__title">📌 {{ topic.title }}</text>
          <text v-for="pt in topic.points" :key="pt" class="topic__point">• {{ pt }}</text>
        </view>
      </AISummarySection>

      <!-- 你的标记重点 -->
      <AISummarySection title="你的标记重点" icon="🔖" :default-open="true" :highlighted="true" class="section">
        <view v-if="marks.length > 0" class="mark-list">
          <TimelineMark
            v-for="m in marks"
            :key="m.id"
            :mark="m"
            :show-actions="true"
            @explain="mockExplain(m)"
            @play="uni.showToast({ title: 'Mock 播放', icon: 'none' })"
            @review="uni.showToast({ title: '已加入复习', icon: 'success' })"
          />
        </view>
        <view v-else class="mark-list">
          <TimelineMark v-for="m in mockMarks" :key="m.id" :mark="m" :show-actions="true" @explain="mockExplain(m)" @play="uni.showToast({ title: 'Mock 播放', icon: 'none' })" @review="uni.showToast({ title: '已加入复习', icon: 'success' })" />
        </view>
      </AISummarySection>

      <!-- Personalized -->
      <AISummarySection title="Personalized for You" icon="🌟" :default-open="true" :accent="true" class="section">
        <view class="profile-info">
          <text class="profile-info__item">🏫 Major: {{ profile.major }}</text>
          <text class="profile-info__item">🗣️ Native: {{ profile.nativeLanguage }}</text>
          <text class="profile-info__item">📊 English: {{ profile.englishLevel }}</text>
          <text class="profile-info__item">🎯 Goal: {{ profile.studyGoal }}</text>
        </view>
        <text class="adapted-title">AI has adapted this summary:</text>
        <view class="adapted-list">
          <text class="adapted-item">✅ Simplified complex concepts</text>
          <text class="adapted-item">✅ Kept "mitosis/meiosis" in English</text>
          <text class="adapted-item">✅ Expanded all marked parts</text>
          <text class="adapted-item">✅ Generated exam-style questions</text>
        </view>
      </AISummarySection>

      <!-- 考试重点预测 -->
      <AISummarySection title="考试重点预测" icon="🎯" :collapsible="true" :default-open="false" class="section">
        <text class="exam-point">• Mitosis vs Meiosis 对比</text>
        <text class="exam-point">• 染色体复制机制</text>
        <text class="exam-point">• 减数分裂各阶段特征</text>
        <text class="exam-point">⚠️ 易错点: 减数分裂阶段混淆</text>
      </AISummarySection>

      <!-- 关键术语 -->
      <AISummarySection title="关键术语" icon="📖" :collapsible="true" :default-open="false" class="section">
        <view class="terms-grid">
          <view v-for="term in terms" :key="term.en" class="term-card">
            <text class="term-card__en">{{ term.en }}</text>
            <text class="term-card__zh">{{ term.zh }}</text>
          </view>
        </view>
      </AISummarySection>

      <!-- 复习任务 -->
      <AISummarySection title="复习任务" icon="✅" :default-open="true" class="section">
        <view v-for="(task, i) in reviewTasks" :key="i" class="review-task" @tap="task.done = !task.done">
          <text class="review-task__check">{{ task.done ? '☑' : '☐' }}</text>
          <text :class="['review-task__text', task.done ? 'done' : '']">{{ task.text }}</text>
        </view>
      </AISummarySection>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view class="footer__btn" @tap="uni.showToast({ title: '分享功能即将上线', icon: 'none' })">
        <text>📤 Share</text>
      </view>
      <view class="footer__btn footer__btn--primary" @tap="saveToKB">
        <text>📥 Save to KB</text>
      </view>
      <view class="footer__btn" @tap="uni.showToast({ title: '笔记功能即将上线', icon: 'none' })">
        <text>📝 Note</text>
      </view>
      <view class="footer__safe" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useRecordStore } from '@/stores/useRecordStore'
import { useUserStore } from '@/stores/useUserStore'
import type { TimelineMarkItem } from '@/types/index'

const { t } = useI18n()
const recordStore = useRecordStore()
const { marks, accuracy, elapsed, summaryTimedOut, localSaved } = storeToRefs(recordStore)
const { profile } = storeToRefs(useUserStore())

const isLoading = ref(true)
onMounted(() => {
  setTimeout(() => { isLoading.value = false }, 600)
})

function formatDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

const mockTopics = [
  { title: 'Cell Division Overview', points: ['有丝分裂：体细胞增殖', '减数分裂：配子形成', '细胞周期：G1→S→G2→M'] },
  { title: 'Mitosis Phases', points: ['Prophase: 核膜消失，染色体浓缩', 'Metaphase: 染色体排列于赤道板', 'Anaphase: 着丝点分裂', 'Telophase: 核膜重建'] },
]

const mockMarks: TimelineMarkItem[] = [
  { id: 'mk-001', recordingId: 'rec-001', timestamp: 525, type: 'unclear', excerpt: '...the difference between meiosis I and meiosis II is that...', aiExplanation: undefined },
  { id: 'mk-002', recordingId: 'rec-001', timestamp: 1112, type: 'examPoint', excerpt: '...this process is key for understanding genetic variation...', aiExplanation: undefined },
]

const terms = [
  { en: 'Mitosis', zh: '有丝分裂' },
  { en: 'Meiosis', zh: '减数分裂' },
  { en: 'Chromosome', zh: '染色体' },
  { en: 'Centromere', zh: '着丝点' },
]

const reviewTasks = ref([
  { text: '今天复习 10 分钟', done: false },
  { text: '完成 5 张 AI flashcards', done: false },
  { text: '回看 2 个标记片段', done: false },
])

function mockExplain(mark: TimelineMarkItem) {
  uni.showToast({ title: '加载 AI 解析...', icon: 'none' })
  setTimeout(() => { mark.aiExplanation = 'AI 解析：这个概念需要特别注意——减数分裂 I 和 II 的关键区别在于同源染色体的分离时机。' }, 1000)
}

function saveToKB() {
  uni.showToast({ title: '已保存到知识库', icon: 'success' })
}
</script>

<style scoped lang="scss">
// ── 骨架屏 ──────────────────────────────────────────────────────
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  flex: 1; padding: $spacing-md $spacing-lg; display: flex; flex-direction: column; gap: $spacing-md;
  &__bar { height: 24rpx; border-radius: $radius-round; background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%); background-size: 200%; animation: shimmer 1.5s infinite; &--wide { width: 60%; } }
  &__card { background: $color-bg-card; border-radius: $radius-2xl; padding: $spacing-md $spacing-lg; display: flex; flex-direction: column; gap: $spacing-sm; }
  &__line { height: 20rpx; border-radius: $radius-round; background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%); background-size: 200%; animation: shimmer 1.5s infinite; &--short { width: 55%; } }
}
// ── 内容淡入 ────────────────────────────────────────────────────
@keyframes fadeIn { from { opacity: 0; transform: translateY(8rpx); } to { opacity: 1; transform: translateY(0); } }
.content-fade-in { animation: fadeIn 0.3s ease; }

.page { min-height: 100vh; background: $color-bg-page; display: flex; flex-direction: column; }
.safe-top { height: var(--status-bar-height, 44px); }
.safe-bottom { height: calc(160rpx + env(safe-area-inset-bottom)); }
.navbar {
  display: flex; align-items: center; padding: $spacing-sm $spacing-lg; background: $color-bg-card;
  &__back { font-size: 60rpx; color: $color-primary; margin-right: $spacing-sm; line-height: 1; }
  &__title { flex: 1; font-size: $font-size-xl; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__placeholder { width: 60rpx; }
}
.scroll { flex: 1; }
.timeout-banner {
  display: flex; align-items: flex-start; gap: $spacing-xs;
  background: #FEF3C7; padding: $spacing-sm $spacing-lg;
  &__icon { font-size: 28rpx; flex-shrink: 0; }
  &__text { font-size: $font-size-sm; color: #92400E; line-height: $line-height-normal; }
}
.saved-banner {
  display: flex; align-items: flex-start; gap: $spacing-xs;
  background: #EEF2FF; padding: $spacing-sm $spacing-lg;
  &__icon { font-size: 28rpx; flex-shrink: 0; }
  &__text { font-size: $font-size-sm; color: $color-primary; line-height: $line-height-normal; }
}
.info-bar {
  background: #F9FAFB; padding: $spacing-sm $spacing-lg;
  border-bottom: 1rpx solid #F0F0F5;
  &__text { font-size: $font-size-sm; color: $color-text-secondary; }
}
.section { margin: $spacing-md $spacing-lg 0; }
.summary-text { font-size: $font-size-md; color: $color-text-primary; line-height: $line-height-relaxed; }
.topic { margin-bottom: $spacing-md; &__title { font-size: $font-size-md; font-weight: $font-weight-semibold; color: $color-text-primary; display: block; margin-bottom: $spacing-xs; } &__point { font-size: $font-size-sm; color: $color-text-secondary; display: block; margin-left: $spacing-md; line-height: $line-height-normal; } }
.mark-list { display: flex; flex-direction: column; gap: $spacing-sm; }
.profile-info { background: #F9FAFB; border-radius: $radius-lg; padding: $spacing-sm $spacing-md; margin-bottom: $spacing-sm; display: flex; flex-direction: column; gap: 4rpx; &__item { font-size: $font-size-sm; color: $color-text-primary; } }
.adapted-title { font-size: $font-size-sm; font-weight: $font-weight-medium; color: $color-accent; display: block; margin-bottom: $spacing-xs; }
.adapted-list { display: flex; flex-direction: column; gap: 4rpx; }
.adapted-item { font-size: $font-size-sm; color: $color-text-primary; }
.exam-point { font-size: $font-size-sm; color: $color-text-primary; display: block; padding: $spacing-xs 0; line-height: $line-height-normal; }
.terms-grid { display: flex; flex-wrap: wrap; gap: $spacing-sm; }
.term-card { background: #F9FAFB; border-radius: $radius-md; padding: $spacing-sm $spacing-md; min-width: 160rpx; &__en { font-size: $font-size-md; font-weight: $font-weight-semibold; color: $color-primary; display: block; } &__zh { font-size: $font-size-sm; color: $color-text-secondary; display: block; } }
.review-task { display: flex; align-items: center; gap: $spacing-sm; padding: $spacing-xs 0; &__check { font-size: 36rpx; color: $color-primary; } &__text { font-size: $font-size-md; color: $color-text-primary; &.done { color: $color-text-tertiary; text-decoration: line-through; } } }
.footer {
  position: fixed; bottom: 0; left: 0; right: 0; background: $color-bg-card;
  border-top: 1rpx solid #F0F0F5; padding: $spacing-sm $spacing-lg;
  display: flex; gap: $spacing-sm; align-items: center;
  &__btn {
    flex: 1; height: 88rpx; border-radius: $radius-lg; display: flex; align-items: center; justify-content: center;
    background: #F3F4F6; font-size: $font-size-sm; color: $color-text-secondary;
    &--primary { background: $color-primary; color: #fff; }
  }
  &__safe { height: env(safe-area-inset-bottom); }
}
</style>
