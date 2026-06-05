<template>
  <view class="sum-page">
    <view class="sum-nav">
      <text class="sum-nav__back" @tap="safeBack">‹</text>
      <text class="sum-nav__title">{{ pageTitle }}</text>
      <text class="sum-nav__more" @tap="handleMore">•••</text>
    </view>

    <view v-if="status === 'loading'" class="sum-loading">
      <view class="sum-skel sum-skel--meta" />
      <view class="sum-skel sum-skel--tabs" />
      <view class="sum-skel sum-skel--card" />
      <view class="sum-skel sum-skel--card" />
    </view>

    <view v-else-if="status === 'error'" class="sum-state">
      <text class="sum-state__title">AI 总结生成失败</text>
      <text class="sum-state__desc">{{ errorDesc }}</text>
      <text class="sum-state__action" @tap="loadData">{{ t('common.retry') }}</text>
      <text class="sum-state__action" @tap="goHome">返回听刻</text>
    </view>

    <view v-else-if="status === 'noData'" class="sum-state">
      <text class="sum-state__title">暂无课堂总结</text>
      <text class="sum-state__desc">请先完成一节课堂录音后再查看 AI 总结。</text>
      <text class="sum-state__action" @tap="goHome">返回听刻</text>
    </view>

    <template v-else>
      <scroll-view scroll-y class="sum-scroll">
        <!-- 资料信息卡 Source Meta Card -->
        <view class="sum-meta">
          <view class="sum-meta__top">
            <view class="sum-meta__icon">{{ sourceIcon }}</view>
            <view class="sum-meta__body">
              <text class="sum-meta__course">{{ sourceTitleFromQuery || summary.courseName || '未命名资料' }}</text>
              <view class="sum-meta__facts">
                <text v-if="spaceNameDisplay" class="sum-meta__space-tag">{{ spaceNameDisplay }}</text>
                <text v-if="sourceTypeLabel">{{ sourceTypeLabel }}</text>
                <text v-if="statusLabel">{{ statusLabel }}</text>
                <text v-if="summary.date">{{ summary.date }}</text>
                <template v-if="!isDocumentSource">
                  <text v-if="summary.duration">{{ Math.round(summary.duration / 60) }}min</text>
                </template>
                <template v-if="isDocumentSource">
                  <text v-if="summary.pageCount">{{ summary.pageCount }} 页</text>
                </template>
                <text v-if="summary.markCount">{{ summary.markCount }}个标记</text>
              </view>
            </view>
          </view>
          <!-- 标记占位（预留结构） -->
          <view class="sum-meta__marker-row">
            <text class="sum-meta__marker-label">标记</text>
            <text class="sum-meta__marker-count">{{ summary.markCount || 0 }}</text>
          </view>
          <view v-if="summary.classFlow" class="sum-meta__line" />
          <view v-if="summary.classFlow" class="sum-meta__flow">
            <text class="sum-meta__flow-label">{{ isDocumentSource ? '资料主线：' : '本节课主线：' }}</text>
            <text class="sum-meta__flow-text">{{ summary.classFlow }}</text>
          </view>
        </view>

        <!-- Phase 10-D: 资料标记模块 -->
        <view class="sum-card sum-card--markers">
          <view class="sum-card__head">
            <view class="sum-card__icon">🔖</view>
            <text class="sum-card__title">资料标记</text>
            <text v-if="markers.length > 0" class="sum-card__count">{{ markers.length }}</text>
          </view>
          <template v-if="markers.length > 0">
            <view v-for="mk in markers" :key="mk.id" class="marker-card">
              <view class="marker-card__top">
                <text class="marker-card__tag" :class="markerTypeClass(mk.type)">{{ markerTypeLabel(mk.type) }}</text>
                <text v-if="mk.timestampMs" class="marker-card__time">{{ formatMarkerTime(mk.timestampMs) }}</text>
              </view>
              <text v-if="mk.contextText" class="marker-card__context">{{ mk.contextText }}</text>
              <text v-else class="marker-card__context marker-card__context--empty">暂无上下文</text>
              <view class="marker-card__actions">
                <view class="marker-card__btn" @tap="onExplainMarker(mk)"><text>解释</text></view>
                <view class="marker-card__btn" @tap="onAddToReview(mk)"><text>加入复习</text></view>
              </view>
            </view>
          </template>
          <view v-else class="marker-empty">
            <text class="marker-empty__text">这份资料暂无标记。</text>
            <text class="marker-empty__hint">你可以在录音时标记重点、疑问或没听懂的地方。</text>
          </view>
        </view>

        <!-- Tab: 文档类只显示总览，音频/视频显示总览+原文 -->
        <view v-if="tabs.length > 1" class="sum-tabs">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="sum-tab"
            :class="{ 'sum-tab--active': currentTab === tab.key }"
            @tap="currentTab = tab.key"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>

        <!-- ========== 总览页 ========== -->
        <view v-if="currentTab === 'overview'" class="sum-content">
          <!-- AI 总结尚未生成时的统一空状态 -->
          <view v-if="!hasAnyAiContent" class="sum-empty-ai">
            <text class="sum-empty-ai__title">AI 总结尚未生成</text>
            <text class="sum-empty-ai__desc">原文已保存，稍后可重新生成总结。</text>
            <text class="sum-empty-ai__btn" @tap="handleRetrySummary">重试生成</text>
          </view>

          <template v-else>
            <!-- 1. AI 总结卡片 -->
            <view v-if="aiSummaryText" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">AI</view>
                <text class="sum-card__title">AI 总结</text>
              </view>
              <text class="sum-card__summary-text">{{ aiSummaryText }}</text>
            </view>

            <!-- 2. 主线（动态标题） -->
            <view v-if="mainline.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">→</view>
                <text class="sum-card__title">{{ isDocumentSource ? '资料主线' : '本节课主线' }}</text>
              </view>
              <view class="mainline-wrap">
                <view v-for="(step, idx) in mainline" :key="idx" class="mainline-step">
                  <view class="mainline-step__num">{{ idx + 1 }}</view>
                  <text class="mainline-step__text">{{ step }}</text>
                  <text v-if="idx < mainline.length - 1" class="mainline-step__arrow">→</text>
                </view>
              </view>
            </view>

            <!-- 3. 你需要优先掌握 -->
            <view v-if="masterPoints.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">◎</view>
                <text class="sum-card__title">你需要优先掌握</text>
              </view>
              <view v-for="(point, idx) in masterPoints" :key="idx" class="master-row">
                <view class="master-row__num">{{ idx + 1 }}</view>
                <text class="master-row__text">{{ point }}</text>
              </view>
            </view>

            <!-- 4. 核心知识点 -->
            <view v-if="knowledgeChips.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">◈</view>
                <text class="sum-card__title">核心知识点</text>
              </view>
              <view class="chip-wrap">
                <view v-for="(chip, idx) in knowledgeChips" :key="idx" class="chip">
                  <text class="chip__text">{{ chip }}</text>
                </view>
              </view>
            </view>

            <!-- 5. 专业术语 -->
            <view v-if="terms.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">¶</view>
                <text class="sum-card__title">专业术语</text>
              </view>
              <view v-for="term in terms" :key="term.term" class="term-row">
                <text class="term-row__en">{{ term.term }}</text>
                <text v-if="term.chinese && term.chinese !== term.term" class="term-row__zh">{{ term.chinese }}</text>
                <text class="term-row__text">{{ term.explanation }}</text>
                <text v-if="term.relatedConcepts" class="term-row__example">例：{{ term.relatedConcepts }}</text>
              </view>
            </view>

            <!-- 6. 考点提醒（完整 point / reason / question） -->
            <view v-if="examFocusList.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">!</view>
                <text class="sum-card__title">考点提醒</text>
              </view>
              <view v-for="(ef, idx) in examFocusList" :key="idx" class="exam-row">
                <view class="exam-row__badge">考点{{ idx + 1 }}</view>
                <text class="exam-row__point">{{ ef.point }}</text>
                <text v-if="ef.reason" class="exam-row__reason">为什么重要：{{ ef.reason }}</text>
                <text v-if="ef.question" class="exam-row__question">可能怎么考：{{ ef.question }}</text>
              </view>
            </view>

            <!-- 7. 今日复习任务 -->
            <view v-if="reviewTasks.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">□</view>
                <text class="sum-card__title">今日复习任务</text>
              </view>
              <view v-for="task in reviewTasks" :key="task.id" class="review-row" @tap="handleToggleTask(task.id)">
                <view class="review-row__box" :class="{ 'review-row__box--done': task.completed }">
                  <text v-if="task.completed">✓</text>
                </view>
                <text class="review-row__text" :class="{ 'review-row__text--done': task.completed }">{{ task.title }}</text>
                <text class="review-row__arrow">›</text>
              </view>
            </view>

            <!-- 8. 易错点 -->
            <view v-if="weakPoints.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">⚠</view>
                <text class="sum-card__title">易错点提醒</text>
              </view>
              <view v-for="(wp, idx) in weakPoints" :key="idx" class="weak-row">
                <text class="weak-row__icon">⚠</text>
                <text class="weak-row__text">{{ wp }}</text>
              </view>
            </view>

            <!-- 9. 知识结构（mindMap 树状列表） -->
            <view v-if="mindMapTree.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">⬡</view>
                <text class="sum-card__title">知识结构</text>
              </view>
              <view v-for="(node, idx) in mindMapTree" :key="idx" class="mindmap-root">
                <text class="mindmap-root__name">{{ node.name }}</text>
                <view v-if="node.children && node.children.length > 0" class="mindmap-children">
                  <view v-for="(child, ci) in node.children" :key="ci" class="mindmap-l1">
                    <view class="mindmap-l1__bar" />
                    <view class="mindmap-l1__content">
                      <text class="mindmap-l1__name">{{ child.name }}</text>
                      <view v-if="child.children && child.children.length > 0" class="mindmap-l2-wrap">
                        <view v-for="(gc, gi) in child.children" :key="gi" class="mindmap-l2">
                          <view class="mindmap-l2__dot" />
                          <text class="mindmap-l2__name">{{ gc.name }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 10. 个性化建议 -->
            <view v-if="personalizedText.length > 0" class="sum-card">
              <view class="sum-card__head">
                <view class="sum-card__icon">●</view>
                <text class="sum-card__title">个性化建议</text>
              </view>
              <view v-for="(item, idx) in personalizedText" :key="idx" class="personal-row">
                <view class="personal-row__icon">{{ personalIcons[idx % 3] }}</view>
                <text class="personal-row__text">{{ item }}</text>
              </view>
            </view>
          </template>
        </view>

        <!-- ========== 原文页 ========== -->
        <view v-else class="sum-content">
          <view class="sum-transcript-tip">
            <text class="sum-transcript-tip__text">{{ transcriptTipText }}</text>
          </view>

          <!-- 有分段原文 -->
          <view v-if="transcriptBlocks.length > 0" class="sum-card">
            <view v-for="(block, idx) in transcriptBlocks" :key="idx" class="doc-block">
              <text class="doc-block__time">{{ block.timeRange }}</text>
              <text class="doc-block__title">{{ block.title }}</text>
              <text class="doc-block__text">{{ block.text }}</text>
            </view>
          </view>

          <!-- 有全文原文但无分段 -->
          <view v-else-if="fullTranscriptText" class="sum-card">
            <text class="doc-block__text">{{ fullTranscriptText }}</text>
          </view>

          <!-- 无原文 -->
          <view v-else class="sum-empty-ai">
            <text class="sum-empty-ai__title">暂无转写原文</text>
            <text class="sum-empty-ai__desc">音频转写内容将在此处显示。</text>
          </view>
        </view>

        <view class="sum-safe" />
      </scroll-view>

      <!-- 底部按钮（Phase 10-C: Source Detail 语义） -->
      <view class="sum-footer">
        <view v-if="sourceFrom === 'knowledge'" class="sum-footer__btn" @tap="goConceptMap">知识图谱</view>
        <view v-else class="sum-footer__btn" @tap="handleShare">{{ t('summary.share') }}</view>
        <view v-if="sourceFrom === 'knowledge' && courseIdFromQuery" class="sum-footer__btn sum-footer__btn--primary" @tap="safeBack">返回学习空间</view>
        <view v-else-if="sourceFrom === 'knowledge'" class="sum-footer__btn sum-footer__btn--primary" @tap="goKnowledgeBase">返回知识库</view>
        <view v-else-if="sourceFrom === 'upload'" class="sum-footer__btn sum-footer__btn--primary" @tap="goKnowledgeBase">返回知识库</view>
        <view v-else-if="sourceFrom === 'record'" class="sum-footer__btn sum-footer__btn--primary" @tap="goKnowledgeBase">查看知识库</view>
        <view v-else class="sum-footer__btn sum-footer__btn--primary" @tap="safeBack">返回</view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useRecordStore } from '@/stores/useRecordStore'
