<template>
  <view class="mu-page">
    <view class="sub-nav">
      <view class="sub-nav__btn" @tap="safeBack">‹</view>
      <view class="sub-nav__center">
        <text class="sub-nav__title">上传资料</text>
      </view>
      <view class="sub-nav__right" />
    </view>

    <scroll-view scroll-y class="sub-scroll">
      <view class="type-list">
        <view v-for="item in types" :key="item.key" class="type-card" :class="{ 'type-card--active': selType === item.key }" @tap="selType = item.key">
          <view class="type-card__icon" :style="{ background: item.iconBg, color: item.iconColor }">{{ item.icon }}</view>
          <view class="type-card__body">
            <text class="type-card__title">{{ item.title }}</text>
            <text class="type-card__desc">{{ item.desc }}</text>
          </view>
          <text v-if="item.real" class="type-card__badge">可上传</text>
        </view>
      </view>

      <!-- 归属学习空间选择 -->
      <view class="space-section">
        <text class="space-section__label">归属学习空间</text>
        <view class="space-selector" @tap="onSelectSpace">
          <view v-if="selectedSpace" class="space-selector__selected">
            <text class="space-selector__name">{{ selectedSpace.spaceName }}</text>
            <text class="space-selector__type">{{ selectedSpace.spaceType }}</text>
          </view>
          <view v-else class="space-selector__placeholder">
            <text>请选择学习空间</text>
          </view>
          <text class="space-selector__arrow">›</text>
        </view>
        <view class="space-new" @tap="onCreateSpace">
          <text class="space-new__text">＋ 新建学习空间</text>
        </view>
      </view>

      <!-- 音频/视频上传区域 -->
      <view v-if="selType === 'audio' || selType === 'video'" class="drop-card" @tap="onMediaUpload">
        <view class="drop-card__icon">{{ selType === 'audio' ? '🎙' : '🎬' }}</view>
        <text class="drop-card__title">点击选择{{ selType === 'audio' ? '音频' : '视频' }}文件</text>
        <text class="drop-card__hint">{{ selType === 'audio' ? '支持 mp3/wav/m4a/aac/webm/ogg' : '支持 mp4/mov/webm/m4v' }}，最大 100MB</text>
      </view>

      <!-- PDF / Reading 上传区域 -->
      <view v-if="selType === 'reading' || selType === 'slides'" class="drop-card" @tap="onDocumentUpload">
        <view class="drop-card__icon">{{ selType === 'reading' ? '📖' : '📑' }}</view>
        <text class="drop-card__title">点击选择 PDF 文件</text>
        <text class="drop-card__hint">支持 PDF 格式，最大 50MB</text>
      </view>

      <!-- 其他类型（功能暂未接入） -->
      <view v-else-if="selType !== 'audio' && selType !== 'video'" class="drop-card">
        <view class="drop-card__icon">↑</view>
        <text class="drop-card__title">该功能即将接入</text>
        <text class="drop-card__hint">笔记 / 错题解析将在下一阶段开放</text>
      </view>

      <view v-if="recordStore.uploadLoading || docUploading" class="upload-status">
        <view class="upload-status__spinner" />
        <text class="upload-status__text">{{ docUploading ? '正在上传并解析资料…' : '正在上传并解析课堂内容...' }}</text>
      </view>

      <view v-if="docError" class="doc-error">
        <text class="doc-error__text">{{ docError }}</text>
      </view>

      <view class="mu-actions">
        <view v-if="selType !== 'audio' && selType !== 'video' && selType !== 'reading' && selType !== 'slides'" class="mu-actions__btn mu-actions__btn--primary" @tap="onParse">开始解析</view>
        <view v-if="selType !== 'audio' && selType !== 'video' && selType !== 'reading' && selType !== 'slides'" class="mu-actions__btn" @tap="onSave">保存到知识库</view>
      </view>

      <view class="page-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRecordStore } from '@/stores/useRecordStore'
import { uploadLearningDocument, DOCUMENT_ERROR_MESSAGES, DOCUMENT_MAX_SIZE } from '@/services/documentApi'
import { getSessions } from '@/services/sessionApi'
import { buildSpaceOptionsFromSessions, type AgentSpaceOption } from '@/utils/spaceOptions'
import { makeSpaceId, inferSpaceType } from '@/utils/spaceKey'

const recordStore = useRecordStore()
const selType = ref('reading')
const showResult = ref(false)
const pdfPage = ref('')
const docUploading = ref(false)
const docError = ref('')

// Phase 10-B: Space 归属选择
const selectedSpace = ref<AgentSpaceOption | null>(null)
const spaceOptions = ref<AgentSpaceOption[]>([])
const spaceLoading = ref(true)

