import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';

const logger = new Logger('BillingService');

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Billing Service is healthy',
      timestamp: new Date(),
      service: 'billing-service'
    };
  })
  .group('/charging-sessions', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [],
          message: 'Charging sessions fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:id', ({ params }) => {
        return {
          success: true,
          data: {
            id: params.id,
            sessionId: `SESSION_${params.id}`,
            stationId: 'STATION_001',
            driverId: 'DRIVER_001',
            startTime: '2025-01-15T10:00:00Z',
            energyConsumed: 25.5,
            cost: 12.75,
            status: 'COMPLETED'
          },
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        logger.info('Charging session started', body);
        return {
          success: true,
          data: {
            sessionId: `SESSION_${Date.now()}`,
            startTime: new Date().toISOString(),
            status: 'ACTIVE',
            ...body
          },
          message: 'Charging session created successfully',
          timestamp: new Date()
        };
      })
      .put('/:id/complete', ({ params, body }) => {
        logger.info(`Charging session completed: ${params.id}`, body);
        return {
          success: true,
          data: {
            id: params.id,
            endTime: new Date().toISOString(),
            status: 'COMPLETED',
            ...body
          },
          message: 'Charging session completed successfully',
          timestamp: new Date()
        };
      })
  )
  .group('/invoices', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: [],
          message: 'Invoices fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:id', ({ params }) => {
        return {
          success: true,
          data: {
            id: params.id,
            invoiceNumber: `INV-${Date.now()}`,
            driverId: 'DRIVER_001',
            totalAmount: 25.50,
            status: 'PAID',
            items: [
              {
                description: 'Charging Session',
                quantity: 25.5,
                unitPrice: 1.00,
                amount: 25.50
              }
            ]
          },
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        logger.info('Invoice generated', body);
        return {
          success: true,
          data: {
            invoiceNumber: `INV-${Date.now()}`,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            ...body
          },
          message: 'Invoice generated successfully',
          timestamp: new Date()
        };
      })
  )
  .group('/pricing', (app) =>
    app
      .get('/tariffs', () => {
        return {
          success: true,
          data: [
            {
              id: 'BASIC',
              name: 'Basic Tariff',
              pricePerKwh: 1.00,
              currency: 'THB',
              active: true
            },
            {
              id: 'PREMIUM',
              name: 'Premium Tariff',
              pricePerKwh: 0.85,
              currency: 'THB',
              active: true
            }
          ],
          message: 'Tariffs fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/calculate', ({ query }) => {
        const { energy, tariffId } = query as { energy: string, tariffId: string };
        const pricePerKwh = tariffId === 'PREMIUM' ? 0.85 : 1.00;
        const totalCost = parseFloat(energy) * pricePerKwh;

        return {
          success: true,
          data: {
            energy: parseFloat(energy),
            tariffId,
            pricePerKwh,
            totalCost,
            currency: 'THB'
          },
          message: 'Cost calculated successfully',
          timestamp: new Date()
        };
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3003);

console.log('💰 Billing Service is running on port 3003');
console.log('📊 Health check: http://localhost:3003/health');
console.log('⚡ Charging Sessions API: http://localhost:3003/charging-sessions');
console.log('🧾 Invoices API: http://localhost:3003/invoices');
console.log('💵 Pricing API: http://localhost:3003/pricing');