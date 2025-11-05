import { Elysia } from 'elysia'
import { openapi } from '@elysiajs/openapi'

const app = new Elysia()
    .use(openapi())
    .get('/', () => 'hi')
    .listen(8082)

console.log('Test server running on http://localhost:8082/openapi')
