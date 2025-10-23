import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { createHash, randomUUID } from 'crypto';
import Omise from 'omise';

// Simple logger for now
class SimpleLogger {
  constructor(private serviceName: string) {}

  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }

  error(message: string, error?: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: this.serviceName,
      message,
      ...(error && { error })
    }));
  }

  warn(message: string, meta?: any) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }
}

const logger = new SimpleLogger('PaymentService');

// Initialize Omise client
const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY || 'pkey_test_5xq8s2o2p2x0j8g8x2x',
  secretKey: process.env.OMISE_SECRET_KEY || 'skey_test_5xq8s2o2p2x0j8g8x2x'
});

// Database simulation (in production, use proper database)
const paymentRecords = new Map();
const customerCards = new Map();
const paymentMethods = new Map();

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Payment Service is healthy',
      timestamp: new Date(),
      service: 'payment-service',
      omise: {
        configured: !!process.env.OMISE_SECRET_KEY,
        mode: process.env.OMISE_PUBLIC_KEY?.includes('test') ? 'test' : 'live'
      }
    };
  })

  // Payment Methods Management
  .group('/payment-methods', (app) =>
    app
      .post('/omise/create-customer', async ({ body }) => {
        try {
          const { userId, email, description } = body as any;

          const customer = await omise.customers.create({
            email,
            description: description || `Customer ${userId}`,
            metadata: { userId }
          });

          customerCards.set(userId, {
            omiseCustomerId: customer.id,
            email,
            createdAt: new Date().toISOString()
          });

          logger.info('Omise customer created', { userId, customerId: customer.id });

          return {
            success: true,
            data: {
              customerId: customer.id,
              userId,
              email,
              createdAt: customer.created_at
            },
            message: 'Customer created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create Omise customer', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create customer',
            timestamp: new Date()
          };
        }
      })

      .post('/omise/add-card', async ({ body }) => {
        try {
          const { userId, omiseCustomerId, token } = body as any;

          const customer = await omise.customers.retrieve(omiseCustomerId);
          const card = await omise.customers.update(omiseCustomerId, {
            card: token
          });

          // Store card info
          const userCards = customerCards.get(userId) || { cards: [] };
          userCards.cards.push({
            id: card.cards.data[0].id,
            last4: card.cards.data[0].last_digits,
            brand: card.cards.data[0].brand,
            created: card.cards.data[0].created_at
          });
          customerCards.set(userId, userCards);

          logger.info('Card added to customer', { userId, cardId: card.cards.data[0].id });

          return {
            success: true,
            data: {
              cardId: card.cards.data[0].id,
              last4: card.cards.data[0].last_digits,
              brand: card.cards.data[0].brand,
              created: card.cards.data[0].created_at
            },
            message: 'Card added successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to add card', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to add card',
            timestamp: new Date()
          };
        }
      })

      .get('/:userId', ({ params }) => {
        const userMethods = customerCards.get(params.userId);
        if (!userMethods) {
          return {
            success: false,
            error: 'No payment methods found',
            timestamp: new Date()
          };
        }

        return {
          success: true,
          data: userMethods,
          message: 'Payment methods retrieved successfully',
          timestamp: new Date()
        };
      })
  )

  // Charge Processing
  .group('/charges', (app) =>
    app
      .post('/omise/create-charge', async ({ body }) => {
        try {
          const {
            amount,
            currency = 'thb',
            cardId,
            customerId,
            description,
            metadata
          } = body as any;

          const charge = await omise.charges.create({
            amount: amount * 100, // Convert to satang (cents)
            currency,
            card: cardId,
            customer: customerId,
            description: description || 'Charging station payment',
            metadata: {
              ...metadata,
              service: 'csms',
              timestamp: new Date().toISOString()
            },
            return_uri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/complete`
          });

          const paymentRecord = {
            id: randomUUID(),
            chargeId: charge.id,
            amount: charge.amount / 100,
            currency: charge.currency,
            status: charge.status,
            description: charge.description,
            metadata: charge.metadata,
            userId: metadata?.userId,
            sessionId: metadata?.sessionId,
            createdAt: new Date().toISOString()
          };

          paymentRecords.set(paymentRecord.id, paymentRecord);

          logger.info('Payment charge created', {
            paymentId: paymentRecord.id,
            chargeId: charge.id,
            amount: paymentRecord.amount,
            status: charge.status
          });

          return {
            success: true,
            data: {
              paymentId: paymentRecord.id,
              chargeId: charge.id,
              amount: paymentRecord.amount,
              currency: paymentRecord.currency,
              status: charge.status,
              authorizeUri: charge.authorize_uri, // For 3D Secure
              description: paymentRecord.description,
              metadata: paymentRecord.metadata
            },
            message: 'Payment charge created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create charge', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create payment charge',
            timestamp: new Date()
          };
        }
      })

      .post('/omise/internet-banking', async ({ body }) => {
        try {
          const {
            amount,
            currency = 'thb',
            sourceType = 'internet_banking_bay',
            description,
            metadata
          } = body as any;

          const charge = await omise.charges.create({
            amount: amount * 100,
            currency,
            source: sourceType,
            description: description || 'Charging station payment via internet banking',
            metadata: {
              ...metadata,
              service: 'csms',
              paymentType: 'internet_banking',
              timestamp: new Date().toISOString()
            },
            return_uri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/complete`
          });

          const paymentRecord = {
            id: randomUUID(),
            chargeId: charge.id,
            amount: charge.amount / 100,
            currency: charge.currency,
            status: charge.status,
            source: charge.source,
            description: charge.description,
            metadata: charge.metadata,
            userId: metadata?.userId,
            sessionId: metadata?.sessionId,
            createdAt: new Date().toISOString()
          };

          paymentRecords.set(paymentRecord.id, paymentRecord);

          logger.info('Internet banking payment created', {
            paymentId: paymentRecord.id,
            chargeId: charge.id,
            amount: paymentRecord.amount,
            sourceType
          });

          return {
            success: true,
            data: {
              paymentId: paymentRecord.id,
              chargeId: charge.id,
              amount: paymentRecord.amount,
              currency: paymentRecord.currency,
              status: charge.status,
              authorizeUri: charge.authorize_uri,
              source: charge.source,
              description: paymentRecord.description,
              metadata: paymentRecord.metadata
            },
            message: 'Internet banking payment created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create internet banking payment', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create internet banking payment',
            timestamp: new Date()
          };
        }
      })

      .get('/:paymentId', ({ params }) => {
        const payment = paymentRecords.get(params.paymentId);
        if (!payment) {
          return {
            success: false,
            error: 'Payment not found',
            timestamp: new Date()
          };
        }

        return {
          success: true,
          data: payment,
          message: 'Payment retrieved successfully',
          timestamp: new Date()
        };
      })

      .post('/:paymentId/verify', async ({ params, body }) => {
        try {
          const payment = paymentRecords.get(params.paymentId);
          if (!payment) {
            return {
              success: false,
              error: 'Payment not found',
              timestamp: new Date()
            };
          }

          // Verify with Omise
          const charge = await omise.charges.retrieve(payment.chargeId);

          // Update payment record
          const updatedPayment = {
            ...payment,
            status: charge.status,
            failureCode: charge.failure_code,
            failureMessage: charge.failure_message,
            updated: new Date().toISOString()
          };

          paymentRecords.set(params.paymentId, updatedPayment);

          logger.info('Payment verified', {
            paymentId: params.paymentId,
            chargeId: charge.id,
            status: charge.status
          });

          return {
            success: true,
            data: updatedPayment,
            message: 'Payment verified successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to verify payment', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to verify payment',
            timestamp: new Date()
          };
        }
      })
  )

  // QR Code Payments (PromptPay, TrueMoney, etc.)
  .group('/qr-codes', (app) =>
    app
      .post('/create', async ({ body }) => {
        try {
          const { amount, currency = 'thb', description, metadata } = body as any;

          // Create source for PromptPay
          const source = await omise.sources.create({
            type: 'promptpay',
            amount: amount * 100,
            currency,
            barcode: `${randomUUID()}-${Date.now()}`,
            description: description || 'Charging station payment via PromptPay',
            metadata: {
              ...metadata,
              service: 'csms',
              paymentType: 'promptpay',
              timestamp: new Date().toISOString()
            }
          });

          const paymentRecord = {
            id: randomUUID(),
            sourceId: source.id,
            amount: source.amount / 100,
            currency: source.currency,
            status: source.status,
            qrCodeData: source.scannable_code?.data,
            barcode: source.barcode,
            description: source.description,
            metadata: source.metadata,
            userId: metadata?.userId,
            sessionId: metadata?.sessionId,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            createdAt: new Date().toISOString()
          };

          paymentRecords.set(paymentRecord.id, paymentRecord);

          logger.info('QR Code payment created', {
            paymentId: paymentRecord.id,
            sourceId: source.id,
            amount: paymentRecord.amount
          });

          return {
            success: true,
            data: {
              paymentId: paymentRecord.id,
              sourceId: source.id,
              amount: paymentRecord.amount,
              currency: paymentRecord.currency,
              status: paymentRecord.status,
              qrCodeData: paymentRecord.qrCodeData,
              barcode: paymentRecord.barcode,
              expiresAt: paymentRecord.expiresAt,
              description: paymentRecord.description,
              metadata: paymentRecord.metadata
            },
            message: 'QR Code payment created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create QR code payment', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create QR code payment',
            timestamp: new Date()
          };
        }
      })
  )

  // Webhook handler for Omise events
  .post('/webhooks/omise', async ({ body }) => {
    try {
      const { key, data } = body as any;

      // Verify webhook signature (in production)
      // const signature = request.headers.get('Omise-Signature');

      logger.info('Omise webhook received', { key, data });

      if (key === 'charge.complete') {
        const charge = data;
        const paymentId = charge.metadata?.paymentId;

        if (paymentId) {
          const payment = paymentRecords.get(paymentId);
          if (payment) {
            const updatedPayment = {
              ...payment,
              status: charge.status,
              failureCode: charge.failure_code,
              failureMessage: charge.failure_message,
              completedAt: new Date().toISOString()
            };
            paymentRecords.set(paymentId, updatedPayment);

            logger.info('Payment completed via webhook', {
              paymentId,
              chargeId: charge.id,
              amount: charge.amount / 100,
              status: charge.status
            });
          }
        }
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
        timestamp: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to process webhook', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to process webhook',
        timestamp: new Date()
      };
    }
  })

  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3005);

console.log('💳 Payment Service is running on port 3005');
console.log('🔑 Health check: http://localhost:3005/health');
console.log('💳 Payment Methods API: http://localhost:3005/payment-methods');
console.log('⚡ Charges API: http://localhost:3005/charges');
console.log('📱 QR Codes API: http://localhost:3005/qr-codes');
console.log('🔗 Webhook endpoint: http://localhost:3005/webhooks/omise');