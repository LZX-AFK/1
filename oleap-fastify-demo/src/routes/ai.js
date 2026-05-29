import { createMockTranscript, processAudioTask } from '../services/mock-ai.js'
import { addRecord } from '../storage/record-store.js'

export async function aiRoutes(app) {
  app.post('/transcript/mock', async (request) => {
    const body = request.body || {}
    const transcript = createMockTranscript(body)
    return {
      ok: true,
      data: transcript
    }
  })

  app.post('/ai/process', async (request) => {
    const body = request.body || {}
    const result = processAudioTask(body)
    const record = await addRecord({
      topic: result.topic,
      scene: body.scene || result.transcript.scene,
      filePath: body.filePath || '',
      result
    })

    return {
      ok: true,
      data: {
        ...result,
        recordId: record.id
      }
    }
  })
}
