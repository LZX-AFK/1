// routes/ws.js
const { createLiveStream } = require('../services/dashscope-asr');
const { savePcmFrame } = require('../services/audioFile');
const prisma = require('../utils/prisma');

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
          console.warn(`[${this.sessionId}] 丢弃音频帧: ${this.droppedCount}`);
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
      if (Date.now() - start > timeoutMs) {
        console.warn(`[${this.sessionId}] flush 超时，强制退出`);
        break;
      }
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
    const writer = new AudioWriter(sessionId);

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      connection.close(1008, 'Session not found');
      return;
    }
    if (!session.startedAt) {
      connection.close(1011, 'Session has no start time');
      return;
    }
    const sessionStartTime = session.startedAt.getTime();

    // 初始化 DashScope ASR 流
    try {
      asrStream = createLiveStream();

      asrStream.on('open', () => {
        asrReady = true;
        console.log(`[DashScope] 会话 ${sessionId.substring(0, 8)} 就绪`);
        connection.send(JSON.stringify({ type: 'ready' }));
      });

      asrStream.on('transcript', async (data) => {
        const { text, isFinal, beginTime, endTime } = data;
        if (!text || !text.trim()) return;

        const absoluteTimestampMs = sessionStartTime + (beginTime || 0);

        connection.send(JSON.stringify({
          type: 'transcript',
          text: text,
          isFinal: isFinal,
          timestampMs: absoluteTimestampMs,
        }));

        // 最终结果存入数据库
        if (isFinal) {
          try {
            const existing = await prisma.transcript.findUnique({ where: { sessionId } });
            const newSegment = { text, timestampMs: absoluteTimestampMs, beginTime, endTime };
            if (existing) {
              const existingSegments = typeof existing.segments === 'string'
                ? JSON.parse(existing.segments)
                : (existing.segments || []);
              const newSegments = [...existingSegments, newSegment];
              await prisma.transcript.update({
                where: { sessionId },
                data: { segments: JSON.stringify(newSegments) },
              });
            } else {
              await prisma.transcript.create({
                data: { sessionId, segments: JSON.stringify([newSegment]) },
              });
            }
          } catch (err) {
            fastify.log.error(`存储转写片段失败: ${err.message}`);
          }
        }
      });

      asrStream.on('error', (err) => {
        console.error(`[DashScope] 错误: ${err.message}`);
        if (!isStoppedByUser) {
          connection.send(JSON.stringify({ type: 'error', message: '语音识别服务暂时不可用' }));
        }
      });

      asrStream.on('close', (code) => {
        console.log(`[DashScope] 流关闭, code: ${code}`);
      });
    } catch (err) {
      fastify.log.error(`无法创建 ASR 流: ${err.message}`);
      connection.close(1011, 'Internal server error');
      return;
    }

    connection.on('message', async (rawMessage) => {
      // 用户主动停止
      try {
        const msg = JSON.parse(rawMessage.toString());
        if (msg.type === 'stop') {
          isStoppedByUser = true;
          if (asrStream) asrStream.finish();
          connection.close();
          return;
        }
      } catch (e) {}

      let pcmBuffer = null;

      // 二进制帧格式: 0x01 + 4字节大端时间戳 + PCM
      if (Buffer.isBuffer(rawMessage) && rawMessage.length >= 5 && rawMessage[0] === 0x01) {
        pcmBuffer = rawMessage.subarray(5);
      } else {
        try {
          const jsonMsg = JSON.parse(rawMessage.toString());
          if (jsonMsg.type === 'audio' && jsonMsg.data) {
            pcmBuffer = Buffer.from(jsonMsg.data, 'base64');
          }
        } catch (err) {
          return;
        }
      }
      if (!pcmBuffer || pcmBuffer.length === 0) return;

      await writer.write(pcmBuffer);

      // 发送到 DashScope
      if (asrStream && asrReady) {
        asrStream.send(pcmBuffer);
      }
    });

    connection.on('close', async (code, reason) => {
      fastify.log.info(`WebSocket 关闭: ${code} ${reason}`);
      if (!isStoppedByUser && asrStream) {
        asrStream.finish();
      }
      await writer.flush();
    });
  });
};
