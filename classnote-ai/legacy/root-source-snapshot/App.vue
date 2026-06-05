<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('[ClassNote AI] App launched')
})
</script>

<style lang="scss">
@import '@/styles/variables.scss';

/* ═══════════ 全局重置 ═══════════ */
*,
*::before,
*::after {
  box-sizing: border-box;
}

page {
  background-color: $bg-page;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: $text-primary;
  font-size: 28rpx;
  -webkit-font-smoothing: antialiased;
  /* uni-app H5 默认渲染 rpx 为 rem，基准基于 window.innerWidth。
     不通过 JS 改 font-size —— 仅通过 CSS max-width 限制移动端容器宽度。
     页面内部的 .home-page 使用 H5 条件编译设 max-width: 430px 实现桌面端居中。 */
}
</style>
