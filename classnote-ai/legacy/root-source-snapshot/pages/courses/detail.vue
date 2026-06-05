<template>
  <!-- Loading -->
  <view v-if="status === 'loading'" class="cd-loading">
    <view class="cd-nav"><view class="cd-nav-skel" /></view>
    <view class="cd-hdr-skel" />
    <view class="cd-tab-skel" />
    <view v-for="i in 3" :key="i" class="cd-card-skel" />
  </view>

  <!-- Error -->
  <view v-else-if="status === 'error'" class="cd-error">
    <view class="cd-nav" @click="goBack"><text class="cd-nav-back">← {{ $t('common.back') }}</text></view>
    <view class="cd-error-bar" @click="retry"><text>{{ $t('courseDetail.error') }}</text></view>
  </view>

  <!-- Empty: no course -->
  <view v-else-if="status === 'empty'">
    <view class="cd-nav" @click="goBack"><text class="cd-nav-back">← {{ $t('common.back') }}</text></view>
    <EmptyState
      icon="📭"
      :title="$t('courseDetail.notFound')"
      :description="$t('courseDetail.notFoundDesc')"
      :actionText="$t('courseDetail.goBackCourses')"
      @action="goBack"
    />
  </view>

  <!-- Normal -->
  <view v-else class="course-detail-page">
    <!-- 1. Top Nav -->
    <view class="cd-nav" @click="goBack">
      <text class="cd-nav-back">← {{ $t('common.back') }}</text>
      <text class="cd-nav-title">{{ courseName }}</text>
    </view>

    <!-- 2. Course Info Header Card -->
    <view class="cd-header">
      <view class="cd-header-top">
        <text class="cd-header-course">{{ courseName }}</text>
        <text class="cd-header-instructor">{{ instructor }}</text>
        <text class="cd-header-meta">{{ courseSchedule }} · {{ courseLocation }}</text>
        <text class="cd-header-term">{{ $t('courseDetail.semester') }}</text>
      </view>
      <view class="cd-stats">
        <view class="cd-stat">
          <text class="cd-stat-num">{{ totalRecordings }}</text>
          <text class="cd-stat-label">{{ $t('common.recording') }}</text>
        </view>
        <view class="cd-stat">
          <text class="cd-stat-num">{{ totalNotes }}</text>
          <text class="cd-stat-label">{{ $t('common.note') }}</text>
        </view>
        <view class="cd-stat">
          <text class="cd-stat-num">{{ totalMarks }}</text>
          <text class="cd-stat-label">{{ $t('common.mark') }}</text>
        </view>
        <view class="cd-stat">
          <text class="cd-stat-num cd-stat-num--green">{{ avgAccuracy }}%</text>
          <text class="cd-stat-label">{{ $t('common.accuracy') }}</text>
        </view>
      </view>
    </view>

    <!-- 3. Tab Bar -->
    <view class="cd-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="cd-tab"
        :class="{ 'cd-tab--active': currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 4. Tab Content -->
    <!-- Recordings Tab -->
    <view v-if="currentTab === 'recordings'" class="cd-content">
      <RecordingCard
        v-for="rec in courseRecordings"
        :key="rec.id"
        :recording="rec"
        @play="handlePlay"
        @transcript="handleTranscript"
        @summary="handleSummary"
        @click="handleSummary"
      />
      <EmptyState
        v-if="!courseRecordings.length"
        icon="🎙️"
        :title="$t('courseDetail.noRecordings')"
        :description="$t('courseDetail.noRecordingsDesc')"
        :actionText="$t('courseDetail.goStartRecording')"
        @action="goRecord"
      />
    </view>

    <!-- Notes Tab -->
    <view v-if="currentTab === 'notes'" class="cd-content">
      <NoteCard
        v-for="note in courseNotes"
        :key="note.id"
        :note="note"
        showCourseName
        @click="handleNoteClick"
      />
      <EmptyState
        v-if="!courseNotes.length"
        icon="📝"
        :title="$t('courseDetail.noNotes')"
        :description="$t('courseDetail.noNotesDesc')"
      />
    </view>

    <!-- Mistakes Tab -->
    <view v-if="currentTab === 'mistakes'" class="cd-content">
      <view v-for="m in courseMistakes" :key="m.id" class="cd-mistake-card" @click="handleMistakeClick">
        <view class="cd-mistake-header">
          <text class="cd-mistake-topic">{{ m.topicLabel }}</text>
          <text class="cd-mistake-status" :class="{ 'cd-mistake-status--done': m.correctAnswer }">
            {{ m.correctAnswer ? $t('courseDetail.statusReviewed') : $t('courseDetail.statusNotMastered') }}
          </text>
        </view>
        <text class="cd-mistake-question">{{ m.question }}</text>
        <view class="cd-mistake-tags">
          <text class="cd-mistake-tag">{{ m.topicLabel }}</text>
        </view>
      </view>
      <EmptyState
        v-if="!courseMistakes.length"
        icon="❌"
        :title="$t('courseDetail.noMistakes')"
        :description="$t('courseDetail.noMistakesDesc')"
      />
    </view>

    <!-- Review Tab -->
    <view v-if="currentTab === 'review'" class="cd-content">
      <view class="cd-review-card">
        <text class="cd-review-title">📋 {{ $t('courseDetail.todayReviewPlan') }}</text>
        <view
          v-for="task in reviewTasks"
          :key="task.id"
          class="cd-review-task"
          @click="toggleTask(task.id)"
        >
          <view class="cd-review-check" :class="{ 'cd-review-check--done': task.completed }">
            <text v-if="task.completed" class="cd-review-check-icon">✓</text>
          </view>
          <text class="cd-review-task-text" :class="{ 'cd-review-task-text--done': task.completed }">{{ task.title }}</text>
        </view>
      </view>
      <view class="cd-weakness-card">
        <text class="cd-weakness-title">⚠️ {{ $t('courseDetail.weaknessAreas') }}</text>
        <view class="cd-weakness-list">
          <text class="cd-weakness-item">Cell Cycle Phases</text>
          <text class="cd-weakness-item">Genetic Expression</text>
          <text class="cd-weakness-item">Chromosome Separation</text>
        </view>
      </view>
      <EmptyState
        v-if="!reviewTasks.length"
        icon="📊"
        :title="$t('courseDetail.noReview')"
        :description="$t('courseDetail.noReviewDesc')"
      />
    </view>

    <!-- Transcript Modal -->
    <view v-if="showTranscript" class="cd-modal-mask" @click="showTranscript = false">
      <view class="cd-modal" @click.stop>
        <view class="cd-modal-header">
          <text class="cd-modal-title">{{ $t('common.transcript') }}</text>
          <text class="cd-modal-close" @click="showTranscript = false">✕</text>
        </view>
        <scroll-view class="cd-modal-body" scroll-y>
          <text class="cd-modal-text">{{ transcriptText }}</text>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useCourseStore } from '@/stores/useCourseStore'

