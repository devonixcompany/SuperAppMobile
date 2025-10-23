import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';
import * as turf from '@turf/turf';
import cron from 'node-cron';

const logger = new Logger('GeolocationService');

// In-memory storage for geofences and locations (use database in production)
const geofences = new Map();
const userLocations = new Map();
const stationLocations = new Map();

interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  coordinates: any; // Turf.js geometry
  properties?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserLocation {
  id: string;
  userId: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: string;
  };
  lastUpdated: string;
}

interface StationLocation {
  id: string;
  stationId: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Geolocation Service is healthy',
      timestamp: new Date(),
      service: 'geolocation-service',
      statistics: {
        totalGeofences: geofences.size,
        activeGeofences: Array.from(geofences.values()).filter(g => g.isActive).length,
        totalUserLocations: userLocations.size,
        totalStationLocations: stationLocations.size
      }
    };
  })
  .group('/geofences', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { isActive, limit = 100, offset = 0 } = query as any;

          let filteredGeofences = Array.from(geofences.values());

          if (isActive !== undefined) {
            filteredGeofences = filteredGeofences.filter(g => g.isActive === (isActive === 'true'));
          }

          // Apply pagination
          const paginatedGeofences = filteredGeofences.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
          );

          return {
            success: true,
            data: {
              geofences: paginatedGeofences,
              total: filteredGeofences.length,
              limit: parseInt(limit),
              offset: parseInt(offset)
            },
            message: 'Geofences retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get geofences', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get geofences',
            timestamp: new Date()
          };
        }
      })
      .get('/:id', ({ params }) => {
        try {
          const geofence = geofences.get(params.id);
          if (!geofence) {
            return {
              success: false,
              error: 'Geofence not found',
              timestamp: new Date()
            };
          }

          return {
            success: true,
            data: geofence,
            message: 'Geofence retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get geofence', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get geofence',
            timestamp: new Date()
          };
        }
      })
      .post('/', ({ body }) => {
        try {
          const { name, type, coordinates, properties, isActive = true } = body as any;

          if (!name || !type || !coordinates) {
            return {
              success: false,
              error: 'Missing required fields: name, type, coordinates',
              timestamp: new Date()
            };
          }

          // Validate geometry with Turf.js
          let geometry;
          try {
            geometry = JSON.parse(coordinates);
          } catch (error) {
            return {
              success: false,
              error: 'Invalid coordinates format',
              message: 'Failed to parse coordinates',
              timestamp: new Date()
            };
          }

          const geofence: Geofence = {
            id: `GEOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            type,
            coordinates,
            properties: properties || {},
            isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          geofences.set(geofence.id, geofence);

          logger.info('Geofence created', { geofenceId: geofence.id, name, type });

          return {
            success: true,
            data: geofence,
            message: 'Geofence created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create geofence', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create geofence',
            timestamp: new Date()
          };
        }
      })
      .put('/:id', ({ params, body }) => {
        try {
          const geofence = geofences.get(params.id);
          if (!geofence) {
            return {
              success: false,
              error: 'Geofence not found',
              timestamp: new Date()
            };
          }

          const updates = body as any;
          const updatedGeofence = {
            ...geofence,
            ...updates,
            updatedAt: new Date().toISOString()
          };

          geofences.set(params.id, updatedGeofence);

          logger.info('Geofence updated', { geofenceId: params.id });

          return {
            success: true,
            data: updatedGeofence,
            message: 'Geofence updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update geofence', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update geofence',
            timestamp: new Date()
          };
        }
      })
      .delete('/:id', ({ params }) => {
        try {
          const geofence = geofences.get(params.id);
          if (!geofence) {
            return {
              success: false,
              error: 'Geofence not found',
              timestamp: new Date()
            };
          }

          // Soft delete
          const deletedGeofence = {
            ...geofence,
            isActive: false,
            updatedAt: new Date().toISOString()
          };

          geofences.set(params.id, deletedGeofence);

          logger.info('Geofence deactivated', { geofenceId: params.id });

          return {
            success: true,
            data: deletedGeofence,
            message: 'Geofence deactivated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to deactivate geofence', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to deactivate geofence',
            timestamp: new Date()
          };
        }
      })
      .post('/:id/check-location', ({ params, body }) => {
        try {
          const geofence = geofences.get(params.id);
          if (!geofence || !geofence.isActive) {
            return {
              success: false,
              error: 'Geofence not found or inactive',
              timestamp: new Date()
            };
          }

          const { location } = body as any;
          if (!location || !location.lat || !location.lng) {
            return {
              success: false,
              error: 'Missing location data: lat, lng required',
              timestamp: new Date()
            };
          }

          const point = turf.point([location.lng, location.lat]);
          let isInside = false;

          switch (geofence.type) {
            case 'circle':
              const center = geofence.coordinates;
              isInside = turf.distance(point, center) <= (geofence.properties?.radius || 100);
              break;
            case 'polygon':
              isInside = turf.booleanPointInPolygon(point, geofence.coordinates);
              break;
            case 'rectangle':
              // For rectangles, create a polygon from bounds
              const bounds = geofence.coordinates;
              if (Array.isArray(bounds) && bounds.length >= 4) {
                const rectanglePolygon = turf.polygon([
                  [bounds[0], bounds[1], bounds[2], bounds[3], bounds[0]]
                ]);
                isInside = turf.booleanPointInPolygon(point, rectanglePolygon);
              }
              break;
          }

          logger.info('Location checked against geofence', {
            geofenceId: params.id,
            geofenceName: geofence.name,
            isInside
          });

          return {
            success: true,
            data: {
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              isInside,
              location,
              distance: geofence.type === 'circle' ? turf.distance(point, geofence.coordinates) : undefined
            },
            message: `Location is ${isInside ? 'inside' : 'outside'} geofence`,
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to check location against geofence', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to check location',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/locations', (app) =>
    app
      .post('/users', ({ body }) => {
        try {
          const { userId, location } = body as any;

          if (!userId || !location || !location.lat || !location.lng) {
            return {
              success: false,
              error: 'Missing required fields: userId, location (lat, lng)',
              timestamp: new Date()
            };
          }

          const userLocation: UserLocation = {
            id: `LOC_${userId}_${Date.now()}`,
            userId,
            location,
            lastUpdated: new Date().toISOString()
          };

          userLocations.set(userLocation.id, userLocation);

          logger.info('User location updated', { userId, location });

          return {
            success: true,
            data: userLocation,
            message: 'User location recorded successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to record user location', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to record user location',
            timestamp: new Date()
          };
        }
      })
      .get('/users/:userId', ({ params }) => {
        try {
          const userLocation = Array.from(userLocations.values())
            .find(loc => loc.userId === params.userId);

          if (!userLocation) {
            return {
              success: false,
              error: 'User location not found',
              timestamp: new Date()
            };
          }

          return {
            success: true,
            data: userLocation,
            message: 'User location retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get user location', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get user location',
            timestamp: new Date()
          };
        }
      })
      .post('/stations', ({ body }) => {
        try {
          const { stationId, location } = body as any;

          if (!stationId || !location || !location.lat || !location.lng) {
            return {
              success: false,
              error: 'Missing required fields: stationId, location (lat, lng)',
              timestamp: new Date()
            };
          }

          const stationLocation: StationLocation = {
            id: `STN_LOC_${stationId}`,
            stationId,
            location,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          stationLocations.set(stationLocation.id, stationLocation);

          logger.info('Station location recorded', { stationId, location });

          return {
            success: true,
            data: stationLocation,
            message: 'Station location recorded successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          error;
          logger.error('Failed to record station location', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to record station location',
            timestamp: new Date()
          };
        }
      })
      .get('/stations', ({ query }) => {
        try {
          const { stationId } = query as any;

          let filteredLocations = Array.from(stationLocations.values());

          if (stationId) {
            filteredLocations = filteredLocations.filter(loc => loc.stationId === stationId);
          }

          return {
            success: true,
            data: filteredLocations,
            message: 'Station locations retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get station locations', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get station locations',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/search', (app) =>
    app
      .get('/nearby', ({ query }) => {
        try {
          const { lat, lng, radius = 5, type = 'all', limit = 20 } = query as any;

          if (!lat || !lng) {
            return {
              success: false,
              error: 'Missing required parameters: lat, lng',
              timestamp: new Date()
            };
          }

          const centerPoint = turf.point([parseFloat(lng), parseFloat(lat)]);
          const searchRadius = parseFloat(radius);

          let nearbyItems: any[] = [];

          // Add nearby stations
          Array.from(stationLocations.values()).forEach(station => {
            const stationPoint = turf.point([station.location.lng, station.location.lat]);
            const distance = turf.distance(centerPoint, stationPoint);

            if (distance <= searchRadius) {
              nearbyItems.push({
                type: 'station',
                data: {
                  stationId: station.stationId,
                  distance: Math.round(distance * 100) / 100
                }
              });
            }
          });

          // Add nearby users
          Array.from(userLocations.values()).forEach(userLocation => {
            const userPoint = turf.point([userLocation.location.lng, userLocation.lat]);
            const distance = turf.distance(centerPoint, userPoint);

            if (distance <= searchRadius) {
              nearbyItems.push({
                type: 'user',
                data: {
                  userId: userLocation.userId,
                  distance: Math.round(distance * 100) / 100
                }
              });
            }
          });

          // Add nearby geofences
          Array.from(geofences.values())
            .filter(geofence => geofence.isActive)
            .forEach(geofence => {
              let distance;
              if (geofence.type === 'circle') {
                distance = turf.distance(centerPoint, geofence.coordinates) - (geofence.properties?.radius || 100);
              }

              if (distance <= searchRadius) {
                nearbyItems.push({
                  type: 'geofence',
                  data: {
                    geofenceId: geofence.id,
                    geofenceName: geofence.name,
                    distance: Math.round(distance * 100) / 100
                  }
                });
              }
            });

          // Sort by distance
          nearbyItems.sort((a, b) => a.data.distance - b.data.distance);

          // Limit results
          nearbyItems = nearbyItems.slice(0, parseInt(limit));

          return {
            success: true,
            data: {
              center: { lat: parseFloat(lat), lng: parseFloat(lng), radius: searchRadius },
              items: nearbyItems
            },
            message: 'Nearby items retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to search nearby items', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to search nearby items',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/distance', (app) =>
    app
      .post('/calculate', ({ body }) => {
        try {
          const { from, to, unit = 'kilometers' } = body as any;

          if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
            return {
              success: false,
              error: 'Missing required fields: from, to (lat, lng)',
              timestamp: new Date()
            };
          }

          const fromPoint = turf.point([parseFloat(from.lng), parseFloat(from.lat)]);
          const toPoint = turf.point([parseFloat(to.lng), parseFloat(to.lat)]);

          let distance = turf.distance(fromPoint, toPoint);

          // Convert units if needed
          if (unit === 'miles') {
            distance = distance * 1609.34; // km to miles
          }

          return {
            success: true,
            data: {
              from: from,
              to: to,
              distance: Math.round(distance * 100) / 100,
              unit
            },
            message: 'Distance calculated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to calculate distance', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to calculate distance',
            timestamp: new Date()
          };
        }
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3009);

console.log('🌍 Geolocation Service is running on port 3009');
console.log('🔑 Health check: http://localhost:3009/health');
console.log('🎯 Geofences API: http://localhost:3009/geofences');
console.log('📍 Locations API: http://localhost:3009/locations');
console.log('🔍 Search API: http://localhost:3009/search');