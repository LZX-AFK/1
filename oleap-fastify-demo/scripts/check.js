import { buildApp } from '../src/app.js'

const app = await buildApp({
  logger: false
})

const health = await app.inject({
  method: 'GET',
  url: '/health'
})

if (health.statusCode !== 200) {
  throw new Error(`GET /health failed: ${health.statusCode}`)
}

const ai = await app.inject({
  method: 'POST',
  url: '/api/ai/process',
  payload: {
    topic: '语音知识库系统',
    filePath: '/mock/audio.wav'
  }
})

if (ai.statusCode !== 200) {
  throw new Error(`POST /api/ai/process failed: ${ai.statusCode}`)
}

const body = JSON.parse(ai.body)
if (!body.ok || !body.data?.summary || !body.data?.recordId) {
  throw new Error('POST /api/ai/process returned invalid body')
}

const records = await app.inject({
  method: 'GET',
  url: '/api/records'
})

if (records.statusCode !== 200) {
  throw new Error(`GET /api/records failed: ${records.statusCode}`)
}

await app.inject({
  method: 'DELETE',
  url: '/api/records'
})

await app.close()
console.log('oleap-fastify-demo check passed')
