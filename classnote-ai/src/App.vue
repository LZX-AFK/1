<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('[ClassNote AI] App Launch')
})

onShow(() => {
  console.log('[ClassNote AI] App Show')
})

onHide(() => {
  console.log('[ClassNote AI] App Hide')
})
</script>

<style lang="scss">
@import '@/styles/variables.scss';

page {
  background-color: $color-bg-page;
  color: $color-text-primary;
  font-family: $font-family-base;
  font-size: $font-size-md;
  line-height: $line-height-normal;
  -webkit-font-smoothing: antialiased;
}

.safe-area-bottom {
  padding-bottom: $safe-area-bottom-env;
  padding-bottom: $safe-area-bottom-var;
}

/* 全局卡片 */
.card {
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-md;
}

/* 全局主按钮 */
.btn-primary {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: #FFFFFF;
  border-radius: $radius-round;
  padding: $spacing-sm $spacing-xl;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  border: none;
  box-shadow: $shadow-glow-primary;

  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

/* 隐藏滚动条 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
