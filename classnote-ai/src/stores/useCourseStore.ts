import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Course } from '@/types/index'

const mockCourses: Course[] = [
  {
    id: 'course-001',
    name: '生物学 101',
    instructor: '张教授',
    schedule: '周一/三 13:00',
    location: '教学楼 203',
    semester: '2026 春季',
    color: '#4F46E5',
    icon: '🔬',
    recordingCount: 8,
    noteCount: 21,
    markCount: 6,
    accuracy: 95,
    status: 'active',
  },
  {
    id: 'course-002',
    name: '化学 201',
    instructor: '陈教授',
    schedule: '周二/四 14:00',
    location: '实验楼 301',
    semester: '2026 春季',
    color: '#10B981',
    icon: '⚗️',
    recordingCount: 6,
    noteCount: 15,
    markCount: 4,
    accuracy: 92,
    status: 'active',
  },
  {
    id: 'course-003',
    name: '物理学 101',
    instructor: '王教授',
    schedule: '周三/五 上午 9:00',
    location: '理科楼 101',
    semester: '2025 秋季',
    color: '#F59E0B',
    icon: '⚛️',
    recordingCount: 10,
    noteCount: 26,
    markCount: 8,
    accuracy: 90,
    status: 'done',
  },
]

export const useCourseStore = defineStore('course', () => {
  const courses = ref<Course[]>(mockCourses)
  const currentCourseId = ref<string | null>(null)

  const currentCourse = computed(() =>
    courses.value.find(c => c.id === currentCourseId.value) ?? null
  )

  function selectCourse(id: string) {
    currentCourseId.value = id
  }

  return { courses, currentCourseId, currentCourse, selectCourse }
})
