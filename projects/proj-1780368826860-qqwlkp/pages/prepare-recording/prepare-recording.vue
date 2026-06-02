<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav">
      <view class="nav__status-bar" />
      <view class="nav__bar">
        <text class="nav__back" @click="goBack">← 返回</text>
        <text class="nav__title">准备录音</text>
        <view class="nav__placeholder" />
      </view>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false" :enhanced="true">
      <!-- 课程信息卡片 -->
      <view class="card course-info">
        <view class="course-info__color" :style="{ backgroundColor: themeColor }" />
        <view class="course-info__body">
          <text class="course-info__name">{{ course?.name || sessionStore.courseTitle || '未选择课程' }}</text>
          <view class="course-info__details">
            <text class="course-info__subject">
              {{ subjectLabel }}
            </text>
            <text v-if="course?.instructor" class="course-info__instructor">
              {{ course.instructor }}
            </text>
          </view>
          <view v-if="course?.schedule" class="course-info__schedule">
            <text class="course-info__schedule-text">🕐 {{ course.schedule }}</text>
            <text v-if="course?.room" class="course-info__room-text">📍 {{ course.room }}</text>
          </view>
        </view>
      </view>

      <!-- 录音设备状态 -->
      <view class="card device-card">
        <text class="card__label">录音设备</text>
        <view class="device-card__row">
          <view class="device-card__icon-wrap" :class="{ 'device-card__icon-wrap--active': recorderStore.micPermission }">
            <text class="device-card__icon">🎤</text>
          </view>
          <view class="device-card__info">
            <text class="device-card__name">{{ recorderStore.currentDevice.name }}</text>
            <text
              class="device-card__status"
              :class="recorderStore.micPermission ? 'text-success' : 'text-warning'"
            >
              {{ recorderStore.micPermission ? '已授权' : '未授权' }}
            </text>
          </view>
          <view v-if="!recorderStore.micPermission" class="device-card__action">
            <text class="device-card__grant-link" @click="requestMicPermission">授权</text>
          </view>
        </view>

        <!-- 权限拒绝降级提示 -->
        <view v-if="showPermissionGuide" class="permission-guide">
          <text class="permission-guide__text">
            需要麦克风权限才能录音。请前往系统设置开启权限。
          </text>
          <text class="permission-guide__btn" @click="openSystemSettings">前往设置</text>
        </view>
      </view>

      <!-- 录音模式 -->
      <view class="card mode-card">
        <text class="card__label">录音模式</text>
        <view class="option-group">
          <view
            v-for="mode in recordingModes"
            :key="mode.value"
            class="option-item"
            :class="{ 'option-item--active': selectedMode === mode.value }"
            @click="selectedMode = mode.value"
          >
            <text class="option-item__icon">{{ mode.icon }}</text>
            <view class="option-item__text">
              <text class="option-item__name">{{ mode.label }}</text>
              <text class="option-item__desc">{{ mode.desc }}</text>
            </view>
            <view v-if="selectedMode === mode.value" class="option-item__check">✓</view>
          </view>
        </view>
      </view>

      <!-- 语言选择 -->
      <view class="card language-card">
        <text class="card__label">课堂语言</text>
        <view class="option-group--inline">
          <view
            v-for="lang in languages"
            :key="lang.value"
            class="option-chip"
            :class="{ 'option-chip--active': selectedLanguage === lang.value }"
            @click="selectedLanguage = lang.value"
          >
            <text class="option-chip__text">{{ lang.label }}</text>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="content-spacer" />
    </scroll-view>

    <!-- 底部开始按钮 + 麦克风权限检查 -->
    <view class="footer">
      <!-- 未授权时显示权限申请按钮 -->
      <view v-if="!recorderStore.micPermission" class="footer__permission-bar">
        <text class="footer__permission-text">请先授权麦克风权限</text>
      </view>

      <button
        class="btn-start"
        :class="{ 'btn-start--loading': isStarting }"
        :disabled="!canStart || isStarting"
        @click="startLiveRecording"
      >
        <text v-if="isStarting" class="btn-start__loading-text">正在准备...</text>
        <text v-else>开始实时录音</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRecorderStore } from '@/stores/recorder'
import { useSessionStore } from '@/stores/session'
import { getMockCourses, SUBJECT_LABELS, SUBJECT_LABELS_EN, COURSE_COLORS, type Course } from '@/types/course'

const recorderStore = useRecorderStore()
const sessionStore = useSessionStore()

// ---------- 路由参数 ----------
const courseId = ref('')

