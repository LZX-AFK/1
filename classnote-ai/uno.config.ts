import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
  ],
  theme: {
    colors: {
      primary: '#4F46E5',
      'primary-dark': '#3730A3',
      accent: '#8B5CF6',
      'accent-light': '#F5F3FF',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      'bg-page': '#F3F4F6',
      'bg-card': '#FFFFFF',
      'text-primary': '#1F2937',
      'text-secondary': '#6B7280',
      'text-tertiary': '#9CA3AF',
    },
  },
  shortcuts: {
    'page-wrap': 'min-h-screen bg-[#F3F4F6]',
    'card-wrap': 'bg-white rounded-2xl p-4 shadow-sm',
  },
})
