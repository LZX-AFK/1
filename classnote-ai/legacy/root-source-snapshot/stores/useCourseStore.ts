import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Course, Recording, AINote, Mistake, ReviewTask } from '@/types'

export const useCourseStore = defineStore('course', () => {
  // --- Mock 课程列表 ---
  const courses = ref<Course[]>([
    {
      id: 'c1',
      name: '生物学 101',
      subject: 'Biology',
      instructor: '张教授',
      schedule: '周一/周三 上午 10:00',
      location: '教学楼 203',
      totalRecordings: 8,
      totalNotes: 21,
      progress: 65,
    },
    {
      id: 'c2',
      name: '化学 201',
      subject: 'Chemistry',
      instructor: '陈教授',
      schedule: '周二/周四 下午 2:00',
      location: '化学楼 201',
      totalRecordings: 6,
      totalNotes: 15,
      progress: 55,
    },
    {
      id: 'c3',
      name: '物理学 101',
      subject: 'Physics',
      instructor: '王教授',
      schedule: '周一/周三/周五 上午 9:00',
      location: '物理楼 301',
      totalRecordings: 10,
      totalNotes: 28,
      progress: 45,
    },
    {
      id: 'c4',
      name: '心理学 101',
      subject: 'Psychology',
      instructor: '李教授',
      schedule: '周二/周四 上午 11:00',
      location: '文科楼 102',
      totalRecordings: 4,
      totalNotes: 9,
      progress: 30,
    },
  ])

  // --- Mock 录音记录 ---
  const recordings = ref<Recording[]>([
    { id: 'r1', courseId: 'c1', courseName: '生物学 101', date: '2026-05-28', duration: 3120, markCount: 4, accuracy: 95, summaryStatus: 'ready', hasSummary: true },
    { id: 'r2', courseId: 'c1', courseName: '生物学 101', date: '2026-05-26', duration: 2880, markCount: 3, accuracy: 96, summaryStatus: 'ready', hasSummary: true },
    { id: 'r3', courseId: 'c1', courseName: '生物学 101', date: '2026-05-21', duration: 3000, markCount: 5, accuracy: 94, summaryStatus: 'ready', hasSummary: true },
    { id: 'r4', courseId: 'c2', courseName: '化学 201', date: '2026-05-27', duration: 2880, markCount: 2, accuracy: 94, summaryStatus: 'ready', hasSummary: true },
    { id: 'r5', courseId: 'c2', courseName: '化学 201', date: '2026-05-23', duration: 2700, markCount: 2, accuracy: 90, summaryStatus: 'ready', hasSummary: true },
    { id: 'r6', courseId: 'c3', courseName: '物理学 101', date: '2026-05-28', duration: 3000, markCount: 4, accuracy: 94, summaryStatus: 'ready', hasSummary: true },
  ])

  // --- Mock AI 笔记 ---
  const aiNotes = ref<AINote[]>([
    {
      id: 'n1',
      recordingId: 'r1',
      title: '细胞分裂概述与有丝分裂阶段',
      summary: '本节课详细讲解了有丝分裂的过程，包括前期、中期、后期和末期。重点讲解了DNA复制机制和细胞周期检查点。',
      courseName: '生物学 101',
      tags: ['mitosis', 'cell cycle', 'chromosome', 'PMAT'],
      sections: [
        { title: 'Cell Division Overview', content: 'Cells reproduce through mitosis...', tags: ['mitosis', 'cell cycle'] },
        { title: 'Stages of Mitosis', content: 'Prophase, Metaphase, Anaphase, Telophase...', tags: ['PMAT', 'phases'] },
      ],
      generatedAt: '2026-05-28T12:00:00Z',
    },
    {
      id: 'n2',
      recordingId: 'r2',
      title: '遗传学基础与DNA复制',
      summary: '本节课介绍了DNA复制、染色体分离和遗传信息传递的基本机制，深入讲解了碱基互补配对原则。',
      courseName: '生物学 101',
      tags: ['DNA replication', 'genetics', 'chromosome', 'base pairing'],
      sections: [
        { title: 'DNA Structure & Replication', content: 'Double helix, semiconservative replication...', tags: ['DNA', 'replication'] },
        { title: 'Genetic Information Transfer', content: 'Transcription and translation basics...', tags: ['genetics', 'transcription'] },
      ],
      generatedAt: '2026-05-26T11:30:00Z',
    },
    {
      id: 'n3',
      recordingId: 'r4',
      title: '化学键与分子结构',
      summary: '本讲深入讲解了离子键、共价键和金属键的形成机制，以及VSEPR理论在分子几何构型预测中的应用。',
      courseName: '化学 201',
      tags: ['chemical bonds', 'VSEPR', 'molecular geometry'],
      sections: [
        { title: 'Ionic vs Covalent Bonds', content: 'Electron transfer vs sharing...', tags: ['bonds'] },
      ],
      generatedAt: '2026-05-27T12:00:00Z',
    },
  ])

  // --- Mock 错题 ---
  const mistakes = ref<Mistake[]>([
    { id: 'm1', question: 'What triggers the G2 phase checkpoint?', correctAnswer: 'DNA damage check', userAnswer: 'Cell size check', courseId: 'c1', topicLabel: 'Cell Cycle', createdAt: '2026-05-28' },
    { id: 'm2', question: 'Which enzyme unwinds DNA during replication?', correctAnswer: 'Helicase', userAnswer: 'DNA polymerase', courseId: 'c1', topicLabel: 'DNA Replication', createdAt: '2026-05-25' },
    { id: 'm3', question: 'Which molecular shape does VSEPR theory predict for CH₄?', correctAnswer: 'Tetrahedral', userAnswer: 'Square planar', courseId: 'c2', topicLabel: 'Molecular Structure', createdAt: '2026-05-27' },
    { id: 'm4', question: 'What type of chemical bond forms between sodium and chlorine atoms?', correctAnswer: 'Ionic bond', userAnswer: 'Covalent bond', courseId: 'c2', topicLabel: 'Chemical Bonds', createdAt: '2026-05-23' },
  ])

  // --- Mock 复习任务 ---
  const reviewTasks = ref<ReviewTask[]>([
    { id: 'rv1', type: 'topic', title: '复习 Cell Division 10 分钟', completed: false },
    { id: 'rv2', type: 'topic', title: '回看 2 个时间轴标记', completed: false },
    { id: 'rv3', type: 'term', title: '完成 5 张记忆卡片', completed: false },
    { id: 'rv4', type: 'topic', title: '复习 mitosis / meiosis 对比', completed: false },
  ])

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
