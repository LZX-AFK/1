/**
 * ClassNote AI — 课程相关类型定义
 * 包含课程、学科标签、课程颜色等
 */

// ---------- 学科分类 ----------
export type Subject =
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'computer_science'
  | 'engineering'
  | 'literature'
  | 'history'
  | 'philosophy'
  | 'economics'
  | 'business'
  | 'psychology'
  | 'art'
  | 'music'
  | 'language'
  | 'law'
  | 'medicine'
  | 'other'

/** 学科中文名映射 */
export const SUBJECT_LABELS: Record<Subject, string> = {
  mathematics: '数学',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  computer_science: '计算机科学',
  engineering: '工程学',
  literature: '文学',
  history: '历史',
  philosophy: '哲学',
  economics: '经济学',
  business: '商学',
  psychology: '心理学',
  art: '艺术',
  music: '音乐',
  language: '语言学',
  law: '法学',
  medicine: '医学',
  other: '其他',
}

/** 学科英文名映射 */
export const SUBJECT_LABELS_EN: Record<Subject, string> = {
  mathematics: 'Mathematics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  computer_science: 'Computer Science',
  engineering: 'Engineering',
  literature: 'Literature',
  history: 'History',
  philosophy: 'Philosophy',
  economics: 'Economics',
  business: 'Business',
  psychology: 'Psychology',
  art: 'Art',
  music: 'Music',
  language: 'Language',
  law: 'Law',
  medicine: 'Medicine',
  other: 'Other',
}

// ---------- 课程主题色 ----------
export type CourseColor =
  | 'purple'
  | 'blue'
  | 'green'
  | 'orange'
  | 'pink'
  | 'teal'
  | 'red'
  | 'indigo'

export const COURSE_COLORS: Record<CourseColor, string> = {
  purple: '#6C63FF',
  blue: '#448AFF',
  green: '#00D9A6',
  orange: '#FF9100',
  pink: '#FF4081',
  teal: '#00BCD4',
  red: '#FF5252',
  indigo: '#536DFE',
}

export const COURSE_COLORS_BG: Record<CourseColor, string> = {
  purple: '#2D2B5E',
  blue: '#1A3A6E',
  green: '#1A4A3A',
  orange: '#4A2E1A',
  pink: '#4A1A2E',
  teal: '#1A3A4A',
  red: '#4A1A2A',
  indigo: '#1E2A5E',
}

// ---------- 课程模型 ----------
export interface Course {
  id: string
  name: string
  subject: Subject
  color: CourseColor
  instructor: string
  semester: string
  schedule: string
  room: string
  totalSessions: number
  completedSessions: number
  pendingReviews: number
  lastSessionDate: string | null
  isArchived: boolean
  createdAt: string
}

// ---------- Mock 数据 (MVP) ----------
export function getMockCourses(): Course[] {
  return [
    {
      id: 'course_demo_001',
      name: '生物信息学导论',
      subject: 'biology',
      color: 'green',
      instructor: 'Dr. Sarah Chen',
      semester: '2026 Spring',
      schedule: 'Mon/Wed 10:00 AM',
      room: 'Science Building 302',
      totalSessions: 32,
      completedSessions: 14,
      pendingReviews: 3,
      lastSessionDate: '2026-05-28T10:00:00Z',
      isArchived: false,
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'course_demo_002',
      name: '高等微积分 II',
      subject: 'mathematics',
      color: 'blue',
      instructor: 'Prof. James Liu',
      semester: '2026 Spring',
      schedule: 'Tue/Thu 2:00 PM',
      room: 'Math Hall 105',
      totalSessions: 28,
      completedSessions: 20,
      pendingReviews: 5,
      lastSessionDate: '2026-05-30T14:00:00Z',
      isArchived: false,
      createdAt: '2026-01-16T08:00:00Z',
    },
    {
      id: 'course_demo_003',
      name: '机器学习基础',
      subject: 'computer_science',
      color: 'purple',
      instructor: 'Dr. Emily Wang',
      semester: '2026 Spring',
      schedule: 'Mon/Fri 9:00 AM',
      room: 'CS Building 201',
      totalSessions: 30,
      completedSessions: 18,
      pendingReviews: 2,
      lastSessionDate: '2026-05-29T09:00:00Z',
      isArchived: false,
      createdAt: '2026-01-14T08:00:00Z',
    },
  ]
}

/** 获取单个 demo 课程（课程列表页默认展示） */
export function getDemoCourse(): Course {
  return {
    id: 'course_demo_001',
    name: '生物信息学导论',
    subject: 'biology',
    color: 'green',
    instructor: 'Dr. Sarah Chen',
    semester: '2026 Spring',
    schedule: 'Mon/Wed 10:00 AM',
    room: 'Science Building 302',
    totalSessions: 32,
    completedSessions: 14,
    pendingReviews: 3,
    lastSessionDate: '2026-05-28T10:00:00Z',
    isArchived: false,
    createdAt: '2026-01-15T08:00:00Z',
  }
}