const types = [
  { key: 'audio', icon: '🎙', title: '上传课堂音频', desc: '上传课堂录音，自动转写并生成 AI 总结', iconBg: '#fef3c7', iconColor: '#d97706', real: true },
  { key: 'video', icon: '🎬', title: '上传课堂视频', desc: '上传课堂视频，提取音频后生成课堂总结', iconBg: '#fce7f3', iconColor: '#db2777', real: true },
  { key: 'reading', icon: '📖', title: '上传 PDF / Reading', desc: '上传 PDF 教材、Reading 材料、论文，自动生成学习笔记', iconBg: '#ecfdf5', iconColor: '#059669', real: true },
  { key: 'slides', icon: '📑', title: '上传 Lecture Slides', desc: '上传 PDF 版课件、讲义，自动生成课程总结', iconBg: '#eef4ff', iconColor: '#2563eb', real: true },
  { key: 'notes', icon: 'N', title: '个人笔记', desc: '上传课堂手写笔记、课后整理内容', iconBg: '#fef3c7', iconColor: '#d97706', real: false },
  { key: 'mistakes', icon: 'Q', title: '错题', desc: '上传试题、错题截图或解析', iconBg: '#fce7f3', iconColor: '#db2777', real: false },
]

onMounted(async () => {
  try {
    const sessions = await getSessions()
    spaceOptions.value = buildSpaceOptionsFromSessions(sessions)
  } catch {
    spaceOptions.value = buildSpaceOptionsFromSessions([])
  } finally {
    spaceLoading.value = false
  }
})

/** 选择已有 Space */
function onSelectSpace() {
  const items = spaceOptions.value.map(o => o.spaceName)
  uni.showActionSheet({
    itemList: items,
    success(res) {
      const opt = spaceOptions.value[res.tapIndex]
      if (opt.spaceId === '__new__') {
        onCreateSpace()
      } else {
        selectedSpace.value = opt
      }
    },
  })
}

/** 新建 Space */
function onCreateSpace() {
  uni.showModal({
    title: '新建学习空间',
    editable: true,
    placeholderText: '例如：Computer Networks',
    success(res) {
      if (res.confirm && res.content?.trim()) {
        const name = res.content.trim()
        const id = makeSpaceId(name)
        const type = inferSpaceType(name)
        selectedSpace.value = { spaceId: id, spaceName: name, spaceType: type, type: 'new' }
      }
    },
  })
}

/** 检查是否已选择 Space */
function ensureSpaceSelected(): boolean {
  if (!selectedSpace.value) {
    uni.showToast({ title: '请选择学习空间', icon: 'none' })
    return false
  }
  return true
}

const audioExts = ['.mp3', '.wav', '.m4a', '.aac', '.webm', '.ogg', '.flac']
const videoExts = ['.mp4', '.mov', '.webm', '.m4v']
const MAX_SIZE = 100 * 1024 * 1024

function safeBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) { uni.navigateBack(); return }
  uni.switchTab({ url: '/pages/agent/index' })
}

function onUploadTap() {
  uni.showToast({ title: '选择文件暂未接入', icon: 'none' })
}

function onParse() {
  uni.showToast({ title: '该能力将在下一阶段接入', icon: 'none' })
}

function onSave() {
  uni.showToast({ title: '该能力将在下一阶段接入', icon: 'none' })
}

function onMediaUpload() {
  if (!ensureSpaceSelected()) return
  const isAudio = selType.value === 'audio'
  const accept = isAudio ? '.mp3,.wav,.m4a,.aac,.webm,.ogg,.flac' : '.mp4,.mov,.webm,.m4v'

  // #ifdef H5
  // H5 使用 input file
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    // 校验大小
    if (file.size > MAX_SIZE) {
      uni.showToast({ title: '文件过大，请选择 100MB 以内的音视频', icon: 'none' })
      return
    }

    // 校验格式
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const validExts = isAudio ? audioExts : videoExts
    if (!validExts.includes(ext)) {
      uni.showToast({ title: `不支持的格式: ${ext}，支持: ${validExts.join('/')}`, icon: 'none' })
      return
    }

    // 创建临时 URL 供 uni.uploadFile 使用
    const blobUrl = URL.createObjectURL(file)
    await recordStore.uploadLectureAndGenerateSummary(blobUrl, isAudio ? 'audio' : 'video', {
      spaceId: selectedSpace.value?.spaceId,
      spaceName: selectedSpace.value?.spaceName,
      spaceType: selectedSpace.value?.spaceType,
    })
    URL.revokeObjectURL(blobUrl)
  }
  input.click()
  // #endif

  // #ifndef H5
  // App/小程序使用 uni.chooseFile
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: isAudio ? audioExts : videoExts,
    success(res) {
      const filePath = res.tempFiles[0]?.path
      if (!filePath) return
      const size = res.tempFiles[0]?.size || 0
      if (size > MAX_SIZE) {
        uni.showToast({ title: '文件过大，请选择 100MB 以内的音视频', icon: 'none' })
        return
      }
      recordStore.uploadLectureAndGenerateSummary(filePath, isAudio ? 'audio' : 'video', {
        spaceId: selectedSpace.value?.spaceId,
        spaceName: selectedSpace.value?.spaceName,
        spaceType: selectedSpace.value?.spaceType,
      })
    },
    fail() {
      // 用户取消不报错
    },
  })
  // #endif
}

