// routes/markers.js
const prisma = require('../utils/prisma');

module.exports = async function (fastify, opts) {
  // 添加标记
  fastify.post('/sessions/:id/markers', async (request, reply) => {
    const { id } = request.params;
    const { timestampMs, label, note, aiFollowUp } = request.body || {};

    // 校验必填字段
    if (timestampMs === undefined || timestampMs === null) {
      return reply.error(400, '缺少必填字段: timestampMs');
    }
    if (!label || !['didnt_understand', 'important', 'question'].includes(label)) {
      return reply.error(400, 'label 必须为: didnt_understand / important / question');
    }

    // 校验课堂存在
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return reply.error(404, '课堂不存在');
    }
    if (session.status !== 'recording') {
      return reply.error(400, '课堂已结束，无法添加标记');
    }

    const marker = await prisma.marker.create({
      data: {
        sessionId: id,
        timestampMs,
        label,
        note: note || null,
        aiFollowUp: aiFollowUp !== undefined ? aiFollowUp : true,
      },
    });

    reply.success({ markerId: marker.id });
  });

  // 获取课堂的所有标记
  fastify.get('/sessions/:id/markers', async (request, reply) => {
    const { id } = request.params;

    const markers = await prisma.marker.findMany({
      where: { sessionId: id },
      orderBy: { timestampMs: 'asc' },
    });

    reply.success(markers);
  });
};
