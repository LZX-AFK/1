<template>
  <view
    class="afb"
    :class="{ 'afb--dragging': isDragging, 'afb--placed': agentStore.floatingPosition.set }"
    :style="posStyle"
    @touchstart.stop.prevent="onTouchStart"
    @touchmove.stop.prevent="onTouchMove"
    @touchend.stop.prevent="onTouchEnd"
  >
    <view class="afb__inner">
      <text class="afb__char">听</text>
    </view>
    <text class="afb__label">听刻</text>
    <view v-if="agentStore.isAgentAvailable" class="afb__glow" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentStore } from '@/stores/useAgentStore'

const agentStore = useAgentStore()

const posX = ref(0)
const posY = ref(0)
const isDragging = ref(false)
const dragMoved = ref(false)
let startX = 0; let startY = 0; let originX = 0; let originY = 0

function getScreenBounds() {
  const sys = uni.getSystemInfoSync()
  return { w: sys.windowWidth, h: sys.windowHeight, safeTop: sys.safeArea?.top ?? 0, safeBot: sys.safeAreaInsets?.bottom ?? 0 }
}

const posStyle = computed(() => {
  if (posX.value === 0 && posY.value === 0 && !agentStore.floatingPosition.set) {
    return { bottom: '180rpx', right: '32rpx' }
  }
  return { left: posX.value + 'px', top: posY.value + 'px' }
})

function onTouchStart(e: TouchEvent) {
  dragMoved.value = false
  isDragging.value = true
  const t = e.touches[0]
  startX = t.clientX; startY = t.clientY
  if (posX.value === 0 && posY.value === 0) {
    const b = getScreenBounds()
    originX = b.w - 80; originY = b.h - 220
    posX.value = originX; posY.value = originY
  }
  originX = posX.value; originY = posY.value
}

function onTouchMove(e: TouchEvent) {
  const t = e.touches[0]
  const dx = t.clientX - startX
  const dy = t.clientY - startY
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.value = true
  const b = getScreenBounds()
  let nx = originX + dx
  let ny = originY + dy
  nx = Math.max(0, Math.min(b.w - 60, nx))
  ny = Math.max(b.safeTop, Math.min(b.h - b.safeBot - 120, ny))
  posX.value = nx; posY.value = ny
}

function onTouchEnd() {
  isDragging.value = false
  agentStore.setFloatingPosition(posX.value, posY.value)
  if (!dragMoved.value) {
    uni.navigateTo({ url: '/pages/agent/index' })
  }
}
</script>

<style lang="scss" scoped>
.afb {
  position: fixed;
  z-index: 800;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  transition: opacity .2s;
  touch-action: none;
  -webkit-user-drag: none;
  pointer-events: auto;
}
.afb--dragging { opacity: .9; transition: none; }

.afb__inner {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: #4F46E5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(79,70,229,.3);
  &:active { opacity: .85; transform: scale(.95); }
}
.afb__char { font-size: 38rpx; color: #FFFFFF; font-weight: 700; }

.afb__label {
  font-size: 20rpx;
  color: #6B7280;
  font-weight: 500;
}

.afb__glow {
  position: absolute;
  top: -12rpx;
  left: -12rpx;
  width: 136rpx;
  height: 136rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(79,70,229,.25);
  animation: afb-glow 2.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes afb-glow {
  0%, 100% { opacity: .3; transform: scale(1); }
  50% { opacity: .8; transform: scale(1.12); }
}
</style>
