import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';

const app = new Elysia()
  .use(openapi({
    documentation: {
      info: {
        title: 'Debug API',
        version: '1.0.0',
        description: 'Debug OpenAPI plugin'
      }
    }
  }))
  .get('/', () => 'Hello World')
  .get('/test', () => ({ message: 'Test endpoint' }))
  .listen(8084);

console.log('Debug server running on http://localhost:8084');
console.log('OpenAPI docs should be at http://localhost:8084/swagger');