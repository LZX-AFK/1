import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { config } from '../config.js'

async function readRecordsFile() {
  try {
    const content = await fs.readFile(config.recordsFile, 'utf8')
    const records = JSON.parse(content)
    return Array.isArray(records) ? records : []
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

async function writeRecordsFile(records) {
  await fs.writeFile(config.recordsFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
}

export async function listRecords() {
  const records = await readRecordsFile()
  return records.sort((a, b) => `${b.createdAt}`.localeCompare(`${a.createdAt}`))
}

export async function getRecord(id) {
  const records = await readRecordsFile()
  return records.find((record) => record.id === id) || null
}

export async function addRecord(input) {
  const records = await readRecordsFile()
  const now = new Date().toISOString()
  const record = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    topic: input.topic || '未命名项目',
    scene: input.scene || 'classroom',
    filePath: input.filePath || '',
    uploadedFile: input.uploadedFile || null,
    result: input.result || null
  }
  records.push(record)
  await writeRecordsFile(records)
  return record
}

export async function clearRecords() {
  await writeRecordsFile([])
  return []
}
