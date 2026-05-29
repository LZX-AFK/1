import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { processAudioTask } from '../services/mock-ai.js'
import { addRecord } from '../storage/record-store.js'

const SAFE_EXTENSION_PATTERN = /^\.[a-zA-Z0-9]+$/

function safeExtension(filename, mimetype) {
  const ext = path.extname(filename || '').toLowerCase()
  if (SAFE_EXTENSION_PATTERN.test(ext)) {
    return ext
  }
  if (`${mimetype}`.includes('mpeg')) return '.mp3'
  if (`${mimetype}`.includes('wav')) return '.wav'
  return '.bin'
}

function publicUploadUrl(fileName) {
  const base = config.publicBaseUrl.replace(/\/$/, '')
  return `${base}/uploads/audio/${encodeURIComponent(fileName)}`
}

export async function audioRoutes(app) {
  app.post('/upload', async (request, reply) => {
    const part = await request.file()

    if (!part) {
      return reply.code(400).send({
        ok: false,
        error: 'audio_file_missing',
        message: '请使用字段名 audio 上传文件'
      })
    }

    const fields = {}
    for (const [key, value] of Object.entries(part.fields || {})) {
      fields[key] = value?.value ?? value
    }

    const extension = safeExtension(part.filename, part.mimetype)
    const storedFileName = `${Date.now()}-${randomUUID()}${extension}`
    const storedPath = path.join(config.uploadDir, storedFileName)

    await pipeline(part.file, fs.createWriteStream(storedPath))

    const stat = await fs.promises.stat(storedPath)
    const uploadedFile = {
      originalName: part.filename,
      fileName: storedFileName,
      mimetype: part.mimetype,
      size: stat.size,
      path: storedPath,
      url: publicUploadUrl(storedFileName)
    }

    const result = processAudioTask({
      topic: fields.topic,
      scene: fields.scene,
      filePath: storedPath,
      fileName: storedFileName,
      uploadedUrl: uploadedFile.url
    })

    const record = await addRecord({
      topic: result.topic,
      scene: fields.scene || result.transcript.scene,
      filePath: storedPath,
      uploadedFile,
      result
    })

    return {
      ok: true,
      data: {
        uploadedFile,
        result: {
          ...result,
          recordId: record.id
        }
      }
    }
  })
}
