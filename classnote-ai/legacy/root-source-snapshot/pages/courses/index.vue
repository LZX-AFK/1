<template>
  <view class="courses-page">
    <!-- ========== Loading ========== -->
    <template v-if="status === 'loading'">
      <view class="courses-page__header">
        <view class="skel skel--title" />
        <view class="skel skel--btn" />
      </view>
      <view class="skel skel--search" style="margin-bottom:24rpx" />
      <view class="skel skel--tabs" />
      <view v-for="i in 4" :key="i" class="skel skel--card" />
    </template>

    <!-- ========== Error ========== -->
    <view v-else-if="status === 'error'" class="courses-page__err">
      <view class="courses-page__header">
        <text class="courses-page__title">{{ $t('courses.title') }}</text>
      </view>
      <view class="courses-page__err-bar">
        <text class="courses-page__err-text">{{ $t('common.error') }}</text>
        <view class="courses-page__err-retry" @tap="initData">
          <text class="courses-page__err-retry-text">{{ $t('common.retry') }}</text>
        </view>
      </view>
    </view>

    <!-- ========== Normal / Empty ========== -->
    <template v-else>
      <!-- ① 标题 + 添加按钮 -->
      <view class="courses-page__header">
        <text class="courses-page__title">{{ $t('courses.title') }}</text>
        <view class="courses-page__add" @tap="showModal = true">
          <text class="courses-page__add-icon">＋</text>
        </view>
      </view>

      <!-- ② 搜索栏 -->
      <view class="courses-page__search">
        <SearchBar
          v-model="searchQuery"
          :placeholder="$t('courses.searchPlaceholder')"
        />
      </view>

      <!-- ③ 筛选 Tab -->
      <scroll-view scroll-x class="courses-page__tabs">
        <view class="courses-page__tabs-inner">
          <view
            v-for="tab in filterTabs"
            :key="tab.key"
            class="courses-page__tab"
            :class="{ 'courses-page__tab--active': activeFilter === tab.key }"
            @tap="activeFilter = tab.key"
          >
            <text
              class="courses-page__tab-text"
              :class="{ 'courses-page__tab-text--active': activeFilter === tab.key }"
            >{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- ④ 空态 -->
      <EmptyState
        v-if="filteredCourses.length === 0"
        icon="📚"
        :title="$t('courses.noCourses')"
        :description="$t('courses.noCoursesDesc')"
        :action-text="$t('courses.addCourseAction')"
        @action="showModal = true"
      />

      <!-- ⑤ 课程列表 + 待复习 -->
      <template v-else>
        <view class="courses-page__list">
          <CourseCard
            v-for="course in filteredCourses"
            :key="course.id"
            :course="course"
            variant="full"
            class="courses-page__card"
            @click="goDetail(course.id)"
          />
        </view>

        <view class="courses-page__section">
          <text class="courses-page__section-title">{{ $t('courses.pendingReview') }}</text>
          <view class="courses-page__review-list">
            <view
              v-for="item in reviewItems"
              :key="item.courseId"
              class="courses-page__review-item"
              @tap="goDetail(item.courseId, true)"
            >
              <view class="courses-page__review-left">
                <text class="courses-page__review-dot">●</text>
                <text class="courses-page__review-text">{{ item.label }}</text>
              </view>
              <text class="courses-page__review-arrow">›</text>
            </view>
          </view>
        </view>
      </template>
    </template>

    <!-- ========== 添加课程弹窗 ========== -->
    <view v-if="showModal" class="modal-mask" @tap="showModal = false">
      <view class="modal-panel" @tap.stop>
        <text class="modal-panel__title">{{ $t('courses.modalTitle') }}</text>

        <view class="modal-panel__field">
          <text class="modal-panel__label">{{ $t('courses.courseName') }}</text>
          <input
            class="modal-panel__input"
            v-model="form.name"
            placeholder="生物学 101"
          />
        </view>

        <view class="modal-panel__field">
          <text class="modal-panel__label">{{ $t('courses.instructor') }}</text>
          <input
            class="modal-panel__input"
            v-model="form.instructor"
            placeholder="张教授"
          />
        </view>

        <view class="modal-panel__field">
          <text class="modal-panel__label">{{ $t('courses.schedule') }}</text>
          <input
            class="modal-panel__input"
            v-model="form.schedule"
            placeholder="周一/周三 上午 10:00"
          />
        </view>

        <view class="modal-panel__field">
          <text class="modal-panel__label">{{ $t('courses.location') }}</text>
          <input
            class="modal-panel__input"
            v-model="form.semester"
            placeholder="2026 春季"
          />
        </view>

        <view class="modal-panel__actions">
          <view class="modal-panel__btn modal-panel__btn--cancel" @tap="showModal = false">
            <text>{{ $t('common.cancel') }}</text>
          </view>
          <view class="modal-panel__btn modal-panel__btn--save" @tap="handleAddCourse">
            <text class="modal-panel__btn-save-text">{{ $t('courses.saveCourse') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCourseStore } from '@/stores/useCourseStore'
import type { Course } from '@/types'

const { t } = useI18n()
const courseStore = useCourseStore()

// --- 页面状态 ---
type PageStatus = 'loading' | 'normal' | 'empty' | 'error'
const status = ref<PageStatus>('loading')

// --- 搜索 & 筛选 ---
const searchQuery = ref('')
const activeFilter = ref('all')

const filterTabs = computed(() => [
  { key: 'all', label: t('courses.filterAll') },
  { key: 'current', label: t('courses.filterThisSemester') },
  { key: 'done', label: t('courses.filterCompleted') },
])

const filteredCourses = computed(() => {
  let list = courseStore.courses

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q),
    )
  }

  // 筛选
  if (activeFilter.value === 'current') {
    list = list.filter((c) => c.progress < 100)
  } else if (activeFilter.value === 'done') {
    list = list.filter((c) => c.progress === 100)
  }

  return list
})

