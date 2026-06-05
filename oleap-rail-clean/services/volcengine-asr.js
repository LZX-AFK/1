/**
 * 火山引擎 ASR 服务 — 标准版 submit + query 轮询
 * 用于课堂近实时字幕：每5秒截取 PCM 片段 → WAV → base64 → submit → query → 返回文本
 */

const { randomUUID } = require('crypto');

const API_KEY = process.env.VOLCENGINE_API_KEY;
const RESOURCE_ID = process.env.VOLCENGINE_RESOURCE_ID || 'volc.seedasr.auc';
const SUBMIT_URL = process.env.VOLCENGINE_ASR_SUBMIT_URL || 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit';
const QUERY_URL = process.env.VOLCENGINE_ASR_QUERY_URL || 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query';
const POLL_INTERVAL = parseInt(process.env.VOLCENGINE_ASR_POLL_INTERVAL_MS || '1500', 10);
const TIMEOUT = parseInt(process.env.VOLCENGINE_ASR_TIMEOUT_MS || '30000', 10);

/**
 * 将 Int16 PCM 数据转换为 WAV 格式 Buffer
 * @param {Buffer} pcmBuffer - Int16 小端 PCM 数据
 * @param {number} sampleRate - 采样率 (默认 16000)
 * @returns {Buffer} WAV 格式 Buffer
 */
function pcmToWav(pcmBuffer, sampleRate = 16000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const wav = Buffer.alloc(totalSize);

  // RIFF header
  wav.write('RIFF', 0);
  wav.writeUInt32LE(totalSize - 8, 4);
  wav.write('WAVE', 8);

  // fmt chunk
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);        // chunk size
  wav.writeUInt16LE(1, 20);          // PCM format
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wav, 44);

  return wav;
}

/**
 * 提交音频到火山引擎 ASR
 * @param {Buffer} wavBuffer - WAV 格式音频
 * @returns {Promise<{requestId: string}>}
 */
async function submit(wavBuffer) {
  const requestId = randomUUID();
  const audioBase64 = wavBuffer.toString('base64');

  const res = await fetch(SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
      'X-Api-Request-Id': requestId,
      'X-Api-Resource-Id': RESOURCE_ID,
      'X-Api-Version': '3.0',
    },
    body: JSON.stringify({
      audio: { format: 'wav', data: audioBase64 },
    }),
  });

  // submit 正常返回 body 为空 {}，通过请求头判断状态
  const statusCode = Number(res.headers.get('x-api-status-code'));
  const statusMessage = res.headers.get('x-api-message') || '';

  if (statusCode && statusCode !== 20000000 && statusCode !== 20000001) {
    throw new Error(`火山引擎 submit 失败: ${statusCode} ${statusMessage}`);
  }

  return { requestId };
}

/**
 * 轮询查询 ASR 结果
 * @param {string} requestId - submit 返回的 requestId
 * @returns {Promise<{text: string, sentences: Array, duration: number}>}
 */
async function query(requestId) {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT) {
    const res = await fetch(QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
        'X-Api-Request-Id': requestId,
        'X-Api-Resource-Id': RESOURCE_ID,
        'X-Api-Version': '3.0',
      },
      body: '{}',
    });

    const statusCode = Number(res.headers.get('x-api-status-code'));
    const statusMessage = res.headers.get('x-api-message') || '';

    if (statusCode === 20000000) {
      // 完成
      const body = await res.json();
      return {
        text: body.result?.text || '',
        sentences: (body.result?.utterances || []).map(u => ({
          text: u.text,
          startTime: u.start_time,
          endTime: u.end_time,
          confidence: u.confidence,
        })),
        duration: body.audio_info?.duration || 0,
      };
    } else if (statusCode === 20000001) {
      // 处理中，继续轮询
      await sleep(POLL_INTERVAL);
    } else {
      throw new Error(`火山引擎 query 失败: ${statusCode} ${statusMessage}`);
    }
  }

  throw new Error(`火山引擎 ASR 超时 (${TIMEOUT}ms)`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 一键识别：PCM → WAV → submit → query → 返回文本
 * @param {Buffer} pcmBuffer - Int16 小端 PCM 数据
 * @returns {Promise<{text: string}>}
 */
async function recognize(pcmBuffer) {
  const wav = pcmToWav(pcmBuffer);
  const { requestId } = await submit(wav);
  const result = await query(requestId);
  return result;
}

module.exports = { recognize, pcmToWav };
