import cors from '@fastify/cors';
import Fastify from 'fastify';
import { authRoutes } from './routes/auth.js';
import { customerRoutes } from './routes/customer.js';
const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
];
export function buildApp(options = {}) {
    const app = Fastify({
        logger: options.logger ?? true,
    });
    const allowedOrigins = getAllowedOrigins(options.webOrigin);
    app.register(cors, {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`Origin ${origin} is not allowed by CORS.`), false);
        },
        credentials: true,
    });
    app.register(authRoutes, { prefix: '/auth' });
    app.register(customerRoutes, { prefix: '/customer' });
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
function getAllowedOrigins(webOrigin) {
    if (!webOrigin)
        return defaultAllowedOrigins;
    const configuredOrigins = webOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    return Array.from(new Set([...configuredOrigins, ...defaultAllowedOrigins]));
}