import { getMarkers } from '@/services/sessionApi'

const { t } = useI18n()
const store = useRecordStore()

const status = ref('loading')
const currentTab = ref('overview')
const sourceFrom = ref('record')
const sessionIdFromQuery = ref(null)
const courseIdFromQuery = ref('')
const courseNameFromQuery = ref('')
const sourceTypeFromQuery = ref('')
const sourceTitleFromQuery = ref('')
const errorDesc = ref('后端服务不可用或总结仍在处理中')

// Phase 10-D: markers
const markers = ref([])

const summary = computed(() => store.summaryResult)

// ========== Phase 10-C: Source Type 判断 ==========

/** 综合 sourceType（优先级: query > summary.sourceType > summary.source > summary.documentType） */
const resolvedSourceType = computed(() => {
  const fromQuery = sourceTypeFromQuery.value.toLowerCase()
  if (fromQuery) return fromQuery
  const s = summary.value
  return (s.sourceType || s.source || s.documentType || '').toLowerCase()
})

/** 音频类 source */
const isAudioLikeSource = computed(() => {
  const st = resolvedSourceType.value
  return /audio|upload-audio/.test(st)
})

/** 视频类 source */
const isVideoLikeSource = computed(() => {
  const st = resolvedSourceType.value
  return /video|upload-video/.test(st)
})

