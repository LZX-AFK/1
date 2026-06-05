// ==============================
// ClassNote AI — 全局类型定义
// 对应 UI Spec v3
// ==============================

/** 课程 */
export interface Course {
  id: string
  name: string
  subject: string
  instructor: string
  schedule: string // e.g. "Mon/Wed 10:00-11:30"
  location: string
  totalRecordings: number
  totalNotes: number
  progress: number // 0-100 课程进度百分比
}

/** 录音记录 */
export interface Recording {
  id: string
  courseId: string
  courseName: string
  date: string // ISO date string
  duration: number // 秒
  markCount: number
  accuracy: number // 0-100 转写准确率
  summaryStatus: 'ready' | 'processing' | 'failed'
  hasSummary: boolean
}

/** AI 结构化笔记 */
export interface AINote {
  id: string
  recordingId: string
  title: string
  summary: string
  courseName: string
  tags: string[]
  sections: NoteSection[]
  generatedAt: string
}

/** 笔记段落 */
export interface NoteSection {
  title: string
  content: string
  tags: string[]
}

/** 知识点节点（时间轴+总结公用） */
export interface TopicNode {
  id: string
  time: number // 秒，对应录音时间
  label: string
  content: string
}

/** 术语卡片 */
export interface TermCard {
  id: string
  term: string
  definition: string
  language: string // 术语原语言
  addedAt: string
}

/** 复习任务 */
export interface ReviewTask {
  id: string
  type: 'term' | 'mistake' | 'topic'
  title: string
  dueDate?: string
  completed: boolean
}

/** 个性化适配（AI总结 "Personalized for You" 模块数据） */
export interface PersonalizedAdaptation {
  topic: string
  adaptations: AdaptationItem[]
}

export interface AdaptationItem {
  type: 'weakness' | 'term' | 'exam' | 'suggestion'
  title: string
  detail: string
}

/** 时间轴标记 */
export type MarkType = 'confusing' | 'important' | 'exam' | 'question' | 'review'

export interface TimelineMark {
  id: string
  time: number // 录音秒数
  type: MarkType
  label: string
  aiExplanation: string
  hasPlayback: boolean // 能否跳转到该时间点播放
  syncStatus?: 'syncing' | 'synced' | 'failed' | 'local-only' // 后端同步状态
}

/** 学生档案 */
export interface StudentProfile {
  major: string
  nativeLanguage: string
  englishLevel: string
  studyGoal: string
  completedCourses: number
  totalStudyHours: number
  streakDays: number // 连续学习天数
}

/** AI 偏好 */
export interface AIPreferences {
  summaryStyle: 'detailed' | 'concise'
  showTimeline: boolean
  autoGenerateTerms: boolean
  personalizedAdaptation: boolean
  notificationReminder: boolean
}

/** 错题/薄弱点 */
export interface Mistake {
  id: string
  question: string
  correctAnswer: string
  userAnswer: string
  courseId: string
  topicLabel: string
  createdAt: string
}

/** 录音配置 */
export interface RecordingConfig {
  courseId?: string // 课程 ID
  lectureTitle?: string // 讲座标题
  lectureLanguage: string // 课堂语言
  summaryLanguage: string // 总结语言
  keepTermsInEnglish: boolean // 专业术语保留英文
  recordingMode?: 'lecture' | 'discussion' | 'interview' // 录音模式
  noteStyle: 'structured' | 'bullet' | 'outline' | 'balanced' | 'detailed' | 'exam' | 'byTopic' // 笔记风格
}

/** 设备状态 */
export interface DeviceState {
  connected: boolean
  deviceName: string
  batteryLevel: number // 0-100
  ancEnabled: boolean // 主动降噪
  signalStrength: 'good' | 'fair' | 'poor'
}
