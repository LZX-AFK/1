<template>
  <view class="page">
    <!-- Logo -->
    <view class="logo-area">
      <text class="logo-text">ClassNote AI</text>
      <text class="logo-subtitle">把每一堂课，变成你的专属笔记</text>
    </view>

    <!-- 课程列表 -->
    <scroll-view
      class="course-list"
      scroll-y
      :show-scrollbar="false"
      :enhanced="true"
    >
      <view
        v-if="courses.length > 0"
        class="course-list__inner"
      >
        <text class="section-title">我的课程</text>
        <CourseCard
          v-for="course in courses"
          :key="course.id"
          :course="course"
          class="course-list__item"
          @click="goToPrepareRecording(course)"
        />
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-state__icon">📚</text>
        <text class="empty-state__title">还没有课程</text>
        <text class="empty-state__desc">点击下方按钮，开始你的第一堂课</text>
      </view>
    </scroll-view>

    <!-- 底部操作 -->
    <view class="footer">
      <button class="btn-start" @click="startNewClass">
        <text class="btn-start__icon">+</text>
        <text>开始新课堂</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import CourseCard from './components/CourseCard.vue'
import { getMockCourses, type Course } from '@/types/course'

const sessionStore = useSessionStore()
const courses = ref<Course[]>([])

onMounted(() => {
  // MVP: 加载 mock 数据
  loadCourses()
})

function loadCourses() {
  courses.value = getMockCourses()
}

/** 点击课程卡片 → 跳转 P11 准备录音 */
function goToPrepareRecording(course: Course) {
  // 将会话信息存入 session store
  sessionStore.setCourseInfo(course.subject, course.name)
  sessionStore.resetSession()

  // 跳转并传递课程 ID（后续 P11 可根据 ID 获取完整课程信息）
  uni.navigateTo({
    url: `/pages/prepare-recording/prepare-recording?courseId=${course.id}`,
  })
}

/** 底部按钮 → 快速开始（使用 demo 课程） */
function startNewClass() {
  const demoCourse = courses.value[0]
  if (demoCourse) {
    goToPrepareRecording(demoCourse)
  } else {
    uni.navigateTo({ url: '/pages/prepare-recording/prepare-recording' })
  }
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: $color-bg-primary;
}

/* ---- Logo 区域 ---- */
.logo-area {
  padding: $spacing-xl $spacing-lg $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.logo-text {
  font-size: $font-size-title;
  font-weight: $font-weight-bold;
  color: $color-primary;
  line-height: $line-height-tight;
}

.logo-subtitle {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

/* ---- 课程列表 ---- */
.course-list {
  flex: 1;
  padding: 0 $spacing-lg;
}

.course-list__inner {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding-bottom: 160rpx;
}

.section-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

/* ---- 空状态 ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  gap: $spacing-md;
}

.empty-state__icon {
  font-size: 80rpx;
}

.empty-state__title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;
}

.empty-state__desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

/* ---- 底部 ---- */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-lg;
  padding-bottom: calc($spacing-lg + env(safe-area-inset-bottom));
  background: linear-gradient(transparent 0%, $color-bg-primary 40%);
}

.btn-start {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: #FFFFFF;
  border-radius: $radius-round;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  box-shadow: $shadow-glow-primary;
  border: none;

  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }

  &__icon {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
  }
}
</style>
