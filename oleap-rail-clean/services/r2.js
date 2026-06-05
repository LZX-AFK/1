// services/r2.js
// 支持两种模式：
// 1. Cloudflare R2（配置了 R2_ENDPOINT / R2_ACCESS_KEY / R2_SECRET_KEY）
// 2. 本地存储（未配置 R2 时自动降级，文件保存在 TEMP_DIR/audio/）

const fs = require('fs').promises;
const path = require('path');

// 检查是否配置了 R2
function isR2Configured() {
  return !!(process.env.R2_ENDPOINT && 
            process.env.R2_ACCESS_KEY && 
            process.env.R2_SECRET_KEY && 
            process.env.R2_BUCKET &&
            process.env.R2_ENDPOINT !== 'https://your-account.r2.cloudflarestorage.com' &&
            process.env.R2_ACCESS_KEY !== 'your_r2_access_key' &&
            process.env.R2_SECRET_KEY !== 'your_r2_secret_key');
}

let r2Client = null;

// 延迟初始化 R2 客户端（只在需要时加载）
async function getR2Client() {
  if (r2Client) return r2Client;
  const { S3Client } = require('@aws-sdk/client-s3');
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY,
    },
  });
  return r2Client;
}

async function uploadToR2Local(buffer, key) {
  const tempDir = process.env.TEMP_DIR || require('os').tmpdir();
  const audioDir = path.join(tempDir, 'audio');
  await fs.mkdir(audioDir, { recursive: true });
  
  const filePath = path.join(audioDir, path.basename(key));
  await fs.writeFile(filePath, buffer);
  
  // 返回本地可访问的 URL（通过 Fastify 静态服务）
  const localUrl = `/audio/${path.basename(key)}`;
  console.log(`[R2] 本地模式 - 文件已保存: ${filePath}`);
  return localUrl;
}

async function uploadToR2Cloud(buffer, key, contentType) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = await getR2Client();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await client.send(command);
  const publicUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;
  console.log(`[R2] 云模式 - 已上传: ${publicUrl}`);
  return publicUrl;
}

async function uploadToR2(buffer, key, contentType) {
  if (isR2Configured()) {
    return uploadToR2Cloud(buffer, key, contentType);
  } else {
    return uploadToR2Local(buffer, key);
  }
}

module.exports = { uploadToR2 };
