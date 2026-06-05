<template>
  <view class="es" :class="{ 'es--compact': compact }">
    <view class="es__icon-wrap" :class="{ 'es__icon-wrap--compact': compact }">
      <text class="es__icon">{{ icon || '📭' }}</text>
    </view>

    <text class="es__title">{{ title }}</text>

    <text v-if="description" class="es__desc">{{ description }}</text>

    <view v-if="actionText" class="es__action" @tap="emit('action')">
      <text class="es__action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
  actionText?: string
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'action'): void
}>()
</script>

<style lang="scss" scoped>
.es {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl $spacing-lg;
  &--compact { padding: $spacing-md $spacing-lg; }
}

.es__icon-wrap {
  width: 160rpx; height: 160rpx;
  border-radius: $border-radius-round;
  background: $bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-md;
  &--compact { width: 96rpx; height: 96rpx; margin-bottom: $spacing-sm; }
}

.es__icon { font-size: 72rpx; }
.es__icon-wrap--compact .es__icon { font-size: 48rpx; }

.es__title {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
  text-align: center;
  margin-bottom: $spacing-sm;
}

.es__desc {
  font-size: $font-sm;
  color: $text-secondary;
  text-align: center;
  line-height: 1.5;
  max-width: 480rpx;
  margin-bottom: $spacing-md;
}

.es__action {
  padding: 18rpx 48rpx;
  border-radius: $border-radius-round;
  background: $color-primary;
  &:active { opacity: 0.8; }
}

.es__action-text {
  font-size: $font-md;
  color: $text-inverse;
  font-weight: 500;
}
</style>
