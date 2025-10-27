import { Elysia } from 'elysia'
import { openapi } from '@elysiajs/openapi'

const app = new Elysia()
    .use(openapi())
    .get('/', () => 'hello')
    .post('/hello', () => 'OpenAPI')
    .listen(3000)

console.log('Official example server running on http://localhost:3000');
console.log('OpenAPI docs should be at: http://localhost:3000/openapi');