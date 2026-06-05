<template>
  <view class="record-prepare">
    <!-- 状态：loading -->
    <template v-if="status === 'loading'">
      <view class="rp-nav"><view class="rp-nav__skeleton" /></view>
      <view class="rp-body">
        <view class="rp-skeleton-card" />
        <view class="rp-skeleton-card" />
        <view class="rp-skeleton-card" />
        <view class="rp-skeleton-card" />
      </view>
    </template>

    <!-- 状态：error -->
    <view v-else-if="status === 'error'" class="rp-error-bar">
      <text class="rp-error-bar__text">{{ t('record.error') }}</text>
      <view class="rp-error-bar__btn" @tap="loadData"><text>{{ t('common.retry') }}</text></view>
    </view>

    <!-- 状态：normal / deviceDisconnected / noCourse -->
    <template v-else>
      <!-- 导航栏 -->
      <view class="rp-nav">
        <text class="rp-nav__title">{{ t('record.prepareTitle') }}</text>
      </view>

      <scroll-view class="rp-body" scroll-y enhanced :show-scrollbar="false">
        <!-- 1. 设备状态 -->
        <view class="rp-card">
          <DeviceStatusBar
            :connected="deviceState.connected"
            :battery="deviceState.batteryLevel"
            :mode="deviceState.connected ? t('record.ancEnabled') : ''"
            :clickable="true"
            @click="handleDeviceClick"
          />
          <view v-if="deviceState.connected" class="rp-mic-test">
            <text class="rp-mic-test__icon">✓</text>
            <text class="rp-mic-test__text">{{ t('record.micTest') }}</text>
          </view>
        </view>

        <!-- 2. 课堂信息 -->
        <view class="rp-card">
          <text class="rp-card__title">{{ t('record.lectureInfo') }}</text>
          <view class="rp-row" @tap="openPicker('course')">
            <text class="rp-row__label">{{ t('record.course') }}</text>
            <text class="rp-row__value">{{ selectedCourseName || t('record.selectCoursePlaceholder') }}</text>
            <text class="rp-row__arrow">›</text>
          </view>
          <view class="rp-row rp-row--divider">
            <text class="rp-row__label">{{ t('record.lectureTitle') }}</text>
            <input
              class="rp-row__input"
              :value="localConfig.lectureTitle"
              :placeholder="t('record.lectureTitlePlaceholder')"
              @input="onLectureTitleInput"
            />
          </view>
        </view>

        <!-- 3. 语言设置 -->
        <view class="rp-card">
          <text class="rp-card__title">{{ t('record.languageSettings') }}</text>
          <view class="rp-row" @tap="openPicker('lectureLanguage')">
            <text class="rp-row__label">{{ t('record.lectureLanguage') }}</text>
            <text class="rp-row__value">{{ lectureLanguageLabel }}</text>
            <text class="rp-row__arrow">›</text>
          </view>
          <view class="rp-row rp-row--divider" @tap="openPicker('summaryLanguage')">
            <text class="rp-row__label">{{ t('record.summaryLanguage') }}</text>
            <text class="rp-row__value">{{ summaryLanguageLabel }}</text>
            <text class="rp-row__arrow">›</text>
          </view>
          <view class="rp-row rp-row--divider">
            <view class="rp-row__left">
              <text class="rp-row__label">{{ t('record.keepTerms') }}</text>
              <text class="rp-row__hint">{{ t('record.keepTermsHint') }}</text>
            </view>
            <switch
              :checked="localConfig.keepTermsInEnglish"
              color="#4F46E5"
              @change="onKeepTermsChange"
            />
          </view>
        </view>

        <!-- 4. 录音设置 -->
        <view class="rp-card">
          <text class="rp-card__title">{{ t('record.recordingSettings') }}</text>
          <view class="rp-row" @tap="openPicker('recordingMode')">
            <text class="rp-row__label">{{ t('record.transcriptMode') }}</text>
            <text class="rp-row__value">{{ recordingModeLabel }}</text>
            <text class="rp-row__arrow">›</text>
          </view>
          <view class="rp-row rp-row--divider" @tap="openPicker('noteStyle')">
            <text class="rp-row__label">{{ t('record.noteStyle') }}</text>
            <text class="rp-row__value">{{ noteStyleLabel }}</text>
            <text class="rp-row__arrow">›</text>
          </view>
        </view>

        <!-- 5. 提示卡片 -->
        <view class="rp-tip">
          <text class="rp-tip__icon">💡</text>
          <text class="rp-tip__text">{{ t('record.tipText') }}</text>
        </view>

        <!-- 6. 按钮区域占位 -->
        <view class="rp-btn-spacer" />
      </scroll-view>

      <!-- 底部开始按钮（固定） -->
      <view class="rp-footer">
        <view
          class="rp-btn"
          :class="{ 'rp-btn--disabled': !canStart }"
          @tap="handleStart"
        >
          <text v-if="!canStart && !deviceState.connected" class="rp-btn__hint">{{ t('record.deviceDisconnected') }}</text>
          <text v-else-if="!canStart && !localConfig.courseId" class="rp-btn__hint">{{ t('record.noCourse') }}</text>
          <text v-else class="rp-btn__text">{{ t('record.startButton') }}</text>
        </view>
      </view>
    </template>

    <!-- 选择器弹窗 -->
    <view v-if="pickerVisible" class="rp-overlay" @tap="closePicker">
      <view v-if="pickerVisible" class="rp-picker" @tap.stop>
        <view class="rp-picker__header">
          <text class="rp-picker__title">{{ pickerTitle }}</text>
          <text class="rp-picker__close" @tap="closePicker">✕</text>
        </view>
        <scroll-view class="rp-picker__body" scroll-y>
          <view
            v-for="(opt, idx) in pickerOptions"
            :key="idx"
            class="rp-picker__item"
            :class="{ 'rp-picker__item--active': opt.value === pickerSelected }"
            @tap="onPickerSelect(opt.value)"
          >
            <text class="rp-picker__item-text">{{ opt.label }}</text>
            <text v-if="opt.value === pickerSelected" class="rp-picker__item-check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RecordingConfig } from '@/types'
