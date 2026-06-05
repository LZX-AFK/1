/**
 * DeepSeek LLM 直连服务
 * 使用 OpenAI-compatible Chat Completions API
 * Phase 7-F: 增强 Prompt，输出完整结构化课堂笔记
 */

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const TIMEOUT = parseInt(process.env.DEEPSEEK_TIMEOUT_MS || '60000', 10);

const SYSTEM_PROMPT = `你是一个专业的大学课堂学习助手。请基于以下课堂转写内容，生成适合学生复习的结构化课堂笔记。即使转写中有错字、重复或识别错误，也请结合上下文进行纠正和整理。不要只做一句话概括，要输出完整学习内容。

请严格返回 JSON，不要包含 Markdown，不要包含代码块，不要包含任何 JSON 之外的文字。

JSON 结构如下：
{
  "title": "本节课标题",
  "oneSentenceSummary": "一句话概括本节课，不超过120字",
  "content": "完整课堂总结，至少 300-600 字，分段说明本节课讲了什么、逻辑顺序是什么、重点在哪里",
  "mainline": ["课堂主线步骤1", "课堂主线步骤2", "课堂主线步骤3"],
  "keyPoints": [
    "必须掌握的重点1",
    "必须掌握的重点2",
    "必须掌握的重点3",
    "必须掌握的重点4"
  ],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "terms": [
    {
      "term": "术语名",
      "explanation": "术语解释",
      "example": "例子或课堂语境"
    }
  ],
  "examFocus": [
    {
      "point": "可能考点",
      "reason": "为什么重要",
      "question": "可能怎么考"
    }
  ],
  "reviewTasks": [
    "具体复习任务1",
    "具体复习任务2",
    "具体复习任务3"
  ],
  "suggestions": [
    "学习建议1",
    "学习建议2"
  ],
  "weakPoints": [
    "学生可能容易混淆或遗漏的地方"
  ],
  "mindMap": [
    {
      "name": "中心或节点",
      "children": [
        { "name": "子节点" }
      ]
    }
  ]
}

输出要求：
1. content 不能少于 300 字，除非转写内容极短。
2. keyPoints 至少 4 条。
3. keywords 至少 5 个。
4. terms 至少 3 个。
5. reviewTasks 至少 3 条。
6. examFocus 至少 3 条。
7. 如果转写内容太短，也要尽可能基于已有内容生成学习笔记，但不要编造无关内容。
8. 对明显 ASR 错字要根据上下文纠正。
9. 用中文输出。
10. 不要说"根据转写内容"，直接给学生可读的笔记。`;

function isDeepSeekConfigured() {
  return !!API_KEY && API_KEY !== '' && !API_KEY.startsWith('sk-your');
}

/**
 * 健壮解析 DeepSeek JSON 返回
 */
function parseDeepSeekResponse(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('DeepSeek 返回为空');
  }

  let content = rawContent.trim();

  // Step 1: 去掉 Markdown 代码块包裹
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  content = content.trim();

  // Step 2: 直接 parse
  try {
    return JSON.parse(content);
  } catch (e1) {
    // Step 3: 尝试提取第一个 { 到最后一个 } 之间的内容
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = content.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (e2) {
        // Step 4: 尝试修复常见 JSON 问题
        // 末尾逗号
        const fixed = jsonStr.replace(/,\s*([\]}])/g, '$1');
        try {
          return JSON.parse(fixed);
        } catch (e3) {
          console.warn('[deepseek] JSON parse failed after all attempts:', e3.message);
          console.warn('[deepseek] raw content preview:', content.substring(0, 300));
          // 保底：返回原始文本作为 content
          return {
            content: rawContent,
            oneSentenceSummary: '',
            keyPoints: [],
            keywords: [],
            terms: [],
            reviewTasks: [],
            suggestions: [],
            examFocus: [],
            weakPoints: [],
            mainline: [],
            mindMap: [],
          };
        }
      }
    }

    // 无法提取 JSON，保底返回
    console.warn('[deepseek] no JSON found in response');
    return {
      content: rawContent,
      oneSentenceSummary: '',
      keyPoints: [],
      keywords: [],
      terms: [],
      reviewTasks: [],
      suggestions: [],
      examFocus: [],
      weakPoints: [],
      mainline: [],
      mindMap: [],
    };
  }
}

/**
 * 调用 DeepSeek 生成课堂总结
 * @param {string} courseName
 * @param {string} transcript - 已清洗的转写文本
 * @param {Array} markers
 * @returns {Promise<Object>} 完整结构化结果
 */
async function generateSummary(courseName, transcript, markers) {
  if (!isDeepSeekConfigured()) {
    throw new Error('DEEPSEEK_NOT_CONFIGURED');
  }

  const markerText = (markers || []).map(m => {
    const label = m.label || 'unknown';
    const time = m.timestampMs ? Math.round(m.timestampMs / 1000) : 0;
    const note = m.note || '';
    return `- [${label}] @${time}s ${note}`;
  }).join('\n');

  const userMessage = `课程名称：${courseName || '未知课程'}

课堂转写文本：
${transcript || '（无转写内容）'}

学生标记：
${markerText || '（无标记）'}

请严格按照要求输出 JSON。`;

  const url = `${BASE_URL}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`DeepSeek API ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    console.log('[deepseek] raw response length:', rawContent.length);

    // 健壮解析
    const parsed = parseDeepSeekResponse(rawContent);

    // 标准化输出
    const result = {
      title: parsed.title || courseName || '课堂笔记',
      oneSentenceSummary: parsed.oneSentenceSummary || '',
      content: parsed.content || '',
      mainline: Array.isArray(parsed.mainline) ? parsed.mainline : [],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      terms: Array.isArray(parsed.terms) ? parsed.terms : [],
      examFocus: Array.isArray(parsed.examFocus) ? parsed.examFocus : [],
      reviewTasks: Array.isArray(parsed.reviewTasks) ? parsed.reviewTasks : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      weakPoints: Array.isArray(parsed.weakPoints) ? parsed.weakPoints : [],
      mindMap: Array.isArray(parsed.mindMap) ? parsed.mindMap : [],
      confidence: parsed.confidence || 0.9,
    };

    // 质量日志
    console.log('[deepseek] parsed result:', {
      contentLen: result.content.length,
      keyPoints: result.keyPoints.length,
      keywords: result.keywords.length,
      terms: result.terms.length,
      examFocus: result.examFocus.length,
      reviewTasks: result.reviewTasks.length,
      suggestions: result.suggestions.length,
      weakPoints: result.weakPoints.length,
      mainline: result.mainline.length,
    });

    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('DEEPSEEK_TIMEOUT');
    }
    throw err;
  }
}

