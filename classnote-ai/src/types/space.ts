/**
 * 学习空间 Space / 资料 Source 类型定义
 * Phase 10-A: 知识库从课程列表升级为学习空间架构
 */

/** 学习空间类型 */
export type SpaceType = 'course' | 'project' | 'topic' | 'exam' | 'portfolio' | 'general'

/** 资料来源类型 */
export type SourceType = 'recording' | 'audio' | 'video' | 'pdf' | 'reading' | 'slides' | 'note' | 'mistake' | 'document' | 'link' | 'unknown'

/** 资料状态 */
export type SourceStatus = 'done' | 'processing' | 'failed' | 'recording' | 'pending' | 'saved'

/** 学习空间 */
export interface LearningSpace {
  id: string
  name: string
  type: SpaceType
  description?: string
  sourceCount: number
  summaryCount: number
  reviewTaskCount: number
  pendingMarkerCount: number
  progress: number
  lastUpdatedAt?: string
  sources: LearningSource[]
  keywords?: string[]
  recentSummary?: string
}

/** 学习资料 */
export interface LearningSource {
  id: string
  spaceId: string
  title: string
  type: SourceType
  source: string
  status: SourceStatus
  createdAt?: string
  updatedAt?: string
  summaryId?: string
  summaryPreview?: string
  markerCount: number
  reviewTaskCount: number
  keywordCount: number
  pageCount?: number
  duration?: number
  metaLabel?: string
}