import { useCourseStore } from '@/stores/useCourseStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useRecordStore } from '@/stores/useRecordStore'
import DeviceStatusBar from '@/components/DeviceStatusBar.vue'

const { t } = useI18n()
const courseStore = useCourseStore()
const deviceStore = useDeviceStore()
const recordStore = useRecordStore()

// --- 状态 ---
type PageStatus = 'loading' | 'normal' | 'deviceDisconnected' | 'noCourse' | 'error'
const status = ref<PageStatus>('loading')

// --- 本地配置 ---
const localConfig = reactive<RecordingConfig>({
  courseId: 'c1',
  lectureTitle: '细胞分裂',
  lectureLanguage: 'English',
  summaryLanguage: '中文',
  keepTermsInEnglish: true,
  recordingMode: 'lecture',
  noteStyle: 'balanced',
})

// --- 设备状态 ---
const deviceState = computed(() => deviceStore.state)

// --- 课程名 ---
const courses = computed(() => courseStore.courses)
const selectedCourseName = computed(() => {
  return courses.value.find(c => c.id === localConfig.courseId)?.name || ''
})

// --- 选择器 ---
type PickerType = 'course' | 'lectureLanguage' | 'summaryLanguage' | 'recordingMode' | 'noteStyle'
const pickerVisible = ref(false)
const pickerType = ref<PickerType>('course')

const lectureLanguages = ['English', 'Spanish', 'Chinese', 'Japanese', 'Korean', 'French', 'German', 'Other']
const summaryLanguages = ['中文', 'English', '中英双语', '跟随课堂语言']
const recordingModes: Array<{ label: string; value: string }> = [
  { label: 'record.modeLecture', value: 'lecture' },
  { label: 'record.modeDiscussion', value: 'discussion' },
  { label: 'record.modeInterview', value: 'interview' },
]
const noteStyles: Array<{ label: string; value: string }> = [
  { label: 'record.noteBalanced', value: 'balanced' },
  { label: 'record.noteDetailed', value: 'detailed' },
  { label: 'record.noteExam', value: 'exam' },
  { label: 'record.noteTopic', value: 'byTopic' },
]

const pickerTitle = computed(() => {
  const map: Record<PickerType, string> = {
    course: t('record.selectCourse'),
    lectureLanguage: t('record.selectLanguage'),
    summaryLanguage: t('record.selectSummaryLang'),
    recordingMode: t('record.selectMode'),
    noteStyle: t('record.selectNoteStyle'),
  }
  return map[pickerType.value] || ''
})

