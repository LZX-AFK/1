/**
 * 将后端 sessions 映射为 Space / Source 架构
 * Phase 10-A: 前端 mapper，不改后端
 */

import type { SessionListItem } from '@/services/sessionApi'
import type { LearningSpace, LearningSource, SpaceType, SourceType, SourceStatus } from '@/types/space'

// ========== 状态标准化 ==========

function mapSessionStatus(raw: string): SourceStatus {
  switch (raw) {
    case 'recording':
    case 'active':
      return 'recording'
    case 'saved':
      return 'saved'
    case 'summarizing':
    case 'processing':
    case 'pending':
      return 'processing'
    case 'done':
    case 'completed':
    case 'success':
      return 'done'
    case 'failed':
    case 'error':
    default:
      return 'failed'
  }
}

// ========== Source 类型推导 ==========

function getSourceType(s: SessionListItem): SourceType {
  const src = (s.source || '').toLowerCase()
  if (src.includes('realtime-recording')) return 'recording'
  if (src.includes('upload-audio')) return 'audio'
  if (src.includes('upload-video')) return 'video'
  if (src.includes('upload-reading')) return 'reading'
  if (src.includes('upload-slides')) return 'slides'
  if (src.includes('upload-document')) return 'pdf'
  if (src.includes('pdf')) return 'pdf'
  if (src.includes('slides')) return 'slides'
  if (src.includes('reading')) return 'reading'
  if (src.includes('document')) return 'document'
  // 根据 subject 推断
  const subj = (s.subject || '').toLowerCase()
  if (subj === 'document') return 'document'
  if (subj === 'upload') return 'audio'
  return 'recording'
}

/** 资料类型 → 显示标签 */
export function sourceTypeLabel(type: SourceType): string {
  const map: Record<SourceType, string> = {
    recording: '课堂录音',
    audio: '课堂音频',
    video: '课堂视频',
    reading: 'Reading',
    slides: 'Lecture Slides',
    pdf: 'PDF 资料',
    document: '文档资料',
    note: '笔记',
    mistake: '错题',
    link: '链接',
    unknown: '资料',
  }
  return map[type] || '资料'
}

// ========== Space 推导 ==========

/** 从 session 推导 spaceKey（Phase 10-B: 优先使用真实 Space 字段） */
function getSpaceKey(s: SessionListItem): string {
  // 优先级: session.spaceId → subject（新数据 subject=spaceId） → title → 'default'
  const subject = (s.subject || '').trim()
  // 新数据：subject 就是 spaceId（由 createSession 的 spaceId 参数设置）
  if (subject && subject !== 'upload' && subject !== 'document') return subject
  const title = (s.title || '').trim()
  if (title) return title
  return 'default'
}

/** 从 session 推导 spaceName（Phase 10-B: 优先使用真实 Space 字段） */
function getSpaceName(s: SessionListItem): string {
  // 新数据：title 格式为 "spaceName 课堂录音"，提取 spaceName
  const title = (s.title || '').trim()
  const subject = (s.subject || '').trim()
  // 如果 subject 是有效的 spaceId（非 upload/document），用它做 spaceName
  if (subject && subject !== 'upload' && subject !== 'document') {
    return subject
  }
  if (title) {
    // 去除 " 课堂录音" 后缀
    const cleaned = title.replace(/\s*课堂录音$/, '').trim()
    return cleaned || title
  }
  // 根据 source 生成
  const src = (s.source || '').toLowerCase()
  if (src.includes('reading') || src.includes('slides') || src.includes('document')) return '上传资料'
  if (src.includes('upload-audio') || src.includes('upload-video')) return '上传课堂'
  if (src.includes('realtime-recording')) return '未命名课程'
  if (subject === 'upload') return '上传课堂'
  if (subject === 'document') return '上传资料'
  return '未命名空间'
}

/** 推导 spaceType（Phase 10-B: 优先使用真实 Space 字段） */
function getSpaceType(s: SessionListItem): SpaceType {
  // 新数据的 subject 就是 spaceId，由前端 makeSpaceId 生成
  // 如果 subject 是英文短横线格式，说明是新数据，按 source 推导 type
  const src = (s.source || '').toLowerCase()
  if (src.includes('realtime-recording') || src.includes('upload-audio') || src.includes('upload-video')) return 'course'
  if (src.includes('upload-reading') || src.includes('upload-slides') || src.includes('upload-document') || src.includes('pdf')) return 'general'
  const subj = (s.subject || '').toLowerCase()
  if (subj === 'upload' || subj === 'document') return 'general'
  // 新数据的 subject 是 spaceId，根据名称推导 type
  if (subj) return inferSpaceTypeFromKey(subj)
  return 'general'
}

