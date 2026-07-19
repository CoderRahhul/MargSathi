import fp from 'fastify-plugin';
import { config } from '../config/env.js';

export default fp(async (fastify) => {

    fastify.addHook('preHandler', async (request, reply) => {

        // Allow health check without API key
        if (request.url === '/health') return;

        const apiKey = request.headers[config.apiKeyHeader];

        if (!apiKey || apiKey !== config.appApiKey) {
            reply.code(401).send({
                error: 'Invalid or Missing API Key'
            });
        }
    });
});
