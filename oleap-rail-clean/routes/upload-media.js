// routes/upload-media.js
// POST /api/sessions/upload-media — 上传课堂音频/视频 → ASR → DeepSeek 总结

const path = require('path');
const fs = require('fs');
const os = require('os');
const { randomUUID } = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const prisma = require('../utils/prisma');
const { streamFileToAsr } = require('../services/dashscope-file-asr');
const { generateSummaryWithRetry } = require('../services/ai');
const { isDeepSeekConfigured } = require('../services/deepseek-llm');
const { cleanTranscriptText, cleanTranscriptSegments } = require('../services/transcript-cleaner');

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.webm', '.ogg', '.flac', '.wma'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'];

const TEMP_DIR = process.env.TEMP_DIR || os.tmpdir();

async function checkFfmpeg() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

async function convertToPcm16k(inputPath) {
  const outputPath = inputPath + '.pcm';
  try {
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-ar', '16000',
      '-ac', '1',
      '-f', 's16le',
      '-y',
      outputPath,
    ]);
    return outputPath;
  } catch (err) {
    throw new Error(`FFMPEG_CONVERT_FAILED: ${err.message}`);
  }
}

async function extractAudioFromVideo(inputPath) {
  const audioPath = inputPath + '.audio.wav';
  try {
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-vn',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      '-y',
      audioPath,
    ]);
    return audioPath;
  } catch (err) {
    throw new Error(`FFMPEG_EXTRACT_FAILED: ${err.message}`);
  }
}

