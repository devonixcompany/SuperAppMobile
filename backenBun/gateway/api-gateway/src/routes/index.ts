import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { ServiceRegistry } from '../services/service-registry.js';
import { createProxyMiddleware } from '../middleware/proxy.js';
import { Logger } from '../../../shared/utils/logger.js';
import { setupErrorHandler } from '../../../shared/middleware/error-handler.js';

const logger = new Logger('APIGateway');

export const createGateway = async () => {
  const serviceRegistry = new ServiceRegistry();
  const proxy = createProxyMiddleware(serviceRegistry);

  const app = new Elysia()
    .use(cors())
    .use(setupErrorHandler)
    .onRequest(({ request, set }) => {
      logger.info(`${request.method} ${request.url}`);
    })
    .get('/health', () => ({
      success: true,
      message: 'API Gateway is healthy',
      timestamp: new Date()
    }))
    .get('/services', async () => {
      const services = await serviceRegistry.getAllServices();
      return {
        success: true,
        data: { services },
        timestamp: new Date()
      };
    })
    .all('/api/users/*', async ({ request, params }) => {
      const path = request.url.split('/api/users')[1];
      return await proxy.proxy(request, 'user-service', path);
    })
    .all('/api/auth/*', async ({ request, params }) => {
      const path = request.url.split('/api/auth')[1];
      return await proxy.proxy(request, 'auth-service', path);
    })
    .all('/api/products/*', async ({ request, params }) => {
      const path = request.url.split('/api/products')[1];
      return await proxy.proxy(request, 'product-service', path);
    })
    .all('/api/orders/*', async ({ request, params }) => {
      const path = request.url.split('/api/orders')[1];
      return await proxy.proxy(request, 'order-service', path);
    })
    .all('*', ({ set }) => {
      set.status = 404;
      return {
        success: false,
        error: 'Route not found',
        timestamp: new Date()
      };
    });

  // Register services on startup
  try {
    await Promise.all([
      serviceRegistry.registerService({
        name: 'user-service',
        url: process.env.USER_SERVICE_URL || 'http://user-service',
        port: 3005,
        healthCheck: `${process.env.USER_SERVICE_URL || 'http://user-service:3005'}/health`,
        tags: ['user', 'authentication', 'core']
      }),
      serviceRegistry.registerService({
        name: 'auth-service',
        url: process.env.AUTH_SERVICE_URL || 'http://auth-service',
        port: 3002,
        healthCheck: `${process.env.AUTH_SERVICE_URL || 'http://auth-service:3002'}/health`,
        tags: ['auth', 'security', 'jwt']
      }),
      serviceRegistry.registerService({
        name: 'station-service',
        url: process.env.STATION_SERVICE_URL || 'http://station-service',
        port: 3001,
        healthCheck: `${process.env.STATION_SERVICE_URL || 'http://station-service:3001'}/health`,
        tags: ['station', 'charging', 'infrastructure']
      }),
      serviceRegistry.registerService({
        name: 'billing-service',
        url: process.env.BILLING_SERVICE_URL || 'http://billing-service',
        port: 3003,
        healthCheck: `${process.env.BILLING_SERVICE_URL || 'http://billing-service:3003'}/health`,
        tags: ['billing', 'payment', 'invoices']
      })
    ]);

    logger.info('All services registered successfully');
  } catch (error) {
    logger.error('Failed to register services:', error);
  }

  return app;
};