import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Course, Recording, AINote, Mistake, ReviewTask } from '@/types'

export const useCourseStore = defineStore('course', () => {
  // 所有数据来自后端 API，不再使用本地 mock
  const courses = ref<Course[]>([])
  const recordings = ref<Recording[]>([])
  const aiNotes = ref<AINote[]>([])
  const mistakes = ref<Mistake[]>([])
  const reviewTasks = ref<ReviewTask[]>([])

  // --- Getter ---
  const totalCourses = computed(() => courses.value.length)

  const getCourseById = computed(() => (id: string) =>
    courses.value.find((c) => c.id === id) ?? null
  )

  const getRecordingsByCourseId = computed(() => (courseId: string) =>
    recordings.value.filter((r) => r.courseId === courseId)
  )

  const getNotesByCourseId = computed(() => (courseId: string) =>
    aiNotes.value.filter((n) => recordings.value
      .filter((r) => r.courseId === courseId)
      .some((r) => r.id === n.recordingId)
    )
  )

  const getMistakesByCourseId = computed(() => (courseId: string) =>
    mistakes.value.filter((m) => m.courseId === courseId)
  )

  const getReviewTasksForCourse = computed(() => (_courseId: string) =>
    reviewTasks.value
  )

  const recordingsForCourse = computed(() => (courseId: string) =>
    recordings.value.filter((r) => r.courseId === courseId)
  )

  // --- 方法 ---
  function setCurrentCourse(courseId: string) {
    currentCourse.value = courses.value.find((c) => c.id === courseId) ?? null
  }

  function addCourse(course: Course) {
    courses.value.push(course)
  }

  function toggleReviewTask(taskId: string) {
    const task = reviewTasks.value.find((t) => t.id === taskId)
    if (task) task.completed = !task.completed
  }

  const currentCourse = ref<Course | null>(courses.value[0])

  return {
    courses,
    currentCourse,
    recordings,
    aiNotes,
    mistakes,
    reviewTasks,
    totalCourses,
    getCourseById,
    getRecordingsByCourseId,
    getNotesByCourseId,
    getMistakesByCourseId,
    getReviewTasksForCourse,
    recordingsForCourse,
    setCurrentCourse,
    addCourse,
    toggleReviewTask,
  }
})
