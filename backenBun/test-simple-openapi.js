import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';

const app = new Elysia()
  .use(openapi({
    path: '/openapi'
  }))
  .get('/test', () => ({ message: 'Hello World' }))
  .listen(8083);

console.log('Simple OpenAPI test server running on http://localhost:8083');
console.log('OpenAPI docs should be at: http://localhost:8083/openapi');