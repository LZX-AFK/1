// routes/sessions.js
const prisma = require('../utils/prisma');
const { finalizeAndUpload } = require('../services/audioFile');
const { generateSummaryWithRetry } = require('../services/ai');

module.exports = async function (fastify, opts) {
  // 创建课堂（仅元数据）
  fastify.post('/sessions', async (request, reply) => {
    const { title, subject } = request.body || {};
    const session = await prisma.session.create({
      data: {
        title: title || null,
        subject: subject || null,
        status: 'recording',
      },
    });
    reply.success({ sessionId: session.id });
  });

  // 历史列表（支持 ?q= 搜索标题、科目、转写全文）
  fastify.get('/sessions', async (request, reply) => {
    const { q } = request.query || {};

    let sessions;

    if (q && q.trim()) {
      const keyword = q.trim();
      // SQLite 用 contains（不区分大小写）搜索 title 和 subject
      const byMeta = await prisma.session.findMany({
        where: {
          userId: 'demo-user',
          OR: [
            { title: { contains: keyword } },
            { subject: { contains: keyword } },
          ],
        },
        orderBy: { startedAt: 'desc' },
        select: { id: true, title: true, subject: true, status: true, durationMs: true, startedAt: true },
      });

      // 搜索转写全文（fullText 字段）
      const byTranscript = await prisma.transcript.findMany({
        where: { fullText: { contains: keyword } },
        select: { sessionId: true },
      });
      const transcriptSessionIds = byTranscript.map(t => t.sessionId);

      // 补充转写匹配的课堂（去重）
      const existingIds = new Set(byMeta.map(s => s.id));
      const extra = transcriptSessionIds.length > 0
        ? await prisma.session.findMany({
            where: { id: { in: transcriptSessionIds.filter(id => !existingIds.has(id)) } },
            orderBy: { startedAt: 'desc' },
            select: { id: true, title: true, subject: true, status: true, durationMs: true, startedAt: true },
          })
        : [];

      sessions = [...byMeta, ...extra].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    } else {
      sessions = await prisma.session.findMany({
        where: { userId: 'demo-user' },
        orderBy: { startedAt: 'desc' },
        select: { id: true, title: true, subject: true, status: true, durationMs: true, startedAt: true },
      });
    }

    reply.success(sessions);
  });

  // 课堂详情（包含转写、标记、总结）
  fastify.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        transcript: true,
        markers: { orderBy: { timestampMs: 'asc' } },
        summary: true,
      },
    });
    if (!session) {
      return reply.error(404, '课堂不存在');
    }
    // SQLite 下 JSON 字段存为字符串，解析后返回
    if (session.transcript?.segments && typeof session.transcript.segments === 'string') {
      try { session.transcript.segments = JSON.parse(session.transcript.segments); } catch (e) {}
    }
    if (session.summary?.keyPoints && typeof session.summary.keyPoints === 'string') {
      try { session.summary.keyPoints = JSON.parse(session.summary.keyPoints); } catch (e) {}
    }
    reply.success(session);
  });

  // 删除课堂
  fastify.delete('/sessions/:id', async (request, reply) => {
    const { id } = request.params;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return reply.error(404, '课堂不存在');
    }

    // 级联删除关联数据（SQLite 无外键级联，手动删）
    await prisma.$transaction([
      prisma.transcript.deleteMany({ where: { sessionId: id } }),
      prisma.marker.deleteMany({ where: { sessionId: id } }),
      prisma.summary.deleteMany({ where: { sessionId: id } }),
      prisma.session.delete({ where: { id } }),
    ]);

    // 清理本地音频文件
    const path = require('path');
    const fs = require('fs');
    const os = require('os');
    const audioDir = process.env.TEMP_DIR || os.tmpdir();
    for (const ext of ['.pcm', '.wav']) {
      const filePath = path.join(audioDir, 'audio', id + ext);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    reply.success({ deleted: true });
  });

  // 导出课堂笔记（Markdown / TXT）
  fastify.get('/sessions/:id/export', async (request, reply) => {
    const { id } = request.params;
    const format = (request.query.format || 'md').toLowerCase();

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        transcript: true,
        markers: { orderBy: { timestampMs: 'asc' } },
        summary: true,
      },
    });
    if (!session) return reply.error(404, '课堂不存在');

    // 解析 JSON 字段
    let segments = [];
    if (session.transcript?.segments) {
      try {
        segments = typeof session.transcript.segments === 'string'
          ? JSON.parse(session.transcript.segments)
          : session.transcript.segments;
      } catch (e) {}
    }
    let keyPoints = [];
    if (session.summary?.keyPoints) {
      try {
        keyPoints = typeof session.summary.keyPoints === 'string'
          ? JSON.parse(session.summary.keyPoints)
          : session.summary.keyPoints;
      } catch (e) {}
    }

    // 时间格式化辅助
    const fmtMs = (ms) => {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const sec = String(s % 60).padStart(2, '0');
      return `${m}:${sec}`;
    };
    const labelMap = { important: '重要', didnt_understand: '没听懂', question: '问题' };

    let content = '';

    if (format === 'md') {
      const lines = [];
      lines.push(`# ${session.title || '课堂笔记'}`);
      if (session.subject) lines.push(`**科目：** ${session.subject}`);
      lines.push(`**时间：** ${new Date(session.startedAt).toLocaleString('zh-CN')}`);
      const dur = session.durationMs ? `${Math.round(session.durationMs / 1000)} 秒` : '—';
      lines.push(`**时长：** ${dur}`);
      lines.push('');

      if (session.summary?.content) {
        lines.push('## AI 总结');
        lines.push(session.summary.content);
        lines.push('');
      }

      if (keyPoints.length > 0) {
        lines.push('## 知识点');
        keyPoints.forEach(p => lines.push(`- ${p}`));
        lines.push('');
      }

      if (session.markers.length > 0) {
        lines.push('## 标记');
        session.markers.forEach(m => {
          const label = labelMap[m.label] || m.label;
          lines.push(`- \`${fmtMs(m.timestampMs)}\` **[${label}]** ${m.note || ''}`);
        });
        lines.push('');
      }

      if (session.transcript?.fullText) {
        lines.push('## 完整转写');
        lines.push(session.transcript.fullText);
        lines.push('');
      } else if (segments.length > 0) {
        lines.push('## 转写片段');
        segments.forEach(seg => {
          lines.push(`- \`${fmtMs(seg.timestampMs || 0)}\` ${seg.text}`);
        });
        lines.push('');
      }

      content = lines.join('\n');
    } else {
      // 纯文本格式
      const lines = [];
      lines.push(`课堂笔记：${session.title || '未命名'}`);
      if (session.subject) lines.push(`科目：${session.subject}`);
      lines.push(`时间：${new Date(session.startedAt).toLocaleString('zh-CN')}`);
      lines.push('='.repeat(40));

      if (session.summary?.content) {
        lines.push('\n【AI 总结】');
        lines.push(session.summary.content);
      }
      if (keyPoints.length > 0) {
        lines.push('\n【知识点】');
        keyPoints.forEach(p => lines.push(`• ${p}`));
      }
      if (session.markers.length > 0) {
        lines.push('\n【标记】');
        session.markers.forEach(m => {
          const label = labelMap[m.label] || m.label;
          lines.push(`[${fmtMs(m.timestampMs)}] [${label}] ${m.note || ''}`);
        });
      }
      if (session.transcript?.fullText) {
        lines.push('\n【完整转写】');
        lines.push(session.transcript.fullText);
      }
      content = lines.join('\n');
    }

    const filename = `${session.title || 'classnote'}-${id.substring(0, 8)}.${format === 'md' ? 'md' : 'txt'}`;
    // 设置下载头
    reply.header('Content-Type', format === 'md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    reply.send(content);
  });

  // 结束课堂（异步处理）
  fastify.patch('/sessions/:id/end', async (request, reply) => {
    const { id } = request.params;

    // 事务：立即更新结束时间、状态、时长
    const updatedSession = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const session = await tx.session.findUnique({ where: { id } });
      if (!session) throw new Error('Session not found');
      if (session.status !== 'recording') {
        throw new Error('课堂已结束或正在处理中');
      }
      const durationMs = now.getTime() - session.startedAt.getTime();
      return tx.session.update({
        where: { id },
        data: {
          endedAt: now,
          status: 'summarizing',
          durationMs,
        },
      });
    });

    // 异步后台任务
    setImmediate(async () => {
      try {
        // 1. 上传音频到 R2（可能为空）
        let audioUrl = null;
        try {
          audioUrl = await finalizeAndUpload(id);
          if (audioUrl) {
            await prisma.session.update({ where: { id }, data: { audioUrl } });
          }
        } catch (audioErr) {
          fastify.log.error(`音频上传失败: ${audioErr.message}`);
        }

        // 2. 获取转写全文和标记
        const transcript = await prisma.transcript.findUnique({ where: { sessionId: id } });
        let fullText = transcript?.fullText || '';
        // 如果 fullText 为空但 segments 有数据，从 segments 拼接
        if (!fullText && transcript?.segments) {
          const segments = typeof transcript.segments === 'string'
            ? JSON.parse(transcript.segments)
            : transcript.segments;
          if (Array.isArray(segments)) {
            fullText = segments.map(s => s.text).join(' ');
            // 回填 fullText
            await prisma.transcript.update({ where: { sessionId: id }, data: { fullText } });
          }
        }
        const markers = await prisma.marker.findMany({
          where: { sessionId: id },
          orderBy: { timestampMs: 'asc' },
        });

        // 3. 调用 AI 生成总结（带超时和重试）
        let summaryContent = '';
        let keyPoints = [];
        try {
          const aiResult = await generateSummaryWithRetry(id, fullText, markers);
          summaryContent = aiResult.content;
          keyPoints = aiResult.keyPoints || [];
        } catch (aiErr) {
          fastify.log.error(`AI 总结失败: ${aiErr.message}`);
          await prisma.session.update({ where: { id }, data: { status: 'failed' } });
          return;
        }

        // 4. 保存总结
        await prisma.summary.upsert({
          where: { sessionId: id },
          update: { content: summaryContent, keyPoints: JSON.stringify(keyPoints) },
          create: { sessionId: id, content: summaryContent, keyPoints: JSON.stringify(keyPoints) },
        });

        // 5. 完成
        await prisma.session.update({ where: { id }, data: { status: 'done' } });
      } catch (err) {
        fastify.log.error(`结束课堂后台任务失败: ${err.message}`);
        await prisma.session.update({ where: { id }, data: { status: 'failed' } });
      }
    });

    reply.success({ status: updatedSession.status });
  });
};
