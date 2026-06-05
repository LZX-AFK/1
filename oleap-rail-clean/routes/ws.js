// routes/ws.js — WebSocket 实时音频转写路由
// 支持 ASR_PROVIDER=doubao | dashscope
//
// 协议：
// 前端 → 后端: { type: 'start' } | { type: 'stop' } | { type: 'ping' } | binary PCM 16kHz chunk
// 后端 → 前端: { type: 'ready', provider } | { type: 'transcript', text, isFinal, timestampMs }
//              | { type: 'error', error, message } | { type: 'done' } | { type: 'pong' }

const { createLiveStream, isDashScopeConfigured } = require('../services/dashscope-asr');
const { createDoubaoStream, isDoubaoConfigured } = require('../services/doubao-asr-stream');
const { savePcmFrame } = require('../services/audioFile');
const { cleanTranscriptText } = require('../services/transcript-cleaner');
const prisma = require('../utils/prisma');

const ASR_PROVIDER = process.env.ASR_PROVIDER || 'doubao';

/**
 * 创建 ASR 流（根据 provider 配置选择）
 */
function createAsrStream() {
  if (ASR_PROVIDER === 'doubao') {
    if (!isDoubaoConfigured()) {
      throw new Error('DOUBAO_NOT_CONFIGURED');
    }
    return createDoubaoStream();
  }
  if (ASR_PROVIDER === 'dashscope') {
    if (!isDashScopeConfigured()) {
      throw new Error('DASHSCOPE_NOT_CONFIGURED');
    }
    return createLiveStream();
  }
  throw new Error(`UNKNOWN_ASR_PROVIDER: ${ASR_PROVIDER}`);
}

