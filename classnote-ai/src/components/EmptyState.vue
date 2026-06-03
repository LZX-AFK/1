<template>
  <view class="empty-state">
    <text class="empty-icon">📭</text>
    <text class="empty-text">{{ message || t('common.empty') }}</text>
    <button v-if="ctaText" class="empty-cta" @tap="$emit('action')">{{ ctaText }}</button>
  </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  message?: string
  ctaText?: string
}>()

defineEmits<{ (e: 'action'): void }>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl $spacing-lg;
}
.empty-icon { font-size: 80rpx; margin-bottom: $spacing-md; }
.empty-text { font-size: $font-size-md; color: $color-text-secondary; text-align: center; }
.empty-cta {
  margin-top: $spacing-lg;
  padding: $spacing-sm $spacing-xl;
  background: $color-primary;
  color: #fff;
  border-radius: $radius-round;
  font-size: $font-size-md;
  border: none;
}
</style>
