import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'
import en from './en.json'

// 从本地存储读取语言偏好，默认为中文
function getStoredLocale(): string {
  try {
    const stored = uni.getStorageSync('locale')
    if (stored === 'zh-CN' || stored === 'en') {
      return stored
    }
  } catch {
    // storage 不可用时忽略
  }
  return 'zh-CN'
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getStoredLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

/**
 * 切换应用语言
 * 写入本地存储以便下次启动时持久化
 */
export function setLocale(lang: 'zh-CN' | 'en'): void {
  i18n.global.locale.value = lang
  try {
    uni.setStorageSync('locale', lang)
  } catch {
    console.warn('[i18n] Failed to persist locale')
  }
}

/**
 * 获取当前语言
 */
export function getLocale(): string {
  return i18n.global.locale.value
}

export function setupI18n() {
  return i18n
}

export { i18n }
export default i18n
