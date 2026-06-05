<template>
  <view class="st-page">
    <view class="sub-nav">
      <view class="sub-nav__btn" @tap="safeSettingsBack">‹</view>
      <view class="sub-nav__center">
        <text class="sub-nav__title">设置</text>
      </view>
      <view class="sub-nav__right" />
    </view>

    <scroll-view scroll-y class="sub-scroll">
      <view class="st-section">
        <text class="st-section__title">录音设置</text>
        <view class="st-card">
          <view class="st-row" @tap="openPicker('lang', ['English', '中文', 'Español', '日本語'])">
            <text class="st-row__label">课堂语言</text><text class="st-row__val">{{ recLang }}</text><text class="st-row__arrow">›</text>
          </view>
          <view class="st-row" @tap="openPicker('sumLang', ['中文', 'English', '日文', '中英双语'])">
            <text class="st-row__label">总结语言</text><text class="st-row__val">{{ sumLang }}</text><text class="st-row__arrow">›</text>
          </view>
          <view class="st-row">
            <text class="st-row__label">保留专业术语英文</text><switch :checked="keepTerms" color="#2563EB" @change="keepTerms = !keepTerms" />
          </view>
          <view class="st-row" @tap="openPicker('mode', ['大课模式', '讨论模式', '问答模式'])">
            <text class="st-row__label">转写模式</text><text class="st-row__val">{{ modeLabel }}</text><text class="st-row__arrow">›</text>
          </view>
          <view class="st-row st-row--last" @tap="openPicker('note', ['平衡模式', '详细模式', '考试模式', '知识点模式'])">
            <text class="st-row__label">AI 笔记风格</text><text class="st-row__val">{{ noteLabel }}</text><text class="st-row__arrow">›</text>
          </view>
        </view>
      </view>

      <view class="st-section">
        <text class="st-section__title">App 设置</text>
        <view class="st-card">
          <view class="st-row" @tap="openPicker('appLang', ['中文', 'English'])">
            <text class="st-row__label">App 语言</text><text class="st-row__val">{{ appLangLabel }}</text><text class="st-row__arrow">›</text>
          </view>
          <view class="st-row"><text class="st-row__label">外观</text><text class="st-row__val">跟随系统</text></view>
          <view class="st-row st-row--last"><text class="st-row__label">通知</text><switch :checked="notifyOn" color="#2563EB" @change="notifyOn = !notifyOn" /></view>
        </view>
      </view>

      <view class="st-section">
        <text class="st-section__title">设备</text>
        <view class="st-card">
          <view class="st-row"><text class="st-row__label">{{ deviceStore.state.connected ? deviceStore.state.deviceName : '未连接设备' }}</text><text v-if="deviceStore.state.connected" class="st-row__badge">已连接</text></view>
          <view v-if="deviceStore.state.connected" class="st-row"><text class="st-row__label">电量</text><text class="st-row__val">{{ deviceStore.state.batteryLevel }}%</text></view>
          <view v-if="deviceStore.state.connected" class="st-row st-row--last"><text class="st-row__label">降噪</text><text class="st-row__val">{{ deviceStore.state.ancEnabled ? '已开启' : '已关闭' }}</text></view>
        </view>
      </view>

      <view class="st-section">
        <text class="st-section__title">服务状态</text>
        <view class="st-card">
          <view class="st-row">
            <text class="st-row__label">当前环境</text>
            <text class="st-row__val" :class="'st-env--' + runtimeEnv">{{ runtimeLabel }}</text>
          </view>
          <view class="st-row" @tap="onEditServerUrl">
            <text class="st-row__label">服务器地址</text>
            <text class="st-row__val st-row__val--mono">{{ displayApiUrl }}</text>
            <text class="st-row__arrow">›</text>
          </view>
          <view class="st-row">
            <text class="st-row__label">WS 地址</text>
            <text class="st-row__val st-row__val--mono">{{ wsBaseUrl }}</text>
          </view>
          <view class="st-row st-row--last">
            <text class="st-row__label">后端连接</text>
            <text v-if="backendOk === null" class="st-row__val">检测中…</text>
            <text v-else-if="backendOk" class="st-row__badge">正常</text>
            <text v-else class="st-row__badge st-row__badge--err">不可用</text>
          </view>
        </view>
        <text v-if="envWarning" class="st-env-warning">{{ envWarning }}</text>
        <view v-if="isCustomApi" class="st-custom-hint">
          <text class="st-custom-hint__text">当前使用自定义服务器地址。清除后将恢复默认地址。</text>
          <view class="st-custom-hint__btn" @tap="onClearCustomUrl">
            <text>恢复默认</text>
          </view>
        </view>
        <view class="st-server-tip">
          <text class="st-server-tip__text">💡 Tunnel 地址变化时，直接在此处粘贴新地址，无需重新打包 APK。</text>
        </view>
      </view>

      <view class="st-section">
        <text class="st-section__title">帮助与隐私</text>
        <view class="st-card">
          <view class="st-row" @tap="onToast"><text class="st-row__label">帮助中心</text><text class="st-row__arrow">›</text></view>
          <view class="st-row" @tap="onToast"><text class="st-row__label">隐私政策</text><text class="st-row__arrow">›</text></view>
          <view class="st-row st-row--last" @tap="onToast"><text class="st-row__label">用户协议</text><text class="st-row__arrow">›</text></view>
        </view>
      </view>

      <view class="page-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/useDeviceStore'
