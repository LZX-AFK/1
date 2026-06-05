<template>
  <view class="app-chip" :class="[`app-chip--${variant}`, `app-chip--${size}`, { 'app-chip--active': active }]" @tap="$emit('tap')">
    <text v-if="icon" class="app-chip__icon">{{ icon }}</text>
    <text class="app-chip__label">{{ label }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  icon?: string
  active?: boolean
  variant?: 'default' | 'primary' | 'warning' | 'success'
  size?: 'sm' | 'md'
}>(), {
  icon: '',
  active: false,
  variant: 'default',
  size: 'md',
})

defineEmits<{ tap: [] }>()
</script>

<style lang="scss" scoped>
.app-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border: 1rpx solid #eef0f3;
  background: #ffffff;
  color: #111827;
  box-sizing: border-box;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.05);
}

.app-chip--md {
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.app-chip--sm {
  height: 52rpx;
  padding: 0 18rpx;
  border-radius: 18rpx;
  font-size: 22rpx;
}

.app-chip__icon,
.app-chip__label {
  line-height: 1;
  white-space: nowrap;
}

.app-chip__icon {
  color: #2563eb;
  font-weight: 800;
}

.app-chip--active,
.app-chip--primary {
  border-color: #bfdbfe;
  background: #eef4ff;
  color: #2563eb;
  font-weight: 800;
}

.app-chip--warning {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #f97316;
}

.app-chip--success {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #16a34a;
}
</style>
