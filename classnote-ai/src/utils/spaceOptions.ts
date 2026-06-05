/**
 * 从真实 sessions 构建 Agent Space 选项列表
 * Phase 10-B: Agent 对话式 Space 选择
 */

import type { SessionListItem } from '@/services/sessionApi'
import { groupSourcesBySpace } from '@/utils/mapSessionToSpace'

export interface AgentSpaceOption {
  spaceId: string
  spaceName: string
  spaceType: string
  description?: string
  icon?: string
  sourceCount?: number
  updatedAt?: string
  type: 'existing' | 'new'
}

/**
 * 从 sessions 构建 Space 选项列表
 * 最近 5 个 Space + 末尾追加"新建学习空间"
 */
export function buildSpaceOptionsFromSessions(sessions: SessionListItem[]): AgentSpaceOption[] {
  const spaces = groupSourcesBySpace(sessions)
  const options: AgentSpaceOption[] = spaces.slice(0, 5).map(s => ({
    spaceId: s.id,
    spaceName: s.name,
    spaceType: s.type,
    description: `${s.sourceCount} 份资料`,
    icon: s.type === 'course' ? '📖' : s.type === 'project' ? '🚀' : s.type === 'exam' ? '📝' : '📁',
    sourceCount: s.sourceCount,
    updatedAt: s.lastUpdatedAt,
    type: 'existing' as const,
  }))

  // 永远追加"新建学习空间"
  options.push({
    spaceId: '__new__',
    spaceName: '新建学习空间',
    spaceType: 'general',
    description: '输入一个新名称',
    icon: '＋',
    type: 'new',
  })

  return options
}
