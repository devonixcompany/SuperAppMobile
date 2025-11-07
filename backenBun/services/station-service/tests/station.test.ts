import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

describe('Station Service', () => {
  const app = new Elysia()
    .use(cors())
    .get('/health', () => ({
      success: true,
      message: 'Station Management Service is healthy',
      timestamp: new Date(),
      service: 'station-service'
    }))
    .group('/stations', (app) =>
      app
        .get('/', () => ({
          success: true,
          data: [],
          message: 'Stations fetched successfully',
          timestamp: new Date()
        }))
        .get('/:id', ({ params }) => ({
          success: true,
          data: {
            id: params.id,
            stationId: `STATION_${params.id}`,
            name: 'Charging Station 1',
            status: 'ACTIVE',
            location: { lat: 13.7563, lng: 100.5018 }
          },
          timestamp: new Date()
        }))
        .post('/', ({ body }) => ({
          success: true,
          data: body,
          message: 'Station created successfully',
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
      expect(data.service).toBe('station-service');
    });
  });

  describe('Station Operations', () => {
    test('should fetch all stations', async () => {
      const response = await app.handle(
        new Request('http://localhost/stations', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should fetch station by id', async () => {
      const response = await app.handle(
        new Request('http://localhost/stations/123', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('123');
    });

    test('should create a new station', async () => {
      const newStation = {
        name: 'Test Station',
        location: { lat: 13.7563, lng: 100.5018 }
      };

      const response = await app.handle(
        new Request('http://localhost/stations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStation)
        })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(newStation.name);
    });
  });
});