/** 录音类 source */
const isRecordingSource = computed(() => {
  const st = resolvedSourceType.value
  return /realtime-recording|recording/.test(st) && !isAudioLikeSource.value && !isVideoLikeSource.value
})

/** 文档类 source */
const isDocumentSource = computed(() => {
  const st = resolvedSourceType.value
  return /document|reading|slides|pdf|upload-document|upload-reading|upload-slides/.test(st)
})

/** 是否有转写原文 */
const hasTranscript = computed(() => {
  return transcriptBlocks.value.length > 0 || fullTranscriptText.value.length > 0
})

/** 兼容旧 isDocumentSummary */
const isDocumentSummary = computed(() => isDocumentSource.value)

/** 页面标题（动态） */
const pageTitle = computed(() => {
  if (isDocumentSource.value) return '资料总结'
  if (isRecordingSource.value) return '课堂总结'
  if (isAudioLikeSource.value || isVideoLikeSource.value) return '音视频总结'
  return '学习资料总结'
})

/** 资料类型标签 */
const sourceTypeLabel = computed(() => {
  const st = resolvedSourceType.value
  if (/realtime-recording/.test(st)) return '课堂录音'
  if (/upload-audio/.test(st)) return '课堂音频'
  if (/upload-video/.test(st)) return '课堂视频'
  if (/upload-reading/.test(st)) return 'Reading'
  if (/upload-slides/.test(st)) return 'Lecture Slides'
  if (/upload-document/.test(st)) return 'PDF 资料'
  if (/document/.test(st)) return '文档资料'
  if (/reading/.test(st)) return 'Reading'
  if (/slides/.test(st)) return 'Lecture Slides'
  if (/pdf/.test(st)) return 'PDF 资料'
  if (/recording/.test(st)) return '课堂录音'
  if (/audio/.test(st)) return '课堂音频'
  if (/video/.test(st)) return '课堂视频'
  return '学习资料'
})