// ---------- 课程信息 ----------
const course = ref<Course | null>(null)
const themeColor = computed(() => {
  if (!course.value) return '#6C63FF'
  return COURSE_COLORS[course.value.color] || '#6C63FF'
})
const subjectLabel = computed(() => {
  if (!course.value) return ''
  // 根据语言显示
  if (selectedLanguage.value === 'zh-CN') {
    return SUBJECT_LABELS[course.value.subject] || course.value.subject
  }
  return SUBJECT_LABELS_EN[course.value.subject] || course.value.subject
})

// ---------- 录音设置 ----------
const recordingModes = [
  {
    value: 'standard' as const,
    label: '标准模式',
    desc: '适合安静课堂环境',
    icon: '📝',
  },
  {
    value: 'noise_cancellation' as const,
    label: '降噪模式',
    desc: '过滤环境噪音，专注人声',
    icon: '🔇',
  },
  {
    value: 'professional' as const,
    label: '专业模式',
    desc: '高保真录音，支持多重处理',
    icon: '🎙️',
  },
]

const languages = [
  { value: 'en-US', label: 'English' },
  { value: 'zh-CN', label: '中文' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
]

const selectedMode = ref<'standard' | 'noise_cancellation' | 'professional'>('standard')
const selectedLanguage = ref('en-US')

// ---------- 麦克风权限 ----------
const showPermissionGuide = ref(false)

// ---------- 状态 ----------
const isStarting = ref(false)

// ---------- 计算属性 ----------
const canStart = computed(() => {
  return recorderStore.micPermission && !!course.value
})

// ---------- 生命周期 ----------
onMounted(async () => {
  // 读取路由参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  courseId.value = options.courseId || ''

  // 加载课程数据
  loadCourseData()

  // 检查麦克风权限
  await checkPermission()

  // 同步 recorder store 配置
  recorderStore.updateConfig({
    mode: selectedMode.value,
    language: selectedLanguage.value,
  })
})

// 监听配置变化，同步到 store
watch([selectedMode, selectedLanguage], ([mode, lang]) => {
  recorderStore.updateConfig({ mode, language: lang })
})

// ---------- 方法 ----------

async function checkPermission() {
  // 如果已经知道有权限，直接返回
  if (recorderStore.micPermission) return

  // 尝试静默检查（不弹系统弹窗）
  try {
    const granted = await recorderStore.requestMicPermission()
    showPermissionGuide.value = !granted
  } catch {
    showPermissionGuide.value = true
  }
}

async function requestMicPermission() {
  showPermissionGuide.value = false
  await recorderStore.requestMicPermission()
  // 如果还是拒绝，显示引导
  if (!recorderStore.micPermission) {
    showPermissionGuide.value = true
  }
}

function openSystemSettings() {
  uni.openSetting({
    success: (res) => {
      if (res.authSetting['scope.record']) {
        recorderStore.micPermission = true
        recorderStore.recorderState = 'ready'
        showPermissionGuide.value = false
      }
    },
  })
}

function loadCourseData() {
  if (courseId.value) {
    // 从 mock 数据中查找
    const courses = getMockCourses()
    course.value = courses.find((c) => c.id === courseId.value) || null
  }

  // 如果没有找到课程，使用 session store 中的信息
  if (!course.value && sessionStore.courseTitle) {
    course.value = {
      id: '',
      name: sessionStore.courseTitle,
      subject: (sessionStore.courseSubject as any) || 'other',
      color: 'purple',
      instructor: '',
      semester: '',
      schedule: '',
      room: '',
      totalSessions: 0,
      completedSessions: 0,
      pendingReviews: 0,
      lastSessionDate: null,
      isArchived: false,
      createdAt: '',
    }
  }

  // 同步语言首选项
  if (sessionStore.courseLanguage) {
    selectedLanguage.value = sessionStore.courseLanguage
  }
}

async function startLiveRecording() {
  if (!canStart.value || isStarting.value) return
  if (!course.value) {
    uni.showToast({ title: '请先选择课程', icon: 'none' })
    return
  }

  isStarting.value = true

  try {
    // 1. 创建会话 (POST /api/sessions)
    await sessionStore.createSession({
      courseId: course.value.id,
      courseSubject: course.value.subject,
      courseTitle: course.value.name,
      language: selectedLanguage.value,
      mode: selectedMode.value,
    })

    // 2. 同步录音配置
    recorderStore.updateConfig({
      mode: selectedMode.value,
      language: selectedLanguage.value,
    })

    // 3. 跳转到实时转写页
    uni.navigateTo({
      url: '/pages/live-transcription/live-transcription',
    })
  } catch (err: any) {
    uni.showToast({
      title: err.message || '启动录音失败',
      icon: 'none',
    })
  } finally {
    isStarting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
  display: flex;
  flex-direction: column;
}

/* ---- 自定义导航栏 ---- */
.nav {
  background-color: $color-bg-secondary;
}

.nav__status-bar {
  height: var(--status-bar-height);
}

.nav__bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-lg;
}

.nav__back {
  font-size: $font-size-md;
  color: $color-primary;
  min-width: 120rpx;
}

.nav__title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.nav__placeholder {
  min-width: 120rpx;
}

/* ---- 内容区 ---- */
.content {
  flex: 1;
  padding: $spacing-lg;
}

.content-spacer {
  height: 200rpx;
}

/* ---- 卡片 ---- */
.card {
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  margin-bottom: $spacing-md;
  box-shadow: $shadow-sm;
}

.card__label {
  display: block;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  margin-bottom: $spacing-md;
}

/* ---- 课程信息卡片 ---- */
.course-info {
  display: flex;
  overflow: hidden;
  padding: 0;

  &__color {
    width: 8rpx;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__name {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
    color: $color-text-primary;
    line-height: $line-height-tight;
  }

  &__details {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__subject {
    font-size: $font-size-sm;
    color: $color-primary;
    background-color: rgba($color-primary, 0.1);
    padding: 4rpx 16rpx;
    border-radius: $radius-round;
  }

  &__instructor {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  &__schedule {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    margin-top: $spacing-xs;
  }

  &__schedule-text,
  &__room-text {
    font-size: $font-size-sm;
    color: $color-text-tertiary;
  }
}

/* ---- 设备卡片 ---- */
.device-card__row {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.device-card__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-round;
  background-color: $color-bg-elevated;
  display: flex;
  align-items: center;
  justify-content: center;

  &--active {
    background-color: rgba($color-success, 0.15);
  }
}

.device-card__icon {
  font-size: $font-size-xxl;
}

.device-card__info {
  flex: 1;
}

.device-card__name {
  display: block;
  font-size: $font-size-md;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.device-card__status {
  font-size: $font-size-sm;
}

.device-card__action {
  padding: $spacing-xs $spacing-md;
}

.device-card__grant-link {
  font-size: $font-size-sm;
  color: $color-primary;
  font-weight: $font-weight-semibold;
}

/* ---- 权限降级引导 ---- */
.permission-guide {
  margin-top: $spacing-md;
  padding: $spacing-md;
  background-color: rgba($color-warning, 0.1);
  border-radius: $radius-md;
  border: 1rpx solid rgba($color-warning, 0.2);
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.permission-guide__text {
  font-size: $font-size-sm;
  color: $color-warning;
  line-height: $line-height-normal;
}

.permission-guide__btn {
  font-size: $font-size-sm;
  color: $color-primary;
  font-weight: $font-weight-semibold;
  text-decoration: underline;
  align-self: flex-start;
}

/* ---- 选项组（纵向） ---- */
.option-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.option-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  border-radius: $radius-md;
  background-color: $color-bg-elevated;
  border: 2rpx solid transparent;
  transition: border-color $transition-fast, background-color $transition-fast;

  &--active {
    border-color: $color-primary;
    background-color: rgba($color-primary, 0.08);
  }

  &__icon {
    font-size: $font-size-xl;
  }

  &__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
  }

  &__check {
    width: 40rpx;
    height: 40rpx;
    border-radius: $radius-round;
    background-color: $color-primary;
    color: #FFFFFF;
    font-size: $font-size-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: $font-weight-bold;
  }
}

/* ---- 选项组（横向 chip） ---- */
.option-group--inline {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.option-chip {
  padding: $spacing-xs $spacing-lg;
  border-radius: $radius-round;
  background-color: $color-bg-elevated;
  border: 2rpx solid transparent;
  transition: all $transition-fast;

  &--active {
    border-color: $color-primary;
    background-color: rgba($color-primary, 0.12);
  }

  &__text {
    font-size: $font-size-md;
    color: $color-text-secondary;

    .option-chip--active & {
      color: $color-primary;
      font-weight: $font-weight-semibold;
    }
  }
}

/* ---- 底部 ---- */
.footer {
  padding: $spacing-lg;
  padding-bottom: calc($spacing-lg + env(safe-area-inset-bottom));
  background: linear-gradient(transparent 0%, $color-bg-primary 30%);
}

.footer__permission-bar {
  text-align: center;
  margin-bottom: $spacing-md;
}

.footer__permission-text {
  font-size: $font-size-sm;
  color: $color-warning;
}

.btn-start {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: #FFFFFF;
  border-radius: $radius-round;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  box-shadow: $shadow-glow-primary;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-normal;

  &:active:not([disabled]) {
    transform: scale(0.97);
    opacity: 0.9;
  }

  &[disabled] {
    opacity: 0.4;
  }

  &--loading {
    opacity: 0.7;
  }

  &__loading-text {
    opacity: 0.9;
  }
}
</style>
