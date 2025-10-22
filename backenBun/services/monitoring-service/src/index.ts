import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';

const logger = new Logger('MonitoringService');

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Monitoring Service is healthy',
      timestamp: new Date(),
      service: 'monitoring-service'
    };
  })
  .group('/stations', (app) =>
    app
      .get('/status', () => {
        return {
          success: true,
          data: [
            {
              stationId: 'STATION_001',
              name: 'Central Mall Charging Station',
              status: 'ONLINE',
              totalConnectors: 4,
              availableConnectors: 2,
              occupiedConnectors: 1,
              faultedConnectors: 1,
              lastSeen: new Date().toISOString()
            },
            {
              stationId: 'STATION_002',
              name: 'Airport Parking Station',
              status: 'ONLINE',
              totalConnectors: 8,
              availableConnectors: 6,
              occupiedConnectors: 2,
              faultedConnectors: 0,
              lastSeen: new Date().toISOString()
            }
          ],
          message: 'Station status fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:stationId/metrics', ({ params }) => {
        return {
          success: true,
          data: {
            stationId: params.stationId,
            totalEnergyDelivered: 1250.75,
            totalSessions: 156,
            averageSessionDuration: 45.5,
            uptime: 99.8,
            lastMaintenance: '2025-01-10T00:00:00Z'
          },
          timestamp: new Date()
        };
      })
  )
  .group('/alerts', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [
            {
              id: 'ALERT_001',
              type: 'FAULT',
              severity: 'HIGH',
              stationId: 'STATION_001',
              connectorId: 3,
              message: 'Connector 3 communication failure',
              createdAt: new Date().toISOString(),
              acknowledged: false
            },
            {
              id: 'ALERT_002',
              type: 'LOW_POWER',
              severity: 'MEDIUM',
              stationId: 'STATION_002',
              connectorId: 2,
              message: 'Power output below 10% of rated capacity',
              createdAt: new Date().toISOString(),
              acknowledged: true
            }
          ],
          message: 'Alerts fetched successfully',
          timestamp: new Date()
        };
      })
      .post('/:id/acknowledge', ({ params }) => {
        logger.info(`Alert acknowledged: ${params.id}`);
        return {
          success: true,
          message: 'Alert acknowledged successfully',
          timestamp: new Date()
        };
      })
  )
  .group('/analytics', (app) =>
    app
      .get('/dashboard', () => {
        return {
          success: true,
          data: {
            overview: {
              totalStations: 25,
              onlineStations: 23,
              totalConnectors: 100,
              activeSessions: 15,
              totalEnergyToday: 525.50,
              revenueToday: 2627.50
            },
            topStations: [
              {
                stationId: 'STATION_001',
                name: 'Central Mall',
                sessionsToday: 45,
                energyToday: 125.75,
                revenueToday: 628.75
              },
              {
                stationId: 'STATION_002',
                name: 'Airport Parking',
                sessionsToday: 32,
                energyToday: 98.25,
                revenueToday: 491.25
              }
            ],
            hourlyUsage: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              sessions: Math.floor(Math.random() * 10) + 2,
              energy: Math.random() * 50 + 10
            }))
          },
          message: 'Dashboard analytics fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/usage', ({ query }) => {
        const { startDate, endDate } = query as { startDate: string, endDate: string };

        return {
          success: true,
          data: {
            period: { startDate, endDate },
            totalSessions: 1250,
            totalEnergy: 5250.75,
            totalRevenue: 26253.75,
            averageSessionDuration: 42.5,
            utilizationRate: 68.5,
            stationPerformance: [
              {
                stationId: 'STATION_001',
                sessions: 250,
                energy: 1050.25,
                revenue: 5251.25,
                utilization: 75.5
              }
            ]
          },
          message: 'Usage analytics fetched successfully',
          timestamp: new Date()
        };
      })
  )
  .group('/real-time', (app) =>
    app
      .get('/connections', () => {
        return {
          success: true,
          data: [
            {
              stationId: 'STATION_001',
              connectorId: 1,
              sessionId: 'SESSION_001',
              driverId: 'DRIVER_001',
              startTime: '2025-01-15T10:00:00Z',
              currentPower: 22.5,
              currentEnergy: 15.75,
              estimatedTimeRemaining: 25
            }
          ],
          message: 'Real-time connections fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/events', () => {
        return {
          success: true,
          data: [
            {
              id: 'EVENT_001',
              type: 'SESSION_STARTED',
              stationId: 'STATION_001',
              connectorId: 2,
              driverId: 'DRIVER_002',
              timestamp: new Date().toISOString(),
              details: 'Charging session started'
            },
            {
              id: 'EVENT_002',
              type: 'STATION_OFFLINE',
              stationId: 'STATION_003',
              timestamp: new Date(Date.now() - 300000).toISOString(),
              details: 'Station went offline'
            }
          ],
          message: 'Real-time events fetched successfully',
          timestamp: new Date()
        };
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3004);

console.log('📊 Monitoring Service is running on port 3004');
console.log('🏥 Health check: http://localhost:3004/health');
console.log('🏢 Station Status API: http://localhost:3004/stations/status');
console.log('🚨 Alerts API: http://localhost:3004/alerts');
console.log('📈 Analytics API: http://localhost:3004/analytics');
console.log('⚡ Real-time API: http://localhost:3004/real-time');