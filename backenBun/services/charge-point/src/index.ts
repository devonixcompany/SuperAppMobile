import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';

const logger = new Logger('ChargePointService');

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Charge Point Service is healthy',
      timestamp: new Date(),
      service: 'charge-point-service'
    };
  })
  .group('/charge-points', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [],
          message: 'Charge points fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:id', ({ params }) => {
        return {
          success: true,
          data: {
            id: params.id,
            chargePointId: `CP_${params.id}`,
            status: 'AVAILABLE',
            vendor: 'Example Vendor',
            model: 'Example Model'
          },
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        logger.info('Charge point created', body);
        return {
          success: true,
          data: body,
          message: 'Charge point created successfully',
          timestamp: new Date()
        };
      })
  )
  .group('/transactions', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [],
          message: 'Transactions fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:id', ({ params }) => {
        return {
          success: true,
          data: {
            id: params.id,
            transactionId: parseInt(params.id),
            status: 'STARTED',
            energyConsumed: 0
          },
          timestamp: new Date()
        };
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(4001);

console.log('🔌 Charge Point Service is running on port 4001');
console.log('📊 Health check: http://localhost:4001/health');
console.log('📍 Charge Points API: http://localhost:4001/charge-points');
console.log('⚡ Transactions API: http://localhost:4001/transactions');