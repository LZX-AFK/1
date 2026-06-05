<template>
  <view class="ctb">
    <view class="ctb__bar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="ctb__item"
        :class="{
          'ctb__item--active': currentKey === tab.key,
          'ctb__item--mid': tab.key === 'record'
        }"
        @tap="handleTap(tab)"
      >
        <!-- 中间录音按钮：凸起圆形 -->
        <view v-if="tab.key === 'record'" class="ctb__mid">
          <image class="ctb__mid-img" :src="tab.iconPath" mode="aspectFit" />
        </view>
        <!-- 普通 Tab -->
        <template v-else>
          <image class="ctb__icon-img" :src="currentKey === tab.key ? tab.activeIconPath : tab.iconPath" mode="aspectFit" />
          <text class="ctb__label">{{ tab.label }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

// --- Tab 配置 ---
interface TabItem {
  key: 'home' | 'courses' | 'record' | 'knowledge' | 'profile'
  iconPath: string
  activeIconPath?: string
  label: string
  route: string
}

const tabs: TabItem[] = [
  { key: 'home',      iconPath: '/static/tabbar/home.png',      activeIconPath: '/static/tabbar/home-active.png',      label: '首页',   route: '/pages/home/index' },
  { key: 'courses',   iconPath: '/static/tabbar/courses.png',   activeIconPath: '/static/tabbar/courses-active.png',   label: '课程',   route: '/pages/courses/index' },
  { key: 'record',    iconPath: '/static/tabbar/record-mid.png',                                                         label: '',       route: '/pages/record/prepare' },
  { key: 'knowledge', iconPath: '/static/tabbar/knowledge.png', activeIconPath: '/static/tabbar/knowledge-active.png', label: '知识库', route: '/pages/knowledge/index' },
  { key: 'profile',   iconPath: '/static/tabbar/profile.png',   activeIconPath: '/static/tabbar/profile-active.png',   label: '我的',   route: '/pages/profile/index' },
]

// --- 当前 Tab 检测 ---
function getCurrentTabKey(): string {
  const pages = getCurrentPages()
  if (!pages.length) return 'home'
  const route = pages[pages.length - 1]?.route ?? ''
  if (route.includes('courses')) return 'courses'
  if (route.includes('record')) return 'record'
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

.ctb__icon-img {
  width: 44rpx;
  height: 44rpx;
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

.ctb__mid-img {
  width: 56rpx;
  height: 56rpx;
}
</style>
