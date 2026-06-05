<template>
  <view class="ctb" :style="{ paddingBottom: safeAreaBottom + 'px' }">
    <view class="ctb__bar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="ctb__item"
        :class="{
          'ctb__item--active': current === tab.key,
          'ctb__item--mid': tab.key === 'record'
        }"
        @tap="handleTap(tab)"
      >
        <!-- 中间录音按钮：凸起圆形 -->
        <view v-if="tab.key === 'record'" class="ctb__mid">
          <text class="ctb__mid-icon">{{ tab.icon }}</text>
        </view>
        <!-- 普通 Tab -->
        <template v-else>
          <text class="ctb__icon">{{ tab.icon }}</text>
          <text class="ctb__label">{{ tab.label }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// --- Props ---
const props = withDefaults(defineProps<{
  current?: 'home' | 'courses' | 'record' | 'knowledge' | 'profile'
}>(), {
  current: 'home'
})

// --- 安全区 ---
const safeAreaBottom = computed(() => {
  // #ifdef H5
  const h = typeof window !== 'undefined'
    ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0
    : 0
  return h
  // #endif
  // #ifndef H5
  return 0
  // #endif
})

// --- Tab 配置 ---
interface TabItem {
  key: 'home' | 'courses' | 'record' | 'knowledge' | 'profile'
  icon: string
  label: string
  route: string
}

const tabs: TabItem[] = [
  { key: 'home',      icon: '🏠',  label: '首页',   route: '/pages/home/index' },
  { key: 'courses',   icon: '📚',  label: '课程',   route: '/pages/courses/index' },
  { key: 'record',    icon: '🎙️', label: '',       route: '/pages/record/prepare' },
  { key: 'knowledge', icon: '📖',  label: '知识库', route: '/pages/knowledge/index' },
  { key: 'profile',   icon: '👤',  label: '我的',   route: '/pages/profile/index' },
]

// --- 点击跳转 ---
function handleTap(tab: TabItem) {
  if (tab.key === props.current) return
  uni.switchTab({ url: tab.route })
}
</script>

<style lang="scss" scoped>
.ctb {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;
}

.ctb__bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 112rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #E5E7EB;
  pointer-events: auto;
}

/* #ifdef H5 */
.ctb {
  max-width: 430px;
  left: 50%;
  transform: translateX(-50%);
}
/* #endif */

// --- 普通 Tab 项 ---
.ctb__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  height: 112rpx;
  flex: 1;
  position: relative;
}

.ctb__icon {
  font-size: 40rpx;
  line-height: 1;
}

.ctb__label {
  font-size: 20rpx;
  color: #6B7280;
  line-height: 1;
}

.ctb__item--active .ctb__label {
  color: #4F46E5;
  font-weight: 600;
}

// --- 中间录音按钮 ---
.ctb__item--mid {
  justify-content: flex-start;
}

.ctb__mid {
  width: 112rpx;
  height: 112rpx;
  border-radius: 9999rpx;
  background: #4F46E5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -40rpx;
  box-shadow: 0 8rpx 24rpx rgba(79, 70, 229, 0.35);
  &:active {
    opacity: 0.85;
    transform: scale(0.95);
  }
}

.ctb__mid-icon {
  font-size: 48rpx;
  line-height: 1;
}
</style>