// ─── 文档总结 Prompt（Phase 9-A）───

const DOCUMENT_SYSTEM_PROMPT = `你是面向大学生和海外留学生的学习资料解析助手。请根据用户上传的 Reading / Lecture Slides / PDF 文档，生成适合学习和复习的结构化笔记。你的目标不是简单摘要，而是帮助学生理解文档内容、提炼重点、解释术语、生成复习任务，并指出可能的考试或作业关注点。

请严格返回 JSON，不要 Markdown，不要代码块。

JSON 结构：
{
  "title": "文档标题",
  "oneSentenceSummary": "一句话概括文档内容",
  "content": "完整学习总结，至少 400-800 字，分段说明文档主题、核心论点、知识结构和学习重点",
  "mainline": ["文档主线1", "文档主线2", "文档主线3"],
  "keyPoints": [
    "必须掌握的重点1",
    "必须掌握的重点2",
    "必须掌握的重点3"
  ],
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "terms": [
    {
      "term": "术语",
      "explanation": "解释",
      "example": "在本文档中的语境或例子"
    }
  ],
  "examFocus": [
    {
      "point": "可能考点或作业重点",
      "reason": "为什么重要",
      "question": "可能怎么考或怎么在作业中使用"
    }
  ],
  "reviewTasks": [
    "具体复习任务1",
    "具体复习任务2",
    "具体复习任务3"
  ],
  "suggestions": [
    "学习建议1",
    "学习建议2"
  ],
  "weakPoints": [
    "学生可能容易混淆或遗漏的地方"
  ],
  "mindMap": [
    {
      "name": "文档主题",
      "children": [
        {
          "name": "一级知识点",
          "children": [
            { "name": "二级知识点" }
          ]
        }
      ]
    }
  ]
}

输出要求：
1. 用中文输出。
2. 如果原文是英文，需要将关键概念用中文解释，必要时保留英文术语。
3. content 至少 400 字，除非文档内容极短。
4. keyPoints 至少 5 条。
5. keywords 至少 5 个。
6. terms 至少 3 个。
7. examFocus 至少 3 条。
8. reviewTasks 至少 3 条。
9. mindMap 至少包含 1 个中心节点和 3 个一级节点。
10. 不要编造文档外无关内容。
11. 如果文档内容不足，尽量基于已有内容总结，并明确内容有限。
12. 不要说"根据文档内容"，直接给学生可读的笔记。`;

/**
 * 调用 DeepSeek 生成文档学习总结
 * @param {string} documentTitle
 * @param {string} documentText - 已清洗的文档文本
 * @param {string} documentType - 'reading' | 'slides'
 * @returns {Promise<Object>} 完整结构化结果
 */
async function generateDocumentSummary(documentTitle, documentText, documentType) {
  if (!isDeepSeekConfigured()) {
    throw new Error('DEEPSEEK_NOT_CONFIGURED');
  }

  const typeLabel = documentType === 'slides' ? 'Lecture Slides / 课件' : 'Reading / PDF 文档';

  const userMessage = `文档类型：${typeLabel}
文档标题：${documentTitle || '未命名文档'}

文档内容：
${documentText || '（无内容）'}

请严格按照要求输出 JSON。`;

  const url = `${BASE_URL}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: DOCUMENT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`DeepSeek API ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    console.log('[deepseek-doc] raw response length:', rawContent.length);

    const parsed = parseDeepSeekResponse(rawContent);

    const result = {
      title: parsed.title || documentTitle || '文档笔记',
      oneSentenceSummary: parsed.oneSentenceSummary || '',
      content: parsed.content || '',
      mainline: Array.isArray(parsed.mainline) ? parsed.mainline : [],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      terms: Array.isArray(parsed.terms) ? parsed.terms : [],
      examFocus: Array.isArray(parsed.examFocus) ? parsed.examFocus : [],
      reviewTasks: Array.isArray(parsed.reviewTasks) ? parsed.reviewTasks : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      weakPoints: Array.isArray(parsed.weakPoints) ? parsed.weakPoints : [],
      mindMap: Array.isArray(parsed.mindMap) ? parsed.mindMap : [],
      confidence: parsed.confidence || 0.9,
    };

    console.log('[deepseek-doc] parsed result:', {
      contentLen: result.content.length,
      keyPoints: result.keyPoints.length,
      keywords: result.keywords.length,
      terms: result.terms.length,
      examFocus: result.examFocus.length,
      reviewTasks: result.reviewTasks.length,
    });

    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('DEEPSEEK_TIMEOUT');
    }
    throw err;
  }
}

module.exports = { generateSummary, generateDocumentSummary, isDeepSeekConfigured };
