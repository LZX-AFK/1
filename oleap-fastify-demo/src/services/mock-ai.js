const TOPIC_PRESETS = {
  knowledge: {
    title: '语音知识库系统',
    summary: '本次录音已经整理为课堂知识点，适合课后复习和资料沉淀。',
    keywords: ['课堂录音', '知识点', '复习问题', '资料库'],
    suggestions: ['保存到课程记录', '生成 3 个复习问题', '为重点概念打标签']
  },
  translation: {
    title: '语音翻译助手',
    summary: '本次录音已经提取核心内容，并生成适合跨语言交流的双语表达。',
    keywords: ['语音转写', '翻译', '双语对照', '跨语言交流'],
    suggestions: ['检查专有名词', '保留原文和译文', '标记需要人工确认的句子']
  },
  content: {
    title: '语音内容生成工具',
    summary: '这段口述内容可以继续加工成文章、脚本、报告或社媒文案。',
    keywords: ['口述创作', '内容生成', '脚本', '文案'],
    suggestions: ['生成标题', '扩写正文', '输出发布建议']
  },
  sales: {
    title: '语音客服 / 销售助手',
    summary: '录音内容已经整理成客户需求、待跟进事项和沟通建议。',
    keywords: ['客户需求', '跟进计划', '服务记录', '沟通建议'],
    suggestions: ['标记客户痛点', '生成下一步跟进计划', '整理服务记录']
  },
  emotion: {
    title: '语音情绪分析工具',
    summary: '录音内容显示表达整体积极，适合用于课堂互动或演讲训练反馈。',
    keywords: ['情绪标签', '表达状态', '沟通反馈', '可视化'],
    suggestions: ['结合文本关键词判断情绪', '避免把结果当作医学结论', '用图表展示趋势']
  },
  redesign: {
    title: '黄鹂智声 App 功能重构',
    summary: '本次结果用于验证重构后的录音、转写和记录页面流程是否清晰。',
    keywords: ['产品重构', '录音入口', '交互优化', '效率提升'],
    suggestions: ['减少入口层级', '突出当前连接状态', '强化录音后下一步操作']
  },
  open: {
    title: '开放创新命题',
    summary: '这段录音可以进入学生自定义业务流程，继续做总结、分类或创意生成。',
    keywords: ['开放创新', '语音入口', '业务流程', '课堂 MVP'],
    suggestions: ['明确目标用户', '控制功能范围', '先完成端到端闭环']
  }
}

function normalizeTopic(value) {
  const text = `${value || ''}`.toLowerCase()
  if (text.includes('翻译') || text.includes('translation')) return 'translation'
  if (text.includes('知识') || text.includes('课堂') || text.includes('笔记')) return 'knowledge'
  if (text.includes('内容') || text.includes('文案') || text.includes('脚本')) return 'content'
  if (text.includes('客服') || text.includes('销售') || text.includes('客户')) return 'sales'
  if (text.includes('情绪') || text.includes('emotion')) return 'emotion'
  if (text.includes('重构') || text.includes('黄鹂')) return 'redesign'
  return text.includes('开放') ? 'open' : 'knowledge'
}

export function createMockTranscript(input = {}) {
  const scene = input.scene || 'classroom'
  const topicKey = normalizeTopic(input.topic)
  const preset = TOPIC_PRESETS[topicKey]

  return {
    scene,
    topic: preset.title,
    text: `这是一段模拟转写文本。当前选题是「${preset.title}」，学生可以把真实耳机录音上传后替换这里的 mock 内容。`,
    confidence: 0.92,
    language: 'zh-CN',
    durationSeconds: Number(input.durationSeconds || 18)
  }
}

export function processAudioTask(input = {}) {
  const transcript = input.text ? {
    scene: input.scene || 'classroom',
    topic: input.topic || '课堂项目',
    text: input.text,
    confidence: 0.9,
    language: 'zh-CN',
    durationSeconds: Number(input.durationSeconds || 18)
  } : createMockTranscript(input)

  const topicKey = normalizeTopic(input.topic || transcript.topic)
  const preset = TOPIC_PRESETS[topicKey]

  return {
    taskId: `mock-${Date.now()}`,
    topic: preset.title,
    source: {
      filePath: input.filePath || '',
      fileName: input.fileName || '',
      uploadedUrl: input.uploadedUrl || ''
    },
    transcript,
    summary: preset.summary,
    keywords: preset.keywords,
    suggestions: preset.suggestions,
    translation: topicKey === 'translation'
      ? {
          targetLanguage: 'en',
          text: 'This is a mock bilingual result for the classroom demo.'
        }
      : null,
    emotion: topicKey === 'emotion'
      ? {
          label: '积极',
          score: 0.78,
          note: '课堂演示结果，仅用于产品原型，不作为专业判断。'
        }
      : null,
    nextActions: [
      '在 App 页面展示结果',
      '保存到历史记录',
      '把 mock 接口替换为真实 ASR 或大模型接口'
    ]
  }
}
