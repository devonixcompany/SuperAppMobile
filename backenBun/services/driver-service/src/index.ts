import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';

const logger = new Logger('DriverService');

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Driver Management Service is healthy',
      timestamp: new Date(),
      service: 'driver-service'
    };
  })
  .group('/drivers', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [],
          message: 'Drivers fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:id', ({ params }) => {
        return {
          success: true,
          data: {
            id: params.id,
            userId: `DRIVER_${params.id}`,
            name: 'John Doe',
            email: 'john.doe@example.com',
            membershipLevel: 'PREMIUM',
            status: 'ACTIVE'
          },
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        logger.info('Driver created', body);
        return {
          success: true,
          data: body,
          message: 'Driver created successfully',
          timestamp: new Date()
        };
      })
  )
  .group('/rfid-cards', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [],
          message: 'RFID cards fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:cardId', ({ params }) => {
        return {
          success: true,
          data: {
            cardId: params.cardId,
            driverId: 'DRIVER_001',
            status: 'ACTIVE',
            expiresAt: '2025-12-31T23:59:59Z'
          },
          timestamp: new Date()
        };
      })
      .post('/validate', ({ body }) => {
        logger.info('RFID validation', body);
        return {
          success: true,
          data: {
            valid: true,
            driverId: 'DRIVER_001',
            membershipLevel: 'PREMIUM'
          },
          message: 'RFID card validated successfully',
          timestamp: new Date()
        };
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3002);

console.log('👨‍💼 Driver Management Service is running on port 3002');
console.log('📊 Health check: http://localhost:3002/health');
console.log('👥 Drivers API: http://localhost:3002/drivers');
console.log('🎫 RFID Cards API: http://localhost:3002/rfid-cards');