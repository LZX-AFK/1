/**
 * DashScope 文件转写服务
 * 使用 paraformer-v2 批量转写 API，支持音频文件直接上传
 * 与实时流式 ASR (dashscope-asr.js) 不同，这个用于文件上传场景
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const API_KEY = process.env.DASHSCOPE_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * 提交文件转写任务
 * @param {string} fileUrl - 音频文件的可访问 URL（需要 DashScope 能访问到）
 * @param {object} options
 * @returns {Promise<string>} taskId
 */
async function submitTranscription(fileUrl, options = {}) {
  const res = await fetch(`${BASE_URL}/services/audio/asr/transcription`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'paraformer-v2',
      input: {
        file_urls: [fileUrl],
      },
      parameters: {
        language_hints: options.languageHints || ['en', 'zh'],
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`DashScope submit failed ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const taskId = data.output?.task_id;
  if (!taskId) {
    throw new Error('DashScope submit: no task_id returned');
  }
  console.log('[DashScope-File] task submitted:', taskId.substring(0, 8));
  return taskId;
}

/**
 * 查询转写任务结果
 * @param {string} taskId
 * @returns {Promise<{status: string, text?: string, segments?: Array}>}
 */
async function queryTranscription(taskId) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`DashScope query failed ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const output = data.output || {};
  const taskStatus = output.task_status;

  if (taskStatus === 'SUCCEEDED') {
    // 解析转写结果
    const results = output.results || [];
    const segments = [];
    let fullText = '';

    for (const result of results) {
      const transcriptUrl = result.transcription_url;
      if (transcriptUrl) {
        try {
          const transcriptRes = await fetch(transcriptUrl);
          const transcriptData = await transcriptRes.json();
          const transcripts = transcriptData.transcripts || [];
          for (const t of transcripts) {
            if (t.text) {
              fullText += (fullText ? ' ' : '') + t.text;
            }
            // 提取 sentences
            if (t.sentences) {
              for (const s of t.sentences) {
                segments.push({
                  text: s.text || '',
                  beginTime: s.begin_time || 0,
                  endTime: s.end_time || 0,
                });
              }
            }
          }
        } catch (e) {
          console.warn('[DashScope-File] transcript fetch error:', e.message);
        }
      }
    }

    return { status: 'SUCCEEDED', text: fullText, segments };
  }

  if (taskStatus === 'FAILED') {
    const errMsg = output.message || 'transcription failed';
    throw new Error(`DashScope transcription failed: ${errMsg}`);
  }

  // PENDING / RUNNING
  return { status: taskStatus };
}

/**
 * 使用流式 ASR 处理本地音频文件（方案 B：分块推送给实时 ASR）
 * 适用于 DashScope 文件 API 不可达或需要实时结果的场景
 *
 * @param {string} filePath - 本地 PCM 16kHz 文件路径
 * @param {object} options
 * @returns {Promise<{text: string, segments: Array}>}
 */
function streamFileToAsr(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    const { createLiveStream } = require('./dashscope-asr');
    const stream = createLiveStream();

    let fullText = '';
    const segments = [];
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('ASR_STREAM_TIMEOUT'));
      }
    }, options.timeoutMs || 120000);

    stream.on('open', () => {
      console.log('[DashScope-File] streaming ASR ready, reading file...');
      // 读取 PCM 文件并分块发送
      const CHUNK_SIZE = 3200; // 100ms at 16kHz 16bit mono = 16000 * 2 * 0.1 = 3200 bytes
      const readStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

      readStream.on('data', (chunk) => {
        stream.send(chunk);
      });

      readStream.on('end', () => {
        console.log('[DashScope-File] file read complete, finishing ASR...');
        stream.finish();
      });

      readStream.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    stream.on('transcript', (data) => {
      const { text, isFinal, beginTime, endTime } = data;
      if (!text || !text.trim()) return;

      // Phase 7-F: 只收集 final segments，跳过 partial 中间结果
      if (isFinal) {
        segments.push({ text, beginTime: beginTime || 0, endTime: endTime || 0 });
        fullText += (fullText ? ' ' : '') + text;
        console.log('[DashScope-File] segment:', text.slice(0, 60));
      }
    });

    stream.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    stream.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log('[DashScope-File] ASR complete, text length:', fullText.length, 'segments:', segments.length);
        resolve({ text: fullText, segments });
      }
    });
  });
}

module.exports = { submitTranscription, queryTranscription, streamFileToAsr };