module.exports = async function (fastify, opts) {
  fastify.post('/sessions/upload-media', async (request, reply) => {
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
      const fields = {};
      const parts = request.parts();
      // file 已经被 request.file() 消费了，这里只读剩余字段
      // 从 multipart data 中手动提取
      const mediaType = file.fields?.mediaType?.value || request.body?.mediaType || 'audio';
      const courseName = file.fields?.courseName?.value || request.body?.courseName || '上传课堂';
      const language = file.fields?.language?.value || request.body?.language || 'en';
      // Phase 10-B: Space 归属字段
      const spaceId = file.fields?.spaceId?.value || request.body?.spaceId || '';
      const spaceName = file.fields?.spaceName?.value || request.body?.spaceName || '';
      const spaceType = file.fields?.spaceType?.value || request.body?.spaceType || '';

      console.log('[upload-media] file:', file.filename, 'type:', mediaType, 'size:', file.file?.bytesRead || 0);

      // 3. 校验文件类型
      const ext = path.extname(file.filename || '').toLowerCase();
      const isAudio = AUDIO_EXTENSIONS.includes(ext);
      const isVideo = VIDEO_EXTENSIONS.includes(ext);

      if (mediaType === 'audio' && !isAudio && !isVideo) {
        return reply.status(400).send({
          ok: false, error: 'UNSUPPORTED_MEDIA_TYPE',
          message: `不支持的音频格式: ${ext}，支持: ${AUDIO_EXTENSIONS.join(', ')}`,
        });
      }

      if (mediaType === 'video' && !isVideo) {
        return reply.status(400).send({
          ok: false, error: 'UNSUPPORTED_MEDIA_TYPE',
          message: `不支持的视频格式: ${ext}，支持: ${VIDEO_EXTENSIONS.join(', ')}`,
        });
      }

      // 4. 保存文件到临时目录
      const fileId = randomUUID();
      const savePath = path.join(TEMP_DIR, 'audio', `${fileId}${ext}`);
      const ws = fs.createWriteStream(savePath);
      await new Promise((resolve, reject) => {
        file.file.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      });
      tempFiles.push(savePath);

      const fileSize = fs.statSync(savePath).size;
      console.log('[upload-media] saved:', savePath, 'size:', fileSize);

      if (fileSize > MAX_FILE_SIZE) {
        return reply.status(400).send({
          ok: false, error: 'FILE_TOO_LARGE', message: '文件过大，请选择 100MB 以内的音视频',
        });
      }

      // 5. 创建 session
      const session = await prisma.session.create({
        data: {
          title: spaceName || courseName || '上传课堂',
          subject: spaceId || 'upload',
          status: 'summarizing',
          startedAt: new Date(),
        },
      });
      const sessionId = session.id;
      console.log('[upload-media] session created:', sessionId.substring(0, 8), spaceId ? `space=${spaceId}` : '');

      // 6. 立即返回 sessionId
      reply.send({ code: 200, data: { sessionId, status: 'processing' }, message: '成功' });

      // 7. 异步处理：转码 → ASR → DeepSeek
      setImmediate(async () => {
        let pcmPath = null;
        let videoAudioPath = null;

        try {
          // 7a. 视频 → 提取音频
          let audioFilePath = savePath;
          if (isVideo || mediaType === 'video') {
            console.log('[upload-media] extracting audio from video...');
            const hasFfmpeg = await checkFfmpeg();
            if (!hasFfmpeg) {
              await prisma.session.update({
                where: { id: sessionId },
                data: { status: 'failed', error: 'FFMPEG_NOT_AVAILABLE' },
              });
              return;
            }
            videoAudioPath = await extractAudioFromVideo(savePath);
            tempFiles.push(videoAudioPath);
            audioFilePath = videoAudioPath;
            console.log('[upload-media] audio extracted');
          }

          // 7b. 转码为 PCM 16kHz
          console.log('[upload-media] converting to PCM 16kHz...');
          const hasFfmpeg = await checkFfmpeg();
          if (!hasFfmpeg) {
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: 'FFMPEG_NOT_AVAILABLE' },
            });
            return;
          }

          pcmPath = await convertToPcm16k(audioFilePath);
          tempFiles.push(pcmPath);
          console.log('[upload-media] PCM converted, starting ASR...');

          // 7c. ASR 流式转写
          const asrResult = await streamFileToAsr(pcmPath, { timeoutMs: 180000 });
          const fullText = asrResult.text;
          const asrSegments = asrResult.segments;

          console.log('[upload-media] ASR complete, text length:', fullText.length, 'segments:', asrSegments.length);

          // 7d. 清洗 transcript（减少重复、口头禅、碎片）
          const rawFullText = fullText;
          let cleanedFullText;
          let cleanedSegments;
          try {
            cleanedFullText = cleanTranscriptText(fullText);
            const rawSegments = asrSegments.map((s, i) => ({
              text: s.text,
              timestampMs: s.beginTime || i * 3000,
              beginTime: s.beginTime,
              endTime: s.endTime,
            }));
            cleanedSegments = cleanTranscriptSegments(rawSegments);
            console.log('[upload-media] transcript cleaned:', rawFullText.length, '→', cleanedFullText.length,
              'segments:', rawSegments.length, '→', cleanedSegments.length);
          } catch (cleanErr) {
            console.warn('[upload-media] transcript cleaning failed, using raw:', cleanErr.message);
            cleanedFullText = fullText;
            cleanedSegments = asrSegments.map((s, i) => ({
              text: s.text,
              timestampMs: s.beginTime || i * 3000,
              beginTime: s.beginTime,
              endTime: s.endTime,
            }));
          }

          // 7d-2. 保存 transcript（原始 + 清洗后）
          const segmentsJson = JSON.stringify(cleanedSegments);

          await prisma.transcript.upsert({
            where: { sessionId },
            update: { fullText: cleanedFullText, segments: segmentsJson },
            create: { sessionId, fullText: cleanedFullText, segments: segmentsJson },
          });

          // 7e. transcript 为空 → 标记失败（用清洗后文本判断）
          if (!cleanedFullText || !cleanedFullText.trim()) {
            console.warn('[upload-media] transcript empty');
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: 'TRANSCRIPT_EMPTY' },
            });
            return;
          }

          if (cleanedFullText.length < 20) {
            console.warn('[upload-media] transcript too short:', cleanedFullText.length);
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: 'TRANSCRIPT_TOO_SHORT' },
            });
            return;
          }

          // 7f. 获取标记
          const markers = await prisma.marker.findMany({
            where: { sessionId },
            orderBy: { timestampMs: 'asc' },
          });

          // 7g. DeepSeek 总结
          console.log('[upload-media] calling DeepSeek...');
          if (!isDeepSeekConfigured()) {
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: 'DEEPSEEK_NOT_CONFIGURED' },
            });
            return;
          }

          const aiResult = await generateSummaryWithRetry(sessionId, cleanedFullText, markers, courseName);
          console.log('[upload-media] DeepSeek success, content length:', (aiResult.content || '').length);

          // 7h. 保存 summary（完整结构化数据）
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
            where: { sessionId },
            update: { content: aiResult.content || '', keyPoints: JSON.stringify(summaryData) },
            create: { sessionId, content: aiResult.content || '', keyPoints: JSON.stringify(summaryData) },
          });

          // 7i. 完成
          await prisma.session.update({
            where: { id: sessionId },
            data: { status: 'done', durationMs: 0 },
          });
          console.log('[upload-media] done ✓', sessionId.substring(0, 8));

        } catch (err) {
          console.error('[upload-media] processing failed:', err.message);
          const errorCode = err.message?.includes('ASR') ? 'ASR_PROCESS_FAILED'
            : err.message?.includes('DEEPSEEK') ? 'DEEPSEEK_PROCESS_FAILED'
            : err.message?.includes('FFMPEG') ? 'FFMPEG_NOT_AVAILABLE'
            : 'UPLOAD_MEDIA_FAILED';
          try {
            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'failed', error: errorCode },
            });
          } catch (e) {
            console.error('[upload-media] failed to update status:', e.message);
          }
        } finally {
          // 清理临时文件
          for (const f of tempFiles) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
          }
        }
      });

    } catch (err) {
      console.error('[upload-media] unexpected error:', err.message);
      return reply.status(500).send({
        ok: false, error: 'UPLOAD_MEDIA_FAILED', message: '上传解析失败，请稍后重试',
      });
    }
  });
};
