<template>
  <view v-if="agentStore.isPanelOpen" class="ap-mask" @tap="agentStore.closePanel()">
    <view class="ap-sheet" @tap.stop>
      <!-- 标题栏 -->
      <view class="ap-head">
        <view class="ap-head__left">
          <view class="ap-head__dot" />
          <text class="ap-head__title">{{ $t('agent.name') }}</text>
          <text class="ap-head__subtitle">{{ $t('agent.subtitle') }}</text>
        </view>
        <text class="ap-head__close" @tap="agentStore.closePanel()">✕</text>
      </view>

      <!-- 消息区 -->
      <scroll-view class="ap-msgs" scroll-y :scroll-into-view="scrollToId" :scroll-with-animation="true">
        <view
          v-for="msg in agentStore.messages"
          :key="msg.id"
          :id="'msg-' + msg.id"
          class="ap-msg"
          :class="msg.role === 'user' ? 'ap-msg--user' : 'ap-msg--agent'"
        >
          <view class="ap-msg__bubble" :class="msg.role === 'user' ? 'ap-msg__bubble--user' : 'ap-msg__bubble--agent'">
            <text class="ap-msg__text">{{ msg.content }}</text>
          </view>
        </view>

        <!-- 思考中 -->
        <view v-if="agentStore.isThinking" class="ap-msg ap-msg--agent">
          <view class="ap-msg__bubble ap-msg__bubble--agent">
            <view class="ap-thinking">
              <view v-for="i in 3" :key="i" class="ap-thinking__dot" :style="{ animationDelay: (i * 0.2) + 's' }" />
            </view>
          </view>
        </view>

        <view id="msg-bottom" style="height:4rpx" />
      </scroll-view>

      <!-- 快捷 chips（无消息时显示） -->
      <view v-if="agentStore.messages.length === 0" class="ap-chips">
        <text v-for="c in chips" :key="c.key" class="ap-chips__item" @tap="onChip(c.key)">{{ $t(c.labelKey) }}</text>
      </view>

      <!-- 底部输入区 -->
      <view class="ap-input-bar">
        <view class="ap-input-bar__btn" @tap="onUpload">
          <text class="ap-input-bar__btn-text">＋</text>
        </view>
        <input class="ap-input-bar__input" v-model="inputText" :placeholder="$t('agent.inputPlaceholder')" confirm-type="send" @confirm="onSend" />
        <view class="ap-input-bar__btn" @tap="onVoice">
          <text class="ap-input-bar__btn-text">🎤</text>
        </view>
        <view class="ap-input-bar__send" @tap="onSend">
          <text class="ap-input-bar__send-text">{{ $t('agent.send') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAgentStore } from '@/stores/useAgentStore'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const agentStore = useAgentStore()
const inputText = ref('')
const scrollToId = ref('msg-bottom')

// 首次打开面板时，如无消息则灌入欢迎消息
onMounted(() => {
  if (agentStore.messages.length === 0) {
    agentStore.addAgentMessage(t('agent.welcome'))
    agentStore.addAgentMessage(t('agent.suggestion'))
  }
})

const chips = [
  { key: 'explain', labelKey: 'agent.chipsExplain' },
  { key: 'record', labelKey: 'agent.chipsRecord' },
  { key: 'mistake', labelKey: 'agent.chipsMistake' },
  { key: 'notes', labelKey: 'agent.chipsNotes' },
  { key: 'upload', labelKey: 'agent.chipsUpload' },
]

function scrollToBottom() { scrollToId.value = ''; setTimeout(() => { scrollToId.value = 'msg-bottom' }, 50) }

function onSend() {
  const text = inputText.value.trim()
  if (!text) { uni.showToast({ title: t('agent.emptyInput'), icon: 'none' }); return }
  agentStore.sendMessage(text)
  inputText.value = ''
  scrollToBottom()
}

function onChip(key: string) {
  const prompts: Record<string, string> = {
    explain: '帮我讲解知识库里的内容',
    record: '帮我开始录音',
    mistake: '分析我的错题',
    notes: '帮我整理笔记',
    upload: '上传资料',
  }
  agentStore.sendMessage(prompts[key] || key)
  scrollToBottom()
}

function onVoice() { uni.showToast({ title: t('agent.voiceNotReady'), icon: 'none' }) }

function onUpload() {
  uni.showActionSheet({
    itemList: [t('agent.uploadNote'), t('agent.uploadMistake'), t('agent.uploadPdf')],
    success() { agentStore.addAgentMessage(t('agent.uploadMock')); scrollToBottom() },
  })
}
</script>

<style lang="scss" scoped>
.ap-mask { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; justify-content: center; }
.ap-sheet {
  width: 100%; max-width: 430px; height: 86vh;
  background: #FAFAF5; border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column; overflow: hidden;
}

/* 标题栏 */
.ap-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx 28rpx 20rpx; border-bottom: 1rpx solid #E8E6E0; flex-shrink: 0;
}
.ap-head__left { display: flex; align-items: center; gap: 12rpx; }
.ap-head__dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #10B981; flex-shrink: 0; }
.ap-head__title { font-size: 34rpx; font-weight: 700; color: #1F2937; }
.ap-head__subtitle { font-size: 24rpx; color: #9CA3AF; }
.ap-head__close { font-size: 36rpx; color: #9CA3AF; padding: 8rpx; }


.ap-msg { margin-bottom: 20rpx; display: flex; }
.ap-msg--agent { justify-content: flex-start; }
.ap-msg--user { justify-content: flex-end; }

.ap-msg__bubble { max-width: 75%; padding: 20rpx 24rpx; border-radius: 20rpx; }
.ap-msg__bubble--agent { background: #FFFFFF; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.ap-msg__bubble--user { background: #4F46E5; }
.ap-msg__text { font-size: 28rpx; line-height: 1.6; }
.ap-msg__bubble--agent .ap-msg__text { color: #1F2937; }
.ap-msg__bubble--user .ap-msg__text { color: #FFFFFF; }

/* 思考中 */
.ap-thinking { display: flex; gap: 8rpx; padding: 4rpx 0; }
.ap-thinking__dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #9CA3AF; animation: ap-blink 1.2s infinite; }
@keyframes ap-blink { 0%,100% { opacity: .25 } 50% { opacity: .8 } }

/* 快捷 chips */
.ap-chips { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 16rpx 24rpx 8rpx; flex-shrink: 0; }
.ap-chips__item {
  padding: 12rpx 24rpx; border-radius: 24rpx;
  background: #F3F0EB; font-size: 24rpx; color: #4F46E5; font-weight: 500;
  &:active { opacity: .7; }
}

/* 输入区 */
.ap-input-bar { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom)); background: #FFFFFF; border-top: 1rpx solid #E8E6E0; flex-shrink: 0; }
.ap-input-bar__btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F3F0EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; &:active { opacity: .7; } }
.ap-input-bar__btn-text { font-size: 32rpx; color: #6B7280; }
.ap-input-bar__input { flex: 1; height: 72rpx; background: #F5F3F0; border-radius: 36rpx; padding: 0 24rpx; font-size: 28rpx; color: #1F2937; }
.ap-input-bar__send { padding: 12rpx 24rpx; background: #4F46E5; border-radius: 24rpx; flex-shrink: 0; &:active { opacity: .85; } }
.ap-input-bar__send-text { font-size: 26rpx; color: #FFFFFF; font-weight: 600; }
</style>
