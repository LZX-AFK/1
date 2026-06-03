<template>
  <view class="search-bar">
    <text class="search-icon">🔍</text>
    <input
      class="search-input"
      :placeholder="placeholder || t('courses.searchPlaceholder')"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  modelValue?: string
  placeholder?: string
}>()

defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
.search-bar {
  display: flex;
  align-items: center;
  background: #F0F0F5;
  border-radius: $radius-round;
  padding: $spacing-sm $spacing-md;
  margin: 0 $spacing-lg;
}
.search-icon { font-size: 32rpx; margin-right: $spacing-sm; }
.search-input {
  flex: 1;
  font-size: $font-size-md;
  color: $color-text-primary;
  background: transparent;
}
</style>
