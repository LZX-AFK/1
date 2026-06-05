/**
 * Agent 意图识别引擎
 * 规则匹配：关键词 → 意图类型
 */

export interface AgentIntent {
  type:
    | 'ask_course_for_recording'
    | 'open_upload'
    | 'open_knowledge'
    | 'open_latest_summary'
    | 'list_recent_sessions'
    | 'open_upload_course'
    | 'list_failed_sessions'
    | 'review_latest'
    | 'open_concept_map_latest'
    | 'open_settings'
    | 'chat_fallback'
  payload?: Record<string, unknown>
}

// ---------- 意图规则 ----------

interface IntentRule {
  type: AgentIntent['type']
  keywords: string[]
}

const INTENT_RULES: IntentRule[] = [
  {
    type: 'ask_course_for_recording',
    keywords: ['开始录音', '开始课堂', '我要上课', '帮我记录课堂', '录音', '上课', '开始记录'],
  },
  {
    type: 'open_upload',
    keywords: ['上传资料', '上传音频', '上传视频', '上传文件', '上传笔记', '上传 PDF', '上传错题', '上传pdf'],
  },
  {
    type: 'open_knowledge',
    keywords: ['打开知识库', '知识库', '查看资料', '课堂记录', '学习空间', '我的课程资料'],
  },
  {
    type: 'open_latest_summary',
    keywords: ['最近总结', '刚才那节课', '上一节课', '最近一节课', '查看总结', 'AI 总结', 'ai 总结', '打开总结', 'AI总结'],
  },
  {
    type: 'list_recent_sessions',
    keywords: ['最近课堂', '历史课堂', '我的课堂', '课堂列表', '最近记录'],
  },
  {
    type: 'open_upload_course',
    keywords: ['上传课堂', '上传音频记录', '上传视频记录', '我上传的课', '上传的课堂'],
  },
  {
    type: 'list_failed_sessions',
    keywords: ['失败', '总结失败', '失败记录', '哪些没生成', '生成失败'],
  },
  {
    type: 'review_latest',
    keywords: ['复习', '复习计划', '帮我复习', '今天复习', '复习最近课堂', '复习上一节课', '复习模式'],
  },
  {
    type: 'open_concept_map_latest',
    keywords: ['知识图谱', '知识结构', '思维导图', '概念图', '知识点图谱'],
  },
  {
    type: 'open_settings',
    keywords: ['设置', '录音设置', '语言设置', '设备设置', '偏好设置'],
  },
]

// 意图优先级（列表越前优先级越高，因为规则数组遍历是顺序匹配）
// 需要特殊处理："上传课堂" 应优先于泛化的 "上传"
// "失败" 不应匹配到太短的输入
const HIGH_PRIORITY_RULES: IntentRule[] = [
  {
    type: 'open_upload_course',
    keywords: ['上传课堂', '上传音频记录', '上传视频记录'],
  },
  {
    type: 'open_latest_summary',
    keywords: ['最近总结', '刚才那节课', '上一节课', '最近一节课', '查看总结', 'AI总结'],
  },
  {
    type: 'list_recent_sessions',
    keywords: ['最近课堂', '历史课堂', '我的课堂', '课堂列表', '最近记录'],
  },
  {
    type: 'list_failed_sessions',
    keywords: ['总结失败', '失败记录', '哪些没生成', '生成失败'],
  },
]

/** 识别用户输入的意图 */
export function parseAgentIntent(text: string): AgentIntent {
  const t = text.trim().toLowerCase()
  if (!t) return { type: 'chat_fallback' }

  // 高优先级规则先匹配
  for (const rule of HIGH_PRIORITY_RULES) {
    if (rule.keywords.some(kw => t.includes(kw.toLowerCase()))) {
      return { type: rule.type }
    }
  }

  // 常规规则
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some(kw => t.includes(kw.toLowerCase()))) {
      return { type: rule.type }
    }
  }

  return { type: 'chat_fallback' }
}

/** 兼容旧入口：detectRecordingIntent */
export function detectRecordingIntent(text: string): boolean {
  const intent = parseAgentIntent(text)
  return intent.type === 'ask_course_for_recording'
}
