import { addRecord, clearRecords, getRecord, listRecords } from '../storage/record-store.js'

export async function recordRoutes(app) {
  app.get('/', async () => {
    return {
      ok: true,
      data: await listRecords()
    }
  })

  app.get('/:id', async (request, reply) => {
    const record = await getRecord(request.params.id)
    if (!record) {
      return reply.code(404).send({
        ok: false,
        error: 'record_not_found',
        message: '记录不存在'
      })
    }
    return {
      ok: true,
      data: record
    }
  })

  app.post('/', async (request) => {
    const record = await addRecord(request.body || {})
    return {
      ok: true,
      data: record
    }
  })

  app.delete('/', async () => {
    return {
      ok: true,
      data: await clearRecords()
    }
  })
}
