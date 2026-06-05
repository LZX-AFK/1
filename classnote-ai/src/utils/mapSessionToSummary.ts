/**
 * 将后端 session 数据映射为前端 SummaryResult 结构
 * Phase 7-F: 支持增强的结构化字段
 */

import type { SummaryResult, ExamFocusItem, MindMapNode } from '@/stores/useRecordStore'
import type { SessionDetail, SessionSummary } from '@/services/sessionApi'

function safeParseJSON<T>(val: T | string | undefined, fallback: T): T {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T } catch { return fallback }
  }
  return val as T
}

function parseSegments(segs: Array<{ text: string; timestampMs?: number }> | string | undefined): Array<{ text: string; timestampMs?: number }> {
  if (Array.isArray(segs)) return segs
  if (typeof segs === 'string') {
    try { return JSON.parse(segs) } catch { return [] }
  }
  return []
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatTimeRange(startSec: number, endSec: number): string {
  return `${formatTime(startSec)} - ${formatTime(endSec)}`
}

/**
 * 从 summary.keyPoints 中提取增强字段
 * 旧格式: keyPoints 是纯 string[]
 * 新格式 (Phase 7-F): keyPoints 是 { keyPoints, keywords, terms, ... }
 */
function extractEnhancedFields(summary: SessionSummary | undefined) {
  if (!summary) return { keyPoints: [], keywords: [], terms: [], reviewTasks: [], examFocus: [] as any[], suggestions: [], weakPoints: [], mainline: [], mindMap: [] as any[], oneSentenceSummary: '', title: '', source: '', documentType: '', pageCount: 0 }

  const raw = safeParseJSON<any>(summary.keyPoints, null)

  // 新格式: keyPoints 是一个包含所有字段的对象
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints : [],
      keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
      terms: Array.isArray(raw.terms) ? raw.terms : [],
      reviewTasks: Array.isArray(raw.reviewTasks) ? raw.reviewTasks : [],
      examFocus: Array.isArray(raw.examFocus) ? raw.examFocus : [],
      suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
      weakPoints: Array.isArray(raw.weakPoints) ? raw.weakPoints : [],
      mainline: Array.isArray(raw.mainline) ? raw.mainline : [],
      mindMap: Array.isArray(raw.mindMap) ? raw.mindMap : (raw.mindMap ? [raw.mindMap] : []),
      oneSentenceSummary: raw.oneSentenceSummary || '',
      title: raw.title || '',
      source: raw.source || (summary as any).source || '',
      documentType: raw.documentType || (summary as any).documentType || '',
      pageCount: raw.pageCount || (summary as any).pageCount || 0,
    }
  }

  // 旧格式: keyPoints 是纯数组
  const kp = Array.isArray(raw) ? raw : (Array.isArray(summary.keyPoints) ? summary.keyPoints : [])
  return {
    keyPoints: kp,
    keywords: (summary as any).keywords || [],
    terms: (summary as any).terms || [],
    reviewTasks: (summary as any).reviewTasks || [],
    examFocus: [],
    suggestions: (summary as any).suggestions || [],
    weakPoints: [],
    mainline: [],
    mindMap: (summary as any).mindMap || [],
    oneSentenceSummary: '',
    title: '',
    source: (summary as any).source || '',
    documentType: (summary as any).documentType || '',
    pageCount: (summary as any).pageCount || 0,
  }
}

