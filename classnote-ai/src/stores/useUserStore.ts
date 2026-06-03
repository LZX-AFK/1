import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StudentProfile, AIPreferences } from '@/types/index'

const mockProfile: StudentProfile = {
  id: 'user-001',
  name: '陈明',
  university: '新哈福大学',
  major: '生物学',
  year: 2,
  nativeLanguage: '中文',
  englishLevel: 'advanced',
  studyGoal: 'examPrep',
}

const mockPreferences: AIPreferences = {
  noteStyle: 'balanced',
  keepTermsInEnglish: true,
  autoExtractExamPoints: true,
  expandUnclearMarks: true,
  linkMistakesToCourses: true,
}

export const useUserStore = defineStore('user', () => {
  const profile = ref<StudentProfile>(mockProfile)
  const preferences = ref<AIPreferences>(mockPreferences)

  function updateProfile(data: Partial<StudentProfile>) {
    profile.value = { ...profile.value, ...data }
  }

  function updatePreferences(data: Partial<AIPreferences>) {
    preferences.value = { ...preferences.value, ...data }
  }

  return { profile, preferences, updateProfile, updatePreferences }
})
