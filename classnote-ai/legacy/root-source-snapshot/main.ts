import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { setupI18n } from './locales'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  const i18n = setupI18n()

  app.use(pinia)
  app.use(i18n)

  return { app }
}
