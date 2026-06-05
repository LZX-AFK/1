<template>
  <view class="sb" :class="{ 'sb--disabled': disabled }">
    <text class="sb__icon">🔍</text>

    <input
      class="sb__input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder || $t('common.search')"
      :disabled="disabled"
      @input="handleInput"
      @confirm="handleSearch"
    />

    <view v-if="showFilter" class="sb__filter" @tap="handleFilter">
      <text class="sb__filter-icon">⚙</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  showFilter?: boolean
  disabled?: boolean
}>(), {
  placeholder: '',
  showFilter: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
  (e: 'filter'): void
}>()

function handleInput(e: any) {
  const value: string = e.detail?.value ?? e.target?.value ?? ''
  emit('update:modelValue', value)
}

function handleSearch(e: any) {
  const value: string = e.detail?.value ?? e.target?.value ?? ''
  emit('search', value)
}

function handleFilter() {
  emit('filter')
}
</script>

<style lang="scss" scoped>
.sb {
  display: flex;
  align-items: center;
  height: 80rpx;
  background: #F9FAFB;
  border-radius: $border-radius-xl;
  padding: 0 $spacing-md;
  gap: $spacing-sm;
  border: 2rpx solid transparent;
  transition: border-color 0.2s;
  box-sizing: border-box;
  &--disabled { opacity: 0.5; }
}

.sb__icon { font-size: 28rpx; flex-shrink: 0; }

.sb__input {
  flex: 1;
  height: 100%;
  font-size: $font-md;
  color: $text-primary;
  background: transparent;
  border: none;
  outline: none;
  &::placeholder { color: $text-tertiary; }
}

.sb__filter {
  width: 56rpx; height: 56rpx;
  border-radius: $border-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { background: $border-color-light; }
}

.sb__filter-icon { font-size: 28rpx; }
</style>
