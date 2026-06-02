<!--
  TimelineBar.vue — Canvas 时间轴横条组件
  绘制：背景轨道 → 进度填充 → 标记圆点 → 当前位置指示器
-->
<template>
  <view class="tlb">
    <view class="tlb__canvas-wrap">
      <!-- @touchstart 透传给父层 -->
      <canvas
        :style="{ width: canvasStyleWidth, height: canvasHeight + 'px' }"
        :canvas-id="canvasId"
        type="2d"
        id="timelineCanvas"
        class="tlb__canvas"
        @touchstart="$emit('barTap', $event)"
      ></canvas>
    </view>

    <!-- 时间标签 -->
    <view class="tlb__labels">
      <text class="tlb__label">00:00</text>
      <text class="tlb__label">{{ formatDuration(durationMs) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue'
import type { Marker } from '@/stores/session'

// ========== Props ==========
const props = defineProps<{
  /** 录音总时长 (ms) */
  durationMs: number
  /** 标记列表 */
  markers: Marker[]
}>()

// ========== Emits ==========
defineEmits<{
  barTap: [event: any]
}>()

// ========== Constants ==========
const canvasId = 'timelineCanvas'
const canvasHeight = 36
const barHeight = 8
const barRadius = 4
const markerRadius = 5
const barTopY = (canvasHeight - barHeight) / 2
const barPadding = markerRadius + 4 // 两端留白

// 标记颜色映射
const markerColors: Record<string, string> = {
  didnt_understand: '#FF9100',
  important: '#FFC107',
  exam_tip: '#FF5252',
  question: '#448AFF',
  note: '#00D9A6',
}

// ========== State ==========
const canvasStyleWidth = ref('100%')
let canvasNode: any = null
let ctx: CanvasRenderingContext2D | null = null
let canvasWidth = 0
let dpr = 1

// 防止重复初始化
let isInitialized = false
let drawTimer: ReturnType<typeof setTimeout> | null = null

// ========== Lifecycle ==========
const instance = getCurrentInstance()

onMounted(() => {
  nextTick(() => {
    initCanvas()
  })
})

onUnmounted(() => {
  if (drawTimer) clearTimeout(drawTimer)
})

// ========== Watch ==========
watch(
  () => [props.durationMs, props.markers.length],
  () => {
    if (isInitialized) {
      // Debounce draw calls
      if (drawTimer) clearTimeout(drawTimer)
      drawTimer = setTimeout(() => draw(), 50)
    }
  },
)

// ========== Canvas Init ==========
function initCanvas() {
  const query = uni.createSelectorQuery()
  if (instance) query.in(instance)

  query
    .select('#timelineCanvas')
    .fields({ node: true, size: true })
    .exec((res: any) => {
      if (!res || !res[0] || !res[0].node) {
        console.warn('[TimelineBar] Canvas node not found, retrying...')
        // 延迟重试
        setTimeout(() => initCanvas(), 200)
        return
      }

      const canvas = res[0].node
      canvasNode = canvas
      canvasWidth = res[0].width
      dpr = uni.getSystemInfoSync().pixelRatio || 2

      // 设置 canvas 物理像素
      canvas.width = canvasWidth * dpr
      canvas.height = canvasHeight * dpr

      ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }

      isInitialized = true
      draw()
    })
}

// ========== Drawing ==========
function draw() {
  if (!ctx || !canvasWidth) return

  const w = canvasWidth
  const h = canvasHeight

  // 清空画布
  ctx.clearRect(0, 0, w, h)

  // 可用绘制宽度
  const drawWidth = w - barPadding * 2
  const barLeft = barPadding
  const barRight = w - barPadding

  // ---- 1. 背景轨道 ----
  ctx.fillStyle = '#2E2E4A'
  ctx.beginPath()
  roundedRect(ctx, barLeft, barTopY, drawWidth, barHeight, barRadius)
  ctx.fill()

  // ---- 2. 进度填充 ----
  const progress = props.durationMs > 0
    ? Math.min(1, props.durationMs / Math.max(props.durationMs, 60000))
    : 0.01 // 最小 1% 可见

  const progressWidth = Math.max(barRadius * 2, drawWidth * progress)

  // 渐变色进度条
  const gradient = ctx.createLinearGradient(barLeft, 0, barLeft + progressWidth, 0)
  gradient.addColorStop(0, '#6C63FF')
  gradient.addColorStop(1, '#8B85FF')
  ctx.fillStyle = gradient
  ctx.beginPath()
  roundedRect(ctx, barLeft, barTopY, progressWidth, barHeight, barRadius)
  ctx.fill()

  // ---- 3. 标记圆点 ----
  props.markers.forEach((marker) => {
    const ratio = props.durationMs > 0
      ? Math.min(1, marker.timestampMs / Math.max(props.durationMs, 1))
      : 0
    const x = barLeft + drawWidth * ratio
    const y = barTopY + barHeight / 2
    const color = markerColors[marker.label] || '#6C63FF'

    // 光晕
    ctx.beginPath()
    ctx.arc(x, y, markerRadius + 3, 0, Math.PI * 2)
    ctx.fillStyle = color + '40' // 25% 透明度
    ctx.fill()

    // 实心点
    ctx.beginPath()
    ctx.arc(x, y, markerRadius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // 白边
    ctx.beginPath()
    ctx.arc(x, y, markerRadius, 0, Math.PI * 2)
    ctx.strokeStyle = '#1A1A2E'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })

  // ---- 4. 当前位置指示器（进度条末端） ----
  if (progress > 0 && progress < 1) {
    const indicatorX = barLeft + progressWidth
    const indicatorY = barTopY + barHeight / 2

    ctx.beginPath()
    ctx.arc(indicatorX, indicatorY, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
  }
}

/** 绘制圆角矩形 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  r = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** 格式化毫秒为 MM:SS */
function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.tlb {
  padding: $spacing-xs $spacing-lg 0;
}

.tlb__canvas-wrap {
  width: 100%;
  overflow: hidden;
  border-radius: $radius-sm;
}

.tlb__canvas {
  display: block;
  width: 100%;
}

.tlb__labels {
  display: flex;
  justify-content: space-between;
  padding: 4rpx 0 0;
}

.tlb__label {
  font-size: 18rpx;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
}
</style>
