// routes/sessions.js
const prisma = require('../utils/prisma');
const { finalizeAndUpload } = require('../services/audioFile');
const { generateSummaryWithRetry, isAiConfigured } = require('../services/ai');
const { isDeepSeekConfigured } = require('../services/deepseek-llm');
const { cleanTranscriptText } = require('../services/transcript-cleaner');

module.exports = async function (fastify, opts) {
  // 创建课堂（仅元数据）
  fastify.post('/sessions', async (request, reply) => {
    const { title, subject, spaceId, spaceName, spaceType, courseName, source, language, summaryLanguage } = request.body || {};
    const now = new Date();
    // Space 归属：subject = spaceId || subject，title 包含 spaceName
    const effectiveSubject = spaceId || subject || null;
    const effectiveTitle = spaceName ? `${spaceName} 课堂录音` : (title || null);
    const session = await prisma.session.create({
      data: {
        title: effectiveTitle,
        subject: effectiveSubject,
        status: 'recording',
        startedAt: now,
      },
    });
    console.log('[session:create]', session.id.substring(0, 8), effectiveTitle || 'untitled', spaceId ? `space=${spaceId}` : '');
    reply.success({ sessionId: session.id });
  });

  // 历史列表（支持 ?q= 搜索标题、科目、转写全文）
  fastify.get('/sessions', async (request, reply) => {
    const { q } = request.query || {};

    let sessions;

    if (q && q.trim()) {
      const keyword = q.trim();
      const byMeta = await prisma.session.findMany({
        where: {
          userId: 'demo-user',
          OR: [
            { title: { contains: keyword } },
            { subject: { contains: keyword } },
          ],
        },
        orderBy: { startedAt: 'desc' },
        select: { id: true, title: true, subject: true, status: true, durationMs: true, startedAt: true, _count: { select: { markers: true } } },
      });

      const byTranscript = await prisma.transcript.findMany({
        where: { fullText: { contains: keyword } },
        select: { sessionId: true },
      });
      const transcriptSessionIds = byTranscript.map(t => t.sessionId);

      const existingIds = new Set(byMeta.map(s => s.id));
      const extra = transcriptSessionIds.length > 0
        ? await prisma.session.findMany({
            where: { id: { in: transcriptSessionIds.filter(id => !existingIds.has(id)) } },
            orderBy: { startedAt: 'desc' },
            select: { id: true, title: true, subject: true, status: true, durationMs: true, startedAt: true, _count: { select: { markers: true } } },
          })
        : [];

      // Phase 10-D: 扁平化 markerCount
      const allRaw = [...byMeta, ...extra];
      sessions = allRaw.map(s => ({ ...s, markerCount: s._count?.markers || 0, _count: undefined })).sort((a, b) => {
        const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return tb - ta;
      });
    } else {
      sessions = await prisma.session.findMany({
        where: { userId: 'demo-user' },
        orderBy: { startedAt: 'desc' },
        select: { id: true, title: true, subject: true, status: true, durationMs: true, startedAt: true, _count: { select: { markers: true } } },
      });
      // Phase 10-D: 扁平化 markerCount
      sessions = sessions.map(s => ({ ...s, markerCount: s._count?.markers || 0, _count: undefined }));
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

    await prisma.$transaction([
      prisma.transcript.deleteMany({ where: { sessionId: id } }),
      prisma.marker.deleteMany({ where: { sessionId: id } }),
      prisma.summary.deleteMany({ where: { sessionId: id } }),
      prisma.session.delete({ where: { id } }),
    ]);

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

  // 导出课堂笔记
  fastify.get('/sessions/:id/export', async (request, reply) => {
    const { id } = request.params;
    const format = (request.query.format || 'md').toLowerCase();

    const session = await prisma.session.findUnique({
      where: { id },
      include: { transcript: true, markers: { orderBy: { timestampMs: 'asc' } }, summary: true },
    });
    if (!session) return reply.error(404, '课堂不存在');

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

    const fmtMs = (ms) => {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const sec = String(s % 60).padStart(2, '0');
      return `${m}:${sec}`;
    };
    const labelMap = { important: '重要', didnt_understand: '没听懂', question: '问题' };

    let content = '';
    if (format === 'md') {
      const lines = [`# ${session.title || '课堂笔记'}`];
      if (session.subject) lines.push(`**科目：** ${session.subject}`);
      lines.push(`**时间：** ${session.startedAt ? new Date(session.startedAt).toLocaleString('zh-CN') : '—'}`);
      lines.push('');
      if (session.summary?.content) { lines.push('## AI 总结'); lines.push(session.summary.content); lines.push(''); }
      if (keyPoints.length > 0) { lines.push('## 知识点'); keyPoints.forEach(p => lines.push(`- ${p}`)); lines.push(''); }
      if (session.markers.length > 0) {
        lines.push('## 标记');
        session.markers.forEach(m => { lines.push(`- \`${fmtMs(m.timestampMs)}\` **[${labelMap[m.label] || m.label}]** ${m.note || ''}`); });
        lines.push('');
      }
      if (session.transcript?.fullText) { lines.push('## 完整转写'); lines.push(session.transcript.fullText); }
      content = lines.join('\n');
    } else {
      const lines = [`课堂笔记：${session.title || '未命名'}`];
      if (session.transcript?.fullText) { lines.push('\n【完整转写】'); lines.push(session.transcript.fullText); }
      content = lines.join('\n');
    }

    const filename = `${session.title || 'classnote'}-${id.substring(0, 8)}.${format === 'md' ? 'md' : 'txt'}`;
    reply.header('Content-Type', format === 'md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    reply.send(content);
  });

  // =====================================================
  // PATCH /sessions/:id/end — 结束课堂并生成 AI 总结
  // =====================================================
  fastify.patch('/sessions/:id/end', { config: { rawBody: false } }, async (request, reply) => {
    const { id } = request.params;
    const { generateSummary } = request.body || {};

    try {
      console.log('[session:end] start', id.substring(0, 8), 'generateSummary:', generateSummary);

      // 1. 查找 session
      const session = await prisma.session.findUnique({ where: { id } });
      if (!session) {
        console.warn('[session:end] session not found', id.substring(0, 8));
        return reply.status(404).send({
          ok: false, error: 'SESSION_NOT_FOUND', message: 'Session not found',
        });
      }
      console.log('[session:end] session found', { id: id.substring(0, 8), status: session.status });

      // 2. 检查状态
      if (session.status === 'done' || session.status === 'failed') {
        console.warn('[session:end] session already ended, status:', session.status);
        return reply.status(200).send({
          ok: true, data: { id, status: session.status },
        });
      }

      // 3. 计算时长
      const now = new Date();
      const startTime = session.startedAt
        ? new Date(session.startedAt).getTime()
        : (session.createdAt ? new Date(session.createdAt).getTime() : now.getTime());
      const durationMs = now.getTime() - startTime;

      // Phase 10-E: generateSummary === false → 保存录音，不总结
      if (generateSummary === false) {
        await prisma.session.update({
          where: { id },
          data: { endedAt: now, status: 'saved', durationMs },
        });
        console.log('[session:end] status → saved (no summary), durationMs:', durationMs);
        return reply.send({ code: 200, data: { id, status: 'saved' }, message: '成功' });
      }

      // 4. 更新状态为 summarizing
      await prisma.session.update({
        where: { id },
        data: { endedAt: now, status: 'summarizing', durationMs },
      });
      console.log('[session:end] status → summarizing, durationMs:', durationMs);

      // 5. 立即返回（异步后台生成总结）
      reply.send({ code: 200, data: { id, status: 'summarizing' }, message: '成功' });

      // 6. 异步后台任务：获取 transcript → 调 AI → 保存总结
      setImmediate(async () => {
        try {
          // 6a. 上传音频（可能为空，不阻塞）
          let audioUrl = null;
          try {
            audioUrl = await finalizeAndUpload(id);
            if (audioUrl) {
              await prisma.session.update({ where: { id }, data: { audioUrl } });
            }
          } catch (audioErr) {
            console.warn('[session:end] audio upload failed:', audioErr.message);
          }

          // 6b. 获取 transcript
          const transcript = await prisma.transcript.findUnique({ where: { sessionId: id } });
          let fullText = transcript?.fullText || '';
          let segmentCount = 0;

          if (!fullText && transcript?.segments) {
            try {
              const segments = typeof transcript.segments === 'string'
                ? JSON.parse(transcript.segments)
                : transcript.segments;
              if (Array.isArray(segments) && segments.length > 0) {
                segmentCount = segments.length;
                fullText = segments.map(s => s.text).join(' ');
                await prisma.transcript.update({ where: { sessionId: id }, data: { fullText } });
              }
            } catch (parseErr) {
              console.warn('[session:end] segments parse error:', parseErr.message);
            }
          }

          console.log('[session:end] transcript count:', segmentCount,
            'text length:', fullText.length,
            'preview:', fullText.slice(0, 120));

          // 6c. transcript 清洗
          fullText = cleanTranscriptText(fullText);

          // transcript 为空 → 标记 failed
          if (!fullText || !fullText.trim()) {
            console.warn('[session:end] transcript empty, marking failed');
            await prisma.session.update({ where: { id }, data: { status: 'failed', error: 'TRANSCRIPT_EMPTY' } });
            return;
          }

          // 6d. 获取标记
          const markers = await prisma.marker.findMany({
            where: { sessionId: id },
            orderBy: { timestampMs: 'asc' },
          });
          console.log('[session:end] markers count:', markers.length);

          // 6e. 获取课程名
          const sessionInfo = await prisma.session.findUnique({ where: { id } });
          const courseName = sessionInfo?.title || sessionInfo?.subject || '课堂录音';

          // 6f. 调 DeepSeek
          console.log('[session:end] calling AI service...');
          if (!isDeepSeekConfigured()) {
            console.warn('[session:end] DeepSeek not configured');
            await prisma.session.update({ where: { id }, data: { status: 'failed', error: 'DEEPSEEK_NOT_CONFIGURED' } });
            return;
          }

          const aiResult = await generateSummaryWithRetry(id, fullText, markers, courseName);
          console.log('[session:end] AI success, content length:', (aiResult.content || '').length);

          // 6g. 保存总结（完整结构化数据）
          const summaryData = {
            title: aiResult.title || '',
            oneSentenceSummary: aiResult.oneSentenceSummary || '',
            mainline: aiResult.mainline || [],
            keyPoints: aiResult.keyPoints || [],
            keywords: aiResult.keywords || [],
            suggestions: aiResult.suggestions || [],
            terms: aiResult.terms || [],
            reviewTasks: aiResult.reviewTasks || [],
            examFocus: aiResult.examFocus || [],
            weakPoints: aiResult.weakPoints || [],
            mindMap: aiResult.mindMap || [],
          };
          await prisma.summary.upsert({
            where: { sessionId: id },
            update: { content: aiResult.content || '', keyPoints: JSON.stringify(summaryData) },
            create: { sessionId: id, content: aiResult.content || '', keyPoints: JSON.stringify(summaryData) },
          });

          // 6h. 完成
          await prisma.session.update({ where: { id }, data: { status: 'done' } });
          console.log('[session:end] done ✓', id.substring(0, 8));

        } catch (err) {
          console.error('[session:end] background task failed:', err.message);
          try {
            const errorCode = err.message.includes('DEEPSEEK') ? 'DEEPSEEK_PROCESS_FAILED' : 'SESSION_END_FAILED';
            await prisma.session.update({ where: { id }, data: { status: 'failed', error: errorCode } });
          } catch (updateErr) {
            console.error('[session:end] failed to update status:', updateErr.message);
          }
        }
      });

    } catch (err) {
      console.error('[session:end] unexpected error:', err.message);
      return reply.status(500).send({
        ok: false, error: 'SESSION_END_FAILED', message: 'Failed to end session',
      });
    }
  });
};