const store = useCourseStore()
const { t } = useI18n()
const courseId = ref('')
const status = ref<'loading' | 'normal' | 'empty' | 'error'>('loading')
const currentTab = ref('recordings')
const showTranscript = ref(false)
const transcriptText = ref('')

const tabs = computed(() => [
  { key: 'recordings', label: t('courseDetail.recordings') },
  { key: 'notes', label: t('courseDetail.notes') },
  { key: 'mistakes', label: t('courseDetail.mistakes') },
  { key: 'review', label: t('courseDetail.review') },
])

const courseData = computed(() => store.getCourseById(courseId.value))
const courseRecordings = computed(() => store.getRecordingsByCourseId(courseId.value))
const courseNotes = computed(() => store.getNotesByCourseId(courseId.value))
const courseMistakes = computed(() => store.getMistakesByCourseId(courseId.value))
const reviewTasks = computed(() => store.getReviewTasksForCourse(courseId.value))

const courseName = computed(() => courseData.value?.name ?? '')
const instructor = computed(() => courseData.value?.instructor ?? '')
const courseSchedule = computed(() => courseData.value?.schedule ?? '')
const courseLocation = computed(() => courseData.value?.location ?? '')
const totalRecordings = computed(() => courseData.value?.totalRecordings ?? 0)
const totalNotes = computed(() => courseData.value?.totalNotes ?? 0)
const totalMarks = computed(() => courseRecordings.value.reduce((s, r) => s + (r.markCount || 0), 0))

