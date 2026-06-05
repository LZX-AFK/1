// services/audioFile.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { uploadToR2 } = require('./r2');

const TEMP_DIR = process.env.TEMP_DIR || os.tmpdir();
const SAMPLE_RATE = 16000;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

// 添加 WAV 头
function addWavHeader(pcmBuffer, sampleRate, bitsPerSample, channels) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(headerSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return Buffer.concat([buffer, pcmBuffer]);
}

// 写入 PCM 帧
async function savePcmFrame(sessionId, pcmBuffer) {
  const filePath = path.join(TEMP_DIR, 'rec_' + sessionId + '.pcm');
  await fs.appendFile(filePath, pcmBuffer);
}

// 等待文件就绪（解决 Windows EBUSY）
async function waitForFileReady(filePath, maxRetries = 3, intervalMs = 100) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      const fd = await fs.open(filePath, 'r');
      await fd.close();
      return true;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

// 结束并上传（空文件防御）
async function finalizeAndUpload(sessionId) {
  const pcmPath = path.join(TEMP_DIR, 'rec_' + sessionId + '.pcm');
  try {
    await fs.access(pcmPath);
  } catch {
    console.warn(`[Audio] 未找到录音文件: ${pcmPath}，视为无录音数据`);
    return null;
  }
  await waitForFileReady(pcmPath);
  const pcmBuffer = await fs.readFile(pcmPath);
  const wavBuffer = addWavHeader(pcmBuffer, SAMPLE_RATE, BITS_PER_SAMPLE, CHANNELS);
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const key = `audio/${timestamp}_${sessionId}_${uniqueId}.wav`;
  const audioUrl = await uploadToR2(wavBuffer, key, 'audio/wav');
  await fs.unlink(pcmPath).catch(() => {});
  return audioUrl;
}

// 清理所有临时文件
async function cleanupTempFiles() {
  const files = await fs.readdir(TEMP_DIR);
  for (const file of files) {
    if (file.startsWith('rec_') && file.endsWith('.pcm')) {
      await fs.unlink(path.join(TEMP_DIR, file)).catch(() => {});
    }
  }
}

module.exports = {
  savePcmFrame,
  finalizeAndUpload,
  cleanupTempFiles,
};
