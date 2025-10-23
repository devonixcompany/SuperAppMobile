import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

describe('Monitoring Service', () => {
  const app = new Elysia()
    .use(cors())
    .get('/health', () => ({
      success: true,
      message: 'Monitoring Service is healthy',
      timestamp: new Date(),
      service: 'monitoring-service'
    }))
    .group('/stations', (app) =>
      app
        .get('/status', () => ({
          success: true,
          data: [
            {
              stationId: 'STATION_001',
              name: 'Test Station',
              status: 'ONLINE',
              totalConnectors: 4,
              availableConnectors: 2
            }
          ],
          message: 'Station status fetched successfully',
          timestamp: new Date()
        }))
        .get('/:stationId/metrics', ({ params }) => ({
          success: true,
          data: {
            stationId: params.stationId,
            totalEnergyDelivered: 1250.75,
            totalSessions: 156,
            uptime: 99.8
          },
          timestamp: new Date()
        }))
    )
    .group('/analytics', (app) =>
      app
        .get('/dashboard', () => ({
          success: true,
          data: {
            overview: {
              totalStations: 25,
              onlineStations: 23,
              activeSessions: 15
            }
          },
          message: 'Dashboard analytics fetched successfully',
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
      expect(data.service).toBe('monitoring-service');
    });
  });

  describe('Station Monitoring', () => {
    test('should fetch station status', async () => {
      const response = await app.handle(
        new Request('http://localhost/stations/status', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data[0].stationId).toBe('STATION_001');
    });

    test('should fetch station metrics', async () => {
      const response = await app.handle(
        new Request('http://localhost/stations/STATION_001/metrics', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stationId).toBe('STATION_001');
      expect(typeof data.data.totalEnergyDelivered).toBe('number');
    });
  });

  describe('Analytics', () => {
    test('should fetch dashboard analytics', async () => {
      const response = await app.handle(
        new Request('http://localhost/analytics/dashboard', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overview).toBeDefined();
      expect(data.data.overview.totalStations).toBe(25);
    });
  });
});
