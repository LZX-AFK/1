// server.js
require('dotenv').config();
const fastify = require('fastify')({
  logger: true,
  bodyLimit: 104857600, // 100MB
});

const path = require('path');
const os = require('os');
const fs = require('fs');

// 确保 audio 目录存在
const audioDir = path.join(process.env.TEMP_DIR || os.tmpdir(), 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// 插件注册
fastify.register(require('@fastify/cors'), { origin: '*' });
fastify.register(require('@fastify/multipart'), {
  limits: { fileSize: 104857600 },
});
fastify.register(require('@fastify/websocket'));
fastify.register(require('@fastify/helmet'), { global: true });

// 本地音频文件静态服务
fastify.register(require('@fastify/static'), {
  root: audioDir,
  prefix: '/audio/',
  decorateReply: false,
});

// 测试页面静态服务
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fastify.register(require('@fastify/static'), {
  root: publicDir,
  prefix: '/',
  decorateReply: false,
});

// 全局统一响应格式
fastify.decorateReply('success', function(data, message = '成功') {
  this.send({ code: 200, data, message });
});
fastify.decorateReply('error', function(code, message, statusCode = 400) {
  this.status(statusCode).send({ code, data: null, message: message || '服务器内部错误' });
});

// 全局错误捕获
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.error(500, error.message || '服务器内部错误', 500);
});

// 健康检查
fastify.get('/health', async (request, reply) => {
  reply.success({ status: 'ok' });
});

// 注册路由
fastify.register(require('./routes/sessions'), { prefix: '/api' });
fastify.register(require('./routes/markers'), { prefix: '/api' });
fastify.register(require('./routes/ws'));
fastify.register(require('./routes/summary'), { prefix: '/api' });

// 启动服务
const start = async () => {
  try {
    const { cleanupTempFiles } = require('./services/audioFile');
    await cleanupTempFiles();
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    fastify.log.info(`服务器运行在 ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// 优雅关闭
const gracefulShutdown = async (signal) => {
  fastify.log.info(`${signal} 收到，开始优雅关闭...`);
  await fastify.close();
  const prisma = require('./utils/prisma');
  await prisma.$disconnect();
  const { cleanupTempFiles } = require('./services/audioFile');
  await cleanupTempFiles();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
