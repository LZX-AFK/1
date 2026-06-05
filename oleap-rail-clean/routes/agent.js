// routes/agent.js — Agent 对话接口（调 DeepSeek）
const { generateSummary, isDeepSeekConfigured } = require('../services/deepseek-llm');

const CHAT_SYSTEM_PROMPT = `你是"听刻"，一个面向海外留学生的 AI 学习助手。你的职责：
1. 帮助学生理解课堂内容、解答学术问题
2. 帮助学生复习知识点、整理笔记
3. 回答关于学习方法、考试准备的问题
4. 用中文回答，简洁清晰，适当使用 emoji

如果用户的问题涉及具体课堂内容，基于你收到的上下文回答。
如果是通用问题，直接回答。
不要说"作为AI"之类的话，直接回答问题。`;

module.exports = async function (fastify, opts) {
  // Agent 聊天
  fastify.post('/agent/chat', async (request, reply) => {
    const { message, history } = request.body || {};

    if (!message || !message.trim()) {
      return reply.error(400, '消息不能为空');
    }

    if (!isDeepSeekConfigured()) {
      return reply.error(503, 'DEEPSEEK_NOT_CONFIGURED', 503);
    }

    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
      const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

      // 构建消息历史
      const messages = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ];

      // 加入历史对话（最多保留最近 10 轮）
      if (Array.isArray(history)) {
        const recent = history.slice(-20);
        for (const msg of recent) {
          messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
        }
      }

      messages.push({ role: 'user', content: message.trim() });

      const url = `${baseUrl}/chat/completions`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        fastify.log.error(`DeepSeek chat error: ${res.status} ${errBody.substring(0, 200)}`);
        return reply.error(502, 'AI 服务调用失败', 502);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';

      reply.success({ content });
    } catch (err) {
      if (err.name === 'AbortError') {
        return reply.error(504, 'AI 响应超时', 504);
      }
      fastify.log.error(`Agent chat error: ${err.message}`);
      reply.error(500, err.message, 500);
    }
  });
};
