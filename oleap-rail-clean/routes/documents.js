// routes/documents.js
// POST /api/sessions/upload-document — 上传 PDF 文档 → 文本提取 → DeepSeek 文档总结

const path = require('path');
const fs = require('fs');
const os = require('os');
const { randomUUID } = require('crypto');

const prisma = require('../utils/prisma');
const { parseDocument, cleanDocumentText, truncateForSummary } = require('../services/document-parser');
const { generateDocumentSummary } = require('../services/deepseek-llm');
const { isDeepSeekConfigured } = require('../services/deepseek-llm');

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PDF_EXTENSIONS = ['.pdf'];
const TEMP_DIR = process.env.TEMP_DIR || os.tmpdir();

// Ensure documents temp dir exists
const docsDir = path.join(TEMP_DIR, 'documents');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

module.exports = async function (fastify, opts) {
  fastify.post('/sessions/upload-document', async (request, reply) => {
    let tempFiles = [];

    try {
      // 1. 接收 multipart 文件
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({
          ok: false, error: 'FILE_REQUIRED', message: '请选择要上传的文件',
        });
      }

      // 2. 解析字段
      const documentType = file.fields?.documentType?.value || request.body?.documentType || 'reading';
      const courseName = file.fields?.courseName?.value || request.body?.courseName || '上传资料';
      const subject = file.fields?.subject?.value || request.body?.subject || 'document';
      const source = file.fields?.source?.value || request.body?.source || `upload-${documentType}`;
      const language = file.fields?.language?.value || request.body?.language || 'auto';
      const title = file.fields?.title?.value || request.body?.title || '';
      // Phase 10-B: Space 归属字段
      const spaceId = file.fields?.spaceId?.value || request.body?.spaceId || '';
      const spaceName = file.fields?.spaceName?.value || request.body?.spaceName || '';
      const spaceType = file.fields?.spaceType?.value || request.body?.spaceType || '';

      console.log('[upload-document] file:', file.filename, 'type:', documentType, 'size:', file.file?.bytesRead || 0);

      // 3. 校验文件类型
      const ext = path.extname(file.filename || '').toLowerCase();

      if (ext === '.ppt' || ext === '.pptx') {
        return reply.status(400).send({
          ok: false, error: 'PPT_PARSE_NOT_SUPPORTED',
          message: 'PPT 解析将在下一阶段接入，请先上传 PDF 版课件。',
        });
      }

      if (!PDF_EXTENSIONS.includes(ext)) {
        return reply.status(400).send({
          ok: false, error: 'UNSUPPORTED_DOCUMENT_TYPE',
          message: '暂不支持该文件格式，请上传 PDF 文件。',
        });
      }

      // 4. 保存文件到临时目录
      const fileId = randomUUID();
      const savePath = path.join(docsDir, `${fileId}${ext}`);
      const ws = fs.createWriteStream(savePath);
      await new Promise((resolve, reject) => {
        file.file.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      });
      tempFiles.push(savePath);

      const fileSize = fs.statSync(savePath).size;
      console.log('[upload-document] saved:', savePath, 'size:', fileSize);

      if (fileSize > MAX_FILE_SIZE) {
        return reply.status(400).send({
          ok: false, error: 'FILE_TOO_LARGE',
          message: '文件过大，请选择 50MB 以内的文档。',
        });
      }

      // 5. 创建 session
      const docTitle = title || file.filename?.replace(/\.[^.]+$/, '') || courseName || '上传资料';
      const session = await prisma.session.create({
        data: {
          title: spaceName || docTitle,
          subject: spaceId || subject,
          status: 'summarizing',
          startedAt: new Date(),
        },
      });
      const sessionId = session.id;
      console.log('[upload-document] session created:', sessionId.substring(0, 8), spaceId ? `space=${spaceId}` : '');

      // 6. 立即返回 sessionId
      reply.send({
        code: 200,
        data: { sessionId, status: 'processing', source, documentType },
        message: '成功',
      });

      // 7. 异步处理：PDF 文本提取 → 清洗 → DeepSeek 总结
      setImmediate(async () => {
        try {
          // 7a. 提取 PDF 文本
          console.log('[upload-document] parsing PDF...');
          const docResult = await parseDocument(savePath, '', ext);
          console.log('[upload-document] PDF parsed, text length:', docResult.text.length, 'pages:', docResult.pages.length);

          // 7b. 清洗文本
          let cleanedText;
          try {
            cleanedText = cleanDocumentText(docResult.text);
            console.log('[upload-document] text cleaned:', docResult.text.length, '→', cleanedText.length);
          } catch (cleanErr) {
            console.warn('[upload-document] text cleaning failed, using raw:', cleanErr.message);
            cleanedText = docResult.text;
          }

          // 7c. 检查文本是否为空
          if (!cleanedText || !cleanedText.trim()) {
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: 'DOCUMENT_TEXT_EMPTY' },
            });
            return;
          }

          if (cleanedText.length < 20) {
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: 'DOCUMENT_TEXT_TOO_SHORT' },
            });
            return;
          }

          // 7d. 保存文档原文为 transcript（复用 transcript 表）
          // 将 PDF pages 映射为 transcriptSegments 格式，方便 Summary 原文页展示
          const documentPages = docResult.pages.map(p => ({
            id: randomUUID(),
            startMs: 0,
            endMs: 0,
            text: p.text,
            timeRange: `第 ${p.pageNumber} 页`,
          }));

          await prisma.transcript.upsert({
            where: { sessionId },
            update: {
              fullText: cleanedText,
              segments: JSON.stringify(documentPages),
            },
            create: {
              sessionId,
              fullText: cleanedText,
              segments: JSON.stringify(documentPages),
            },
          });

          // 7e. 截断长文本
          const { text: inputText, truncated } = truncateForSummary(cleanedText, 12000);
          if (truncated) {
            console.log('[upload-document] text truncated for DeepSeek input');
          }

          // 7f. DeepSeek 文档总结
          console.log('[upload-document] calling DeepSeek for document summary...');
          if (!isDeepSeekConfigured()) {
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: 'DEEPSEEK_NOT_CONFIGURED' },
            });
            return;
          }

          const finalTitle = docResult.metadata.title || docTitle;
          const aiResult = await generateDocumentSummary(finalTitle, inputText, documentType);
          console.log('[upload-document] DeepSeek success, content length:', (aiResult.content || '').length);

          // 7g. 保存 summary（完整结构化数据）
          const summaryData = {
            title: aiResult.title || finalTitle,
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
            // 文档特有元数据
            source: source,
            documentType: documentType,
            pageCount: docResult.metadata.pageCount || 0,
          };

          await prisma.summary.upsert({
            where: { sessionId },
            update: { content: aiResult.content || '', keyPoints: JSON.stringify(summaryData) },
            create: { sessionId, content: aiResult.content || '', keyPoints: JSON.stringify(summaryData) },
          });

          // 7h. 更新 session 标题（如果 DeepSeek 生成了更好的标题）
          const updateData = { status: 'done', durationMs: 0 };
          if (aiResult.title && aiResult.title !== docTitle) {
            updateData.title = aiResult.title;
          }

          await prisma.session.update({
            where: { id: sessionId },
            data: updateData,
          });
          console.log('[upload-document] done ✓', sessionId.substring(0, 8));

        } catch (err) {
          console.error('[upload-document] processing failed:', err.message);
          const errorCode = err.code || (
            err.message?.includes('PDF') ? 'PDF_PARSE_FAILED'
            : err.message?.includes('DEEPSEEK') ? 'DOCUMENT_SUMMARY_FAILED'
            : 'UPLOAD_DOCUMENT_FAILED'
          );
          try {
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: errorCode },
            });
          } catch (e) {
            console.error('[upload-document] failed to update status:', e.message);
          }
        } finally {
          // 清理临时文件
          for (const f of tempFiles) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
          }
        }
      });

    } catch (err) {
      console.error('[upload-document] unexpected error:', err.message);
      return reply.status(500).send({
        ok: false, error: 'UPLOAD_DOCUMENT_FAILED', message: '上传解析失败，请稍后重试',
      });
    }
  });
};
