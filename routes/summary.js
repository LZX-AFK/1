// routes/summary.js
const prisma = require('../utils/prisma');

module.exports = async function (fastify, opts) {
  fastify.get('/sessions/:id/summary', async (request, reply) => {
    const { id } = request.params;
    const summary = await prisma.summary.findUnique({
      where: { sessionId: id },
    });
    if (!summary) {
      return reply.error(404, '总结不存在或尚未生成');
    }
    // SQLite 下 keyPoints 存为 JSON 字符串，转回数组返回
    if (summary.keyPoints && typeof summary.keyPoints === 'string') {
      try { summary.keyPoints = JSON.parse(summary.keyPoints); } catch (e) {}
    }
    reply.success(summary);
  });
};