// 背压写入器
class AudioWriter {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.isWriting = false;
    this.buffer = [];
    this.maxBufferSize = 1000;
    this.droppedCount = 0;
  }

  async write(pcmBuffer) {
    if (this.isWriting) {
      if (this.buffer.length >= this.maxBufferSize) {
        this.buffer.shift();
        this.droppedCount++;
        if (this.droppedCount % 100 === 0) {
          console.warn(`[ws] 丢弃音频帧: ${this.droppedCount}`);
        }
      }
      this.buffer.push(pcmBuffer);
      return;
    }
    this.isWriting = true;
    try {
      await savePcmFrame(this.sessionId, pcmBuffer);
    } finally {
      this.isWriting = false;
      if (this.buffer.length > 0) {
        const next = this.buffer.shift();
        this.write(next);
      }
    }
  }

  async flush(timeoutMs = 5000) {
    const start = Date.now();
    while (this.isWriting) {
      if (Date.now() - start > timeoutMs) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

module.exports = async function (fastify) {
  fastify.get('/ws/session/:id/audio', { websocket: true }, async (connection, req) => {
    const sessionId = req.params.id;
    let asrStream = null;
    let asrReady = false;
    let isStoppedByUser = false;
    let audioChunkCount = 0;
    let transcriptCount = 0;
    const writer = new AudioWriter(sessionId);

    console.log(`[ws] session audio connected: ${sessionId.substring(0, 8)}`);

    // 校验 session 存在
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.warn(`[ws] session not found: ${sessionId.substring(0, 8)}`);
      connection.send(JSON.stringify({ type: 'error', error: 'SESSION_NOT_FOUND', message: '课堂不存在' }));
      connection.close(1008, 'Session not found');
      return;
    }

    // startedAt 可能为 null（创建时未设置），用 createdAt 兜底
    const sessionStartTime = session.startedAt
      ? session.startedAt.getTime()
      : session.createdAt
        ? session.createdAt.getTime()
        : Date.now();

    if (!session.startedAt) {
      console.warn(`[ws] session has no startedAt, using createdAt or now`);
    }

    // 初始化 ASR 流
    try {
      console.log(`[ws] creating ASR stream, provider: ${ASR_PROVIDER}`);
      asrStream = createAsrStream();

      asrStream.on('open', () => {
        asrReady = true;
        console.log(`[ws] ASR provider ready (${ASR_PROVIDER})`);
        // 告知前端 ASR 已就绪，可以开始发送音频
        connection.send(JSON.stringify({ type: 'ready', provider: ASR_PROVIDER }));
      });

      asrStream.on('transcript', async (data) => {
        const { text, isFinal, beginTime, endTime } = data;
        if (!text || !text.trim()) return;

        transcriptCount++;
        const absoluteTimestampMs = sessionStartTime + (beginTime || 0);

        // 推送给前端
        connection.send(JSON.stringify({
          type: 'transcript',
          text: text,
          isFinal: isFinal,
          timestampMs: absoluteTimestampMs,
        }));

        // 最终结果存入数据库（清洗后）
        if (isFinal) {
          try {
            const cleanedText = cleanTranscriptText(text);
            if (!cleanedText || !cleanedText.trim()) return; // 清洗后为空则跳过
            const existing = await prisma.transcript.findUnique({ where: { sessionId } });
            const newSegment = { text: cleanedText, timestampMs: absoluteTimestampMs, beginTime, endTime };
            if (existing) {
              const existingSegments = typeof existing.segments === 'string'
                ? JSON.parse(existing.segments)
                : (existing.segments || []);
              const newSegments = [...existingSegments, newSegment];
              await prisma.transcript.update({
                where: { sessionId },
                data: {
                  segments: JSON.stringify(newSegments),
                  fullText: (existing.fullText || '') + ' ' + cleanedText,
                },
              });
            } else {
              await prisma.transcript.create({
                data: {
                  sessionId,
                  segments: JSON.stringify([newSegment]),
                  fullText: cleanedText,
                },
              });
            }
            console.log(`[ws] transcript saved, total segments: ${transcriptCount}`);
          } catch (err) {
            fastify.log.error(`存储转写片段失败: ${err.message}`);
          }
        }
      });

      asrStream.on('error', (err) => {
        const errMsg = err.message || '未知错误';
        console.error(`[ws] ASR error: ${errMsg}`);

        if (errMsg.includes('NOT_CONFIGURED')) {
          connection.send(JSON.stringify({
            type: 'error',
            error: errMsg.includes('DOUBAO') ? 'DOUBAO_NOT_CONFIGURED' : 'DASHSCOPE_NOT_CONFIGURED',
            message: `${ASR_PROVIDER} ASR 未配置，请检查后端环境变量`,
          }));
        } else if (!isStoppedByUser) {
          connection.send(JSON.stringify({
            type: 'error',
            error: 'ASR_CONNECT_FAILED',
            message: `语音识别服务错误: ${errMsg}`,
          }));
        }
      });

      asrStream.on('close', (code) => {
        console.log(`[ws] ASR stream closed, code: ${code}, chunks: ${audioChunkCount}, transcripts: ${transcriptCount}`);
      });
    } catch (err) {
      const errMsg = err.message || '';
      console.error(`[ws] ASR init failed: ${errMsg}`);
      if (errMsg.includes('NOT_CONFIGURED')) {
        connection.send(JSON.stringify({
          type: 'error',
          error: errMsg.includes('DOUBAO') ? 'DOUBAO_NOT_CONFIGURED' : 'DASHSCOPE_NOT_CONFIGURED',
          message: `${ASR_PROVIDER} ASR 未配置`,
        }));
        connection.close(1011, errMsg);
      } else {
        connection.close(1011, 'Internal server error');
      }
      return;
    }

    // 处理前端消息
    connection.on('message', async (rawMessage) => {
      // JSON 控制消息
      try {
        const msg = JSON.parse(rawMessage.toString());
        if (msg.type === 'start') {
          console.log(`[ws] start from client, session: ${sessionId.substring(0, 8)}`);
          return;
        }
        if (msg.type === 'stop') {
          isStoppedByUser = true;
          console.log(`[ws] stop from client, chunks: ${audioChunkCount}, transcripts: ${transcriptCount}`);
          if (asrStream) asrStream.finish();
          connection.send(JSON.stringify({ type: 'done' }));
          connection.close();
          return;
        }
        if (msg.type === 'ping') {
          connection.send(JSON.stringify({ type: 'pong' }));
          return;
        }
      } catch (e) {
        // 不是 JSON，继续当音频处理
      }

      // 二进制音频帧（PCM 16kHz 16bit mono）
      let pcmBuffer = null;
      if (Buffer.isBuffer(rawMessage)) {
        pcmBuffer = rawMessage;
      } else if (rawMessage instanceof ArrayBuffer) {
        pcmBuffer = Buffer.from(rawMessage);
      } else {
        return;
      }

      if (!pcmBuffer || pcmBuffer.length === 0) return;

      audioChunkCount++;
      if (audioChunkCount <= 5 || audioChunkCount % 40 === 0) {
        console.log(`[ws] audio chunk #${audioChunkCount}, ${pcmBuffer.length} bytes, asrReady: ${asrReady}`);
      }

      // 保存音频帧
      await writer.write(pcmBuffer);

      // 发送到 ASR
      if (asrStream && asrReady) {
        asrStream.send(pcmBuffer);
      }
    });

    connection.on('close', async (code, reason) => {
      console.log(`[ws] session audio closed: ${sessionId.substring(0, 8)}, chunks: ${audioChunkCount}, transcripts: ${transcriptCount}`);
      if (!isStoppedByUser && asrStream) {
        asrStream.finish();
      }
      await writer.flush();
    });
  });
};
