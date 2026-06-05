// routes/summary.js
const prisma = require('../utils/prisma');

module.exports = async function (fastify, opts) {
  fastify.get('/sessions/:id/summary', async (request, reply) => {
    const { id } = request.params;

    // 先检查 session 状态
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return reply.status(404).send({
        code: 404, data: null, message: '课堂不存在',
      });
    }

    // session 仍在录音
    if (session.status === 'recording') {
      return reply.success({ status: 'recording', content: null, keyPoints: [] });
    }

    // session 正在生成总结
    if (session.status === 'summarizing') {
      return reply.success({ status: 'processing', content: null, keyPoints: [] });
    }

    // session 总结失败 — 返回 error code
    if (session.status === 'failed') {
      return reply.success({
        status: 'failed',
        error: session.error || 'UNKNOWN_ERROR',
        content: null,
        keyPoints: [],
      });
    }

    // session 已完成，查找总结
    const summary = await prisma.summary.findUnique({
      where: { sessionId: id },
    });
    if (!summary) {
      return reply.success({ status: 'done', content: null, keyPoints: [] });
    }

    // 解析 keyPoints JSON（Phase 7-F: 包含完整结构化数据）
    let keyPoints = [];
    let keywords = [];
    let suggestions = [];
    let terms = [];
    let reviewTasks = [];
    let examFocus = [];
    let weakPoints = [];
    let mainline = [];
    let mindMap = [];
    let oneSentenceSummary = '';
    let title = '';
    let source = '';
    let documentType = '';
    let pageCount = 0;

    if (summary.keyPoints && typeof summary.keyPoints === 'string') {
      try {
        const parsed = JSON.parse(summary.keyPoints);
        if (Array.isArray(parsed)) {
          // 兼容旧格式：keyPoints 是纯数组
          keyPoints = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Phase 7-F 格式：完整结构化数据
          keyPoints = parsed.keyPoints || [];
          keywords = parsed.keywords || [];
          suggestions = parsed.suggestions || [];
          terms = parsed.terms || [];
          reviewTasks = parsed.reviewTasks || [];
          examFocus = parsed.examFocus || [];
          weakPoints = parsed.weakPoints || [];
          mainline = parsed.mainline || [];
          mindMap = parsed.mindMap || [];
          oneSentenceSummary = parsed.oneSentenceSummary || '';
          title = parsed.title || '';
          source = parsed.source || '';
          documentType = parsed.documentType || '';
          pageCount = parsed.pageCount || 0;
        }
      } catch (e) {
        console.warn('[summary] keyPoints JSON parse error:', e.message);
      }
    }

    reply.success({
      id: summary.id,
      sessionId: summary.sessionId,
      status: 'done',
      content: summary.content,
      title,
      oneSentenceSummary,
      mainline,
      keyPoints,
      keywords,
      suggestions,
      terms,
      reviewTasks,
      examFocus,
      weakPoints,
      mindMap,
      source,
      documentType,
      pageCount,
    });
  });
};
