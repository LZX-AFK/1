import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// UnoCSS 暂不在此加载（ESM-only 与当前 uni CLI config bundler 不兼容）
// Phase 1 升级到 vite.config.mts 或改用 unocss-preset-uno CJS 版本时启用

export default defineConfig({
  plugins: [
    uni({
      inputDir: 'src',
    }),
  ],
})