/** 状态标签 */
const statusLabel = computed(() => '已完成')

/** 所属空间名 */
const spaceNameDisplay = computed(() => {
  return courseNameFromQuery.value || summary.value.spaceName || summary.value.courseName || ''
})

/** 文档类型标签（旧兼容） */
const documentTypeLabel = computed(() => {
  if (isDocumentSource.value) return sourceTypeLabel.value
  return ''
})

/** Tab 列表（Phase 10-C: 动态根据 sourceType + hasTranscript） */
const tabs = computed(() => {
  if (isDocumentSource.value) {
    return [{ key: 'overview', label: '总览' }]
  }
  if (hasTranscript.value) {
    return [
      { key: 'overview', label: '总览' },
      { key: 'transcript', label: '原文' },
    ]
  }
  return [{ key: 'overview', label: '总览' }]
})

/** 原文提示文案（Phase 10-C: 视频类不同） */
const transcriptTipText = computed(() => {
  if (isVideoLikeSource.value) return '原文由视频音轨识别生成，可能存在错字，可结合 AI 总结查看。'
  return '原文由语音识别生成，可能存在错字，可结合 AI 总结查看。'
})

/** 资料图标 */
const sourceIcon = computed(() => {
  if (isDocumentSource.value) return '📄'
  if (isVideoLikeSource.value) return '🎬'
  if (isAudioLikeSource.value) return '🎵'
  if (isRecordingSource.value) return '🎙'
  return '📁'
})

// --- 总览页数据 ---

/** AI 总结正文 — 优先用完整 content，fallback 到 oneSentenceSummary */
const aiSummaryText = computed(() => {
  const s = summary.value
  // structuredSummary[0].coreConcept 是完整的 summary.content
  return s.structuredSummary?.[0]?.coreConcept || s.oneSentenceSummary || ''
})

/** 需要掌握的点 */
const masterPoints = computed(() => summary.value.keyPoints || [])

/** 核心知识点标签 — 用真正的 keywords */
const knowledgeChips = computed(() => {
  const s = summary.value
  if (s.keywords && s.keywords.length > 0) {
    return s.keywords
  }
  // fallback: 从 keyPoints 中取短的
  const chips = []
  for (const point of (s.keyPoints || [])) {
    if (point.length <= 20) chips.push(point)
  }
  return chips
})

/** 本节课主线 */
const mainline = computed(() => {
  const s = summary.value
  // 从 classFlow 拆回主线步骤
  if (s.classFlow && s.classFlow.includes(' → ')) {
    return s.classFlow.split(' → ')
  }
  return []
})

/** 专业术语 */
const terms = computed(() => summary.value.terms || [])

/** 考点提醒（保留完整 point / reason / question） */
const examFocusList = computed(() => {
  const items = summary.value.examFocusItems || []
  return items.map((item) => {
    if (typeof item === 'string') return { point: item, reason: '', question: '' }
    return { point: item.point || '', reason: item.reason || '', question: item.question || '' }
  }).filter((item) => item.point)
})

/** 知识结构 mindMap */
const mindMapTree = computed(() => summary.value.mindMap || [])

/** 复习任务 */
const reviewTasks = computed(() => summary.value.reviewTasks || [])

/** 个性化建议 */
const personalizedText = computed(() => {
  const items = summary.value.personalizedItems || []
  return items.map((item) => item.text)
})

