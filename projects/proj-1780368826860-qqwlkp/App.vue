<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('[ClassNote AI] App Launch')
  // 检查登录状态
  const token = uni.getStorageSync('auth_token')
  if (token) {
    console.log('[ClassNote AI] 已登录')
  }
})

onShow(() => {
  console.log('[ClassNote AI] App Show')
})

onHide(() => {
  console.log('[ClassNote AI] App Hide')
})
</script>

<style lang="scss">
/* 全局样式 */
@import '@/styles/variables.scss';

page {
  background-color: $color-bg-primary;
  color: $color-text-primary;
  font-family: $font-family-base;
  font-size: $font-size-md;
  line-height: $line-height-normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: $safe-area-bottom;
  padding-bottom: $safe-area-bottom-env;
}

/* 通用工具类 */
.text-primary { color: $color-text-primary; }
.text-secondary { color: $color-text-secondary; }
.text-tertiary { color: $color-text-tertiary; }
.text-brand { color: $color-primary; }
.text-success { color: $color-success; }
.text-warning { color: $color-warning; }
.text-error { color: $color-error; }

.bg-primary { background-color: $color-bg-primary; }
.bg-secondary { background-color: $color-bg-secondary; }
.bg-card { background-color: $color-bg-card; }
.bg-elevated { background-color: $color-bg-elevated; }

/* 圆角卡片 */
.card {
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-md;
}

/* 渐变按钮 */
.btn-primary {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: #FFFFFF;
  border-radius: $radius-round;
  padding: $spacing-sm $spacing-xl;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  border: none;
  box-shadow: $shadow-glow-primary;
  transition: all $transition-normal;

  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

/* 滚动条隐藏 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
