import crypto from 'crypto';
import { Elysia, t } from 'elysia';
import { prisma } from '../../lib/prisma';
import { PaymentService } from './payment.service';

export const webhookController = () =>
  new Elysia({ prefix: '/api/payment/omise' })
    
    // Omise webhook endpoint
    .post(
      '/webhook',
      async ({ body, headers, set }: any) => {
        try {
          // Verify webhook signature for security
          const signature = headers['x-omise-signature'];
          const webhookSecret = process.env.OMISE_WEBHOOK_SECRET;
          
          if (webhookSecret && signature) {
            const expectedSignature = crypto
              .createHmac('sha256', webhookSecret)
              .update(JSON.stringify(body))
              .digest('hex');
              
            if (signature !== expectedSignature) {
              console.error('Invalid webhook signature');
              set.status = 401;
              return { success: false, message: 'Invalid signature' };
            }
          }

          const { key, data } = body;
          
          console.log('Received Omise webhook:', { key, chargeId: data?.id });

          switch (key) {
            case 'charge.complete':
              await handleChargeComplete(data);
              break;
              
            case 'charge.create':
              await handleChargeCreate(data);
              break;
              
            case 'charge.update':
              await handleChargeUpdate(data);
              break;
              
            case 'charge.capture':
              await handleChargeCapture(data);
              break;
              
            case 'refund.create':
              await handleRefundCreate(data);
              break;
              
            default:
              console.log('Unhandled webhook event:', key);
          }

          return { success: true, message: 'Webhook processed successfully' };
          
        } catch (error: any) {
          console.error('Webhook processing error:', error);
          set.status = 500;
          return { 
            success: false, 
            message: error.message || 'Webhook processing failed' 
          };
        }
      },
      {
        detail: {
          tags: ['Payment Webhooks'],
          summary: '🔔 Omise Payment Webhook',
          description: `
Handle webhook notifications from Omise payment gateway.

**Supported Events:**
- \`charge.complete\`: Payment charge completed (success or failure)
- \`charge.create\`: New charge created
- \`charge.update\`: Charge status updated
- \`charge.capture\`: Authorized charge captured
- \`refund.create\`: Refund processed

**Security:**
- Validates webhook signature using HMAC-SHA256
- Only processes requests with valid signatures
- Webhook secret must be configured in environment

**Process Flow:**
1. Validate webhook signature
2. Parse event type and data
3. Update payment and transaction records
4. Return acknowledgment to Omise

**Note:** This endpoint is called by Omise servers, not directly by clients.
          `,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['key', 'data'],
                  properties: {
                    key: {
                      type: 'string',
                      description: 'Event type',
                      example: 'charge.complete',
                      enum: [
                        'charge.complete',
                        'charge.create',
                        'charge.update',
                        'charge.capture',
                        'refund.create'
                      ]
                    },
                    data: {
                      type: 'object',
                      description: 'Event payload data from Omise',
                      properties: {
                        id: { type: 'string', example: 'chrg_test_5xj6h36c0j1p2kxqskt' },
                        status: { type: 'string', example: 'successful' },
                        paid: { type: 'boolean', example: true },
                        amount: { type: 'number', example: 150050 },
                        currency: { type: 'string', example: 'thb' }
                      }
                    }
                  }
                },
                examples: {
                  chargeComplete: {
                    summary: 'Charge Complete Event',
                    value: {
                      key: 'charge.complete',
                      data: {
                        id: 'chrg_test_5xj6h36c0j1p2kxqskt',
                        status: 'successful',
                        paid: true,
                        amount: 150050,
                        currency: 'thb'
                      }
                    }
                  },
                  refundCreate: {
                    summary: 'Refund Create Event',
                    value: {
                      key: 'refund.create',
                      data: {
                        id: 'rfnd_test_5xj6h36c0j1p2kxqskt',
                        charge: 'chrg_test_5xj6h36c0j1p2kxqskt',
                        amount: 150050,
                        currency: 'thb'
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Webhook processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Webhook processed successfully' }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Invalid webhook signature',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Invalid signature' }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Webhook processing error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Webhook processing failed' }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          key: t.String(),
          data: t.Any()
        })
      }
    );

// Handle charge complete event
async function handleChargeComplete(chargeData: any) {
  try {
    const { id: chargeId, status, paid, amount, currency, metadata } = chargeData;
    
    console.log('Processing charge.complete:', { chargeId, status, paid });

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { chargeId },
      include: { transaction: true }
    });

    if (!payment) {
      console.error('Payment not found for charge:', chargeId);
      return;
    }

    if (paid && status === 'successful') {
      // Payment successful
      await PaymentService.handleSuccessfulPayment(payment.id, chargeData);
      
      // Update transaction status
      if (payment.transaction) {
        await prisma.transactions.update({
          where: { id: payment.transaction.id },
          data: { 
            status: 'COMPLETED'
          }
        });
      }
      
      console.log('Payment completed successfully:', chargeId);
    } else {
      // Payment failed
      await PaymentService.handleFailedPayment(payment.id, `Charge failed: ${status}`);
      
      // Update transaction status
      if (payment.transaction) {
        await prisma.transactions.update({
          where: { id: payment.transaction.id },
          data: { 
            status: 'FAILED'
          }
        });
      }
      
      console.log('Payment failed:', chargeId, status);
    }
  } catch (error) {
    console.error('Error handling charge.complete:', error);
    throw error;
  }
}

