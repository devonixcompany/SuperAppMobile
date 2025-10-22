import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './routes/auth.js';
import { Logger } from '../../../../shared/utils/logger.js';

const logger = new Logger('AuthService');

const app = new Elysia()
  .use(cors())
  .use(authRoutes)
  .get('/health', () => {
    return {
      success: true,
      message: 'Auth Service is healthy',
      timestamp: new Date(),
      service: 'auth-service'
    };
  })
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3002);

console.log('🚀 Auth Service is running on port 3002');
console.log('📊 Health check: http://localhost:3002/health');
console.log('🔐 Auth API: http://localhost:3002/auth');