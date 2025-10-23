import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

describe('Driver Service', () => {
  const app = new Elysia()
    .use(cors())
    .get('/health', () => ({
      success: true,
      message: 'Driver Service is healthy',
      timestamp: new Date(),
      service: 'driver-service'
    }))
    .group('/drivers', (app) =>
      app
        .get('/', () => ({
          success: true,
          data: [],
          message: 'Drivers fetched successfully',
          timestamp: new Date()
        }))
        .get('/:id', ({ params }) => ({
          success: true,
          data: {
            id: params.id,
            name: 'Test Driver',
            status: 'ACTIVE'
          },
          timestamp: new Date()
        }))
        .post('/', ({ body }) => ({
          success: true,
          data: body,
          message: 'Driver created successfully',
          timestamp: new Date()
        }))
    );

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await app.handle(
        new Request('http://localhost/health', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.service).toBe('driver-service');
    });
  });

  describe('Driver Operations', () => {
    test('should fetch all drivers', async () => {
      const response = await app.handle(
        new Request('http://localhost/drivers', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should fetch driver by id', async () => {
      const response = await app.handle(
        new Request('http://localhost/drivers/123', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('123');
    });

    test('should create a new driver', async () => {
      const newDriver = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const response = await app.handle(
        new Request('http://localhost/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDriver)
        })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(newDriver.name);
    });
  });
});
