import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { userRoutes } from './routes/user.js';
import { Logger } from '../../../../shared/utils/logger.js';

const logger = new Logger('UserService');

const app = new Elysia()
  .use(cors())
  .use(userRoutes)
  .get('/health', () => {
    return {
      success: true,
      message: 'User Service is healthy',
      timestamp: new Date(),
      service: 'user-service'
    };
  })
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3005);

console.log('🚀 User Service is running on port 3005');
console.log('📊 Health check: http://localhost:3005/health');
console.log('👥 Users API: http://localhost:3005/users');