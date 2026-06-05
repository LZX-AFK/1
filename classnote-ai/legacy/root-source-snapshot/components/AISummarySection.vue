<template>
  <view
    class="ass"
    :class="{
      'ass--highlighted': highlighted,
      [`ass--${accent}`]: highlighted,
    }"
  >
    <view
      class="ass__header"
      :class="{ 'ass__header--collapsible': collapsible }"
      @tap="handleToggle"
    >
      <view class="ass__title-row">
        <text v-if="icon" class="ass__icon">{{ icon }}</text>
        <text class="ass__title">{{ title }}</text>
      </view>
      <text v-if="collapsible" class="ass__chevron" :class="{ 'ass__chevron--open': isOpen }">▾</text>
    </view>

    <view v-show="isOpen" class="ass__body">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  icon?: string
  collapsible?: boolean
  defaultOpen?: boolean
  highlighted?: boolean
  accent?: 'primary' | 'purple' | 'warning' | 'none'
}>(), {
  collapsible: false,
  defaultOpen: true,
  highlighted: false,
  accent: 'primary',
})

const emit = defineEmits<{
  (e: 'toggle', open: boolean): void
}>()

const isOpen = ref(props.defaultOpen)

watch(() => props.defaultOpen, (val) => {
  isOpen.value = val
})

function handleToggle() {
  if (!props.collapsible) return
  isOpen.value = !isOpen.value
  emit('toggle', isOpen.value)
}
</script>

<style lang="scss" scoped>
.ass {
  display: flex;
  flex-direction: column;
  background: $bg-card;
  border-radius: $border-radius-xl;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);

  &--highlighted { border-left: 6rpx solid transparent; }
  &--primary { border-left-color: $color-primary; background: $color-primary-light; }
  &--purple { border-left-color: $color-accent; background: $color-accent-light; }
  &--warning { border-left-color: $color-warning; background: #FFFBEB; }
}

.ass__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md;
  gap: $spacing-sm;
  &--collapsible:active { opacity: 0.6; }
}

.ass__title-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex: 1;
  min-width: 0;
}

.ass__icon { font-size: 32rpx; flex-shrink: 0; }

.ass__title {
  font-size: $font-lg;
  font-weight: 700;
  color: $text-primary;
}

.ass__chevron {
  font-size: 32rpx;
  color: $text-tertiary;
  transition: transform 0.2s;
  flex-shrink: 0;
  &--open { transform: rotate(180deg); }
}

.ass__body {
  padding: 0 $spacing-md $spacing-md;
}
</style>
