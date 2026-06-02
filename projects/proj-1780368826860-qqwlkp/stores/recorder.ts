/**
 * ClassNote AI — 录音状态 Store
 * 管理麦克风录音、耳机 BLE 连接、音频权限等状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ---------- 类型定义 ----------

export type RecorderState =
  | 'idle'             // 初始待机
  | 'requesting'       // 权限申请中
  | 'ready'            // 已授权，准备就绪
  | 'preparing'        // 准备录音（连接耳机/检查设备）
  | 'recording'        // 录音中
  | 'paused'           // 暂停
  | 'stopping'         // 正在停止
  | 'error'            // 错误状态

export type DeviceType = 'mic' | 'ble_headset'

export interface DeviceInfo {
  type: DeviceType
  name: string
  connected: boolean
  batteryLevel: number     // 0-100，非耳机设备为 -1
  sampleRate: number
}

export interface RecorderConfig {
  /** 设备类型 */
  deviceType: DeviceType
  /** 采样率 (Hz) */
  sampleRate: number
  /** 声道数 */
  numberOfChannels: number
  /** 编码格式 */
  format: 'pcm' | 'wav' | 'mp3'
  /** 录音模式 */
  mode: 'standard' | 'noise_cancellation' | 'professional'
  /** 语言 */
  language: string
}

// ---------- 状态管理 ----------