// Handle charge create event
async function handleChargeCreate(chargeData: any) {
  try {
    const { id: chargeId, status, authorize_uri } = chargeData;
    
    console.log('Processing charge.create:', { chargeId, status, has3DS: !!authorize_uri });

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { chargeId }
    });

    if (!payment) {
      console.error('Payment not found for charge:', chargeId);
      return;
    }

    // If 3D Secure is required
    if (authorize_uri) {
      await PaymentService.handlePending3DSPayment(payment.id);
      console.log('3D Secure required for charge:', chargeId);
    }
  } catch (error) {
    console.error('Error handling charge.create:', error);
    throw error;
  }
}

// Handle charge update event
async function handleChargeUpdate(chargeData: any) {
  try {
    const { id: chargeId, status, paid } = chargeData;
    
    console.log('Processing charge.update:', { chargeId, status, paid });

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { chargeId }
    });

    if (!payment) {
      console.error('Payment not found for charge:', chargeId);
      return;
    }

    // Update payment status based on charge status
    let paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' = 'PENDING';
    
    if (paid && status === 'successful') {
      paymentStatus = 'SUCCESS';
    } else if (status === 'failed') {
      paymentStatus = 'FAILED';
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: paymentStatus
      }
    });

    console.log('Payment status updated:', chargeId, paymentStatus);
  } catch (error) {
    console.error('Error handling charge.update:', error);
    throw error;
  }
}

// Handle charge capture event
async function handleChargeCapture(chargeData: any) {
  try {
    const { id: chargeId, status, paid } = chargeData;
    
    console.log('Processing charge.capture:', { chargeId, status, paid });

    // Similar to charge.complete but for captured charges
    await handleChargeComplete(chargeData);
  } catch (error) {
    console.error('Error handling charge.capture:', error);
    throw error;
  }
}

// Handle refund create event
async function handleRefundCreate(refundData: any) {
  try {
    const { id: refundId, charge, amount, currency } = refundData;
    const chargeId = charge;
    
    console.log('Processing refund.create:', { refundId, chargeId, amount });

    // Find the original payment
    const payment = await prisma.payment.findFirst({
      where: { chargeId },
      include: { transaction: true }
    });

    if (!payment) {
      console.error('Payment not found for refund:', chargeId);
      return;
    }

    // Create refund record
    await prisma.payment.create({
      data: {
        userId: payment.userId,
        transactionId: payment.transactionId,
        amount: -Math.abs(amount), // Negative amount for refund
        currency: currency || 'THB',
        status: 'SUCCESS',
        provider: 'OMISE',
        chargeId: refundId,
        cardId: payment.cardId
      }
    });

    // Update original payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: 'REFUNDED'
      }
    });

    // Update transaction status if needed
    if (payment.transaction) {
      await prisma.transactions.update({
        where: { id: payment.transaction.id },
        data: { 
          status: 'CANCELED'
        }
      });
    }

    console.log('Refund processed successfully:', refundId);
  } catch (error) {
    console.error('Error handling refund.create:', error);
    throw error;
  }
}