/** 从 spaceKey 推导空间类型 */
function inferSpaceTypeFromKey(key: string): SpaceType {
  const lower = key.toLowerCase()
  if (/course|lecture|class|课程|课堂/.test(lower)) return 'course'
  if (/project|项目/.test(lower)) return 'project'
  if (/exam|final|midterm|考试|quiz/.test(lower)) return 'exam'
  if (/portfolio|作品集/.test(lower)) return 'portfolio'
  if (/topic|专题|主题/.test(lower)) return 'topic'
  return 'course' // 默认为课程类型
}

/** 格式化日期 */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffH = diffMs / 3600000
    if (diffH < 1) return '刚刚'
    if (diffH < 24) return `${Math.floor(diffH)}小时前`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return ''
  }
}

// ========== 导出函数 ==========

/** normalizeSource: session → LearningSource */
export function normalizeSource(raw: SessionListItem): LearningSource {
  const sourceType = getSourceType(raw)
  return {
    id: raw.id,
    spaceId: getSpaceKey(raw),
    title: raw.title || '未命名资料',
    type: sourceType,
    source: raw.source || '',
    status: mapSessionStatus(raw.status),
    createdAt: raw.startedAt,
    updatedAt: raw.startedAt,
    markerCount: raw.markerCount || 0,  // Phase 10-D: 使用真实 markerCount
    reviewTaskCount: 0,
    keywordCount: 0,
    duration: raw.durationMs ? Math.round(raw.durationMs / 1000) : undefined,
    metaLabel: sourceTypeLabel(sourceType),
  }
}

/** groupSourcesBySpace: sessions → LearningSpace[] */
export function groupSourcesBySpace(sessions: SessionListItem[]): LearningSpace[] {
  const map = new Map<string, LearningSpace>()

  for (const raw of sessions) {
    const spaceKey = getSpaceKey(raw)
    const source = normalizeSource(raw)

    if (!map.has(spaceKey)) {
      map.set(spaceKey, {
        id: spaceKey,
        name: getSpaceName(raw),
        type: getSpaceType(raw),
        sourceCount: 0,
        summaryCount: 0,
        reviewTaskCount: 0,
        pendingMarkerCount: 0,
        progress: 0,
        lastUpdatedAt: raw.startedAt,
        sources: [],
        keywords: [],
        recentSummary: '',
      })
    }

    const space = map.get(spaceKey)!
    space.sources.push(source)
    space.sourceCount++
    if (source.status === 'done') space.summaryCount++
    if (source.status === 'processing') space.pendingMarkerCount++
    space.reviewTaskCount += source.reviewTaskCount
    space.markerCount += source.markerCount

    // 更新最近时间
    if (raw.startedAt && (!space.lastUpdatedAt || raw.startedAt > space.lastUpdatedAt)) {
      space.lastUpdatedAt = raw.startedAt
    }
  }

  // 计算进度和排序
  const spaces = Array.from(map.values())
  for (const space of spaces) {
    space.progress = space.sourceCount > 0
      ? Math.round((space.summaryCount / space.sourceCount) * 100)
      : 0
    // sources 按时间倒序
    space.sources.sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )
  }

  // spaces 按最近更新倒序
  spaces.sort((a, b) =>
    new Date(b.lastUpdatedAt || 0).getTime() - new Date(a.lastUpdatedAt || 0).getTime()
  )

  return spaces
}

/** getSpaceTypeLabel: 空间类型 → 显示标签 */
export function getSpaceTypeLabel(type: SpaceType): string {
  const map: Record<SpaceType, string> = {
    course: '课程',
    project: '项目',
    topic: '主题',
    exam: '考试',
    portfolio: '作品集',
    general: '综合',
  }
  return map[type] || '综合'
}

/** getSpaceTypeIcon: 空间类型 → 图标 */
export function getSpaceTypeIcon(type: SpaceType): string {
  const map: Record<SpaceType, string> = {
    course: '📖',
    project: '🚀',
    topic: '💡',
    exam: '📝',
    portfolio: '🎨',
    general: '📁',
  }
  return map[type] || '📁'
}