export const useRecorderStore = defineStore('recorder', () => {
  // ---- 录音状态 ----
  const recorderState = ref<RecorderState>('idle')

  // ---- 权限 ----
  const micPermission = ref<boolean>(false)
  const micPermissionRequested = ref<boolean>(false)

  // ---- 设备信息 ----
  const currentDevice = ref<DeviceInfo>({
    type: 'mic',
    name: '手机麦克风',
    connected: false,
    batteryLevel: -1,
    sampleRate: 16000,
  })

  const availableDevices = ref<DeviceInfo[]>([])

  // ---- BLE 耳机状态 ----
  const bleConnecting = ref(false)
  const bleConnected = ref(false)
  const bleDeviceName = ref('')
  const bleBatteryLevel = ref(-1)
  const bleError = ref<string | null>(null)

  // ---- 录音配置 ----
  const recorderConfig = ref<RecorderConfig>({
    deviceType: 'mic',
    sampleRate: 16000,
    numberOfChannels: 1,
    format: 'pcm',
    mode: 'standard',
    language: 'en-US',
  })

  // ---- 录音管理器 ----
  let recorderManager: UniApp.RecorderManager | null = null

  // ---- 计时 ----
  const recordingStartTime = ref(0)
  const recordingElapsed = ref(0)
  let timerInterval: ReturnType<typeof setInterval> | null = null

  // ---- 音频数据 ----
  const audioBufferSize = ref(0)
  const lastFrameTimestamp = ref(0)

  // ---- 错误 ----
  const recorderError = ref<string | null>(null)

  // ========== Getters ==========

  const isRecording = computed(() => recorderState.value === 'recording')
  const isPaused = computed(() => recorderState.value === 'paused')
  const isActive = computed(() =>
    ['recording', 'paused'].includes(recorderState.value)
  )
  const canStartRecording = computed(() =>
    ['ready', 'preparing'].includes(recorderState.value)
  )
  const hasMicPermission = computed(() => micPermission.value)

  /** 录音时长格式化 (MM:SS) */
  const formattedDuration = computed(() => {
    const totalSeconds = Math.floor(recordingElapsed.value / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  // ========== Actions ==========

  /** 请求麦克风权限 */
  async function requestMicPermission(): Promise<boolean> {
    recorderState.value = 'requesting'
    micPermissionRequested.value = true

    return new Promise((resolve) => {
      // uni-app 的录音权限检查
      uni.authorize({
        scope: 'scope.record',
        success: () => {
          micPermission.value = true
          recorderState.value = 'ready'
          resolve(true)
        },
        fail: () => {
          // 引导用户去设置页面开启
          uni.showModal({
            title: '麦克风权限',
            content: 'ClassNote AI 需要使用麦克风进行课堂录音，请在设置中开启麦克风权限。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                uni.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.record']) {
                      micPermission.value = true
                      recorderState.value = 'ready'
                      resolve(true)
                    } else {
                      recorderState.value = 'error'
                      recorderError.value = '麦克风权限被拒绝'
                      resolve(false)
                    }
                  },
                })
              } else {
                recorderState.value = 'error'
                recorderError.value = '麦克风权限被拒绝'
                resolve(false)
              }
            },
          })
        },
      })
    })
  }

  /** 扫描 BLE 耳机设备 */
  async function scanBLEDevice(): Promise<void> {
    bleConnecting.value = true
    bleError.value = null

    // MVP 阶段：手机麦克风方案，BLE 连接为占位逻辑
    try {
      // TODO: 接入 oleap-ble-sdk
      // 原 SDK 路径：@/uni_modules/oleap-ble-sdk
      console.log('[Recorder] BLE 扫描 — 占位（MVP 使用手机麦克风）')
    } catch (err: any) {
      bleError.value = err.message || 'BLE 扫描失败'
    } finally {
      bleConnecting.value = false
    }
  }

  /** 连接 BLE 耳机 */
  async function connectBLEDevice(deviceId: string): Promise<void> {
    bleConnecting.value = true
    bleError.value = null

    try {
      // TODO: 接入 oleap-ble-sdk
      console.log(`[Recorder] BLE 连接 — 占位 deviceId=${deviceId}`)
    } catch (err: any) {
      bleError.value = err.message || 'BLE 连接失败'
    } finally {
      bleConnecting.value = false
    }
  }

  /** 断开 BLE 耳机 */
  function disconnectBLE() {
    bleConnected.value = false
    bleDeviceName.value = ''
    bleBatteryLevel.value = -1
    currentDevice.value = {
      type: 'mic',
      name: '手机麦克风',
      connected: false,
      batteryLevel: -1,
      sampleRate: 16000,
    }
  }

  /** 更新录音配置 */
  function updateConfig(config: Partial<RecorderConfig>) {
    recorderConfig.value = { ...recorderConfig.value, ...config }
  }

  /** 开始录音 */
  function startRecording(onFrame?: (frame: ArrayBuffer) => void): boolean {
    if (recorderState.value !== 'ready' && recorderState.value !== 'preparing') {
      console.warn(`[Recorder] 当前状态 ${recorderState.value} 不允许开始录音`)
      return false
    }

    recorderError.value = null
    recorderState.value = 'preparing'

    try {
      recorderManager = uni.getRecorderManager()

      recorderManager.onStart(() => {
        recorderState.value = 'recording'
        recordingStartTime.value = Date.now()
        recordingElapsed.value = 0

        // 启动计时器
        timerInterval = setInterval(() => {
          recordingElapsed.value = Date.now() - recordingStartTime.value
        }, 200)
      })

      recorderManager.onPause(() => {
        recorderState.value = 'paused'
      })

      recorderManager.onResume(() => {
        recorderState.value = 'recording'
        recordingStartTime.value = Date.now() - recordingElapsed.value
      })

      recorderManager.onStop((res) => {
        recorderState.value = 'idle'
        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }
        console.log('[Recorder] 录音停止, 文件:', res.tempFilePath)
      })

      recorderManager.onError((err) => {
        recorderState.value = 'error'
        recorderError.value = err.errMsg || '录音出错'
        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }
      })

      // 逐帧回调
      recorderManager.onFrameRecorded((res) => {
        lastFrameTimestamp.value = Date.now()
        audioBufferSize.value = res.frameBuffer.byteLength
        if (onFrame) {
          onFrame(res.frameBuffer as ArrayBuffer)
        }
      })

      // 开始录音
      recorderManager.start({
        duration: 7200000,     // 最长 2 小时
        sampleRate: recorderConfig.value.sampleRate,
        numberOfChannels: recorderConfig.value.numberOfChannels,
        encodeBitRate: 48000,
        format: recorderConfig.value.format,
        frameSize: 20,         // 20ms 一帧，配合 WebSocket 流式发送
      })

      return true
    } catch (err: any) {
      recorderState.value = 'error'
      recorderError.value = err.message || '初始化录音失败'
      return false
    }
  }

  /** 暂停录音 */
  function pauseRecording() {
    if (recorderManager && recorderState.value === 'recording') {
      recorderManager.pause()
    }
  }

  /** 恢复录音 */
  function resumeRecording() {
    if (recorderManager && recorderState.value === 'paused') {
      recorderManager.resume()
    }
  }

  /** 停止录音 */
  function stopRecording(): Promise<{ tempFilePath: string; duration: number; fileSize: number }> {
    return new Promise((resolve, reject) => {
      if (!recorderManager) {
        reject(new Error('录音管理器未初始化'))
        return
      }

      recorderState.value = 'stopping'

      // 先注册 onStop，再调用 stop
      recorderManager.onStop((res) => {
        resolve({
          tempFilePath: res.tempFilePath,
          duration: res.duration,
          fileSize: res.fileSize,
        })
      })

      recorderManager.stop()
    })
  }

  /** 重置录音状态 */
  function resetRecorder() {
    if (recorderManager && recorderState.value !== 'idle') {
      recorderManager.stop()
    }
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    recorderManager = null
    recorderState.value = 'idle'
    recorderError.value = null
    recordingStartTime.value = 0
    recordingElapsed.value = 0
    audioBufferSize.value = 0
    lastFrameTimestamp.value = 0
  }

  return {
    // 状态
    recorderState,
    micPermission,
    micPermissionRequested,
    currentDevice,
    availableDevices,
    bleConnecting,
    bleConnected,
    bleDeviceName,
    bleBatteryLevel,
    bleError,
    recorderConfig,
    recordingStartTime,
    recordingElapsed,
    audioBufferSize,
    lastFrameTimestamp,
    recorderError,

    // Getters
    isRecording,
    isPaused,
    isActive,
    canStartRecording,
    hasMicPermission,
    formattedDuration,

    // Actions
    requestMicPermission,
    scanBLEDevice,
    connectBLEDevice,
    disconnectBLE,
    updateConfig,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecorder,
  }
})
