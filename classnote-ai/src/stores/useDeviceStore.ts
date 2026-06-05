import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DeviceState } from '@/types'

export const useDeviceStore = defineStore('device', () => {
  // 设备状态（未连接时为空）
  const state = ref<DeviceState>({
    connected: false,
    deviceName: '',
    batteryLevel: 0,
    ancEnabled: false,
    signalStrength: 'poor',
  })

  const isConnected = computed(() => state.value.connected)
  const batteryDisplay = computed(() => `${state.value.batteryLevel}%`)

  const pairedDevices = ref<Array<{ id: string; name: string; type: string; lastConnected: string }>>([])

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
