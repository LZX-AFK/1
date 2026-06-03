import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'
import en from './en.json'

let initialLocale = 'zh-CN'
try {
  initialLocale = (uni.getStorageSync('locale') as string) || 'zh-CN'
} catch {
  // fallback
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'zh-CN',
  globalInjection: true,
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export type AppLocale = 'zh-CN' | 'en'

export function setLocale(locale: AppLocale) {
  ;(i18n.global.locale as { value: string }).value = locale
  uni.setStorageSync('locale', locale)
}
