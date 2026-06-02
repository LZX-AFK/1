<!--
  MarkerSheet.vue — 标记选择弹层组件
  底部弹出：标签选择 + 文字备注 + 确认/取消
-->
<template>
  <!-- 遮罩层 -->
  <view
    v-if="visible"
    class="ms__mask"
    :class="{ 'ms__mask--visible': visible }"
    @click="onCancel"
    @touchmove.stop.prevent="() => {}"
  />

  <!-- 底部弹层 -->
  <view class="ms" :class="{ 'ms--visible': visible }">
    <!-- 拖拽条 -->
    <view class="ms__handle">
      <view class="ms__handle-bar" />
    </view>

    <!-- 标题 -->
    <view class="ms__header">
      <text class="ms__title">Add Marker</text>
      <text class="ms__time">{{ formatTime(currentTimeMs) }}</text>
    </view>

    <!-- 标签选择 -->
    <text class="ms__section-label">Label</text>
    <view class="ms__labels">
      <view
        v-for="item in markerTypes"
        :key="item.value"
        class="ms__label-chip"
        :class="{
          'ms__label-chip--active': selectedLabel === item.value,
        }"
        :style="selectedLabel === item.value ? { borderColor: item.color, backgroundColor: item.color + '18' } : {}"
        @click="selectedLabel = item.value"
      >
        <text class="ms__label-icon">{{ item.icon }}</text>
        <text
          class="ms__label-text"
          :style="selectedLabel === item.value ? { color: item.color } : {}"
        >
          {{ item.label }}
        </text>
      </view>
    </view>

    <!-- 备注输入 -->
    <text class="ms__section-label">Note (optional)</text>
    <view class="ms__note-wrap">
      <textarea
        v-model="noteText"
        class="ms__note-input"
        placeholder="Add a note..."
        placeholder-style="color: #6E6E8A;"
        :maxlength="200"
        :auto-height="true"
        :show-confirm-bar="false"
        :adjust-position="true"
      />
      <text class="ms__note-count">{{ noteText.length }}/200</text>
    </view>

    <!-- 操作按钮 -->
    <view class="ms__actions">
      <view class="ms__btn ms__btn--cancel" @click="onCancel">
        <text class="ms__btn-text">Cancel</text>
      </view>
      <view
        class="ms__btn ms__btn--confirm"
        :class="{ 'ms__btn--disabled': !selectedLabel }"
        @click="onConfirm"
      >
        <text class="ms__btn-text ms__btn-text--confirm">Add Marker</text>
      </view>
    </view>

    <!-- 安全区占位 -->
    <view class="ms__safe-area" />
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// ========== Props ==========
const props = defineProps<{
  visible: boolean
  currentTimeMs: number
  transcriptOffset: number
}>()

// ========== Emits ==========
const emit = defineEmits<{
  confirm: [data: { label: string; note: string; timestampMs: number; transcriptOffset: number }]
  cancel: []
}>()

// ========== Marker Types ==========
const markerTypes = [
  { value: 'didnt_understand', label: 'Didn\'t get it', icon: '❓', color: '#FF9100' },
  { value: 'important', label: 'Important', icon: '⭐', color: '#FFC107' },
  { value: 'exam_tip', label: 'Exam tip', icon: '📝', color: '#FF5252' },
  { value: 'question', label: 'Question', icon: '💬', color: '#448AFF' },
  { value: 'note', label: 'Note', icon: '📌', color: '#00D9A6' },
] as const

// ========== State ==========
const selectedLabel = ref<string>('')
const noteText = ref('')

// ========== Watch ==========
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 重置表单
    selectedLabel.value = ''
    noteText.value = ''
  }
})

// ========== Methods ==========
function onConfirm() {
  if (!selectedLabel.value) return

  emit('confirm', {
    label: selectedLabel.value,
    note: noteText.value.trim(),
    timestampMs: props.currentTimeMs,
    transcriptOffset: props.transcriptOffset,
  })
}

function onCancel() {
  emit('cancel')
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
/* ---- 遮罩 ---- */
.ms__mask {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: $z-index-modal;
  opacity: 0;
  pointer-events: none;
  transition: opacity $transition-normal;

  &--visible {
    opacity: 1;
    pointer-events: auto;
  }
}

/* ---- 弹层 ---- */
.ms {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-index-popup;
  background-color: $color-bg-secondary;
  border-radius: $radius-xl $radius-xl 0 0;
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.4);
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  max-height: 80vh;
  overflow-y: auto;

  &--visible {
    transform: translateY(0);
  }
}

.ms__handle {
  display: flex;
  justify-content: center;
  padding: $spacing-sm;
}

.ms__handle-bar {
  width: 64rpx;
  height: 8rpx;
  background-color: $color-bg-elevated;
  border-radius: $radius-round;
}

/* ---- 头部 ---- */
.ms__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 $spacing-lg $spacing-sm;
}

.ms__title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.ms__time {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  font-family: $font-family-mono;
}

/* ---- 分区标签 ---- */
.ms__section-label {
  display: block;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: $color-text-tertiary;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  padding: $spacing-md $spacing-lg $spacing-sm;
}

/* ---- 标签网格 ---- */
.ms__labels {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  padding: 0 $spacing-lg;
}

.ms__label-chip {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-round;
  background-color: $color-bg-elevated;
  border: 2rpx solid transparent;
  transition: all $transition-fast;

  &--active {
    border-width: 2rpx;
    border-style: solid;
  }
}

.ms__label-icon {
  font-size: $font-size-md;
}

.ms__label-text {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  font-weight: $font-weight-medium;
}

/* ---- 备注输入 ---- */
.ms__note-wrap {
  margin: 0 $spacing-lg;
  background-color: $color-bg-card;
  border-radius: $radius-md;
  border: 1px solid $color-border;
  padding: $spacing-sm $spacing-md;
  position: relative;
}

.ms__note-input {
  width: 100%;
  min-height: 80rpx;
  font-size: $font-size-md;
  color: $color-text-primary;
  line-height: $line-height-normal;
  padding: $spacing-xs 0;
}

.ms__note-count {
  text-align: right;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  padding-top: 4rpx;
}

/* ---- 操作按钮 ---- */
.ms__actions {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-lg;
}

.ms__btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &--cancel {
    background-color: $color-bg-elevated;
  }

  &--confirm {
    background: linear-gradient(135deg, $color-primary, $color-primary-dark);
    box-shadow: $shadow-glow-primary;

    &:active:not(.ms__btn--disabled) {
      transform: scale(0.97);
      opacity: 0.9;
    }
  }

  &--disabled {
    opacity: 0.4;
  }
}

.ms__btn-text {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;

  &--confirm {
    color: #FFFFFF;
  }
}

/* ---- 安全区 ---- */
.ms__safe-area {
  height: calc($spacing-lg + env(safe-area-inset-bottom));
}
</style>
