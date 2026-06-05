/**
 * 学习空间 ID / Type 生成工具
 * Phase 10-B: 新建 Space 时生成 spaceId 和 spaceType
 */

import type { SpaceType } from '@/types/space'

/** 从空间名称生成 spaceId */
export function makeSpaceId(spaceName: string): string {
  const cleaned = spaceName.trim()
  if (!cleaned) return 'default'
  if (/^[a-zA-Z0-9\s-]+$/.test(cleaned)) {
    return cleaned.toLowerCase().replace(/\s+/g, '-')
  }
  return cleaned
}

/** 从空间名称推导 spaceType */
export function inferSpaceType(spaceName: string): SpaceType {
  const lower = spaceName.toLowerCase()
  if (/course|课程|lecture|class|课堂/.test(lower)) return 'course'
  if (/project|项目/.test(lower)) return 'project'
  if (/exam|final|midterm|考试|quiz/.test(lower)) return 'exam'
  if (/portfolio|作品集/.test(lower)) return 'portfolio'
  if (/topic|专题|主题/.test(lower)) return 'topic'
  return 'general'
}

/** 构建完整的 Space 归属参数（用于 session/document 创建） */
export function buildSpaceParams(spaceId: string, spaceName: string, spaceType: SpaceType) {
  return {
    spaceId,
    spaceName,
    spaceType,
    subject: spaceId,
    courseName: spaceName,
  }
}
