<template>
  <view class="page">
    <view class="safe-top" />
    <view class="navbar">
      <text class="navbar__back" @tap="uni.navigateBack()">‹</text>
      <text class="navbar__title">{{ t('record.prepareTitle') }}</text>
      <view class="navbar__placeholder" />
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 课程选择 -->
      <view class="section">
        <text class="section__label">{{ t('record.course') }}</text>
        <view class="selector" @tap="showCoursePicker = true">
          <text :class="['selector__text', selectedCourse ? '' : 'selector__text--placeholder']">
            {{ selectedCourse ? selectedCourse.icon + ' ' + selectedCourse.name : '请选择课程' }}
          </text>
          <text class="selector__arrow">▼</text>
        </view>
      </view>

      <!-- 课堂语言 -->
      <view class="section">
        <text class="section__label">{{ t('record.lectureLang') }}</text>
        <text class="section__hint">选择老师授课时使用的语言</text>
        <scroll-view scroll-x class="lang-scroll">
          <view class="lang-list">
            <view
              v-for="lang in languages"
              :key="lang"
              :class="['lang-chip', config.lectureLanguage === lang ? 'lang-chip--active' : '']"
              @tap="config.lectureLanguage = lang"
            >
              <text>{{ lang }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 总结语言 -->
      <view class="section">
        <text class="section__label">{{ t('record.summaryLang') }}</text>
        <view v-for="lang in summaryLangs" :key="lang" class="radio-row" @tap="config.summaryLanguage = lang">
          <view :class="['radio', config.summaryLanguage === lang ? 'radio--on' : '']" />
          <text class="radio-label">{{ lang }}</text>
        </view>
      </view>

      <!-- Keep Terms -->
      <view class="section section--row">
        <view class="section__text-group">
          <text class="section__label">{{ t('record.keepTerms') }}</text>
          <text class="section__hint">保留专业术语英文，方便考试复习</text>
        </view>
        <view :class="['switch', config.keepTermsInEnglish ? 'switch--on' : '']" @tap="config.keepTermsInEnglish = !config.keepTermsInEnglish">
          <view class="switch__thumb" />
        </view>
      </view>

      <!-- 笔记风格 -->
      <view class="section">
        <text class="section__label">{{ t('record.noteStyle') }}</text>
        <view class="style-grid">
          <view
            v-for="s in noteStyles"
            :key="s.key"
            :class="['style-chip', config.noteStyle === s.key ? 'style-chip--active' : '']"
            @tap="config.noteStyle = s.key"
          >
            <text class="style-chip__icon">{{ s.icon }}</text>
            <text class="style-chip__label">{{ s.label }}</text>
          </view>
        </view>
      </view>

      <!-- 设备状态 -->
      <view class="section">
        <text class="section__label">耳机设备</text>
        <DeviceStatusBar @tap="uni.switchTab({ url: '/pages/profile/index' })" />
      </view>

      <!-- 提示 -->
      <view class="tip">
        <text class="tip__icon">💡</text>
        <text class="tip__text">将手机放在桌面上，保持耳机连接以获得更好的收音效果</text>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部开始按钮 -->
    <view class="footer">
      <view
        :class="['start-btn', canStart ? 'start-btn--enabled' : 'start-btn--disabled']"
        @tap="startRecording"
      >
        <text v-if="!starting" class="start-btn__text">▶ {{ t('record.startRecording') }}</text>
        <text v-else class="start-btn__text">加载中...</text>
      </view>
      <view class="footer__safe" />
    </view>

    <!-- 课程选择弹窗 -->
    <view v-if="showCoursePicker" class="sheet-mask sheet-mask--visible" @tap="showCoursePicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet__handle" />
        <text class="sheet__title">选择课程</text>
        <view class="course-list">
          <view
            v-for="c in courses"
            :key="c.id"
            class="course-option"
            @tap="selectCourse(c)"
          >
            <text class="course-option__icon">{{ c.icon }}</text>
            <view class="course-option__info">
              <text class="course-option__name">{{ c.name }}</text>
              <text class="course-option__sub">{{ c.instructor }}</text>
            </view>
            <text v-if="selectedCourse?.id === c.id" class="course-option__check">✓</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useCourseStore } from '@/stores/useCourseStore'
import { useRecordStore } from '@/stores/useRecordStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import type { Course, NoteStyle } from '@/types/index'

const { t } = useI18n()
const { courses } = storeToRefs(useCourseStore())
const { device } = storeToRefs(useDeviceStore())
const recordStore = useRecordStore()