// --- 待复习 ---
const reviewItems = [
  { courseId: 'c1', courseName: '生物学', label: '生物学 · 6 个标记待复习' },
  { courseId: 'c2', courseName: '化学', label: '化学 · 4 个重点待复习' },
]

// --- 添加课程弹窗 ---
const showModal = ref(false)
const form = reactive({
  name: '',
  instructor: '',
  schedule: '',
  semester: '',
})

function handleAddCourse() {
  if (!form.name.trim()) return

  const newCourse: Course = {
    id: `c${Date.now()}`,
    name: form.name.trim(),
    subject: form.name.trim(),
    instructor: form.instructor.trim() || '待指定',
    schedule: form.schedule.trim() || '待指定',
    location: form.semester.trim() || '待指定',
    totalRecordings: 0,
    totalNotes: 0,
    progress: 0,
  }

  courseStore.addCourse(newCourse)
  showModal.value = false

  // 重置表单
  form.name = ''
  form.instructor = ''
  form.schedule = ''
  form.semester = ''
}

// --- 导航 ---
function goDetail(courseId: string, toReview = false) {
  const url = toReview
    ? `/pages/courses/detail?id=${courseId}&tab=review`
    : `/pages/courses/detail?id=${courseId}`
  uni.navigateTo({ url })
}

// --- 初始化 ---
function initData() {
  status.value = 'loading'
  // 模拟网络延迟，10% 概率触发错误态
  setTimeout(() => {
    if (Math.random() < 0.1) {
      status.value = 'error'
    } else {
      status.value = 'normal'
    }
  }, 500)
}

initData()
</script>

<style lang="scss" scoped>
// ==============================
// 页面根容器
// ==============================
.courses-page {
  min-height: 100vh;
  background: #F3F4F6;
  padding: 32rpx;
  padding-top: calc(48rpx + env(safe-area-inset-top));
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-x: hidden;
}