const avgAccuracy = computed(() => {
  const recs = courseRecordings.value
  if (!recs.length) return 0
  return Math.round(recs.reduce((s, r) => s + r.accuracy, 0) / recs.length)
})

onLoad((opts: Record<string, string> | undefined) => {
  if (opts?.id) {
    courseId.value = opts.id
  }
  loadData()
})

function loadData() {
  status.value = 'loading'
  setTimeout(() => {
    if (!courseData.value) {
      status.value = 'empty'
      return
    }
    status.value = 'normal'
  }, 500)
}

function retry() {
  loadData()
}

function goBack() {
  uni.navigateBack()
}

function goRecord() {
  uni.switchTab({ url: '/pages/record/prepare' })
}

function handlePlay() {
  uni.showToast({ title: t('courseDetail.playComingSoon'), icon: 'none' })
}

function handleTranscript(rec: { id: string; courseName: string; date: string }) {
  transcriptText.value = `【${rec.courseName} · ${rec.date}】\n\n本节课覆盖了细胞分裂的基础知识，包括间期的 G1/S/G2 子阶段和有丝分裂的四个阶段。重点讨论了 DNA 复制机制和细胞周期检查点调控。讲师在课堂中多次强调了染色体分离过程中纺锤体的重要作用...\n\n[转录文本仅供演示]`
  showTranscript.value = true
}

function handleSummary(rec: { id: string }) {
  uni.navigateTo({ url: `/pages/record/summary?id=${rec.id}` })
}

function handleNoteClick(note: { id: string }) {
  uni.navigateTo({ url: `/pages/record/summary?id=${note.id}` })
}

function handleMistakeClick() {
  uni.showToast({ title: t('courseDetail.mistakeComingSoon'), icon: 'none' })
}

function toggleTask(taskId: string) {
  store.toggleReviewTask(taskId)
}
</script>