/** 易错点 */
const weakPoints = computed(() => {
  return (summary.value.commonMistakes || []).map((m) => m.text)
})

const personalIcons = ['↗', '◷', '▤']

/** 是否有任何 AI 内容 */
const hasAnyAiContent = computed(() => {
  const s = summary.value
  return !!(s.oneSentenceSummary || s.keyPoints?.length || s.terms?.length || s.reviewTasks?.length || s.personalizedItems?.length || s.structuredSummary?.length || s.mindMap?.length)
})

// --- 原文页数据 ---

/** 分段原文 */
const transcriptBlocks = computed(() => summary.value.transcriptBlocks || [])

/** 全文原文（无分段时的 fallback） */
const fullTranscriptText = computed(() => {
  // 优先从 store 的 transcriptSegments 拼接
  if (store.transcriptSegments.length > 0) {
    return store.transcriptSegments.map(s => s.text).join('\n')
  }
  // 从 summary 结构化数据
  if (summary.value.transcriptBlocks?.length > 0) {
    return summary.value.transcriptBlocks.map(b => b.text).join('\n')
  }
  return ''
})

// --- 生命周期 ---

async function loadData() {
  status.value = 'loading'
  store.summaryError = null
  markers.value = []

  if (sessionIdFromQuery.value) {
    await store.fetchSessionSummary(sessionIdFromQuery.value)
    // Phase 10-D: 加载 markers（不阻塞主流程）
    loadMarkers(sessionIdFromQuery.value)
    if (store.summaryError) {
      const msg = store.summaryError
      if (msg.includes('BACKEND_CORS')) errorDesc.value = '后端请求失败，请确认后端 CORS 配置和服务状态'
      else if (msg.includes('TRANSCRIPT_TOO_SHORT')) errorDesc.value = '录音内容太短，无法生成 AI 总结。请录制 20 秒以上的课堂内容后重试。'
      else if (msg.includes('TRANSCRIPT_EMPTY')) errorDesc.value = '没有识别到有效语音，请确认麦克风权限、音量和录音时长后重试。'
      else if (msg.includes('SUMMARY_TIMEOUT')) errorDesc.value = 'AI 总结生成超时，请稍后重试'
      else if (msg.includes('SUMMARY_FAILED')) errorDesc.value = 'AI 服务未启动或未配置，请检查后端 AI service'
      else if (msg.includes('SUMMARY_PROCESSING')) errorDesc.value = 'AI 总结仍在生成中，请稍后重试'
      else if (msg.includes('SESSION_MISSING')) errorDesc.value = '课堂会话不存在'
      else errorDesc.value = msg
      status.value = 'error'
      return
    }
  }

  if (summary.value.courseName || summary.value.keyPoints?.length || summary.value.oneSentenceSummary) {
    status.value = 'normal'
    // 文档类或无原文时自动切回总览（防 activeTab 残留为 transcript）
    if (isDocumentSource.value || !hasTranscript.value) {
      currentTab.value = 'overview'
    }
  } else if (store.summaryError) {
    status.value = 'error'
  } else {
    status.value = 'noData'
  }
}

onLoad((query) => {
  const from = query?.from || 'record'
  sourceFrom.value = from === 'knowledge' ? 'knowledge' : from === 'upload' ? 'upload' : 'record'
  sessionIdFromQuery.value = query?.sessionId || null
  // Phase 10-C: Space / Source 参数
  courseIdFromQuery.value = query?.spaceId ? decodeURIComponent(query.spaceId) : (query?.courseId ? decodeURIComponent(query.courseId) : '')
  courseNameFromQuery.value = query?.spaceName ? decodeURIComponent(query.spaceName) : (query?.courseName ? decodeURIComponent(query.courseName) : '')
  sourceTypeFromQuery.value = query?.sourceType ? decodeURIComponent(query.sourceType) : ''
  sourceTitleFromQuery.value = query?.sourceTitle ? decodeURIComponent(query.sourceTitle) : ''
})

// --- 导航 ---

function safeBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  if (sourceFrom.value === 'knowledge' && courseIdFromQuery.value) {
    uni.redirectTo({ url: `/pages/knowledge/course?spaceId=${encodeURIComponent(courseIdFromQuery.value)}&spaceName=${encodeURIComponent(courseNameFromQuery.value)}` })
    return
  }
  if (sourceFrom.value === 'knowledge') {
    uni.switchTab({ url: '/pages/knowledge/index' })
    return
  }
  uni.switchTab({ url: '/pages/agent/index' })
}

function goHome() {
  uni.switchTab({ url: '/pages/agent/index' })
}

function goKnowledgeBase() {
  uni.switchTab({ url: '/pages/knowledge/index' })
}

function goConceptMap() {
  if (sessionIdFromQuery.value) {
    uni.navigateTo({ url: `/pages/concept-map/index?sessionId=${sessionIdFromQuery.value}` })
  } else {
    uni.showToast({ title: '暂无知识点图谱', icon: 'none' })
  }
}

