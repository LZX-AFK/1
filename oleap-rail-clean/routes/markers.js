// routes/markers.js
// Phase 10-D: 扩展标记类型 + 支持 contextText / spaceId / sourceType
const prisma = require('../utils/prisma');

const VALID_LABELS = ['didnt_understand', 'important', 'question', 'exam', 'review', 'note', 'confused'];

module.exports = async function (fastify, opts) {
  // 添加标记
  fastify.post('/sessions/:id/markers', async (request, reply) => {
    const { id } = request.params;
    const { timestampMs, label, note, aiFollowUp, content, contextText, type, spaceId, spaceName, sourceId, sourceType } = request.body || {};

    // 校验必填字段
    if (timestampMs === undefined || timestampMs === null) {
      return reply.error(400, '缺少必填字段: timestampMs');
    }

    // Phase 10-D: 支持更多 label 类型
    const effectiveLabel = label || type || 'important';
    const normalizedLabel = effectiveLabel === 'confused' ? 'didnt_understand' : effectiveLabel;
    if (!VALID_LABELS.includes(normalizedLabel) && !VALID_LABELS.includes(effectiveLabel)) {
      // 容错：接受任何 label，不硬拒绝
      console.warn('[marker] unknown label:', effectiveLabel, '- accepting anyway');
    }

    // 校验课堂存在
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return reply.error(404, '课堂不存在');
    }
    // Phase 10-D: 允许 recording 和 done 状态添加标记
    if (session.status === 'failed') {
      return reply.error(400, '课堂处理失败，无法添加标记');
    }

    const marker = await prisma.marker.create({
      data: {
        sessionId: id,
        timestampMs: timestampMs || 0,
        label: normalizedLabel || effectiveLabel,
        note: note || content || contextText || null,
        aiFollowUp: aiFollowUp !== undefined ? aiFollowUp : true,
      },
    });

    // Phase 10-D: 返回完整 marker 对象
    reply.success({
      markerId: marker.id,
      id: marker.id,
      sessionId: id,
      sourceId: sourceId || id,
      type: normalizedLabel || effectiveLabel,
      label: normalizedLabel || effectiveLabel,
      content: content || contextText || note || '',
      timestampMs: marker.timestampMs,
      contextText: contextText || note || '',
      status: 'pending',
      createdAt: marker.createdAt,
    });
  });

  // 获取课堂的所有标记
  fastify.get('/sessions/:id/markers', async (request, reply) => {
    const { id } = request.params;

    const markers = await prisma.marker.findMany({
      where: { sessionId: id },
      orderBy: { timestampMs: 'asc' },
    });

    // Phase 10-D: 返回增强格式
    const enhanced = markers.map(m => ({
      id: m.id,
      sessionId: m.sessionId,
      sourceId: m.sessionId,
      type: m.label === 'didnt_understand' ? 'confused' : m.label,
      label: m.label === 'didnt_understand' ? '没听懂' : m.label,
      content: m.note || '',
      timestampMs: m.timestampMs,
      contextText: m.note || '',
      status: 'pending',
      createdAt: m.createdAt,
    }));

    reply.success(enhanced);
  });
};
