export async function healthRoutes(app) {
  app.get('/health', async () => {
    return {
      ok: true,
      service: 'oleap-fastify-demo',
      time: new Date().toISOString()
    }
  })
}
