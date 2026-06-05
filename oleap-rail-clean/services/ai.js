/**
 * AI 总结服务
 * 优先使用 DeepSeek 直连，备选外部 AI_SERVICE_URL
 * 不再有 mock fallback
 */

const axios = require('axios');
const { generateSummary: deepseekGenerate, isDeepSeekConfigured } = require('./deepseek-llm');

const AI_SERVICE_PROVIDER = process.env.AI_SERVICE_PROVIDER || 'deepseek';

/**
 * 检查 AI 是否可用
 */
function isAiConfigured() {
  if (AI_SERVICE_PROVIDER === 'deepseek') {
    return isDeepSeekConfigured();
  }
  return !!(process.env.AI_SERVICE_URL);
}

/**
 * 调用外部 AI service（兼容旧的 Python FastAPI）
 */
async function callExternalAiService(sessionId, fullText, markers) {
  const response = await axios.post(
    process.env.AI_SERVICE_URL,
    { sessionId, fullText, markers },
    { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
  );
  if (response.data && typeof response.data.content === 'string') {
    return {
      content: response.data.content,
      keyPoints: response.data.keyPoints || [],
    };
  }
  throw new Error('AI 服务返回格式无效');
}

/**
 * 生成课堂总结（带重试）
 * @param {string} sessionId
 * @param {string} fullText - 转写全文
 * @param {Array} markers - 标记列表
 * @param {string} courseName - 课程名
 * @returns {Promise<{content: string, keyPoints: string[], keywords: string[], suggestions: string[], terms: Array, reviewTasks: string[]}>}
 */
async function generateSummaryWithRetry(sessionId, fullText, markers, courseName, retries = 2) {
  if (!isAiConfigured()) {
    throw new Error('AI_SERVICE_NOT_CONFIGURED');
  }

  const baseDelay = 1500;
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (AI_SERVICE_PROVIDER === 'deepseek') {
        return await deepseekGenerate(courseName || '课堂录音', fullText, markers);
      } else {
        return await callExternalAiService(sessionId, fullText, markers);
      }
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`AI 调用失败 (${attempt}/${retries})，${delay}ms 后重试: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`AI 总结失败: ${lastError?.message || '未知错误'}`);
}

module.exports = { generateSummaryWithRetry, isAiConfigured };
