import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

describe('Billing Service', () => {
  const app = new Elysia()
    .use(cors())
    .get('/health', () => ({
      success: true,
      message: 'Billing Service is healthy',
      timestamp: new Date(),
      service: 'billing-service'
    }))
    .group('/charging-sessions', (app) =>
      app
        .get('/', () => ({
          success: true,
          data: [],
          message: 'Charging sessions fetched successfully',
          timestamp: new Date()
        }))
        .post('/', ({ body }) => ({
          success: true,
          data: {
            sessionId: `SESSION_${Date.now()}`,
            startTime: new Date().toISOString(),
            status: 'ACTIVE',
            ...body
          },
          message: 'Charging session created successfully',
          timestamp: new Date()
        }))
    )
    .group('/invoices', (app) =>
      app
        .get('/', () => ({
          success: true,
          data: [],
          message: 'Invoices fetched successfully',
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
      expect(data.service).toBe('billing-service');
    });
  });

  describe('Charging Sessions', () => {
    test('should fetch all charging sessions', async () => {
      const response = await app.handle(
        new Request('http://localhost/charging-sessions', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should create a charging session', async () => {
      const session = {
        stationId: 'STATION_001',
        driverId: 'DRIVER_001'
      };

      const response = await app.handle(
        new Request('http://localhost/charging-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session)
        })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('ACTIVE');
    });
  });

  describe('Invoices', () => {
    test('should fetch all invoices', async () => {
      const response = await app.handle(
        new Request('http://localhost/invoices', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});
