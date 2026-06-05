import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DeviceState } from '@/types'

export const useDeviceStore = defineStore('device', () => {
  // --- Mock 设备状态 ---
  const state = ref<DeviceState>({
    connected: true,
    deviceName: 'AirPods Pro',
    batteryLevel: 85,
    ancEnabled: true,
    signalStrength: 'good',
  })

  // --- 计算属性 ---
  const isConnected = computed(() => state.value.connected)
  const batteryDisplay = computed(() => `${state.value.batteryLevel}%`)

  // --- Mock 设备列表 ---
  const pairedDevices = ref([
    { id: 'd1', name: 'AirPods Pro', type: 'earbuds', lastConnected: '2026-06-03T09:30:00Z' },
    { id: 'd2', name: 'Sony WH-1000XM5', type: 'headphones', lastConnected: '2026-05-28T14:00:00Z' },
  ])

  // --- 方法 ---
  function connect(deviceName: string) {
    state.value = {
      connected: true,
      deviceName,
      batteryLevel: 100,
      ancEnabled: true,
      signalStrength: 'good',
    }
  }

  function disconnect() {
    state.value = {
      ...state.value,
      connected: false,
      signalStrength: 'poor',
    }
  }

  function toggleANC() {
    state.value.ancEnabled = !state.value.ancEnabled
  }

  function updateBattery(level: number) {
    state.value.batteryLevel = Math.max(0, Math.min(100, level))
  }

  return {
    state,
    pairedDevices,
    isConnected,
    batteryDisplay,
    connect,
    disconnect,
    toggleANC,
    updateBattery,
  }
})
