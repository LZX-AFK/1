<template>
  <view class="page">
    <view class="safe-top" />
    <view class="navbar">
      <text class="navbar__title">{{ t('courses.title') }}</text>
      <view class="navbar__add" @tap="showAdd = true">
        <text class="navbar__add-icon">＋</text>
      </view>
    </view>

    <SearchBar v-model="keyword" :placeholder="t('courses.searchPlaceholder')" />

    <scroll-view scroll-y class="scroll">
      <view class="filter-row">
        <view
          v-for="f in filters"
          :key="f.key"
          :class="['filter-chip', activeFilter === f.key ? 'filter-chip--active' : '']"
          @tap="activeFilter = f.key"
        >
          <text>{{ f.label }}</text>
        </view>
      </view>

      <view v-if="filteredCourses.length" class="list">
        <CourseCard
          v-for="c in filteredCourses"
          :key="c.id"
          :course="c"
          variant="full"
          @tap="goCourseDetail(c.id)"
        />
      </view>
      <EmptyState v-else :message="t('courses.empty')" :cta-text="t('courses.addCourse')" @action="showAdd = true" />

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 添加课程 BottomSheet -->
    <view v-if="showAdd" class="sheet-mask sheet-mask--visible" @tap="showAdd = false">
      <view class="sheet" @tap.stop>
        <view class="sheet__handle" />
        <view class="sheet__header">
          <text class="sheet__title">Add New Course</text>
          <text class="sheet__close" @tap="showAdd = false">✕</text>
        </view>
        <scroll-view scroll-y class="sheet__form">
          <view class="form-row">
            <text class="form-label">Course Name</text>
            <input class="form-input" v-model="newCourse.name" placeholder="e.g. Biology 101" :adjust-position="false" />
          </view>
          <view class="form-row">
            <text class="form-label">Instructor</text>
            <input class="form-input" v-model="newCourse.instructor" placeholder="e.g. Prof. Smith" :adjust-position="false" />
          </view>
          <view class="form-row">
            <text class="form-label">Schedule</text>
            <input class="form-input" v-model="newCourse.schedule" placeholder="e.g. Mon/Wed 10:00" :adjust-position="false" />
          </view>
          <view style="height: 40rpx" />
        </scroll-view>
        <view class="sheet__btns">
          <view class="sheet__btn sheet__btn--cancel" @tap="showAdd = false"><text>{{ t('common.cancel') }}</text></view>
          <view class="sheet__btn sheet__btn--save" @tap="saveCourse"><text>{{ t('common.save') }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useCourseStore } from '@/stores/useCourseStore'

const { t } = useI18n()
const courseStore = useCourseStore()
const { courses } = storeToRefs(courseStore)

const keyword = ref('')
const activeFilter = ref('all')
const showAdd = ref(false)
const newCourse = ref({ name: '', instructor: '', schedule: '' })

const filters = [
  { key: 'all', label: t('courses.filter.all') },
  { key: 'current', label: t('courses.filter.current') },
  { key: 'done', label: t('courses.filter.done') },
]

const filteredCourses = computed(() =>
  courses.value.filter(c => {
    if (keyword.value && !c.name.toLowerCase().includes(keyword.value.toLowerCase())) return false
    if (activeFilter.value === 'current') return c.status !== 'done'
    if (activeFilter.value === 'done') return c.status === 'done'
    return true
  })
)

function goCourseDetail(id: string) {
  courseStore.selectCourse(id)
  uni.navigateTo({ url: `/pages/courses/detail?id=${id}` })
}

let savingCourse = false
function saveCourse() {
  if (!newCourse.value.name || savingCourse) return
  savingCourse = true
  courses.value.push({
    id: `course-${Date.now()}`,
    name: newCourse.value.name,
    instructor: newCourse.value.instructor,
    schedule: newCourse.value.schedule,
    location: '',
    semester: '2026 春季',
    color: '#4F46E5',
    icon: '📚',
    recordingCount: 0, noteCount: 0, markCount: 0, accuracy: 0,
  })
  newCourse.value = { name: '', instructor: '', schedule: '' }
  showAdd.value = false
  uni.showToast({ title: '课程已添加', icon: 'success' })
  setTimeout(() => { savingCourse = false }, 600)
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: $color-bg-page; display: flex; flex-direction: column; }
.safe-top { height: var(--status-bar-height, 44px); }
.safe-bottom { height: calc(120rpx + env(safe-area-inset-bottom)); }
.navbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-sm $spacing-lg $spacing-md; background: $color-bg-card;
  &__title { font-size: $font-size-2xl; font-weight: $font-weight-bold; color: $color-text-primary; }
  &__add { width: 72rpx; height: 72rpx; background: $color-primary; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  &__add-icon { font-size: 40rpx; color: #fff; font-weight: bold; }
}
.scroll { flex: 1; }
.filter-row { display: flex; gap: $spacing-sm; padding: $spacing-md $spacing-lg; }
.filter-chip {
  padding: $spacing-xs $spacing-md; border-radius: $radius-round; background: $color-bg-card;
  font-size: $font-size-sm; color: $color-text-secondary; border: 1rpx solid #E5E7EB;
  &--active { background: $color-primary; color: #fff; border-color: $color-primary; }
}
.list { display: flex; flex-direction: column; gap: $spacing-md; padding: 0 $spacing-lg; }

.sheet-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; display: flex; align-items: flex-end;
  background: rgba(0,0,0,0); transition: background $transition-normal;
  &--visible { background: rgba(0,0,0,0.4); }
}
.sheet {
  width: 100%; background: $color-bg-card; border-radius: $radius-2xl $radius-2xl 0 0; padding: $spacing-md $spacing-lg;
  transform: translateY(100%); transition: transform $transition-normal;
  .sheet-mask--visible & { transform: translateY(0); }
  &__handle { width: 80rpx; height: 8rpx; background: #E5E7EB; border-radius: 4rpx; margin: 0 auto $spacing-md; }
  &__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: $spacing-lg; }
  &__title { font-size: $font-size-xl; font-weight: $font-weight-semibold; color: $color-text-primary; }
  &__close { font-size: 36rpx; color: $color-text-tertiary; }
  &__form { display: flex; flex-direction: column; gap: $spacing-md; margin-bottom: $spacing-lg; }
  &__btns { display: flex; gap: $spacing-md; padding-bottom: env(safe-area-inset-bottom); }
  &__btn {
    flex: 1; height: 88rpx; border-radius: $radius-lg; display: flex; align-items: center; justify-content: center;
    font-size: $font-size-md; font-weight: $font-weight-medium;
    &--cancel { background: #F3F4F6; color: $color-text-secondary; }
    &--save { background: $color-primary; color: #fff; }
  }
}
.form-row { display: flex; flex-direction: column; gap: $spacing-xs; }
.form-label { font-size: $font-size-sm; color: $color-text-secondary; }
.form-input {
  height: 88rpx; background: #F9FAFB; border-radius: $radius-lg;
  padding: 0 $spacing-md; font-size: $font-size-md; color: $color-text-primary; border: 1rpx solid #E5E7EB;
}
</style>