/** 从 session detail 或 summary 映射为 SummaryResult */
export function mapSessionToSummary(
  session: SessionDetail,
  fallback?: { courseName?: string; duration?: number },
): SummaryResult {
  const enhanced = extractEnhancedFields(session.summary)
  const segments = parseSegments(session.transcript?.segments)
  const markers = session.markers || []
  const fullText = session.transcript?.fullText || ''
  const durationSec = session.durationMs ? Math.round(session.durationMs / 1000) : (fallback?.duration || 0)
  const courseName = session.title || session.subject || fallback?.courseName || '课堂录音'
  const summaryContent = session.summary?.content || ''

  // --- AI 总结 ---
  const oneSentenceSummary = enhanced.oneSentenceSummary
    || (summaryContent ? summaryContent.substring(0, 200) + (summaryContent.length > 200 ? '...' : '') : '课堂总结生成中...')

  // --- 主线 ---
  const classFlow = enhanced.mainline.length > 0 ? enhanced.mainline.join(' → ') : ''

  // --- transcript blocks ---
  const transcriptBlocks: SummaryResult['transcriptBlocks'] = []
  if (segments.length > 0) {
    const chunkSize = Math.max(1, Math.ceil(segments.length / 5))
    for (let i = 0; i < segments.length; i += chunkSize) {
      const chunk = segments.slice(i, i + chunkSize)
      const startSec = Math.round((chunk[0].timestampMs || 0) / 1000)
      const endSec = Math.round((chunk[chunk.length - 1].timestampMs || 0) / 1000 + 30)
      transcriptBlocks.push({
        timeRange: formatTimeRange(startSec, endSec),
        title: `片段 ${transcriptBlocks.length + 1}`,
        text: chunk.map((s) => s.text).join(' '),
        hasMarks: markers.some(
          (m) => m.timestampMs >= (chunk[0].timestampMs || 0) && m.timestampMs <= (chunk[chunk.length - 1].timestampMs || 0) + 30000,
        ),
      })
    }
  } else if (fullText) {
    const sentences = fullText.split(/[.。\n]/).filter((s) => s.trim().length > 10)
    const chunkSize = Math.max(1, Math.ceil(sentences.length / 5))
    for (let i = 0; i < sentences.length; i += chunkSize) {
      const chunk = sentences.slice(i, i + chunkSize)
      transcriptBlocks.push({
        timeRange: formatTimeRange(i * 60, (i + chunkSize) * 60),
        title: `片段 ${transcriptBlocks.length + 1}`,
        text: chunk.join('. ').trim(),
        hasMarks: false,
      })
    }
  }

  // --- timeline marks ---
  const timelineMarks: SummaryResult['timelineMarks'] = markers.map((m) => ({
    id: m.id,
    time: Math.round(m.timestampMs / 1000),
    type: m.label === 'didnt_understand' ? 'confusing' : m.label === 'important' ? 'important' : m.label === 'question' ? 'exam' : 'review',
    label: m.note || m.label,
    aiExplanation: '',
    hasPlayback: false,
  }))

  // --- terms: 增强格式 { term, explanation, example } → { term, chinese, explanation, relatedConcepts } ---
  const terms = enhanced.terms.map((t: any) => ({
    term: t.term || '',
    chinese: t.chinese || t.term || '',
    explanation: t.explanation || '',
    relatedConcepts: t.example || t.relatedConcepts || '',
    confusingWith: t.confusingWith || undefined,
  }))

  // --- review tasks: 字符串数组 → 对象数组 ---
  const reviewTasks: SummaryResult['reviewTasks'] = enhanced.reviewTasks.map((task: string, idx: number) => ({
    id: `rt-${idx}`,
    title: task,
    completed: false,
  }))

  // --- examFocus → examFocusItems (保留完整对象) ---
  const examFocusItems: ExamFocusItem[] = enhanced.examFocus.length > 0
    ? enhanced.examFocus.map((ef: any) => {
        if (typeof ef === 'string') {
          return { point: ef, reason: '', question: '' }
        }
        return {
          point: ef.point || ef.title || '',
          reason: ef.reason || ef.explanation || '',
          question: ef.question || ef.exampleQuestion || ef.howToTest || '',
        }
      }).filter((item: ExamFocusItem) => item.point)
    : []

  // --- mindMap ---
  const mindMap: MindMapNode[] = Array.isArray(enhanced.mindMap)
    ? enhanced.mindMap
    : enhanced.mindMap ? [enhanced.mindMap as any] : []

  // --- weakPoints → commonMistakes ---
  const commonMistakes = enhanced.weakPoints.map((wp: string) => ({ text: wp }))

  // --- suggestions → personalizedItems ---
  const personalizedItems = enhanced.suggestions.map((s: string) => ({ text: s }))

  // --- structuredSummary: 用增强字段构建 ---
  const structuredSummary = enhanced.keyPoints.length > 0
    ? [{
        title: enhanced.title || '课堂要点',
        coreConcept: summaryContent || oneSentenceSummary,
        bulletPoints: enhanced.keyPoints,
      }]
    : []

  // --- document detection ---
  const source = enhanced.source || ''
  const documentType = enhanced.documentType || ''
  const pageCount = enhanced.pageCount || 0
  const isDocument = /document|reading|slides|pdf/i.test(source) || /document|reading|slides|pdf/i.test(documentType)

  // --- Phase 10-C: Space / Source metadata ---
  const spaceId = session.subject || ''
  const spaceName = (session.title || '').replace(/\s*课堂录音$/, '').trim()
  const sourceType = source || documentType || (isDocument ? 'document' : 'recording')

  return {
    courseName: enhanced.title || courseName,
    date: session.startedAt ? new Date(session.startedAt).toLocaleDateString('zh-CN') : '',
    duration: durationSec,
    source,
    documentType,
    pageCount,
    spaceId,
    spaceName,
    spaceType: '',
    sourceType,
    markCount: markers.length,
    accuracy: 0,
    classFlow,
    oneSentenceSummary,
    keyPoints: enhanced.keyPoints,
    keywords: enhanced.keywords,
    personalizedItems,
    reviewTasks,
    // document sessions: clear transcript to prevent frontend display
    transcriptBlocks: isDocument ? [] : transcriptBlocks,
    lectureTimeline: isDocument ? [] : transcriptBlocks.map((b) => ({
      timeRange: b.timeRange,
      title: b.title,
      whatTaught: b.text.substring(0, 100),
      teacherEmphasis: '',
      relatedMarks: '',
    })),
    structuredSummary,
    timelineMarks: isDocument ? [] : timelineMarks,
    examFocusItems,
    questionTypes: [],
    commonMistakes,
    mindMap,
    terms,
    reviewPlan: {
      estimatedMinutes: Math.max(5, Math.round(durationSec / 60 / 3)),
      completionRate: '0%',
      steps: reviewTasks.length > 0
        ? [{ title: '复习', tasks: reviewTasks }]
        : [],
    },
  }
}
