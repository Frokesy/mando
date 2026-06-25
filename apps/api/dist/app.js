import cors from '@fastify/cors';
import Fastify from 'fastify';
export function buildApp(options = {}) {
    const app = Fastify({
        logger: options.logger ?? true,
    });
    app.register(cors, {
        origin: options.webOrigin ?? 'http://localhost:3000',
        credentials: true,
    });
    app.get('/health', async () => {
        return {
            status: 'ok',
            service: 'mando-api',
            timestamp: new Date().toISOString(),
        };
    });
    app.get('/', async () => {
        return {
            name: 'Mando API',
            status: 'running',
        };
    });
    return app;
}