const selectedCourse = ref<Course | null>(null)
const showCoursePicker = ref(false)
const starting = ref(false)
const micGranted = ref(true)   // 乐观假设已授权，检测后修正

const config = ref({
  courseId: '',
  lectureLanguage: 'English',
  summaryLanguage: '中文',
  keepTermsInEnglish: true,
  noteStyle: 'detailed' as NoteStyle,
})

const languages = ['English', '中文', '日本語', '한국어', 'Español', 'Français']
const summaryLangs = ['中文 (母语)', 'English', 'Bilingual 双语', 'Same as lecture']
const noteStyles = [
  { key: 'balanced', icon: '⚖️', label: '均衡型' },
  { key: 'detailed', icon: '📋', label: '详细型' },
  { key: 'concise', icon: '✂️', label: '简洁型' },
]

const canStart = computed(() => !!selectedCourse.value && device.value.connected && micGranted.value)

function selectCourse(c: Course) {
  selectedCourse.value = c
  config.value.courseId = c.id
  showCoursePicker.value = false
}

// ── 麦克风权限检测与引导 ──────────────────────────────────────
onMounted(() => {
  checkMicPermission()
})

function checkMicPermission() {
  // #ifdef APP-PLUS
  const android = ['android.permission.RECORD_AUDIO']
  try {
    plus.android.requestPermissions(
      android,
      () => { micGranted.value = true },
      (e: any) => {
        micGranted.value = false
        // code -2 = 永久拒绝（"不再询问"）
        if (e?.code === -2) showPermissionGuide()
      }
    )
  } catch {
    micGranted.value = true  // iOS 或 plus API 不存在时降级
  }
  // #endif
  // #ifdef MP-WEIXIN
  uni.getSetting({
    success(res) {
      if (res.authSetting['scope.record'] === false) {
        micGranted.value = false
        showPermissionGuide()
      } else {
        uni.authorize({
          scope: 'scope.record',
          success() { micGranted.value = true },
          fail() {
            micGranted.value = false
            showPermissionGuide()
          },
        })
      }
    },
  })
  // #endif
}

function showPermissionGuide() {
  uni.showModal({
    title: '需要麦克风权限',
    content: '请前往系统设置，允许 ClassNote AI 使用麦克风，否则无法录音。',
    confirmText: '去设置',
    cancelText: '取消',
    success(res) {
      if (!res.confirm) return
      // #ifdef APP-PLUS
      try { plus.runtime.openURL('app-settings:') } catch {}
      // #endif
      // #ifdef MP-WEIXIN
      uni.openSetting({})
      // #endif
    },
  })
}

