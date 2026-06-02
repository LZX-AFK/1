import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function numberEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const config = {
  rootDir,
  host: process.env.HOST || '0.0.0.0',
  port: numberEnv('PORT', 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000',
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || 'uploads/audio'),
  maxFileSizeBytes: numberEnv('MAX_FILE_SIZE_MB', 80) * 1024 * 1024,
  recordsFile: path.resolve(rootDir, 'data/records.json')
}
