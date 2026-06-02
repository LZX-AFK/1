import fs from 'node:fs/promises'
import path from 'node:path'
import fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { config } from './config.js'
import { healthRoutes } from './routes/health.js'
import { audioRoutes } from './routes/audio.js'
import { aiRoutes } from './routes/ai.js'
import { recordRoutes } from './routes/records.js'

export async function buildApp(options = {}) {
  await fs.mkdir(config.uploadDir, { recursive: true })
  await fs.mkdir(path.dirname(config.recordsFile), { recursive: true })

  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    },
    ...options
  })

  await app.register(cors, {
    origin: true
  })

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: config.maxFileSizeBytes
    }
  })

  await app.register(fastifyStatic, {
    root: config.uploadDir,
    prefix: '/uploads/audio/'
  })

  await app.register(healthRoutes)
  await app.register(audioRoutes, { prefix: '/api/audio' })
  await app.register(aiRoutes, { prefix: '/api' })
  await app.register(recordRoutes, { prefix: '/api/records' })

  app.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({
      ok: false,
      error: 'not_found',
      message: `Route ${request.method} ${request.url} not found`
    })
  })

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error)
    const statusCode = error.statusCode || 500
    return reply.code(statusCode).send({
      ok: false,
      error: error.code || 'internal_error',
      message: error.message || 'Internal Server Error'
    })
  })

  return app
}
