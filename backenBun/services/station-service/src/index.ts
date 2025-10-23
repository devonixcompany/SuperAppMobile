import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';

const logger = new Logger('StationService');

// In-memory storage for stations (use database in production)
const stations = new Map();
const connectors = new Map();

interface Station {
  id: string;
  stationId: string;
  name: string;
  operatorId?: string;
  locationLat?: number;
  locationLng?: number;
  address?: any;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  ocppVersion: string;
  createdAt: string;
  updatedAt: string;
}

interface Connector {
  id: string;
  stationId: string;
  connectorId: number;
  chargePointId?: string;
  type: 'TYPE_1' | 'TYPE_2' | 'CHADEMO' | 'CCS' | 'TESLA' | 'DOMESTIC';
  powerRating: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'UNAVAILABLE' | 'FAULTED' | 'MAINTENANCE';
  maxCurrent?: number;
  maxPower?: number;
  createdAt: string;
  updatedAt: string;
}

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Station Management Service is healthy',
      timestamp: new Date(),
      service: 'station-service',
      statistics: {
        totalStations: stations.size,
        totalConnectors: connectors.size,
        activeStations: Array.from(stations.values()).filter(s => s.status === 'ACTIVE').length,
        availableConnectors: Array.from(connectors.values()).filter(c => c.status === 'AVAILABLE').length
      }
    };
  })
  .group('/stations', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { status, operatorId, limit = 100, offset = 0 } = query as any;

          let filteredStations = Array.from(stations.values());

          if (status) {
            filteredStations = filteredStations.filter(s => s.status === status);
          }

          if (operatorId) {
            filteredStations = filteredStations.filter(s => s.operatorId === operatorId);
          }

          // Apply pagination
          const paginatedStations = filteredStations.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
          );

          return {
            success: true,
            data: {
              stations: paginatedStations,
              total: filteredStations.length,
              limit: parseInt(limit),
              offset: parseInt(offset)
            },
            message: 'Stations fetched successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get stations', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get stations',
            timestamp: new Date()
          };
        }
      })
      .get('/:id', ({ params }) => {
        const station = Array.from(stations.values()).find(s => s.stationId === params.id);
        if (!station) {
          return {
            success: false,
            error: 'Station not found',
            timestamp: new Date()
          };
        }

        // Get connectors for this station
        const stationConnectors = Array.from(connectors.values())
          .filter(c => c.stationId === station.id);

        return {
          success: true,
          data: {
            ...station,
            connectors: stationConnectors
          },
          message: 'Station retrieved successfully',
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        try {
          const {
            stationId,
            name,
            operatorId,
            location,
            ocppVersion = '1.6'
          } = body as any;

          if (!stationId || !name) {
            return {
              success: false,
              error: 'Missing required fields: stationId, name',
              timestamp: new Date()
            };
          }

          // Check if station already exists
          const existingStation = Array.from(stations.values()).find(s => s.stationId === stationId);
          if (existingStation) {
            return {
              success: false,
              error: 'Station with this ID already exists',
              timestamp: new Date()
            };
          }

          const station: Station = {
            id: `STN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            stationId,
            name,
            operatorId,
            locationLat: location?.lat,
            locationLng: location?.lng,
            address: location?.address,
            status: 'ACTIVE',
            ocppVersion,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          stations.set(station.id, station);

          // Create default connectors (2 connectors per station)
          for (let i = 1; i <= 2; i++) {
            const connector: Connector = {
              id: `CON_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
              stationId: station.id,
              connectorId: i,
              type: 'TYPE_2',
              powerRating: 22000,
              status: 'AVAILABLE',
              maxCurrent: 32,
              maxPower: 22,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            connectors.set(connector.id, connector);
          }

          logger.info('Station created', { stationId, name, connectorCount: 2 });

          return {
            success: true,
            data: {
              ...station,
              connectors: Array.from(connectors.values()).filter(c => c.stationId === station.id)
            },
            message: 'Station created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create station', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create station',
            timestamp: new Date()
          };
        }
      })
      .put('/:id', ({ params, body }) => {
        try {
          const station = Array.from(stations.values()).find(s => s.stationId === params.id);
          if (!station) {
            return {
              success: false,
              error: 'Station not found',
              timestamp: new Date()
            };
          }

          const updates = body as any;
          const updatedStation = {
            ...station,
            ...updates,
            updatedAt: new Date().toISOString()
          };

          stations.set(station.id, updatedStation);

          logger.info('Station updated', { stationId: params.id });

          return {
            success: true,
            data: updatedStation,
            message: 'Station updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update station', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update station',
            timestamp: new Date()
          };
        }
      })
      .delete('/:id', ({ params }) => {
        try {
          const station = Array.from(stations.values()).find(s => s.stationId === params.id);
          if (!station) {
            return {
              success: false,
              error: 'Station not found',
              timestamp: new Date()
            };
          }

          // Soft delete by changing status
          const deletedStation = {
            ...station,
            status: 'DECOMMISSIONED' as const,
            updatedAt: new Date().toISOString()
          };

          stations.set(station.id, deletedStation);

          // Decommission all connectors
          const stationConnectors = Array.from(connectors.values())
            .filter(c => c.stationId === station.id);

          stationConnectors.forEach(connector => {
            const updatedConnector = {
              ...connector,
              status: 'UNAVAILABLE' as const,
              updatedAt: new Date().toISOString()
            };
            connectors.set(connector.id, updatedConnector);
          });

          logger.info('Station decommissioned', { stationId: params.id });

          return {
            success: true,
            data: deletedStation,
            message: 'Station decommissioned successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to decommission station', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to decommission station',
            timestamp: new Date()
          };
        }
      })
      .get('/:id/connectors', ({ params }) => {
        try {
          const station = Array.from(stations.values()).find(s => s.stationId === params.id);
          if (!station) {
            return {
              success: false,
              error: 'Station not found',
              timestamp: new Date()
            };
          }

          const stationConnectors = Array.from(connectors.values())
            .filter(c => c.stationId === station.id);

          return {
            success: true,
            data: stationConnectors,
            message: 'Station connectors retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get station connectors', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get station connectors',
            timestamp: new Date()
          };
        }
      })
      .get('/nearby', ({ query }) => {
        try {
          const { lat, lng, radius = 10 } = query as any;

          if (!lat || !lng) {
            return {
              success: false,
              error: 'Missing required parameters: lat, lng',
              timestamp: new Date()
            };
          }

          const userLat = parseFloat(lat);
          const userLng = parseFloat(lng);
          const searchRadius = parseFloat(radius);

          const nearbyStations = Array.from(stations.values())
            .filter(station => station.status === 'ACTIVE' && station.locationLat && station.locationLng)
            .map(station => {
              const distance = calculateDistance(
                userLat, userLng,
                station.locationLat!, station.locationLng!
              );
              return { ...station, distance };
            })
            .filter(station => station.distance <= searchRadius)
            .sort((a, b) => a.distance - b.distance);

          return {
            success: true,
            data: nearbyStations,
            message: 'Nearby stations retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get nearby stations', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get nearby stations',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/connectors', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { stationId, status, type } = query as any;

          let filteredConnectors = Array.from(connectors.values());

          if (stationId) {
            const station = Array.from(stations.values()).find(s => s.stationId === stationId);
            if (station) {
              filteredConnectors = filteredConnectors.filter(c => c.stationId === station.id);
            }
          }

          if (status) {
            filteredConnectors = filteredConnectors.filter(c => c.status === status);
          }

          if (type) {
            filteredConnectors = filteredConnectors.filter(c => c.type === type);
          }

          return {
            success: true,
            data: filteredConnectors,
            message: 'Connectors fetched successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get connectors', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get connectors',
            timestamp: new Date()
          };
        }
      })
      .put('/:id/status', ({ params, body }) => {
        try {
          const connector = connectors.get(params.id);
          if (!connector) {
            return {
              success: false,
              error: 'Connector not found',
              timestamp: new Date()
            };
          }

          const { status } = body as any;
          const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'UNAVAILABLE', 'FAULTED', 'MAINTENANCE'];

          if (!validStatuses.includes(status)) {
            return {
              success: false,
              error: 'Invalid status',
              timestamp: new Date()
            };
          }

          const updatedConnector = {
            ...connector,
            status,
            updatedAt: new Date().toISOString()
          };

          connectors.set(params.id, updatedConnector);

          logger.info('Connector status updated', {
            connectorId: params.id,
            newStatus: status
          });

          return {
            success: true,
            data: updatedConnector,
            message: 'Connector status updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update connector status', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update connector status',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/availability', (app) =>
    app
      .get('/summary', () => {
        try {
          const summary = {
            totalStations: stations.size,
            activeStations: Array.from(stations.values()).filter(s => s.status === 'ACTIVE').length,
            totalConnectors: connectors.size,
            availableConnectors: Array.from(connectors.values()).filter(c => c.status === 'AVAILABLE').length,
            occupiedConnectors: Array.from(connectors.values()).filter(c => c.status === 'OCCUPIED').length,
            reservedConnectors: Array.from(connectors.values()).filter(c => c.status === 'RESERVED').length,
            unavailableConnectors: Array.from(connectors.values()).filter(c => ['UNAVAILABLE', 'FAULTED', 'MAINTENANCE'].includes(c.status)).length
          };

          return {
            success: true,
            data: summary,
            message: 'Availability summary retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get availability summary', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get availability summary',
            timestamp: new Date()
          };
        }
      })
      .get('/real-time', () => {
        try {
          const realTimeData = Array.from(stations.values())
            .filter(station => station.status === 'ACTIVE')
            .map(station => {
              const stationConnectors = Array.from(connectors.values())
                .filter(c => c.stationId === station.id);

              return {
                stationId: station.stationId,
                name: station.name,
                location: {
                  lat: station.locationLat,
                  lng: station.locationLng,
                  address: station.address
                },
                connectors: stationConnectors.map(connector => ({
                  connectorId: connector.connectorId,
                  type: connector.type,
                  powerRating: connector.powerRating,
                  status: connector.status,
                  maxCurrent: connector.maxCurrent,
                  maxPower: connector.maxPower
                })),
                availability: {
                  total: stationConnectors.length,
                  available: stationConnectors.filter(c => c.status === 'AVAILABLE').length,
                  occupied: stationConnectors.filter(c => c.status === 'OCCUPIED').length,
                  reserved: stationConnectors.filter(c => c.status === 'RESERVED').length,
                  unavailable: stationConnectors.filter(c => ['UNAVAILABLE', 'FAULTED', 'MAINTENANCE'].includes(c.status)).length
                }
              };
            });

          return {
            success: true,
            data: realTimeData,
            message: 'Real-time availability retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get real-time availability', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get real-time availability',
            timestamp: new Date()
          };
        }
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3001);

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

console.log('⚡ Station Management Service is running on port 3001');
console.log('📊 Health check: http://localhost:3001/health');
console.log('🏢 Stations API: http://localhost:3001/stations');
console.log('🔌 Connectors API: http://localhost:3001/connectors');
console.log('📍 Availability API: http://localhost:3001/availability');