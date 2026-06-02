<template>
  <view class="page">
    <!-- 顶部状态栏 -->
    <view class="status-bar-placeholder" />
    <view class="recording-header">
      <text class="timer">{{ recorderStore.formattedDuration }}</text>
      <view class="recording-indicator">
        <view class="dot" />
        <text class="recording-text">录音中</text>
      </view>
    </view>

    <!-- 实时字幕区域 -->
    <scroll-view class="transcript-area" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="transcript-content">
        <!-- 已确认的转写文本 -->
        <text
          v-for="(seg, idx) in sessionStore.transcripts"
          :key="idx"
          class="segment final"
        >
          {{ seg.text }}
        </text>

        <!-- 实时字幕（非最终结果） -->
        <text v-if="sessionStore.liveText" class="segment live">
          {{ sessionStore.liveText }}
        </text>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="controls">
      <!-- 快捷标记按钮 -->
      <view class="marker-buttons">
        <button class="marker-btn" @click="addMarker('didnt_understand')">
          <text class="marker-icon">❓</text>
          <text class="marker-label">没懂</text>
        </button>
        <button class="marker-btn" @click="addMarker('important')">
          <text class="marker-icon">⭐</text>
          <text class="marker-label">重点</text>
        </button>
        <button class="marker-btn" @click="addMarker('exam_tip')">
          <text class="marker-icon">📝</text>
          <text class="marker-label">考点</text>
        </button>
        <button class="marker-btn" @click="addMarker('question')">
          <text class="marker-icon">💬</text>
          <text class="marker-label">疑问</text>
        </button>
      </view>

      <!-- 主控制按钮 -->
      <view class="main-controls">
        <button class="ctrl-btn secondary" @click="togglePause">
          {{ recorderStore.isPaused ? '▶ 继续' : '⏸ 暂停' }}
        </button>
        <button class="ctrl-btn primary" @click="endRecording">
          ⏹ 结束课堂
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useRecorderStore } from '@/stores/recorder'
import { createAudioSessionWs, WsConnectionState, type ClassNoteWebSocket } from '@/utils/ws'
import { patch } from '@/utils/request'

const sessionStore = useSessionStore()
const recorderStore = useRecorderStore()

const scrollTop = ref(0)
let scrollTimer: ReturnType<typeof setInterval> | null = null
let wsClient: ClassNoteWebSocket | null = null

onMounted(() => {
  // 开始录音 + WebSocket 连接
  startSession()

  // 自动滚动到底部
  scrollTimer = setInterval(() => {
    scrollTop.value = 999999
  }, 500)
})

onUnmounted(() => {
  if (scrollTimer) clearInterval(scrollTimer)
  // 安全清理：用户直接返回（未点结束按钮）时释放资源
  if (recorderStore.isActive) {
    console.log('[Live] 页面异常退出，自动清理录音资源')
    if (wsClient) {
      wsClient.close()
      wsClient = null
    }
    recorderStore.resetRecorder()
  }
})

function startSession() {
  const sid = sessionStore.sessionId
  if (!sid) {
    console.error('[Live] sessionId 为空，无法启动课堂')
    uni.showToast({ title: '会话创建失败', icon: 'none' })
    return
  }

  // 1. 创建 WebSocket 连接（内置断线重连 + 心跳）
  wsClient = createAudioSessionWs(sid, { debug: true })

  // 2. 注册 transcript 消息处理
  wsClient.on('transcript', (msg) => {
    if (msg.text) {
      const ts = msg.timestampMs || recorderStore.recordingElapsed
      if (msg.isFinal) {
        // 最终结果 → 追加到已确认列表
        sessionStore.appendTranscript({
          start: ts,
          end: ts,
          text: msg.text,
          isFinal: true,
        })
      }
      // 实时字幕（含中间结果和最终结果）
      sessionStore.updateLiveTranscript(msg.text, msg.isFinal ?? false, ts)
    }
  })

  // 3. 注册错误处理
  wsClient.on('error', (msg) => {
    console.error('[Live] WebSocket 错误:', msg.message)
    uni.showToast({ title: '连接异常，自动重连中', icon: 'none', duration: 2000 })
  })

  // 4. 建立 WebSocket 连接
  wsClient.connect().then(() => {
    console.log('[Live] WebSocket 已连接，开始发送音频帧')
  }).catch((err) => {
    console.error('[Live] WebSocket 连接失败，使用纯本地录音模式:', err)
    uni.showToast({ title: '实时转写暂不可用，录音继续', icon: 'none' })
  })

  // 5. 启动录音，每帧 PCM 数据通过 WebSocket 发送到后端 ASR
  const started = recorderStore.startRecording((frame: ArrayBuffer) => {
    if (wsClient && wsClient.connectionState === WsConnectionState.CONNECTED) {
      wsClient.sendAudioFrame(frame)
    }
  })

  if (!started) {
    console.error('[Live] 录音启动失败，当前状态:', recorderStore.recorderState)
    uni.showToast({ title: '录音启动失败', icon: 'none' })
  }
}

