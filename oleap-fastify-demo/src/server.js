import { buildApp } from './app.js'
import { config } from './config.js'

const app = await buildApp()

try {
  await app.listen({
    host: config.host,
    port: config.port
  })

  app.log.info(`Classroom API: http://localhost:${config.port}`)
  app.log.info(`Phone API base: http://<computer-lan-ip>:${config.port}`)
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
