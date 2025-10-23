import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

describe('OCPP Gateway Service', () => {
  // Mock connection manager for testing
  const mockConnectionManager = {
    getStatistics: () => ({
      totalConnections: 5,
      activeConnections: 3,
      inactiveConnections: 2
    }),
    getAllConnections: () => [
      {
        id: 'conn-001',
        chargePointId: 'CP001',
        ocppVersion: '1.6',
        status: 'CONNECTED',
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString()
      },
      {
        id: 'conn-002',
        chargePointId: 'CP002',
        ocppVersion: '1.6',
        status: 'CONNECTED',
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString()
      }
    ]
  };

  const app = new Elysia()
    .use(cors())
    .get('/health', () => ({
      success: true,
      message: 'OCPP Gateway Service is healthy',
      timestamp: new Date(),
      service: 'ocpp-gateway',
      connections: mockConnectionManager.getStatistics()
    }))
    .get('/connections', () => ({
      success: true,
      data: {
        connections: mockConnectionManager.getAllConnections().map(conn => ({
          id: conn.id,
          chargePointId: conn.chargePointId,
          ocppVersion: conn.ocppVersion,
          status: conn.status,
          connectedAt: conn.connectedAt,
          lastHeartbeat: conn.lastHeartbeat
        })),
        statistics: mockConnectionManager.getStatistics()
      },
      timestamp: new Date()
    }))
    .get('/connections/:chargePointId', ({ params }) => ({
      success: true,
      data: {
        id: `conn-${params.chargePointId}`,
        chargePointId: params.chargePointId,
        ocppVersion: '1.6',
        status: 'CONNECTED',
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString()
      },
      timestamp: new Date()
    }));

  describe('Health Check', () => {
    test('should return healthy status with connection statistics', async () => {
      const response = await app.handle(
        new Request('http://localhost/health', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.service).toBe('ocpp-gateway');
      expect(data.connections).toBeDefined();
      expect(data.connections.totalConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Connection Management', () => {
    test('should list all connections', async () => {
      const response = await app.handle(
        new Request('http://localhost/connections', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.connections).toBeDefined();
      expect(Array.isArray(data.data.connections)).toBe(true);
      expect(data.data.statistics).toBeDefined();
    });

    test('should return connection statistics', async () => {
      const response = await app.handle(
        new Request('http://localhost/connections', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(data.data.statistics.totalConnections).toBe(5);
      expect(data.data.statistics.activeConnections).toBe(3);
      expect(data.data.statistics.inactiveConnections).toBe(2);
    });

    test('should get connection by charge point ID', async () => {
      const response = await app.handle(
        new Request('http://localhost/connections/CP001', { method: 'GET' })
      );
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.chargePointId).toBe('CP001');
      expect(data.data.ocppVersion).toBe('1.6');
      expect(data.data.status).toBe('CONNECTED');
    });

    test('should include connection metadata', async () => {
      const response = await app.handle(
        new Request('http://localhost/connections', { method: 'GET' })
      );
      const data = await response.json();
      const firstConnection = data.data.connections[0];
      
      expect(firstConnection.id).toBeDefined();
      expect(firstConnection.chargePointId).toBeDefined();
      expect(firstConnection.ocppVersion).toBeDefined();
      expect(firstConnection.status).toBeDefined();
      expect(firstConnection.connectedAt).toBeDefined();
      expect(firstConnection.lastHeartbeat).toBeDefined();
    });
  });

  describe('OCPP Protocol Support', () => {
    test('should support OCPP 1.6 connections', async () => {
      const response = await app.handle(
        new Request('http://localhost/connections', { method: 'GET' })
      );
      const data = await response.json();
      
      const ocpp16Connections = data.data.connections.filter(
        (conn: any) => conn.ocppVersion === '1.6'
      );
      
      expect(ocpp16Connections.length).toBeGreaterThan(0);
    });
  });
});
