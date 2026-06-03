import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DeviceState } from '@/types/index'

const mockDevice: DeviceState = {
  connected: true,
  name: 'Newmax 耳机 Pro',
  battery: 85,
  ancEnabled: true,
  noiseReductionEnabled: true,
}

export const useDeviceStore = defineStore('device', () => {
  const device = ref<DeviceState>(mockDevice)

  function setConnected(connected: boolean) {
    device.value.connected = connected
  }

  function setBattery(level: number) {
    device.value.battery = Math.max(0, Math.min(100, level))
  }

  function toggleANC() {
    device.value.ancEnabled = !device.value.ancEnabled
  }

  return { device, setConnected, setBattery, toggleANC }
})