function handleMore() { uni.showToast({ title: t('summary.moreComingSoon'), icon: 'none' }) }
function handleToggleTask(id) { store.toggleSummaryReviewTask(id) }
function handleShare() { uni.showToast({ title: t('summary.shareComingSoon'), icon: 'none' }) }
function handleRetrySummary() { uni.showToast({ title: '重新生成总结将在下一阶段接入。', icon: 'none' }) }

// Phase 10-D: Marker functions
async function loadMarkers(sessionId) {
  try {
    const data = await getMarkers(sessionId)
    markers.value = (data || []).map((m) => ({
      id: m.id || '',
      type: m.type || m.label || 'important',
      label: m.label || m.type || '标记',
      timestampMs: m.timestampMs,
      contextText: m.contextText || m.note || m.content || '',
      status: m.status || 'pending',
      content: m.content || '',
    }))
  } catch (err) {
    console.warn('[summary] loadMarkers failed', err)
    // 不影响主内容
  }
}

function formatMarkerTime(ms) {
  if (!ms) return ''
  const sec = Math.round(ms / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function markerTypeLabel(type) {
  const map = {
    important: '重点', question: '疑问', confused: '没听懂',
    didnt_understand: '没听懂', exam: '考点', review: '待复习', note: '笔记',
  }
  return map[type] || '标记'
}

function markerTypeClass(type) {
  if (type === 'important') return 'marker-card__tag--important'
  if (type === 'question' || type === 'confused' || type === 'didnt_understand') return 'marker-card__tag--question'
  if (type === 'exam') return 'marker-card__tag--exam'
  if (type === 'review') return 'marker-card__tag--review'
  return 'marker-card__tag--default'
}

function onExplainMarker(_marker) {
  uni.showToast({ title: 'AI 解释标记将在下一阶段接入', icon: 'none' })
}

function onAddToReview(_marker) {
  uni.showToast({ title: '加入复习将在下一阶段接入', icon: 'none' })
}

onMounted(() => { loadData() })
</script>

<style lang="scss" scoped>
.sum-page {
  min-height: 100vh;
  background: #f7f8fa;
  color: #111827;
  overflow: hidden;
  padding-bottom: calc(154rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* #ifdef H5 */
.sum-page { max-width: 430px; margin: 0 auto; }
/* #endif */

/* ====== Nav ====== */
.sum-nav {
  height: calc(env(safe-area-inset-top) + 120rpx);
  padding: calc(env(safe-area-inset-top) + 32rpx) 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.sum-nav__back,
.sum-nav__more {
  width: 92rpx;
  color: #071446;
}

.sum-nav__back {
  font-size: 58rpx;
  line-height: 1;
}

.sum-nav__more {
  text-align: right;
  font-size: 28rpx;
  letter-spacing: 4rpx;
  font-weight: 800;
}

.sum-nav__title {
  font-size: 40rpx;
  color: #071446;
  font-weight: 800;
}

/* ====== Scroll ====== */
.sum-scroll {
  height: calc(100vh - env(safe-area-inset-top) - 120rpx);
  box-sizing: border-box;
}

/* ====== Meta Card ====== */
.sum-meta {
  margin: 24rpx 32rpx 24rpx;
  padding: 28rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 32rpx;
  box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}

.sum-meta__top {
  display: flex;
  gap: 24rpx;
  align-items: center;
}

.sum-meta__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: #eef4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  font-size: 24rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.sum-meta__body {
  flex: 1;
  min-width: 0;
}

.sum-meta__course {
  display: block;
  font-size: 34rpx;
  color: #071446;
  font-weight: 800;
  margin-bottom: 14rpx;
}

.sum-meta__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx 18rpx;
}

.sum-meta__facts text {
  font-size: 23rpx;
  color: #6b7280;
}

.sum-meta__space-tag {
  padding: 2rpx 12rpx;
  background: #eef4ff;
  color: #2563eb;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.sum-meta__marker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f3f4f6;
}

.sum-meta__marker-label {
  font-size: 24rpx;
  color: #9ca3af;
}

.sum-meta__marker-count {
  font-size: 24rpx;
  color: #6b7280;
  font-weight: 600;
}

.sum-meta__line {
  height: 1rpx;
  background: #e5e7eb;
  margin: 26rpx 0;
}

.sum-meta__flow {
  display: flex;
  gap: 12rpx;
  align-items: baseline;
}

.sum-meta__flow-label {
  font-size: 28rpx;
  color: #111827;
  font-weight: 700;
  flex-shrink: 0;
}

.sum-meta__flow-text {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.5;
}

/* ====== Tabs (2 tabs, equal width) ====== */
.sum-tabs {
  display: flex;
  gap: 0;
  margin: 0 32rpx 24rpx;
  background: #ffffff;
  border-radius: 999rpx;
  border: 1rpx solid #eef0f3;
  overflow: hidden;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.04);
}

.sum-tab {
  flex: 1;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 28rpx;
  transition: all 0.2s;
}

.sum-tab--active {
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
  border-radius: 999rpx;
}

/* ====== Content Area ====== */
.sum-content {
  padding-bottom: 4rpx;
}

/* ====== Cards ====== */
.sum-card {
  margin: 0 32rpx 24rpx;
  padding: 28rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 32rpx;
  box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}

.sum-card__head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.sum-card__icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 16rpx;
  background: #eef4ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 800;
}

.sum-card__title {
  font-size: 32rpx;
  color: #111827;
  font-weight: 800;
}

.sum-card__summary-text {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  line-height: 1.75;
  white-space: pre-wrap;
}

/* ====== Mainline ====== */
.mainline-wrap {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.mainline-step {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.mainline-step__num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #eef4ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.mainline-step__text {
  flex: 1;
  font-size: 27rpx;
  color: #111827;
  line-height: 1.5;
}

.mainline-step__arrow {
  color: #9ca3af;
  font-size: 24rpx;
  flex-shrink: 0;
}

/* ====== Exam Focus ====== */
.exam-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eef0f3;
}

.exam-row:last-child { border-bottom: none; }

.exam-row__badge {
  display: inline-block;
  padding: 4rpx 14rpx;
  background: #fef3c7;
  color: #92400e;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.exam-row__point {
  display: block;
  font-size: 28rpx;
  color: #111827;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.exam-row__reason {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 6rpx;
}

.exam-row__question {
  display: block;
  font-size: 24rpx;
  color: #2563eb;
  line-height: 1.5;
  font-style: italic;
}

/* ====== MindMap Tree ====== */
.mindmap-root {
  margin-bottom: 16rpx;
}

.mindmap-root:last-child { margin-bottom: 0; }

.mindmap-root__name {
  display: block;
  font-size: 30rpx;
  color: #111827;
  font-weight: 800;
  margin-bottom: 12rpx;
}

.mindmap-children {
  padding-left: 8rpx;
}

.mindmap-l1 {
  display: flex;
  gap: 0;
  margin-bottom: 8rpx;
}

.mindmap-l1__bar {
  width: 4rpx;
  background: #c7d8ff;
  border-radius: 2rpx;
  flex-shrink: 0;
  margin-right: 18rpx;
}

.mindmap-l1__content {
  flex: 1;
}

.mindmap-l1__name {
  display: block;
  font-size: 28rpx;
  color: #2563eb;
  font-weight: 700;
  margin-bottom: 8rpx;
}

.mindmap-l2-wrap {
  padding-left: 12rpx;
}

.mindmap-l2 {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}

.mindmap-l2__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #93b4ff;
  flex-shrink: 0;
}