const pickerOptions = computed(() => {
  switch (pickerType.value) {
    case 'course':
      return courses.value.map(c => ({ label: c.name, value: c.id }))
    case 'lectureLanguage':
      return lectureLanguages.map(l => ({ label: l, value: l }))
    case 'summaryLanguage':
      return summaryLanguages.map(l => ({ label: l, value: l }))
    case 'recordingMode':
      return recordingModes.map(m => ({ label: String(t(m.label as any)), value: m.value }))
    case 'noteStyle':
      return noteStyles.map(s => ({ label: String(t(s.label as any)), value: s.value }))
    default:
      return []
  }
})

const pickerSelected = computed(() => {
  switch (pickerType.value) {
    case 'course': return localConfig.courseId || ''
    case 'lectureLanguage': return localConfig.lectureLanguage
    case 'summaryLanguage': return localConfig.summaryLanguage
    case 'recordingMode': return localConfig.recordingMode || 'lecture'
    case 'noteStyle': return localConfig.noteStyle
    default: return ''
  }
})

const lectureLanguageLabel = computed(() => localConfig.lectureLanguage)
const summaryLanguageLabel = computed(() => localConfig.summaryLanguage)
const recordingModeLabel = computed(() => {
  const m = recordingModes.find(x => x.value === localConfig.recordingMode)
  return m ? String(t(m.label as any)) : ''
})
const noteStyleLabel = computed(() => {
  const s = noteStyles.find(x => x.value === localConfig.noteStyle)
  return s ? String(t(s.label as any)) : ''
})

// --- 能否开始 ---
const canStart = computed(() => {
  return deviceState.value.connected && !!localConfig.courseId
})

// --- 选择器操作 ---
function openPicker(type: PickerType) {
  pickerType.value = type
  pickerVisible.value = true
}

function closePicker() {
  pickerVisible.value = false
}

function onPickerSelect(value: string) {
  switch (pickerType.value) {
    case 'course':
      localConfig.courseId = value
      break
    case 'lectureLanguage':
      localConfig.lectureLanguage = value
      break
    case 'summaryLanguage':
      localConfig.summaryLanguage = value
      break
    case 'recordingMode':
      localConfig.recordingMode = value as RecordingConfig['recordingMode']
      break
    case 'noteStyle':
      localConfig.noteStyle = value as RecordingConfig['noteStyle']
      break
  }
  closePicker()
}

// --- 其他输入 ---
function onLectureTitleInput(e: any) {
  localConfig.lectureTitle = e.detail.value
}

function onKeepTermsChange(e: any) {
  localConfig.keepTermsInEnglish = e.detail.value
}

// --- 设备点击 ---
function handleDeviceClick() {
  uni.showToast({ title: '设备管理稍后开放', icon: 'none', duration: 1500 })
}

// --- 开始录音 ---
function handleStart() {
  if (!canStart.value) return
  recordStore.setRecordingConfig({ ...localConfig })
  recordStore.startMockRecording()
  uni.navigateTo({ url: '/pages/record/live' })
}

// --- 加载数据 ---
function loadData() {
  status.value = 'loading'

  // 从 store 恢复已保存的配置
  const saved = recordStore.config
  if (saved.courseId) localConfig.courseId = saved.courseId
  if (saved.lectureTitle) localConfig.lectureTitle = saved.lectureTitle
  if (saved.lectureLanguage) localConfig.lectureLanguage = saved.lectureLanguage
  if (saved.summaryLanguage) localConfig.summaryLanguage = saved.summaryLanguage
  localConfig.keepTermsInEnglish = saved.keepTermsInEnglish
  if (saved.recordingMode && saved.recordingMode !== localConfig.recordingMode) {
    localConfig.recordingMode = saved.recordingMode
  }
  if (saved.noteStyle && saved.noteStyle !== localConfig.noteStyle) {
    localConfig.noteStyle = saved.noteStyle
  }

  // 模拟短暂加载后进入 normal
  setTimeout(() => {
    if (!deviceState.value.connected) {
      status.value = 'deviceDisconnected'
    } else if (!localConfig.courseId) {
      status.value = 'noCourse'
    } else {
      status.value = 'normal'
    }
  }, 400)
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.record-prepare {
  min-height: 100vh;
  background: #F3F4F6;
  display: flex;
  flex-direction: column;
}

/* ===== 导航栏 ===== */
.rp-nav {
  padding: calc(env(safe-area-inset-top) + 80rpx) 32rpx 20rpx;
  &__title {
    font-size: 40rpx;
    font-weight: 700;
    color: #1F2937;
  }
  &__skeleton {
    width: 240rpx;
    height: 48rpx;
    background: #E5E7EB;
    border-radius: 12rpx;
  }
}

/* ===== 骨架屏 ===== */
.rp-skeleton-card {
  width: calc(100% - 64rpx);
  height: 140rpx;
  margin: 0 32rpx 24rpx;
  background: #E5E7EB;
  border-radius: 24rpx;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* ===== Error Bar ===== */
.rp-error-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32rpx;
  padding: 24rpx 32rpx;
  background: #FEF2F2;
  border: 2rpx solid #FECACA;
  border-radius: 24rpx;
  &__text {
    font-size: 28rpx;
    color: #EF4444;
  }
  &__btn {
    font-size: 28rpx;
    color: #FFFFFF;
    background: #EF4444;
    padding: 12rpx 32rpx;
    border-radius: 16rpx;
  }
}

/* ===== 内容区域 ===== */
.rp-body {
  flex: 1;
  padding: 0 32rpx;
  box-sizing: border-box;
}

/* ===== 卡片 ===== */
.rp-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  box-sizing: border-box;
  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1F2937;
    margin-bottom: 20rpx;
    display: block;
  }
}