<style lang="scss" scoped>
.course-detail-page {
  min-height: 100vh;
  background: #F3F4F6;
  padding: 32rpx;
  padding-top: 0;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Nav */
.cd-nav {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: calc(env(safe-area-inset-top) + 24rpx) 0 24rpx;
}
.cd-nav-back { font-size: 28rpx; color: #4F46E5; }
.cd-nav-title { font-size: 32rpx; font-weight: 700; color: #1F2937; }

/* Loading */
.cd-nav-skel { width: 160rpx; height: 32rpx; background: #E5E7EB; border-radius: 8rpx; }
.cd-hdr-skel { width: 100%; height: 280rpx; background: #E5E7EB; border-radius: 24rpx; margin-top: 16rpx; }
.cd-tab-skel { width: 100%; height: 80rpx; background: #E5E7EB; border-radius: 16rpx; margin-top: 24rpx; }
.cd-card-skel { width: 100%; height: 200rpx; background: #E5E7EB; border-radius: 24rpx; margin-top: 24rpx; }
.cd-loading { padding: 32rpx; padding-bottom: 200rpx; min-height: 100vh; background: #F3F4F6; }

/* Error */
.cd-error { min-height: 100vh; background: #F3F4F6; padding: 32rpx; }
.cd-error-bar { padding: 24rpx; background: #FEE2E2; border-radius: 16rpx; text-align: center; font-size: 28rpx; color: #DC2626; }

/* Header Card */
.cd-header {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 100%;
  box-sizing: border-box;
}
.cd-header-top { display: flex; flex-direction: column; gap: 8rpx; }
.cd-header-course { font-size: 40rpx; font-weight: 700; color: #1F2937; }
.cd-header-instructor { font-size: 28rpx; color: #6B7280; }
.cd-header-meta { font-size: 24rpx; color: #6B7280; }
.cd-header-term { font-size: 24rpx; color: #9CA3AF; margin-top: 4rpx; }

.cd-stats {
  display: flex;
  border-top: 2rpx solid #F3F4F6;
  padding-top: 20rpx;
}
.cd-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.cd-stat-num { font-size: 36rpx; font-weight: 700; color: #1F2937; }
.cd-stat-num--green { color: #10B981; }
.cd-stat-label { font-size: 24rpx; color: #9CA3AF; }

/* Tabs */
.cd-tabs {
  display: flex;
  margin-top: 24rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 8rpx;
  width: 100%;
  box-sizing: border-box;
}
.cd-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 18rpx;
  font-size: 28rpx;
  color: #6B7280;
  transition: all 0.2s;
}
.cd-tab--active {
  background: #4F46E5;
  color: #FFFFFF;
  font-weight: 600;
}

/* Content */
.cd-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 24rpx;
}

/* Mistakes */
.cd-mistake-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  width: 100%;
  box-sizing: border-box;
  &:active { opacity: 0.7; }
}
.cd-mistake-header { display: flex; justify-content: space-between; align-items: center; }
.cd-mistake-topic { font-size: 24rpx; color: #4F46E5; font-weight: 600; }
.cd-mistake-status { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; background: #FEE2E2; color: #DC2626; }
.cd-mistake-status--done { background: #D1FAE5; color: #059669; }
.cd-mistake-question { font-size: 28rpx; color: #1F2937; line-height: 1.5; }
.cd-mistake-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.cd-mistake-tag { font-size: 22rpx; color: #6B7280; background: #F3F4F6; padding: 4rpx 16rpx; border-radius: 20rpx; }

/* Review */
.cd-review-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  width: 100%;
  box-sizing: border-box;
}
.cd-review-title { font-size: 32rpx; font-weight: 700; color: #1F2937; }
.cd-review-task { display: flex; align-items: center; gap: 16rpx; }
.cd-review-check {
  width: 40rpx; height: 40rpx;
  border-radius: 8rpx;
  border: 3rpx solid #D1D5DB;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cd-review-check--done { background: #4F46E5; border-color: #4F46E5; }
.cd-review-check-icon { font-size: 28rpx; color: #FFFFFF; }
.cd-review-task-text { font-size: 28rpx; color: #1F2937; }
.cd-review-task-text--done { color: #9CA3AF; text-decoration: line-through; }

.cd-weakness-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  width: 100%;
  box-sizing: border-box;
}
.cd-weakness-title { font-size: 28rpx; font-weight: 600; color: #1F2937; }
.cd-weakness-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.cd-weakness-item {
  font-size: 24rpx; color: #DC2626; background: #FEF2F2;
  padding: 8rpx 20rpx; border-radius: 20rpx;
}

/* Modal */
.cd-modal-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 999;
}
.cd-modal {
  width: 100%; max-width: 430px;
  max-height: 70vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column;
  box-sizing: border-box;
}
.cd-modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 2rpx solid #F3F4F6;
}
.cd-modal-title { font-size: 32rpx; font-weight: 700; color: #1F2937; }
.cd-modal-close { font-size: 36rpx; color: #6B7280; padding: 8rpx; }
.cd-modal-body { padding: 24rpx 32rpx 48rpx; max-height: 50vh; }
.cd-modal-text { font-size: 28rpx; color: #374151; line-height: 1.8; white-space: pre-wrap; }
</style>