function onDocumentUpload() {
  if (!ensureSpaceSelected()) return
  docError.value = ''
  const isReading = selType.value === 'reading'
  const accept = '.pdf'

  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (file.size > DOCUMENT_MAX_SIZE) {
      docError.value = '文件过大，请选择 50MB 以内的文档。'
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (ext !== '.pdf') {
      docError.value = '暂不支持该文件格式，请上传 PDF 文件。'
      return
    }

    const blobUrl = URL.createObjectURL(file)
    const docType = isReading ? 'reading' : 'slides'

    docUploading.value = true
    docError.value = ''

    try {
      const result = await uploadLearningDocument(blobUrl, {
        documentType: docType,
        courseName: selectedSpace.value?.spaceName || '上传资料',
        subject: selectedSpace.value?.spaceId || 'document',
        source: `upload-${docType}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        spaceId: selectedSpace.value?.spaceId,
        spaceName: selectedSpace.value?.spaceName,
        spaceType: selectedSpace.value?.spaceType,
      })

      URL.revokeObjectURL(blobUrl)

      // 跳转 Summary 页
      uni.navigateTo({
        url: `/pages/record/summary?sessionId=${result.sessionId}&from=upload`,
      })
    } catch (err: any) {
      URL.revokeObjectURL(blobUrl)
      const msg = err?.message || ''
      // 匹配错误码到用户文案
      const matchedCode = Object.keys(DOCUMENT_ERROR_MESSAGES).find(code => msg.includes(code))
      docError.value = matchedCode ? DOCUMENT_ERROR_MESSAGES[matchedCode] : (msg || '上传解析失败，请稍后重试。')
    } finally {
      docUploading.value = false
    }
  }
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: ['.pdf'],
    success(res) {
      const filePath = res.tempFiles[0]?.path
      if (!filePath) return
      const size = res.tempFiles[0]?.size || 0
      if (size > DOCUMENT_MAX_SIZE) {
        docError.value = '文件过大，请选择 50MB 以内的文档。'
        return
      }
      const docType = isReading ? 'reading' : 'slides'
      docUploading.value = true
      docError.value = ''

      uploadLearningDocument(filePath, {
        documentType: docType,
        courseName: selectedSpace.value?.spaceName || '上传资料',
        subject: selectedSpace.value?.spaceId || 'document',
        source: `upload-${docType}`,
        spaceId: selectedSpace.value?.spaceId,
        spaceName: selectedSpace.value?.spaceName,
        spaceType: selectedSpace.value?.spaceType,
      }).then(result => {
        uni.navigateTo({
          url: `/pages/record/summary?sessionId=${result.sessionId}&from=upload`,
        })
      }).catch((err: any) => {
        const msg = err?.message || ''
        const matchedCode = Object.keys(DOCUMENT_ERROR_MESSAGES).find(code => msg.includes(code))
        docError.value = matchedCode ? DOCUMENT_ERROR_MESSAGES[matchedCode] : (msg || '上传解析失败，请稍后重试。')
      }).finally(() => {
        docUploading.value = false
      })
    },
    fail() {
      // 用户取消不报错
    },
  })
  // #endif
}
</script>

<style lang="scss" scoped>
.mu-page { min-height: 100vh; background: #f7f8fa; color: #111827; overflow: hidden; }
/* #ifdef H5 */
.mu-page { max-width: 430px; margin: 0 auto; }
/* #endif */
.sub-nav { height: calc(env(safe-area-inset-top) + 120rpx); padding: calc(env(safe-area-inset-top) + 32rpx) 32rpx 0; display: flex; align-items: center; justify-content: center; box-sizing: border-box; position: relative; z-index: 20; }
.sub-nav__btn, .sub-nav__right { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; position: absolute; bottom: 0; }
.sub-nav__btn { left: 32rpx; color: #071446; font-size: 58rpx; line-height: 1; }
.sub-nav__right { right: 32rpx; }
.sub-nav__center { height: 88rpx; display: flex; align-items: center; justify-content: center; }
.sub-nav__title { font-size: 36rpx; color: #071446; font-weight: 800; }
.sub-scroll { height: calc(100vh - env(safe-area-inset-top) - 120rpx); padding: 28rpx 32rpx 0; box-sizing: border-box; }
.type-list { display: flex; flex-direction: column; gap: 24rpx; margin-bottom: 24rpx; }
.type-card, .drop-card, .result-card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 28rpx; padding: 28rpx; box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, .06); box-sizing: border-box; }
.type-card { display: flex; gap: 20rpx; align-items: center; }
.type-card--active { border-color: #2563eb; background: #eef4ff; }
.type-card__icon { width: 64rpx; height: 64rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 32rpx; flex-shrink: 0; }
.type-card__body { flex: 1; min-width: 0; }
.type-card__title { display: block; font-size: 28rpx; color: #111827; font-weight: 800; }
.type-card__desc { display: block; margin-top: 8rpx; font-size: 23rpx; color: #6b7280; line-height: 1.45; }
.type-card__badge { font-size: 20rpx; color: #059669; background: #ecfdf5; padding: 4rpx 12rpx; border-radius: 12rpx; flex-shrink: 0; }
.drop-card { min-height: 220rpx; border-style: dashed; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; margin-bottom: 24rpx; }
.drop-card__icon { width: 72rpx; height: 72rpx; border-radius: 22rpx; background: #eef4ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 38rpx; font-weight: 800; }
.drop-card__title { font-size: 28rpx; color: #111827; font-weight: 800; }
.drop-card__hint { font-size: 24rpx; color: #9ca3af; }
.result-card { margin-bottom: 24rpx; }
.result-card__title { display: block; margin-bottom: 16rpx; font-size: 30rpx; color: #111827; font-weight: 800; }
.result-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; font-size: 25rpx; color: #374151; }
.result-row__dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: #2563eb; flex-shrink: 0; }
.page-input { display: flex; align-items: center; gap: 12rpx; margin: 16rpx 0; padding: 12rpx 16rpx; border-radius: 18rpx; background: #f7f8fa; }
.page-input__label { font-size: 24rpx; color: #6b7280; }
.page-input__field { flex: 1; height: 64rpx; background: #fff; border-radius: 16rpx; padding: 0 16rpx; font-size: 26rpx; color: #111827; text-align: center; }
.upload-status { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 32rpx; margin-bottom: 24rpx; background: #eef4ff; border-radius: 28rpx; }
.upload-status__spinner { width: 32rpx; height: 32rpx; border: 4rpx solid #bfdbfe; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
.upload-status__text { font-size: 26rpx; color: #2563eb; font-weight: 600; }
@keyframes spin { to { transform: rotate(360deg); } }
.mu-actions { display: flex; gap: 16rpx; }
.mu-actions__btn { flex: 1; min-height: 78rpx; border-radius: 24rpx; background: #fff; color: #4b5563; display: flex; align-items: center; justify-content: center; font-size: 27rpx; font-weight: 800; box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, .05); }
.mu-actions__btn--primary { background: #2563eb; color: #fff; }
.doc-error { margin-bottom: 24rpx; padding: 24rpx 28rpx; background: #fef2f2; border: 1rpx solid #fecaca; border-radius: 28rpx; }
.doc-error__text { font-size: 26rpx; color: #dc2626; line-height: 1.5; }
/* Space selector */
.space-section { margin-bottom: 24rpx; }
.space-section__label { display: block; font-size: 26rpx; color: #374151; font-weight: 700; margin-bottom: 12rpx; }
.space-selector { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 24rpx; background: #fff; border: 1rpx solid #eef0f3; border-radius: 24rpx; box-shadow: 0 8rpx 20rpx rgba(15,23,42,.04); }
.space-selector:active { background: #f8faff; }
.space-selector__selected { display: flex; align-items: center; gap: 12rpx; }
.space-selector__name { font-size: 28rpx; color: #111827; font-weight: 600; }
.space-selector__type { font-size: 20rpx; color: #6b7280; padding: 4rpx 12rpx; background: #f3f4f6; border-radius: 999rpx; }
.space-selector__placeholder { font-size: 28rpx; color: #9ca3af; }
.space-selector__arrow { color: #9ca3af; font-size: 36rpx; }
.space-new { margin-top: 12rpx; display: flex; justify-content: center; }
.space-new__text { font-size: 26rpx; color: #2563eb; font-weight: 600; }
.page-safe { height: calc(env(safe-area-inset-bottom) + 180rpx); }
</style>