/* ===== 行 ===== */
.rp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  min-height: 80rpx;
  box-sizing: border-box;

  &--divider {
    border-top: 1px solid #F3F4F6;
  }

  &__label {
    font-size: 28rpx;
    color: #1F2937;
    white-space: nowrap;
  }

  &__value {
    font-size: 28rpx;
    color: #6B7280;
    margin-left: 24rpx;
    text-align: right;
    flex: 1;
  }

  &__arrow {
    font-size: 36rpx;
    color: #9CA3AF;
    margin-left: 12rpx;
  }

  &__input {
    font-size: 28rpx;
    color: #6B7280;
    margin-left: 24rpx;
    text-align: right;
    flex: 1;
    min-width: 0;
  }

  &__left {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    flex: 1;
    min-width: 0;
  }

  &__hint {
    font-size: 24rpx;
    color: #9CA3AF;
    line-height: 34rpx;
  }
}

/* ===== 麦克风测试 ===== */
.rp-mic-test {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 16rpx;
  padding-left: 4rpx;
  &__icon {
    width: 36rpx;
    height: 36rpx;
    background: #D1FAE5;
    color: #10B981;
    font-size: 22rpx;
    font-weight: 700;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__text {
    font-size: 24rpx;
    color: #10B981;
  }
}

/* ===== 提示卡片 ===== */
.rp-tip {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background: #EEF2FF;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  &__icon {
    font-size: 32rpx;
    margin-top: 2rpx;
  }
  &__text {
    font-size: 26rpx;
    color: #4338CA;
    line-height: 40rpx;
    flex: 1;
  }
}

/* ===== 按钮占位 ===== */
.rp-btn-spacer {
  height: 40rpx;
}

/* ===== 底部按钮 ===== */
.rp-footer {
  width: 100%;
  padding: 20rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #F3F4F6;
  box-sizing: border-box;
}

.rp-btn {
  width: 100%;
  height: 100rpx;
  border-radius: 24rpx;
  background: #4F46E5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(79, 70, 229, 0.3);

  &--disabled {
    background: #9CA3AF;
    box-shadow: none;
  }

  &__text {
    font-size: 34rpx;
    font-weight: 600;
    color: #FFFFFF;
  }

  &__hint {
    font-size: 28rpx;
    color: #FFFFFF;
    opacity: 0.85;
  }
}

/* ===== 选择器弹窗 ===== */
.rp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.rp-picker {
  width: 100%;
  max-height: 60vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx 32rpx 20rpx;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1F2937;
  }

  &__close {
    font-size: 32rpx;
    color: #9CA3AF;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__body {
    max-height: 48vh;
    padding: 0 32rpx 32rpx;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 0;
    border-bottom: 1px solid #F3F4F6;
    min-height: 88rpx;

    &--active &-text {
      color: #4F46E5;
      font-weight: 500;
    }
  }

  &__item-text {
    font-size: 30rpx;
    color: #1F2937;
  }

  &__item-check {
    font-size: 30rpx;
    color: #4F46E5;
    font-weight: 700;
  }
}
</style>
