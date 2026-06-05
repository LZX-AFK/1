/**
 * 后端 BackendProcessResult → 前端 SummaryResult 映射
 * 纯函数，无网络请求，无 Vue/Pinia 依赖
 */

import type { BackendProcessResult } from '@/services/api'
import type { SummaryResult } from '@/stores/useRecordStore'
import type { TimelineMark } from '@/types'

interface MapContext {
  courseName?: string
  marks?: TimelineMark[]
  duration?: number
  fallbackAccuracy?: number
}

export function mapBackendToSummary(
  backend: BackendProcessResult,
  ctx: MapContext = {},
): SummaryResult {
  const summary = backend.summary ?? '本节课已完成 AI 处理，重点内容已整理为课堂总结。'
  const keywords = backend.keywords ?? []
  const suggestions = backend.suggestions ?? []
  const transcript = backend.transcript ?? {}
  const confidence = transcript.confidence ?? 0.95
  const durationSec = ctx.duration ?? transcript.durationSeconds ?? 0
  const accuracy = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence)

  // --- transcriptBlocks ---
  const rawText = transcript.text ?? ''
  const segments = transcript.segments ?? []
  const transcriptBlocks = segments.length > 0
    ? segments.map((seg, i) => ({
        timeRange: formatTime(seg.start ?? i * 60) + ' - ' + formatTime(seg.end ?? (i + 1) * 60),
        title: `段落 ${i + 1}`,
        text: seg.text ?? '',
        hasMarks: false,
      }))
    : splitTextToBlocks(rawText, durationSec)

  // --- lectureTimeline ---
  const lectureTimeline = transcriptBlocks.map(b => ({
    timeRange: b.timeRange,
    title: b.title,
    whatTaught: b.text.slice(0, 120) + (b.text.length > 120 ? '...' : ''),
    teacherEmphasis: '',
    relatedMarks: '',
  }))

  // --- structuredSummary ---
  const structuredSummary = keywords.length > 0
    ? keywords.map(kw => ({
        title: kw,
        coreConcept: summary,
        bulletPoints: [`${kw} 是本次课堂的重要知识点。`, summary],
      }))
    : [{ title: '课堂总结', coreConcept: summary, bulletPoints: [summary] }]

  // --- examFocusItems ---
  const examFocusItems = keywords.length > 0
    ? keywords.map(kw => `解释 ${kw} 的概念、过程与易错点。`)
    : ['回顾本节课核心知识点']

  // --- questionTypes ---
  const questionTypes = [
    { type: '简答题', description: `解释 ${keywords[0] ?? '本节课'} 的核心概念` },
    { type: '选择题', description: '判断本节课中的关键知识点' },
  ]

  // --- terms ---
  const terms = keywords.map(kw => ({
    term: kw,
    chinese: kw,
    explanation: summary.slice(0, 60),
    relatedConcepts: keywords.filter(k => k !== kw).join(' / ') || kw,
  }))

  // --- reviewPlan ---
  const reviewSteps = suggestions.length > 0
    ? [{ title: '复习建议', tasks: suggestions.map((s, i) => ({ id: `bk${i}`, title: s, completed: false })) }]
    : [{
        title: '复习建议',
        tasks: [
          { id: 'bk0', title: '回看课堂总结', completed: false },
          { id: 'bk1', title: '复习专业术语', completed: false },
          { id: 'bk2', title: '完成练习题', completed: false },
        ],
      }]

  // --- keyPoints ---
  const keyPoints = keywords.length > 0
    ? keywords.map(kw => `${kw} 是本次课堂的重要概念，请重点理解其定义和应用场景。`)
    : [summary]

  return {
    courseName: ctx.courseName ?? backend.topic ?? '未命名课堂',
    date: new Date().toLocaleDateString('zh-CN'),
    duration: durationSec,
    markCount: ctx.marks?.length ?? keywords.length,
    accuracy: accuracy || 0,
    classFlow: keywords.length > 0 ? keywords.join(' → ') : (backend.topic ?? '课堂总结'),
    oneSentenceSummary: summary,
    keyPoints,
    keywords,
    personalizedItems: suggestions.map(s => ({ text: s })),
    reviewTasks: suggestions.map((s, i) => ({ id: `srt${i}`, title: s, completed: false })),
    transcriptBlocks,
    lectureTimeline,
    structuredSummary,
    timelineMarks: ctx.marks ?? [],
    examFocusItems,
    questionTypes,
    commonMistakes: suggestions
      .filter(s => /区分|注意|不要|易错|混淆/.test(s))
      .map(s => ({ text: s })),
    terms,
    reviewPlan: {
      estimatedMinutes: Math.max(10, Math.round(durationSec / 60 / 3)),
      completionRate: '0%',
      steps: reviewSteps,
    },
  }
}

// ==================== 工具函数 ====================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function splitTextToBlocks(text: string, totalSeconds: number) {
  if (!text) {
    return [{ timeRange: '00:00 - 00:00', title: '转写内容', text: '暂无转写数据', hasMarks: false }]
  }

  // 按中文句号、英文句点、换行切分
  const sentences = text.split(/[。.\n]+/).filter(s => s.trim().length > 0)
  const chunkSize = Math.max(1, Math.ceil(sentences.length / 4))
  const blocks: Array<{ timeRange: string; title: string; text: string; hasMarks: boolean }> = []

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize)
    const blockIdx = blocks.length
    const startSec = Math.round((blockIdx / 4) * totalSeconds)
    const endSec = Math.round(((blockIdx + 1) / 4) * totalSeconds)

    blocks.push({
      timeRange: formatTime(startSec) + ' - ' + formatTime(endSec),
      title: `段落 ${blockIdx + 1}`,
      text: chunk.join('。') + '。',
      hasMarks: false,
    })
  }

  return blocks
}