function addMarker(label: string) {
  const timestampMs = recorderStore.recordingElapsed
  sessionStore.addMarker({
    sessionId: sessionStore.sessionId || 'demo-session',
    timestampMs,
    transcriptOffset: sessionStore.transcripts.length,
    label: label as any,
    note: '',
    aiFollowUp: true,
  })

  uni.showToast({ title: '标记已添加', icon: 'none', duration: 1000 })
}

function togglePause() {
  if (recorderStore.isPaused) {
    // 恢复录音 → onFrameRecorded 回调自动恢复，音频帧继续发送
    recorderStore.resumeRecording()
    // 如果 WebSocket 在暂停期间意外断开，尝试重连
    if (wsClient && wsClient.connectionState !== WsConnectionState.CONNECTED
        && wsClient.connectionState !== WsConnectionState.CONNECTING) {
      wsClient.connect().catch(() => {})
    }
    uni.showToast({ title: '已继续录音', icon: 'none', duration: 1000 })
  } else {
    // 暂停录音 → recorderManager.pause() 停止 onFrameRecorded 回调
    // WebSocket 保持连接（维持心跳），音频帧自动停止发送
    recorderStore.pauseRecording()
    uni.showToast({ title: '已暂停录音', icon: 'none', duration: 1000 })
  }
}

async function endRecording() {
  const result = await new Promise<{ confirm: boolean }>((resolve) => {
    uni.showModal({
      title: '结束课堂',
      content: '确定要结束本次课堂录音吗？AI 将为你生成课堂总结。',
      confirmText: '确定结束',
      cancelText: '继续录音',
      success: (res) => resolve(res),
    })
  })

  if (!result.confirm) return

  // 1. 关闭 WebSocket 连接（停止发送音频帧 + 断开心跳）
  if (wsClient) {
    wsClient.close()
    wsClient = null
  }

  // 2. 停止计时器
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }

  // 3. 停止录音，获取录音文件路径
  try {
    const recordResult = await recorderStore.stopRecording()
    console.log('[Live] 录音已停止，文件:', recordResult.tempFilePath)
  } catch (err) {
    console.error('[Live] 停止录音失败:', err)
  }

  // 4. 设置 AI 总结加载状态
  sessionStore.startSummarizing()

  // 5. 调用后端结束会话，触发 AI 总结生成
  try {
    await patch(`/sessions/${sessionStore.sessionId}/end`)
    console.log('[Live] AI 总结生成已触发')
  } catch (err) {
    console.error('[Live] 结束会话请求失败:', err)
    // MVP 降级：后端不可用时仍跳转，AI 总结页显示超时提示
  }

  // 6. 跳转到 AI 总结页
  uni.redirectTo({ url: '/pages/ai-summary/ai-summary' })
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-bg-primary;
}

.recording-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md $spacing-lg;
}

.timer {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  font-family: $font-family-mono;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: $color-accent;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.recording-text {
  font-size: $font-size-sm;
  color: $color-accent;
}

.transcript-area {
  flex: 1;
  padding: $spacing-lg;
}

.transcript-content {
  padding-bottom: 200rpx;
}

.segment {
  display: block;
  font-size: $font-size-md;
  line-height: $line-height-relaxed;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;

  &.final {
    color: $color-text-primary;
  }

  &.live {
    color: $color-primary-light;
    border-left: 4rpx solid $color-primary;
    padding-left: $spacing-sm;
  }
}

.controls {
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc($spacing-lg + $safe-area-bottom-env);
  background: linear-gradient(transparent, $color-bg-primary 20%);
}

.marker-buttons {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.marker-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: $spacing-sm;
  background: $color-bg-card;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  font-size: $font-size-xs;

  .marker-icon {
    font-size: $font-size-xl;
  }

  .marker-label {
    color: $color-text-secondary;
  }
}

.main-controls {
  display: flex;
  gap: $spacing-md;
}

.ctrl-btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-round;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  border: none;

  &.primary {
    background-color: $color-accent;
    color: #FFFFFF;
  }

  &.secondary {
    background-color: $color-bg-elevated;
    color: $color-text-secondary;
  }
}
</style>
