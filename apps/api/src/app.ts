import cors from '@fastify/cors'
import Fastify from 'fastify'

import { authRoutes } from './routes/auth.js'

type BuildAppOptions = {
  logger?: boolean
  webOrigin?: string
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  })

  app.register(cors, {
    origin: options.webOrigin ?? 'http://localhost:3000',
    credentials: true,
  })

  app.register(authRoutes, { prefix: '/auth' })

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'mando-api',
      timestamp: new Date().toISOString(),
    }
  })

  app.get('/', async () => {
    return {
      name: 'Mando API',
      status: 'running',
    }
  })

  return app
}