.mindmap-l2__name {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.5;
}

/* ====== Weak Points ====== */
.weak-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.weak-row:last-child { margin-bottom: 0; }

.weak-row__icon {
  color: #f59e0b;
  font-size: 26rpx;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.weak-row__text {
  flex: 1;
  font-size: 27rpx;
  color: #111827;
  line-height: 1.6;
}

/* ====== Key Points ====== */
.master-row {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  margin-bottom: 20rpx;
}

.master-row:last-child { margin-bottom: 0; }

.master-row__num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #eef4ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.master-row__text {
  flex: 1;
  font-size: 27rpx;
  color: #111827;
  line-height: 1.65;
}

/* ====== Knowledge Chips ====== */
.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  padding: 12rpx 24rpx;
  background: #eef4ff;
  border-radius: 999rpx;
  border: 1rpx solid #c7d8ff;
}

.chip__text {
  font-size: 24rpx;
  color: #2563eb;
  font-weight: 600;
}

/* ====== Terms ====== */
.term-row {
  padding: 22rpx 0;
  border-bottom: 1rpx solid #eef0f3;
}

.term-row:last-child { border-bottom: none; }

.term-row__en {
  display: block;
  font-size: 29rpx;
  color: #111827;
  font-weight: 700;
  margin-bottom: 6rpx;
}

.term-row__zh {
  display: block;
  color: #6b7280;
  font-size: 24rpx;
  margin-bottom: 8rpx;
}

.term-row__text {
  display: block;
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.65;
}

.term-row__example {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  line-height: 1.5;
  margin-top: 6rpx;
  font-style: italic;
}

/* ====== Review Tasks ====== */
.review-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 20rpx;
}

.review-row:last-child { margin-bottom: 0; }

.review-row__box {
  width: 34rpx;
  height: 34rpx;
  border-radius: 8rpx;
  border: 2rpx solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 22rpx;
  flex-shrink: 0;
}

.review-row__box--done {
  background: #2563eb;
  border-color: #2563eb;
}

.review-row__text {
  flex: 1;
  min-width: 0;
  font-size: 27rpx;
  color: #111827;
  line-height: 1.55;
}

.review-row__text--done {
  color: #9ca3af;
  text-decoration: line-through;
}

