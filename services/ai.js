// services/ai.js
// 支持两种模式：
// 1. AI 服务模式（配置了 AI_SERVICE_URL，调用外部 AI 接口）
// 2. 本地 Mock 模式（没有配置 AI_SERVICE_URL 时自动降级，纯文本处理）

const axios = require('axios');

// 检查是否配置了 AI 服务
function isAiConfigured() {
  return !!(process.env.AI_SERVICE_URL && 
            process.env.AI_SERVICE_URL !== 'http://localhost:3001/generate-summary');
}

// ---------- Mock 模式：纯本地文本处理，不依赖任何 API ----------

function generateMockSummary(fullText, markers) {
  // 提取前 N 个字符作为内容概要
  const textPreview = fullText || '（无转写内容）';
  
  // 按句号分割
  const sentences = textPreview
    .split(/[.!\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // 生成知识点（取出头几句）
  const keyPointsList = sentences.slice(0, Math.min(5, sentences.length)).map((s, i) => {
    return `第${i + 1}点: ${s.substring(0, 80)}${s.length > 80 ? '...' : ''}`;
  });

  // 如果有标记，生成标记相关重点
  let markerSection = '';
  if (markers && markers.length > 0) {
    const markerLabels = {
      'didnt_understand': '🔴 没听懂',
      'important': '🟡 重要',
      'question': '🟢 疑问',
    };
    markerSection = '\n\n## 📌 标记重点\n\n';
    markers.forEach((m, i) => {
      const label = markerLabels[m.label] || m.label;
      const timeStr = formatTimestamp(m.timestampMs);
      markerSection += `**${label}** (${timeStr})`;
      if (m.note) markerSection += ` — ${m.note}`;
      markerSection += '\n\n';
    });
  }

  const summary = `# 课堂笔记\n\n## 📝 内容摘要\n\n${textPreview.substring(0, 500)}${textPreview.length > 500 ? '...' : ''}${markerSection}\n\n## 🔑 关键知识点\n\n${keyPointsList.map(kp => `- ${kp}`).join('\n')}\n\n---\n*该总结由系统自动生成（Mock 模式），如需更精准的个性化总结，请配置 AI 服务。*`;

  return {
    content: summary,
    keyPoints: keyPointsList,
  };
}

function formatTimestamp(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// ---------- AI 服务模式：调外部 API ----------

async function callAiService(sessionId, fullText, markers) {
  const response = await axios.post(
    process.env.AI_SERVICE_URL,
    { sessionId, fullText, markers },
    {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (response.data && typeof response.data.content === 'string') {
    return {
      content: response.data.content,
      keyPoints: response.data.keyPoints || [],
    };
  } else {
    throw new Error('AI 服务返回格式无效');
  }
}

// ---------- 统一入口 ----------

async function generateSummaryWithRetry(sessionId, fullText, markers, retries = 3) {
  if (isAiConfigured()) {
    // 真实 AI 服务模式（带重试）
    const baseDelay = 1000;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await callAiService(sessionId, fullText, markers);
      } catch (err) {
        lastError = err;
        if (attempt === retries) break;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`AI 调用失败 (${attempt}/${retries})，${delay}ms 后重试: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error(`AI 总结失败，已重试 ${retries} 次: ${lastError.message}`);
  } else {
    // Mock 模式：本地生成，无需任何配置
    console.log('[AI] Mock 模式：本地生成总结');
    return generateMockSummary(fullText, markers);
  }
}

module.exports = { generateSummaryWithRetry };
