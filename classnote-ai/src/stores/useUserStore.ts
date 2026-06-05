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
    completionRate: 0,
    major: '',
    secondMajor: '',
    stage: '',
    nativeLanguage: '',
    englishLevel: '',
    goals: [],
    summaryPreferences: [],
    explanationDepth: 'standardClass',
    coursePreferences: {},
  }
}

export const useUserStore = defineStore('user', () => {
  const profile = ref<StudentProfile>({
    major: '',
    nativeLanguage: '',
    englishLevel: '',
    studyGoal: '',
    completedCourses: 0,
    totalStudyHours: 0,
    streakDays: 0,
  })

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

  const displayName = computed(() => '听刻用户')

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
