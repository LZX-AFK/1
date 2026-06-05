/**
 * DashScope Fun-ASR 实时流式语音识别服务
 * 通过 WebSocket 双向流式接入，支持逐字实时返回
 *
 * 流程：WebSocket 连接 → run-task → 持续发送 PCM → 收 result-generated → finish-task
 */

const WebSocket = require('ws');
const { randomUUID } = require('crypto');

const API_KEY = process.env.DASHSCOPE_API_KEY;
const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

/**
 * 创建一个实时语音识别流
 * @returns {object} { send(pcm), finish(), onTranscript(cb), onError(cb), onClose(cb) }
 */
function createLiveStream() {
  const taskId = randomUUID();
  let ws = null;
  let started = false;
  let finished = false;
  const callbacks = { transcript: null, error: null, close: null, open: null };

  function connect() {
    ws = new WebSocket(WS_URL, {
      headers: { 'Authorization': 'Bearer ' + API_KEY },
    });

    ws.on('open', () => {
      console.log('[DashScope] WebSocket 已连接');

      // 发送 run-task
      const runTask = JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: {
          task_group: 'audio',
          task: 'asr',
          function: 'recognition',
          model: 'fun-asr-realtime',
          parameters: {
            format: 'pcm',
            sample_rate: 16000,
            language_hints: ['zh'],
          },
          input: {},
        },
      });
      ws.send(runTask);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const event = msg.header?.event;

        if (event === 'task-started') {
          started = true;
          console.log('[DashScope] 任务已启动');
          if (callbacks.open) callbacks.open();
        } else if (event === 'result-generated') {
          const sentence = msg.payload?.output?.sentence;
          if (!sentence || sentence.heartbeat) return;
          const text = sentence.text || '';
          const isFinal = sentence.sentence_end === true;
          if (!text.trim() && !isFinal) return;
          if (callbacks.transcript) {
            callbacks.transcript({
              text,
              isFinal,
              beginTime: sentence.begin_time,
              endTime: sentence.end_time,
              sentenceId: sentence.sentence_id,
              words: sentence.words || [],
            });
          }
        } else if (event === 'task-failed') {
          const errMsg = msg.header?.error_message || '未知错误';
          console.error('[DashScope] 任务失败:', errMsg);
          if (callbacks.error) callbacks.error(new Error(errMsg));
        } else if (event === 'task-finished') {
          console.log('[DashScope] 任务完成');
          finished = true;
          if (callbacks.close) callbacks.close(1000);
        }
      } catch (e) {
        // 二进制数据忽略
      }
    });

    ws.on('error', (err) => {
      console.error('[DashScope] WebSocket 错误:', err.message);
      if (callbacks.error) callbacks.error(err);
    });

    ws.on('close', (code) => {
      console.log('[DashScope] WebSocket 关闭, code:', code);
      if (!finished && callbacks.close) callbacks.close(code);
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
        ws.send(pcmBuffer);
      }
    },

    finish() {
      if (ws && ws.readyState === WebSocket.OPEN && started && !finished) {
        const finishTask = JSON.stringify({
          header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
          payload: { input: {} },
        });
        ws.send(finishTask);
      }
    },
  };
}

module.exports = { createLiveStream };