function startRecording() {
  if (starting.value) return
  if (!selectedCourse.value) {
    uni.showToast({ title: '请先选择课程', icon: 'none' })
    return
  }
  if (!micGranted.value) {
    showPermissionGuide()
    return
  }
  if (!device.value.connected) {
    uni.showToast({ title: '请先连接耳机', icon: 'none' })
    return
  }
  starting.value = true
  recordStore.startRecording({ ...config.value, noteStyle: config.value.noteStyle as NoteStyle })
  setTimeout(() => {
    starting.value = false
    uni.navigateTo({ url: '/pages/record/live' })
  }, 500)
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: $color-bg-page; display: flex; flex-direction: column; }
.safe-top { height: var(--status-bar-height, 44px); }
.navbar {
  display: flex; align-items: center; padding: $spacing-sm $spacing-lg; background: $color-bg-card;
  &__back { font-size: 60rpx; color: $color-primary; margin-right: $spacing-sm; line-height: 1; }
  &__title { flex: 1; font-size: $font-size-xl; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__placeholder { width: 60rpx; }
}
.scroll { flex: 1; padding-bottom: 160rpx; }
.section {
  margin: $spacing-md $spacing-lg 0; background: $color-bg-card; border-radius: $radius-2xl;
  padding: $spacing-md $spacing-lg;
  &--row { display: flex; align-items: center; justify-content: space-between; }
  &__label { font-size: $font-size-md; font-weight: $font-weight-semibold; color: $color-text-primary; margin-bottom: $spacing-xs; display: block; }
  &__hint { font-size: $font-size-sm; color: $color-text-secondary; margin-bottom: $spacing-sm; display: block; }
  &__text-group { flex: 1; }
}
.selector {
  height: 88rpx; background: #F9FAFB; border-radius: $radius-lg; display: flex;
  align-items: center; justify-content: space-between; padding: 0 $spacing-md;
  border: 1rpx solid #E5E7EB;
  &__text { font-size: $font-size-md; color: $color-text-primary; &--placeholder { color: $color-text-tertiary; } }
  &__arrow { font-size: $font-size-sm; color: $color-text-tertiary; }
}
.lang-scroll { width: 100%; margin-top: $spacing-xs; }
.lang-list { display: flex; gap: $spacing-sm; padding-right: $spacing-lg; }
.lang-chip {
  padding: $spacing-xs $spacing-md; border-radius: $radius-round;
  background: #F3F4F6; font-size: $font-size-sm; color: $color-text-secondary;
  white-space: nowrap; flex-shrink: 0;
  &--active { background: $color-primary; color: #fff; }
}
.radio-row {
  display: flex; align-items: center; gap: $spacing-sm; padding: $spacing-xs 0;
}
.radio {
  width: 36rpx; height: 36rpx; border-radius: 50%; border: 3rpx solid #D1D5DB;
  &--on { border-color: $color-primary; background: $color-primary; box-shadow: inset 0 0 0 6rpx #fff; }
}
.radio-label { font-size: $font-size-md; color: $color-text-primary; }
.switch {
  width: 100rpx; height: 56rpx; border-radius: 28rpx; background: #D1D5DB; position: relative;
  transition: background $transition-fast;
  &--on { background: $color-primary; }
  &__thumb {
    position: absolute; top: 6rpx; left: 6rpx; width: 44rpx; height: 44rpx;
    background: #fff; border-radius: 50%; transition: left $transition-fast;
  }
}
.switch--on .switch__thumb { left: 50rpx; }
.style-grid { display: flex; gap: $spacing-sm; flex-wrap: wrap; margin-top: $spacing-xs; }
.style-chip {
  display: flex; align-items: center; gap: $spacing-xs; padding: $spacing-xs $spacing-md;
  border-radius: $radius-lg; background: #F3F4F6; border: 2rpx solid transparent;
  &--active { background: #EEF2FF; border-color: $color-primary; }
  &__icon { font-size: 32rpx; }
  &__label { font-size: $font-size-sm; color: $color-text-primary; }
}
.tip {
  margin: $spacing-md $spacing-lg 0; background: #EEF2FF; border-radius: $radius-xl;
  padding: $spacing-md; display: flex; gap: $spacing-sm; align-items: flex-start;
  &__icon { font-size: 36rpx; }
  &__text { font-size: $font-size-sm; color: $color-primary; line-height: $line-height-normal; flex: 1; }
}
.safe-bottom { height: 40rpx; }
.footer {
  position: fixed; bottom: 0; left: 0; right: 0; background: $color-bg-card;
  padding: $spacing-md $spacing-lg; border-top: 1rpx solid #F0F0F5;
  &__safe { height: env(safe-area-inset-bottom); }
}
.start-btn {
  height: 96rpx; border-radius: $radius-lg; display: flex; align-items: center; justify-content: center;
  &--enabled { background: $color-primary; }
  &--disabled { background: #D1D5DB; }
  &__text { font-size: $font-size-lg; font-weight: $font-weight-semibold; color: #fff; }
}
.sheet-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; display: flex; align-items: flex-end;
  background: rgba(0,0,0,0); transition: background $transition-normal;
  &--visible { background: rgba(0,0,0,0.4); }
}
.sheet {
  width: 100%; background: $color-bg-card; border-radius: $radius-2xl $radius-2xl 0 0;
  padding: $spacing-md $spacing-lg; max-height: 70vh;
  transform: translateY(100%); transition: transform $transition-normal;
  .sheet-mask--visible & { transform: translateY(0); }
  &__handle { width: 80rpx; height: 8rpx; background: #E5E7EB; border-radius: 4rpx; margin: 0 auto $spacing-md; }
  &__title { font-size: $font-size-xl; font-weight: $font-weight-semibold; color: $color-text-primary; margin-bottom: $spacing-lg; display: block; }
}
.course-list { display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); }
.course-option {
  display: flex; align-items: center; gap: $spacing-sm; padding: $spacing-md 0;
  border-bottom: 1rpx solid #F0F0F5;
  &__icon { font-size: 40rpx; }
  &__info { flex: 1; display: flex; flex-direction: column; }
  &__name { font-size: $font-size-md; color: $color-text-primary; font-weight: $font-weight-medium; }
  &__sub { font-size: $font-size-sm; color: $color-text-secondary; }
  &__check { font-size: 36rpx; color: $color-primary; }
}
</style>