import {
  RUNTIME_ENVIRONMENT,
  WS_BASE_URL,
  RUNTIME_LABEL,
  IS_CUSTOM_API,
  saveCustomApiUrl,
  clearCustomApiUrl,
  getCurrentApiUrl,
  getCurrentWsUrl,
  validateRuntimeConfig,
} from '@/config/runtime'
import { getApiBaseUrl, checkHealth, reloadApiBaseUrl } from '@/services/api'

const deviceStore = useDeviceStore()
const recLang = ref('English')
const sumLang = ref('中文')
const keepTerms = ref(true)
const modeLabel = ref('大课模式')
const noteLabel = ref('平衡模式')
const appLangLabel = ref('中文')
const notifyOn = ref(true)

// --- 环境信息 ---
const runtimeEnv = RUNTIME_ENVIRONMENT
const runtimeLabel = RUNTIME_LABEL
const isCustomApi = ref(IS_CUSTOM_API)
const apiBaseUrl = ref(getCurrentApiUrl())
const wsBaseUrl = ref(getCurrentWsUrl())
const displayApiUrl = ref(getCurrentApiUrl().replace(/^https?:\/\//, '').replace(/^wss?:\/\//, ''))
const backendOk = ref<boolean | null>(null)
const envWarning = ref('')

const { warnings } = validateRuntimeConfig()
if (warnings.length > 0) {
  envWarning.value = warnings[0]
}

async function refreshBackendStatus() {
  try {
    await checkHealth()
    backendOk.value = true
  } catch {
    backendOk.value = false
  }
}

onMounted(() => {
  refreshBackendStatus()
})

function openPicker(label: string, items: string[]) {
  uni.showActionSheet({
    itemList: items,
    success(res) {
      const v = items[res.tapIndex]
      if (label === 'lang') recLang.value = v
      if (label === 'sumLang') sumLang.value = v
      if (label === 'mode') modeLabel.value = v
      if (label === 'note') noteLabel.value = v
      if (label === 'appLang') appLangLabel.value = v
    },
  })
}

function safeSettingsBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/profile/index' })
}

function onToast() {
  uni.showToast({ title: '功能暂未接入', icon: 'none' })
}

function onEditServerUrl() {
  uni.showModal({
    title: '服务器地址',
    content: '输入后端 API 地址，如 https://xxxx.trycloudflare.com\n\n支持 Cloudflare Tunnel / ngrok / 自定义域名',
    editable: true,
    placeholderText: 'https://xxxx.trycloudflare.com',
    success(res) {
      if (res.confirm && res.content) {
        let url = res.content.trim()
        // 自动补协议
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ws://') && !url.startsWith('wss://')) {
          url = `https://${url}`
        }
        saveCustomApiUrl(url)
        reloadApiBaseUrl()
        apiBaseUrl.value = getCurrentApiUrl()
        wsBaseUrl.value = getCurrentWsUrl()
        displayApiUrl.value = apiBaseUrl.value.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '')
        isCustomApi.value = true
        backendOk.value = null
        envWarning.value = ''
        uni.showToast({ title: '已保存', icon: 'success' })
        refreshBackendStatus()
      }
    },
  })
}