.review-row__arrow {
  color: #9ca3af;
  font-size: 36rpx;
}

/* ====== Personalized ====== */
.personal-row {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  margin-bottom: 20rpx;
}

.personal-row:last-child { margin-bottom: 0; }

.personal-row__icon {
  width: 54rpx;
  height: 54rpx;
  border-radius: 16rpx;
  background: #eef4ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.personal-row__text {
  flex: 1;
  font-size: 27rpx;
  color: #111827;
  line-height: 1.65;
}

/* ====== Marker Cards (Phase 10-D) ====== */
.sum-card--markers { background: #fffef5; border-color: #fde68a; }
.sum-card__count { margin-left: auto; font-size: 24rpx; color: #6b7280; font-weight: 600; }
.marker-card { padding: 18rpx 0; border-bottom: 1rpx solid #f3f4f6; }
.marker-card:last-child { border-bottom: none; }
.marker-card__top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.marker-card__tag { padding: 4rpx 14rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 600; }
.marker-card__tag--important { background: #fef3c7; color: #92400e; }
.marker-card__tag--question { background: #eef4ff; color: #2563eb; }
.marker-card__tag--exam { background: #fce7f3; color: #db2777; }
.marker-card__tag--review { background: #ecfdf5; color: #059669; }
.marker-card__tag--default { background: #f3f4f6; color: #6b7280; }
.marker-card__time { font-size: 24rpx; color: #9ca3af; }
.marker-card__context { display: block; font-size: 26rpx; color: #4b5563; line-height: 1.5; margin-bottom: 10rpx; }
.marker-card__context--empty { color: #9ca3af; font-style: italic; }
.marker-card__actions { display: flex; gap: 12rpx; }
.marker-card__btn { padding: 8rpx 18rpx; border-radius: 16rpx; background: #eef4ff; }
.marker-card__btn text { font-size: 22rpx; color: #2563eb; font-weight: 600; }
.marker-empty { padding: 12rpx 0; }
.marker-empty__text { display: block; font-size: 26rpx; color: #6b7280; margin-bottom: 6rpx; }
.marker-empty__hint { display: block; font-size: 24rpx; color: #9ca3af; }

/* ====== AI Empty State ====== */
.sum-empty-ai {
  margin: 0 32rpx 24rpx;
  padding: 60rpx 32rpx;
  background: #ffffff;
  border-radius: 32rpx;
  text-align: center;
  border: 1rpx solid #eef0f3;
}

.sum-empty-ai__title {
  display: block;
  font-size: 30rpx;
  color: #111827;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.sum-empty-ai__desc {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 24rpx;
}

.sum-empty-ai__btn {
  display: inline-block;
  padding: 14rpx 40rpx;
  background: #eef4ff;
  color: #2563eb;
  font-size: 26rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

/* ====== Transcript Tab ====== */
.sum-transcript-tip {
  margin: 0 32rpx 20rpx;
  padding: 18rpx 24rpx;
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 20rpx;
}

.sum-transcript-tip__text {
  font-size: 24rpx;
  color: #92400e;
  line-height: 1.5;
}

.doc-block {
  padding: 22rpx 0;
  border-bottom: 1rpx solid #eef0f3;
}

.doc-block:last-child { border-bottom: none; }

.doc-block__time {
  display: block;
  font-size: 23rpx;
  color: #2563eb;
  margin-bottom: 8rpx;
}

.doc-block__title {
  display: block;
  font-size: 25rpx;
  color: #6b7280;
  margin-bottom: 6rpx;
}

.doc-block__text {
  display: block;
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.65;
}

/* ====== Footer ====== */
.sum-footer {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 14rpx;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #eef0f3;
  box-sizing: border-box;
  z-index: 100;
}

.sum-footer__btn {
  flex: 1;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 24rpx;
}

.sum-footer__btn--primary {
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
}

/* ====== Skeleton ====== */
.sum-loading {
  padding: 0 32rpx;
}

.sum-skel {
  background: linear-gradient(90deg, #eef0f3 25%, #f7f8fa 50%, #eef0f3 75%);
  background-size: 200% 100%;
  border-radius: 28rpx;
  margin-bottom: 24rpx;
  animation: sumShimmer 1.4s infinite;
}

.sum-skel--meta { height: 212rpx; }
.sum-skel--tabs { height: 68rpx; }
.sum-skel--card { height: 240rpx; }

@keyframes sumShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ====== Error / NoData State ====== */
.sum-state {
  margin: 32rpx;
  padding: 60rpx 32rpx;
  background: #ffffff;
  border-radius: 32rpx;
  text-align: center;
}

.sum-state__title {
  display: block;
  font-size: 30rpx;
  color: #111827;
  font-weight: 700;
}

.sum-state__desc,
.sum-state__action {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.sum-state__action { color: #2563eb; }
.sum-safe { height: calc(env(safe-area-inset-bottom) + 160rpx); }
</style>
