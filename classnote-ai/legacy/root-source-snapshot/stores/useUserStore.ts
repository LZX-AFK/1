import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StudentProfile, AIPreferences } from '@/types'

export interface LearningProfile {
  completionRate: number
  major: string
  secondMajor: string
  stage: string
  nativeLanguage: string
  englishLevel: string
  goals: string[]
  summaryPreferences: string[]
  explanationDepth: string
  coursePreferences: Record<string, string[]>
}

function defaultLearningProfile(): LearningProfile {
  return {
    completionRate: 70,
    major: 'Biology',
    secondMajor: 'Computer Science',
    stage: '本科 / 考研准备',
    nativeLanguage: '中文',
    englishLevel: 'IELTS 7.0',
    goals: ['finalExam', 'gradExam', 'classUnderstanding'],
    summaryPreferences: ['structuredNotes', 'examFirst', 'keepTermsEnglish'],
    explanationDepth: 'standardClass',
    coursePreferences: {
      'biology-101': ['examFirst', 'termExplanation', 'mechanismFlow'],
      'java-prog': ['conceptFirst', 'codeExamples', 'interviewQuestions'],
      'chem-201': ['conceptCompare', 'commonMistakes', 'formulaDerivation'],
    },
  }
}

export const useUserStore = defineStore('user', () => {
  // --- Mock 学生档案 ---
  const profile = ref<StudentProfile>({
    major: 'Biology',
    nativeLanguage: '中文',
    englishLevel: 'IELTS 7.0',
    studyGoal: '备考期末',
    completedCourses: 3,
    totalStudyHours: 48,
    streakDays: 12,
  })

  // --- Mock AI 偏好 ---
  const preferences = ref<AIPreferences>({
    summaryStyle: 'detailed',
    showTimeline: true,
    autoGenerateTerms: true,
    personalizedAdaptation: true,
    notificationReminder: true,
  })

  // --- App 语言 ---
  const appLanguage = ref<string>('zh-CN')

  // --- 个性化学习档案 ---
  const learningProfile = ref<LearningProfile>(defaultLearningProfile())

  const displayName = computed(() => 'Alex')

  function updateProfile(partial: Partial<StudentProfile>) {
    profile.value = { ...profile.value, ...partial }
  }

  function updatePreferences(partial: Partial<AIPreferences>) {
    preferences.value = { ...preferences.value, ...partial }
  }

  function setAppLanguage(lang: string) {
    appLanguage.value = lang
    uni.setStorageSync('locale', lang)
  }

  function togglePersonalizedSummary() {
    preferences.value.personalizedAdaptation = !preferences.value.personalizedAdaptation
  }

  function toggleAutoGenerateTerms() {
    preferences.value.autoGenerateTerms = !preferences.value.autoGenerateTerms
  }

  function toggleNotificationReminder() {
    preferences.value.notificationReminder = !preferences.value.notificationReminder
  }

  // --- 学习档案方法 ---
  function toggleLearningGoal(goal: string) {
    const idx = learningProfile.value.goals.indexOf(goal)
    if (idx >= 0) {
      learningProfile.value.goals.splice(idx, 1)
    } else {
      learningProfile.value.goals.push(goal)
    }
  }

  function toggleSummaryPreference(pref: string) {
    const idx = learningProfile.value.summaryPreferences.indexOf(pref)
    if (idx >= 0) {
      learningProfile.value.summaryPreferences.splice(idx, 1)
    } else {
      learningProfile.value.summaryPreferences.push(pref)
    }
  }

  function setExplanationDepth(depth: string) {
    learningProfile.value.explanationDepth = depth
  }

  function toggleCoursePreference(courseId: string, preference: string) {
    const arr = learningProfile.value.coursePreferences
    if (!arr[courseId]) arr[courseId] = []
    const idx = arr[courseId].indexOf(preference)
    if (idx >= 0) {
      arr[courseId].splice(idx, 1)
    } else {
      arr[courseId].push(preference)
    }
  }

  function saveLearningProfile() {
    learningProfile.value.completionRate = 100
    // 同步到现有 profile 保持兼容
    profile.value = {
      ...profile.value,
      major: learningProfile.value.major,
      nativeLanguage: learningProfile.value.nativeLanguage,
      englishLevel: learningProfile.value.englishLevel,
    }
  }

  return {
    profile,
    preferences,
    appLanguage,
    learningProfile,
    displayName,
    updateProfile,
    updatePreferences,
    setAppLanguage,
    togglePersonalizedSummary,
    toggleAutoGenerateTerms,
    toggleNotificationReminder,
    toggleLearningGoal,
    toggleSummaryPreference,
    setExplanationDepth,
    toggleCoursePreference,
    saveLearningProfile,
  }
})