// ==============================
// 骨架屏
// ==============================
.skel {
  background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.5s ease-in-out infinite;
  border-radius: 16rpx;

  &--title   { width: 240rpx; height: 40rpx; }
  &--btn     { width: 64rpx;  height: 64rpx; border-radius: 32rpx; }
  &--search  { width: 100%;   height: 80rpx; border-radius: 24rpx; }
  &--tabs    { width: 100%;   height: 64rpx; margin-bottom: 24rpx; }
  &--card    { width: 100%;   height: 160rpx; margin-bottom: 24rpx; }
}

@keyframes skel-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ==============================
// Header
// ==============================
.courses-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.courses-page__title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1F2937;
}

.courses-page__add {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #4F46E5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.courses-page__add-icon {
  font-size: 36rpx;
  color: #FFFFFF;
  font-weight: 300;
  line-height: 1;
}

// ==============================
// Search
// ==============================
.courses-page__search {
  margin-bottom: 24rpx;
}

// ==============================
// Filter tabs
// ==============================
.courses-page__tabs {
  margin-bottom: 24rpx;
  white-space: nowrap;
}

.courses-page__tabs-inner {
  display: flex;
  gap: 16rpx;
}

.courses-page__tab {
  padding: 14rpx 32rpx;
  border-radius: 32rpx;
  background: #FFFFFF;
  flex-shrink: 0;

  &--active {
    background: #4F46E5;
  }
}

.courses-page__tab-text {
  font-size: 28rpx;
  color: #6B7280;

  &--active {
    color: #FFFFFF;
    font-weight: 500;
  }
}

// ==============================
// Course list
// ==============================
.courses-page__list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.courses-page__card {
  width: 100%;
  box-sizing: border-box;
}

// ==============================
// Section (待复习)
// ==============================
.courses-page__section {
  margin-top: 40rpx;
}

.courses-page__section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 20rpx;
  display: block;
}

.courses-page__review-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.courses-page__review-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  width: 100%;
  box-sizing: border-box;
}

.courses-page__review-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
  flex: 1;
}

.courses-page__review-dot {
  font-size: 24rpx;
  color: #F59E0B;
  flex-shrink: 0;
}

.courses-page__review-text {
  font-size: 28rpx;
  color: #1F2937;
}

.courses-page__review-arrow {
  font-size: 32rpx;
  color: #9CA3AF;
  flex-shrink: 0;
}

// ==============================
// Error
// ==============================
.courses-page__err-bar {
  background: #FEF2F2;
  border: 2rpx solid #FECACA;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.courses-page__err-text {
  font-size: 28rpx;
  color: #EF4444;
  flex: 1;
}

.courses-page__err-retry {
  padding: 12rpx 32rpx;
  background: #EF4444;
  border-radius: 24rpx;
  flex-shrink: 0;
}

.courses-page__err-retry-text {
  font-size: 24rpx;
  color: #FFFFFF;
}

// ==============================
// Modal (add course)
// ==============================
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-panel {
  width: 100%;
  max-width: 430px;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.modal-panel__title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1F2937;
  text-align: center;
  display: block;
  margin-bottom: 36rpx;
}

.modal-panel__field {
  margin-bottom: 24rpx;
}

.modal-panel__label {
  font-size: 24rpx;
  color: #6B7280;
  margin-bottom: 12rpx;
  display: block;
}

.modal-panel__input {
  width: 100%;
  height: 80rpx;
  background: #F9FAFB;
  border: 2rpx solid #E5E7EB;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1F2937;
  box-sizing: border-box;
}

.modal-panel__actions {
  display: flex;
  gap: 24rpx;
  margin-top: 36rpx;
}

.modal-panel__btn {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 500;
  box-sizing: border-box;

  &--cancel {
    background: #F3F4F6;
    color: #6B7280;
  }

  &--save {
    background: #4F46E5;
  }
}

.modal-panel__btn-save-text {
  color: #FFFFFF;
}
</style>
