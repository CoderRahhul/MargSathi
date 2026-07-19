import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';

// Routes
import navigationRoutes from './routes/navigation/index.js';

export async function buildApp() {
    const app = Fastify({ logger: true });

    // Global Plugins
    await app.register(cors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
    });

    await app.register(rateLimitPlugin);

    // Public Routes
    app.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    app.get('/check-route', async () => {
        return {
            status: 'ok',
            message: 'MargSathi backend is running 🚀'
        };
    });

    // Protected Routes
    await app.register(async function (protectedRoutes) {
        await protectedRoutes.register(authPlugin);
        await protectedRoutes.register(navigationRoutes, {
            prefix: '/api/v1/navigation'
        });
    });

    return app;
}