function onClearCustomUrl() {
  uni.showModal({
    title: '恢复默认',
    content: '清除自定义服务器地址，恢复为编译时配置的默认地址？',
    success(res) {
      if (res.confirm) {
        clearCustomApiUrl()
        reloadApiBaseUrl()
        apiBaseUrl.value = getCurrentApiUrl()
        wsBaseUrl.value = getCurrentWsUrl()
        displayApiUrl.value = apiBaseUrl.value.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '')
        isCustomApi.value = false
        backendOk.value = null
        const { warnings: w } = validateRuntimeConfig()
        envWarning.value = w.length > 0 ? w[0] : ''
        uni.showToast({ title: '已恢复默认', icon: 'success' })
        refreshBackendStatus()
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.st-page { min-height: 100vh; background: #f7f8fa; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.st-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.sub-nav { height: calc(env(safe-area-inset-top) + 120rpx); padding: calc(env(safe-area-inset-top) + 32rpx) 32rpx 0; display: flex; align-items: center; justify-content: center; box-sizing: border-box; position: relative; z-index: 20; }
.sub-nav__btn, .sub-nav__right { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; position: absolute; bottom: 0; }
.sub-nav__btn { left: 32rpx; color: #071446; font-size: 58rpx; line-height: 1; }
.sub-nav__right { right: 32rpx; }
.sub-nav__center { height: 88rpx; display: flex; align-items: center; justify-content: center; }
.sub-nav__title { font-size: 36rpx; color: #071446; font-weight: 800; }
.sub-scroll { height: calc(100vh - env(safe-area-inset-top) - 120rpx); padding: 28rpx 32rpx 0; box-sizing: border-box; }
.st-section { margin-bottom: 28rpx; }
.st-section__title { display: block; margin: 0 0 12rpx 6rpx; font-size: 24rpx; color: #9ca3af; font-weight: 800; }
.st-card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; overflow: hidden; box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, .06); }
.st-row { min-height: 88rpx; padding: 0 28rpx; border-bottom: 1rpx solid #f1f3f5; display: flex; align-items: center; gap: 16rpx; box-sizing: border-box; }
.st-row--last { border-bottom: 0; }
.st-row__label { flex: 1; min-width: 0; font-size: 28rpx; color: #111827; }
.st-row__val { font-size: 26rpx; color: #6b7280; }
.st-row__arrow { font-size: 34rpx; color: #cbd5e1; }
.st-row__badge { padding: 6rpx 18rpx; border-radius: 999rpx; background: #dcfce7; color: #16a34a; font-size: 22rpx; font-weight: 800; }
.st-row__val--mono { font-family: 'Courier New', monospace; font-size: 22rpx; word-break: break-all; max-width: 360rpx; }
.st-env--local-h5 { color: #2563eb; }
.st-env--lan-test { color: #d97706; }
.st-env--public-demo { color: #16a34a; }
.st-row__badge--err { background: #fee2e2 !important; color: #dc2626 !important; }
.st-env-warning { display: block; margin: 12rpx 6rpx 0; font-size: 22rpx; color: #d97706; line-height: 1.5; }
.st-custom-hint { display: flex; align-items: center; justify-content: space-between; margin: 12rpx 6rpx 0; padding: 16rpx 20rpx; background: #f0fdf4; border-radius: 16rpx; }
.st-custom-hint__text { font-size: 22rpx; color: #16a34a; flex: 1; }
.st-custom-hint__btn { padding: 8rpx 20rpx; background: #dcfce7; border-radius: 999rpx; margin-left: 16rpx; }
.st-custom-hint__btn text { font-size: 22rpx; color: #16a34a; font-weight: 600; }
.st-server-tip { margin: 12rpx 6rpx 0; padding: 16rpx 20rpx; background: #eff6ff; border-radius: 16rpx; }
.st-server-tip__text { font-size: 22rpx; color: #2563eb; line-height: 1.5; }
.page-safe { height: calc(env(safe-area-inset-bottom) + 180rpx); }
</style>
