<template>
  <view v-if="visible" class="mask">
    <view class="card">
      <text class="card__icon">🧠</text>
      <text class="card__title">{{ $t('record.processingTitle') }}</text>
      <view class="card__steps">
        <view v-for="(step, i) in steps" :key="i" class="card__step">
          <view class="card__step-status">
            <text v-if="i < currentStep" class="card__step-check">✓</text>
            <text v-else-if="i === currentStep" class="card__step-spinner">●</text>
            <text v-else class="card__step-dot">○</text>
          </view>
          <text class="card__step-label" :class="{ 'card__step-label--done': i < currentStep }">
            {{ step }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ done: [] }>()

const steps = [
  t('record.processingStepTranscribing'),
  t('record.processingStepAnalyzing'),
  t('record.processingStepKeyPoints'),
  t('record.processingStepGenerating'),
  t('record.processingStepPersonalizing'),
]
const currentStep = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => props.visible, (v) => {
  if (v) {
    currentStep.value = 0
    startSimulation()
  } else {
    stopSimulation()
  }
})

function startSimulation() {
  stopSimulation()
  timer = setInterval(() => {
    if (currentStep.value < steps.length) {
      currentStep.value++
    }
    if (currentStep.value >= steps.length) {
      stopSimulation()
      setTimeout(() => emit('done'), 400)
    }
  }, 800)
}

function stopSimulation() {
  if (timer) { clearInterval(timer); timer = null }
}

onUnmounted(() => stopSimulation())
</script>

<style lang="scss" scoped>
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); z-index: 2000;
  display: flex; align-items: center; justify-content: center;
}
.card {
  width: calc(100% - 96rpx); max-width: 380px;
  background: #fff; border-radius: 24rpx; padding: 48rpx 40rpx;
  display: flex; flex-direction: column; align-items: center;
}
.card__icon { font-size: 64rpx; margin-bottom: 16rpx; }
.card__title { font-size: 32rpx; font-weight: 700; color: #1F2937; margin-bottom: 32rpx; text-align: center; }
.card__steps { width: 100%; display: flex; flex-direction: column; gap: 20rpx; }
.card__step { display: flex; align-items: center; gap: 16rpx; }
.card__step-status { width: 40rpx; text-align: center; flex-shrink: 0; }
.card__step-check { font-size: 28rpx; color: #10B981; }
.card__step-spinner { font-size: 28rpx; color: #4F46E5; animation: pulse 0.8s infinite; }
.card__step-dot { font-size: 28rpx; color: #D1D5DB; }
.card__step-label { font-size: 28rpx; color: #6B7280; }
.card__step-label--done { color: #10B981; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
