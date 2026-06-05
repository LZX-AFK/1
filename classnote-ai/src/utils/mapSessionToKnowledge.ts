/**
 * 把后端 sessions 映射为知识库课程空间数据
 * 按 subject/courseName 聚合
 */

import type { SessionListItem } from '@/services/sessionApi'

// ---------- 类型 ----------

/** 后端 session 标准化后的状态 */
export type NormalizedStatus = 'recording' | 'processing' | 'done' | 'failed'

/** 标准化后的 session */
export interface NormalizedSession {
  id: string
  title: string
  courseKey: string
  courseName: string
  status: NormalizedStatus
  durationSec: number
  createdAt: string
  startedAt: string
  markerCount: number
  transcriptSegmentCount: number
  summaryPreview: string
  source: 'record' | 'upload'
}

/** 课程聚合组 */
export interface CourseGroup {
  courseKey: string
  courseName: string
  sessions: NormalizedSession[]
  totalCount: number
  doneCount: number
  processingCount: number
  recordingCount: number
  failedCount: number
  markerCount: number
  latestDate: string
  progress: number
  summaryPreview: string
}

/** 课程卡片数据（给模板用） */
export interface CourseCardData {
  id: string
  courseKey: string
  courseName: string
  icon: string
  theme: 'bio' | 'chem' | 'physics' | 'math'
  latestDate: string
  totalCount: number
  doneCount: number
  processingCount: number
  failedCount: number
  markerCount: number
  progress: number
  summaryPreview: string
}

// ---------- 工具函数 ----------

/** 标准化 session status */
function normalizeStatus(raw: string): NormalizedStatus {
  switch (raw) {
    case 'recording':
    case 'active':
      return 'recording'
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

/** 已知 subject → 显示名映射（仅保留通用映射，不写死业务数据） */
const SUBJECT_DISPLAY_NAMES: Record<string, string> = {
  'upload': '上传课堂',
}

/** 标准化 source */
function inferSource(s: SessionListItem): 'record' | 'upload' {
  const sub = (s.subject || '').toLowerCase()
  const title = (s.title || '').toLowerCase()
  if (sub === 'upload' || title.includes('上传')) return 'upload'
  return 'record'
}

/** 格式化日期为短格式 */
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

// ---------- 导出函数 ----------

/** normalizeSession: 将后端 SessionListItem 标准化 */
export function normalizeSession(raw: SessionListItem): NormalizedSession {
  const courseKey = raw.subject || raw.title || 'uncategorized'
  const displayName = SUBJECT_DISPLAY_NAMES[courseKey]
  const courseName = displayName || (raw.subject && raw.subject !== 'upload'
    ? raw.title || raw.subject
    : (raw.title || '未命名课堂'))
  return {
    id: raw.id,
    title: raw.title || '未命名课堂',
    courseKey,
    courseName,
    status: normalizeStatus(raw.status),
    durationSec: Math.round((raw.durationMs || 0) / 1000),
    createdAt: raw.startedAt,
    startedAt: raw.startedAt,
    markerCount: 0,
    transcriptSegmentCount: 0,
    summaryPreview: '',
    source: inferSource(raw),
  }
}

/** groupSessionsByCourse: 按 courseKey 分组 */
export function groupSessionsByCourse(sessions: NormalizedSession[]): Map<string, CourseGroup> {
  const map = new Map<string, CourseGroup>()
  for (const s of sessions) {
    const key = s.courseKey
    if (!map.has(key)) {
      map.set(key, {
        courseKey: key,
        courseName: s.courseName,
        sessions: [],
        totalCount: 0,
        doneCount: 0,
        processingCount: 0,
        recordingCount: 0,
        failedCount: 0,
        markerCount: 0,
        latestDate: '',
        progress: 0,
        summaryPreview: '',
      })
    }
    const g = map.get(key)!
    g.sessions.push(s)
    g.totalCount++
    if (s.status === 'done') g.doneCount++
    else if (s.status === 'processing') g.processingCount++
    else if (s.status === 'recording') g.recordingCount++
    else g.failedCount++
    g.markerCount += s.markerCount
  }
  // 排序 sessions + 计算 latestDate / progress / summaryPreview
  for (const g of map.values()) {
    g.sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    g.latestDate = formatDate(g.sessions[0].startedAt)
    g.progress = g.totalCount > 0 ? Math.round((g.doneCount / g.totalCount) * 100) : 0
    const latestDone = g.sessions.find(s => s.status === 'done')
    g.summaryPreview = latestDone?.summaryPreview || ''
  }
  return map
}

/** mapCourseGroupToCard: 课程组 → 卡片数据 */
export function mapCourseGroupToCard(group: CourseGroup, idx: number): CourseCardData {
  const themes: Array<'bio' | 'chem' | 'physics' | 'math'> = ['bio', 'chem', 'physics', 'math']
  const icons = ['DNA', 'CH', 'PH', 'MA']
  return {
    id: group.courseKey,
    courseKey: group.courseKey,
    courseName: group.courseName,
    icon: icons[idx % icons.length],
    theme: themes[idx % themes.length],
    latestDate: group.latestDate,
    totalCount: group.totalCount,
    doneCount: group.doneCount,
    processingCount: group.processingCount,
    failedCount: group.failedCount,
    markerCount: group.markerCount,
    progress: group.progress,
    summaryPreview: group.summaryPreview,
  }
}
