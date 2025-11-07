import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

describe('Charge Point Service', () => {
  const app = new Elysia()
    .use(cors())
    .get('/health', () => ({
      success: true,
      message: 'Charge Point Service is healthy',
      timestamp: new Date(),
      service: 'charge-point-service'
    }))
    .group('/charge-points', (app) =>
      app
        .get('/', () => ({
          success: true,
          data: [],
          message: 'Charge points fetched successfully',
          timestamp: new Date()
        }))
        .get('/:id', ({ params }) => ({
          success: true,
          data: {
            id: params.id,
            chargePointId: `CP_${params.id}`,
            status: 'AVAILABLE',
            vendor: 'Example Vendor',
            model: 'Example Model'
          },
          timestamp: new Date()
        }))
        .post('/', ({ body }) => ({
          success: true,
          data: body,
          message: 'Charge point created successfully',
          timestamp: new Date()
        }))
    )
    .group('/transactions', (app) =>
      app
        .get('/', () => ({
          success: true,
          data: [],
          message: 'Transactions fetched successfully',
          timestamp: new Date()
        }))
        .get('/:id', ({ params }) => ({
          success: true,
          data: {
            id: params.id,
            transactionId: parseInt(params.id),
            status: 'STARTED',
            energyConsumed: 0
          },
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
      expect(data.service).toBe('charge-point-service');
    });
  });

  describe('Charge Point Operations', () => {
    test('should fetch all charge points', async () => {
      const response = await app.handle(
        new Request('http://localhost/charge-points', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should fetch charge point by id', async () => {
      const response = await app.handle(
        new Request('http://localhost/charge-points/CP001', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('CP001');
      expect(data.data.chargePointId).toBe('CP_CP001');
    });

    test('should create a new charge point', async () => {
      const newChargePoint = {
        chargePointId: 'CP_NEW_001',
        vendor: 'Test Vendor',
        model: 'Test Model'
      };

      const response = await app.handle(
        new Request('http://localhost/charge-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newChargePoint)
        })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.chargePointId).toBe(newChargePoint.chargePointId);
    });
  });

  describe('Transaction Operations', () => {
    test('should fetch all transactions', async () => {
      const response = await app.handle(
        new Request('http://localhost/transactions', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should fetch transaction by id', async () => {
      const response = await app.handle(
        new Request('http://localhost/transactions/123', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('123');
      expect(data.data.transactionId).toBe(123);
      expect(data.data.status).toBe('STARTED');
    });
  });
});
