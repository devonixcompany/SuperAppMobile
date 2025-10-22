import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { Logger } from '../../../shared/utils/logger.js';

const logger = new Logger('StationService');

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Station Management Service is healthy',
      timestamp: new Date(),
      service: 'station-service'
    };
  })
  .group('/stations', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [],
          message: 'Stations fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:id', ({ params }) => {
        return {
          success: true,
          data: {
            id: params.id,
            stationId: `STATION_${params.id}`,
            name: 'Charging Station 1',
            status: 'ACTIVE',
            location: { lat: 13.7563, lng: 100.5018 }
          },
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        logger.info('Station created', body);
        return {
          success: true,
          data: body,
          message: 'Station created successfully',
          timestamp: new Date()
        };
      })
      .put('/:id', ({ params, body }) => {
        logger.info(`Station updated: ${params.id}`, body);
        return {
          success: true,
          data: { id: params.id, ...body },
          message: 'Station updated successfully',
          timestamp: new Date()
        };
      })
      .delete('/:id', ({ params }) => {
        logger.info(`Station deleted: ${params.id}`);
        return {
          success: true,
          message: 'Station deleted successfully',
          timestamp: new Date()
        };
      })
  )
  .group('/connectors', (app) =>
    app
      .get('/station/:stationId', ({ params }) => {
        return {
          success: true,
          data: [
            {
              id: 1,
              type: 'TYPE_2',
              status: 'AVAILABLE',
              powerRating: 22000
            },
            {
              id: 2,
              type: 'CCS',
              status: 'OCCUPIED',
              powerRating: 50000
            }
          ],
          message: 'Connectors fetched successfully',
          timestamp: new Date()
        };
      })
      .put('/station/:stationId/:connectorId', ({ params, body }) => {
        logger.info(`Connector updated: ${params.stationId}/${params.connectorId}`, body);
        return {
          success: true,
          data: { stationId: params.stationId, connectorId: params.connectorId, ...body },
          message: 'Connector updated successfully',
          timestamp: new Date()
        };
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3001);

console.log('🚗️ Station Management Service is running on port 3001');
console.log('📊 Health check: http://localhost:3001/health');
console.log('🏢 Stations API: http://localhost:3001/stations');
console.log('🔌 Connectors API: http://localhost:3001/connectors');