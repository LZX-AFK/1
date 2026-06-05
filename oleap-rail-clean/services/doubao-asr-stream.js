/**
 * 豆包/火山引擎 流式 ASR 服务
 * WebSocket 实时语音识别
 *
 * 环境变量：
 *   DOUBAO_ASR_API_KEY   - 火山引擎 API Key (Access Token)
 *   DOUBAO_ASR_APP_ID    - 应用 ID
 *   DOUBAO_ASR_CLUSTER   - 集群标识 (如: volc.bigasr.sauc)
 *   DOUBAO_ASR_WS_URL    - WebSocket 地址 (默认 wss://openspeech.bytedance.com/api/v2/asr)
 *   DOUBAO_ASR_SAMPLE_RATE - 采样率 (默认 16000)
 */

const WebSocket = require('ws');
const { randomUUID } = require('crypto');

const API_KEY = process.env.DOUBAO_ASR_API_KEY;
const APP_ID = process.env.DOUBAO_ASR_APP_ID;
const CLUSTER = process.env.DOUBAO_ASR_CLUSTER || 'volc.bigasr.sauc';
const WS_URL = process.env.DOUBAO_ASR_WS_URL || 'wss://openspeech.bytedance.com/api/v2/asr';
const SAMPLE_RATE = parseInt(process.env.DOUBAO_ASR_SAMPLE_RATE || '16000', 10);

function isDoubaoConfigured() {
  return !!(API_KEY && APP_ID);
}

/**
 * 创建豆包 ASR 流式识别会话
 * @returns {object} { send(pcm), finish(), on(event, cb) }
 */
function createDoubaoStream() {
  if (!isDoubaoConfigured()) {
    throw new Error('DOUBAO_NOT_CONFIGURED');
  }

  const taskId = randomUUID();
  let ws = null;
  let started = false;
  let finished = false;
  const callbacks = { transcript: null, error: null, close: null, open: null };

  // 构建连接 URL（带鉴权参数）
  const connectUrl = `${WS_URL}?appId=${encodeURIComponent(APP_ID)}&access_token=${encodeURIComponent(API_KEY)}&cluster=${encodeURIComponent(CLUSTER)}`;

  function connect() {
    try {
      ws = new WebSocket(connectUrl);
    } catch (err) {
      if (callbacks.error) callbacks.error(new Error(`ASR_CONNECT_FAILED: ${err.message}`));
      return;
    }

    ws.on('open', () => {
      // 发送开始请求
      const startReq = {
        header: {
          event: 'StartTask',
          event_no: 1,
          task_id: taskId,
          stream_id: randomUUID().replace(/-/g, ''),
          codec: 'raw',
        },
        payload: {
          user: { uid: 'classnote-user' },
          audio: {
            format: 'pcm',
            rate: SAMPLE_RATE,
            bits: 16,
            channel: 1,
            language: 'en-US',
          },
          add_params: {
            // 启用标点和智能分句
            show_utterances: true,
          },
        },
      };
      ws.send(JSON.stringify(startReq));
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const event = msg.header?.event;
        const eventNo = msg.header?.event_no;

        if (event === 'TaskStarted' || event === 100) {
          started = true;
          console.log('[DoubaoASR] 任务已启动');
          if (callbacks.open) callbacks.open();
        } else if (event === 'ResultChanged' || event === 200) {
          // 中间结果
          const utterance = msg.payload?.result?.utterances?.[0];
          if (utterance) {
            const text = utterance.text || '';
            if (text.trim()) {
              callbacks.transcript?.({
                text,
                isFinal: false,
                beginTime: utterance.start_time || 0,
                endTime: utterance.end_time || 0,
              });
            }
          }
        } else if (event === 'UtteranceEnd' || event === 300) {
          // 最终结果
          const utterance = msg.payload?.result?.utterances?.[0];
          if (utterance) {
            const text = utterance.text || '';
            if (text.trim()) {
              callbacks.transcript?.({
                text,
                isFinal: true,
                beginTime: utterance.start_time || 0,
                endTime: utterance.end_time || 0,
              });
            }
          }
        } else if (event === 'TaskFailed' || event === 999) {
          const errMsg = msg.header?.message || '豆包 ASR 任务失败';
          console.error('[DoubaoASR] 任务失败:', errMsg);
          callbacks.error?.(new Error(`ASR_TASK_FAILED: ${errMsg}`));
        } else if (event === 'TaskFinished' || event === 400) {
          finished = true;
          callbacks.close?.(1000);
        }
      } catch (e) {
        // 二进制帧忽略
      }
    });

    ws.on('error', (err) => {
      console.error('[DoubaoASR] WebSocket 错误:', err.message);
      callbacks.error?.(new Error(`ASR_CONNECT_FAILED: ${err.message}`));
    });

    ws.on('close', (code) => {
      console.log('[DoubaoASR] WebSocket 关闭, code:', code);
      if (!finished) callbacks.close?.(code);
    });
  }

  connect();

  return {
    on(event, cb) {
      callbacks[event] = cb;
      return this;
    },

    send(pcmBuffer) {
      if (ws && ws.readyState === WebSocket.OPEN && started && !finished) {
        // 发送二进制音频帧
        ws.send(pcmBuffer);
      }
    },

    finish() {
      if (ws && ws.readyState === WebSocket.OPEN && started && !finished) {
        const finishReq = {
          header: {
            event: 'StopTask',
            event_no: 2,
            task_id: taskId,
            stream_id: '',
          },
          payload: {},
        };
        ws.send(JSON.stringify(finishReq));
      }
    },

    isReady() {
      return started && !finished;
    },
  };
}

module.exports = { createDoubaoStream, isDoubaoConfigured };
