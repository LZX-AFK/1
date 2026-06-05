<template>
  <view class="ctb">
    <view class="ctb__bar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="ctb__item"
        :class="{ 'ctb__item--active': currentKey === tab.key }"
        @tap="handleTap(tab)"
      >
        <text class="ctb__icon-text">{{ tab.icon }}</text>
        <text class="ctb__label">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

// --- Tab 配置 ---
interface TabItem {
  key: 'home' | 'courses' | 'knowledge' | 'profile'
  icon: string
  label: string
  route: string
}

const tabs: TabItem[] = [
  { key: 'home',      icon: '▲', label: '首页',   route: '/pages/home/index' },
  { key: 'courses',   icon: '■', label: '课程',   route: '/pages/courses/index' },
  { key: 'knowledge', icon: '◆', label: '知识库', route: '/pages/knowledge/index' },
  { key: 'profile',   icon: '◉', label: '我的',   route: '/pages/profile/index' },
]

// --- 当前 Tab 检测 ---
function getCurrentTabKey(): string {
  const pages = getCurrentPages()
  if (!pages.length) return 'home'
  const route = pages[pages.length - 1]?.route ?? ''
  if (route.includes('courses')) return 'courses'
  if (route.includes('knowledge')) return 'knowledge'
  if (route.includes('profile')) return 'profile'
  return 'home'
}

const currentKey = ref(getCurrentTabKey())

// 监听路由变化更新 currentKey
watch(
  () => {
    const pages = getCurrentPages()
    return pages[pages.length - 1]?.route ?? ''
  },
  () => { currentKey.value = getCurrentTabKey() },
  { immediate: true }
)

onMounted(() => {
  currentKey.value = getCurrentTabKey()
})

// --- 点击跳转 ---
function handleTap(tab: TabItem) {
  if (tab.key === currentKey.value) return
  uni.switchTab({ url: tab.route })
}
</script>

<style lang="scss" scoped>
.ctb {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  pointer-events: none;
}

.ctb__bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100rpx;
  padding-bottom: env(safe-area-inset-bottom);
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
  height: 100rpx;
  flex: 1;
  position: relative;
}

.ctb__icon-text {
  font-size: 40rpx;
  color: #9CA3AF;
  line-height: 1;
}

.ctb__item--active .ctb__icon-text {
  color: #4F46E5;
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
</style>
