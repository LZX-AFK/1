// ── 枚举 ───────────────────────────────────────────────────────
export type MarkType = 'unclear' | 'keypoint' | 'examPoint' | 'question'

export type NoteStyle = 'balanced' | 'detailed' | 'concise'

export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced' | 'native'

export type StudyGoal = 'examPrep' | 'comprehension' | 'research' | 'language'

// ── 设备 ───────────────────────────────────────────────────────
export interface DeviceState {
  connected: boolean
  name: string
  battery: number       // 0-100
  ancEnabled: boolean
  noiseReductionEnabled: boolean
}

// ── 学生档案 ───────────────────────────────────────────────────
export interface StudentProfile {
  id: string
  name: string
  university: string
  major: string
  year: number
  nativeLanguage: string
  englishLevel: EnglishLevel
  studyGoal: StudyGoal
  avatar?: string
}

export interface AIPreferences {
  noteStyle: NoteStyle
  keepTermsInEnglish: boolean
  autoExtractExamPoints: boolean
  expandUnclearMarks: boolean
  linkMistakesToCourses: boolean
}

// ── 课程 ───────────────────────────────────────────────────────
export interface Course {
  id: string
  name: string
  instructor: string
  schedule: string      // e.g. "周一/三 13:00"
  location: string
  semester: string
  color: string         // 课程主题色
  icon: string          // emoji or icon key
  recordingCount: number
  noteCount: number
  markCount: number
  accuracy: number      // 平均转写准确率 0-100
  status?: 'active' | 'done'
}

// ── 录音配置 ───────────────────────────────────────────────────
export interface RecordingConfig {
  courseId: string
  lectureTitle?: string
  lectureLanguage: string   // e.g. 'English'
  summaryLanguage: string   // e.g. '中文'
  keepTermsInEnglish: boolean
  noteStyle: NoteStyle
}

// ── 录音记录 ───────────────────────────────────────────────────
export interface Recording {
  id: string
  courseId: string
  title: string
  date: string          // ISO date
  duration: number      // seconds
  accuracy: number      // 0-100
  markCount: number
  noteCount: number
  status: 'processing' | 'done' | 'error'
}

// ── 时间轴标记 ─────────────────────────────────────────────────
export interface TimelineMarkItem {
  id: string
  recordingId: string
  timestamp: number     // seconds from start
  type: MarkType
  excerpt: string       // 标记时的转写文本片段
  aiExplanation?: string
}

// ── AI 笔记 ────────────────────────────────────────────────────
export interface TopicNode {
  title: string
  content: string
  subTopics?: TopicNode[]
}

export interface TermCard {
  term: string
  definition: string
  originalLanguage: string
}

export interface ReviewTask {
  id: string
  type: 'flashcard' | 'quiz' | 'reread'
  content: string
  dueDate: string
  done: boolean
}

export interface PersonalizedAdaptation {
  insight: string       // e.g. "这是你的薄弱考点"
  terms: TermCard[]
  suggestions: string[]
}

export interface AINote {
  id: string
  recordingId: string
  courseId: string
  title: string
  date: string
  duration: number
  structuredNotes: TopicNode[]
  keyPoints: string[]
  marks: TimelineMarkItem[]
  personalized: PersonalizedAdaptation
  tags: string[]
}

// ── 错题 ───────────────────────────────────────────────────────
export interface Mistake {
  id: string
  courseId: string
  recordingId?: string
  question: string
  wrongAnswer: string
  correctAnswer: string
  explanation: string
  tags: string[]
  createdAt: string
  reviewCount: number
  mastered: boolean
}
