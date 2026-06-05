// services/deepgram.js
const { Deepgram } = require('@deepgram/sdk');

let deepgramClient = null;

function getDeepgramClient() {
  if (!deepgramClient) {
    deepgramClient = new Deepgram(process.env.DEEPGRAM_API_KEY);
  }
  return deepgramClient;
}

function createLiveStream() {
  const dgClient = getDeepgramClient();
  const connection = dgClient.transcription.live({
    model: 'nova-2',
    language: 'zh-CN',
    punctuate: true,
    interim_results: true,
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
  });
  return connection;
}

module.exports = { createLiveStream };
