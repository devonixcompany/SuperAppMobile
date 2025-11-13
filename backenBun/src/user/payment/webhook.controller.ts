import crypto from 'crypto';
import { Elysia, t } from 'elysia';
import { prisma } from '../../lib/prisma';
import { PaymentService } from './payment.service';

type ChargeMetadata = {
  transactionId?: string;
  paymentId?: string;
  userId?: string;
};

async function findPaymentByChargeInfo(
  chargeId?: string,
  metadata?: ChargeMetadata,
  includeTransaction = false,
) {
  const include = includeTransaction ? { transaction: true } : undefined;

  if (chargeId) {
    const paymentByChargeId = await prisma.payment.findFirst({ where: { chargeId }, include });
    if (paymentByChargeId) {
      return paymentByChargeId;
    }
  }

  if (metadata?.paymentId) {
    const paymentByPaymentId = await prisma.payment.findUnique({
      where: { id: metadata.paymentId },
      include,
    });
    if (paymentByPaymentId) {
      return paymentByPaymentId;
    }
  }

  if (metadata?.transactionId) {
    const paymentByTransactionId = await prisma.payment.findFirst({
      where: { transactionId: metadata.transactionId },
      orderBy: { createdAt: 'desc' },
      include,
    });
    if (paymentByTransactionId) {
      return paymentByTransactionId;
    }
  }

  return null;
}

export const webhookController = () =>
  new Elysia({ prefix: '/api/payment/omise' })
    
    // Omise webhook endpoint
    .post(
      '/webhook',
      async ({ body, headers, set }: any) => {
        try {
          console.log('🔔 [WEBHOOK] Received request from Omise');
          console.log('🔔 [WEBHOOK] Headers:', {
            signature: headers['x-omise-signature'] ? 'present' : 'missing',
            contentType: headers['content-type']
          });
          console.log('🔔 [WEBHOOK] Body:', JSON.stringify(body, null, 2));

          // Verify webhook signature for security
          const signature = headers['x-omise-signature'];
          const webhookSecret = process.env.OMISE_WEBHOOK_SECRET;

          console.log('🔔 [WEBHOOK] Secret configured:', webhookSecret ? 'yes' : 'no');

          if (webhookSecret && signature) {
            const expectedSignature = crypto
              .createHmac('sha256', webhookSecret)
              .update(JSON.stringify(body))
              .digest('hex');

            console.log('🔔 [WEBHOOK] Signature validation:', {
              provided: signature,
              expected: expectedSignature,
              match: signature === expectedSignature
            });

            if (signature !== expectedSignature) {
              console.error('❌ [WEBHOOK] Invalid webhook signature');
              set.status = 401;
              return { success: false, message: 'Invalid signature' };
            }
            console.log('✅ [WEBHOOK] Signature valid');
          } else {
            console.log('⚠️ [WEBHOOK] Skipping signature validation (secret or signature missing)');
          }

          const { key, data } = body;

          console.log('🔔 [WEBHOOK] Processing event:', { key, chargeId: data?.id });

          switch (key) {
            case 'charge.complete':
              await handleChargeComplete(data);
              break;
            
            // Newer event keys explicitly for success/failed
            case 'charge.succeeded':
              await handleChargeComplete(data);
              break;
            case 'charge.failed':
              await handleChargeUpdate(data);
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

    // Find the payment record using helper that considers metadata fallbacks
    const payment = await findPaymentByChargeInfo(chargeId, metadata, true);

    if (!payment) {
      console.error('Payment not found for charge:', chargeId, { metadata });
      return;
    }

    if (paid && status === 'successful') {
      // Payment successful
      console.log('✅ [WEBHOOK] Payment successful, updating payment and transaction...', {
        paymentId: payment.id,
        chargeId,
        amount: payment.amount,
        transactionId: payment.transaction?.id
      });

      await PaymentService.handleSuccessfulPayment(payment.id, chargeData);

      // Update transaction status
      if (payment.transaction) {
        await prisma.transactions.update({
          where: { id: payment.transaction.id },
          data: {
            status: 'COMPLETED'
          }
        });
        console.log('✅ [WEBHOOK] Transaction status updated to COMPLETED');
      }

      console.log('✅ [WEBHOOK] Payment completed successfully:', chargeId);
    } else {
      // Payment failed
      console.log('❌ [WEBHOOK] Payment failed, updating payment and transaction...', {
        paymentId: payment.id,
        chargeId,
        status,
        paid
      });

      await PaymentService.handleFailedPayment(payment.id, `Charge failed: ${status}`);

      // Update transaction status
      if (payment.transaction) {
        await prisma.transactions.update({
          where: { id: payment.transaction.id },
          data: {
            status: 'FAILED'
          }
        });
        console.log('❌ [WEBHOOK] Transaction status updated to FAILED');
      }

      console.log('❌ [WEBHOOK] Payment failed:', chargeId, status);
    }
  } catch (error) {
    console.error('Error handling charge.complete:', error);
    throw error;
  }
}

// Handle charge create event
async function handleChargeCreate(chargeData: any) {
  try {
    const { id: chargeId, status, authorize_uri, metadata } = chargeData;
    
    console.log('Processing charge.create:', { chargeId, status, has3DS: !!authorize_uri });

    // Find the payment record using helper
    const payment = await findPaymentByChargeInfo(chargeId, metadata);

    if (!payment) {
      console.error('Payment not found for charge:', chargeId, { metadata });
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
    const { id: chargeId, status, paid, metadata } = chargeData;
    
    console.log('Processing charge.update:', { chargeId, status, paid });

    // Find the payment record using helper
    const payment = await findPaymentByChargeInfo(chargeId, metadata);

    if (!payment) {
      console.error('Payment not found for charge:', chargeId, { metadata });
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

    // Find the original payment using helper
    const payment = await findPaymentByChargeInfo(chargeId, undefined, true);

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
