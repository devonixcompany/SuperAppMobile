import { PaymentStatus } from '@prisma/client';
import Omise from 'omise';
import { Buffer } from 'buffer';
import { prisma } from '../../lib/prisma';

// Initialize Omise client
const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!,
});

// Omise Source (3DS) response shape (minimal fields used)
interface OmiseSource {
  id: string;
  redirect?: {
    url?: string;
    uri?: string;
  };
}

// Helper: create 3DS source via Omise REST (ensures compatibility)
async function createThreeDSSource(cardId: string, amount: number, returnUri: string): Promise<OmiseSource> {
  const secretKey = process.env.OMISE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('OMISE_SECRET_KEY is not configured');
  }

  const auth = Buffer.from(`${secretKey}:`).toString('base64');

  const body = new URLSearchParams({
    type: 'three_d_secure',
    amount: String(amount),
    currency: 'THB',
    card: cardId,
    return_uri: returnUri,
  }).toString();

  try {
    const resp = await fetch('https://api.omise.co/sources', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const json: any = await resp.json();
    if (!resp.ok) {
      const code = json?.code || 'omise_error';
      const message = json?.message || 'Failed to create 3DS source';
      const err = new Error(`[Omise] ${code}: ${message}`);
      // Attach raw details
      (err as any).details = json;
      throw err;
    }
    if (!json || typeof json.id !== 'string') {
      throw new Error('Invalid source response: missing id');
    }
    return {
      id: json.id,
      redirect: json.redirect,
    };
  } catch (e: any) {
    console.error('❌ Failed to create 3DS Source:', e?.details || e);
    throw e;
  }
}

export class PaymentService {
  // Add payment card to user
  static async addPaymentCard(userId: string, token: string, setDefault?: boolean) {
    try {
      // Get or create Omise customer
      let user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          paymentCards: {
            where: { deletedAt: null }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      let customer: any | null = null;
      let customerExists = false;

      // Try to get existing customer if omiseCustomerId exists
      if (user.omiseCustomerId) {
        try {
          customer = await omise.customers.retrieve(user.omiseCustomerId);
          customerExists = true;
          console.log('✅ Found existing Omise customer:', customer.id);
        } catch (error: any) {
          // Customer not found in Omise, need to create new one
          console.log('⚠️ Omise customer not found, creating new one:', error.message);
          customerExists = false;
        }
      }

      // Create new customer if doesn't exist
      if (!customerExists) {
        customer = await omise.customers.create({
          email: user.email,
          description: `Customer for user ${user.id}`,
          card: token
        });

        console.log('✅ Created new Omise customer:', customer.id);

        // Update user with new Omise customer ID
        await prisma.user.update({
          where: { id: userId },
          data: { omiseCustomerId: customer.id }
        });
      } else {
        // Customer exists, add card to existing customer
        const currentCustomerId = customer?.id ?? user.omiseCustomerId;
        if (!currentCustomerId) {
          throw new Error('Omise customer is not initialized');
        }
        await omise.customers.update(currentCustomerId, {
          card: token
        });
        // Refresh customer data to get the new card
        customer = await omise.customers.retrieve(currentCustomerId);
        console.log('✅ Added card to existing customer:', currentCustomerId);
      }

      const shouldSetDefault = Boolean(setDefault) || user.paymentCards.length === 0;

      // Get the latest card from customer
      if (!customer) {
        throw new Error('Failed to initialize Omise customer');
      }
      const cards = customer.cards?.data ?? [];
      if (!cards || cards.length === 0) {
        throw new Error('No cards found after adding');
      }

      const latestCard = cards[cards.length - 1];

      if (shouldSetDefault && user.paymentCards.length > 0) {
        await prisma.paymentCard.updateMany({
          where: {
            userId,
            deletedAt: null
          },
          data: { isDefault: false }
        });
      }

      // Save PaymentCard
      const paymentCard = await prisma.paymentCard.create({
        data: {
          userId,
          omiseCardId: latestCard.id,
          omiseCustomerId: customer.id,
          brand: latestCard.brand || null,
          lastDigits: latestCard.last_digits || null,
          expirationMonth: latestCard.expiration_month || null,
          expirationYear: latestCard.expiration_year || null,
          isDefault: shouldSetDefault
        }
      });

      if (shouldSetDefault) {
        await omise.customers.update(customer.id, {
          // Omise API expects 'default' for default card update
          default: latestCard.id
        } as any);
      }

      return paymentCard;
    } catch (error) {
      console.error('Error adding payment card:', error);
      throw error;
    }
  }

  // Get user's payment cards
  static async getPaymentCards(userId: string) {
    try {
      const cards = await prisma.paymentCard.findMany({
        where: {
          userId,
          deletedAt: null
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return cards.map(({ deletedAt, ...card }) => card);
    } catch (error) {
      console.error('Error getting payment cards:', error);
      throw error;
    }
  }

  // Remove payment card
  static async removePaymentCard(userId: string, cardId: string) {
    try {
      const card = await prisma.paymentCard.findFirst({
        where: { 
          id: cardId,
          userId,
          deletedAt: null
        }
      });

      if (!card) {
        throw new Error('Card not found');
      }

      // Delete from Omise
      if (!card.omiseCustomerId) {
        throw new Error('Card is missing customer reference');
      }

      await omise.customers.destroyCard(card.omiseCustomerId, card.omiseCardId);

      // Delete from database
      await prisma.paymentCard.delete({
        where: { id: cardId }
      });

      if (card.isDefault) {
        const nextDefault = await prisma.paymentCard.findFirst({
          where: {
            userId,
            deletedAt: null
          },
          orderBy: [
            { createdAt: 'desc' }
          ]
        });

        if (nextDefault) {
          await prisma.paymentCard.update({
            where: { id: nextDefault.id },
            data: { isDefault: true }
          });

          await omise.customers.update(card.omiseCustomerId, {
            default: nextDefault.omiseCardId
          } as any);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing payment card:', error);
      throw error;
    }
  }

  // Set default payment card
  static async setDefaultCard(userId: string, cardId: string) {
    try {
      const targetCard = await prisma.paymentCard.findFirst({
        where: {
          id: cardId,
          userId,
          deletedAt: null
        }
      });

      if (!targetCard) {
        throw new Error('Card not found');
      }

      // Unset all cards as default
      await prisma.paymentCard.updateMany({
        where: { 
          userId,
          deletedAt: null
        },
        data: { isDefault: false }
      });

      // Set the selected card as default
      const updatedCard = await prisma.paymentCard.update({
        where: { 
          id: targetCard.id,
        },
        data: { isDefault: true }
      });

      // Update Omise customer default card
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          paymentCards: {
            where: { id: targetCard.id }
          }
        }
      });

      if (user?.omiseCustomerId) {
        await omise.customers.update(user.omiseCustomerId, {
          default: targetCard.omiseCardId
        } as any);
      }

      return updatedCard;
    } catch (error) {
      console.error('Error setting default card:', error);
      throw error;
    }
  }

  // Process payment for transaction
  static async processPayment(transactionId: string, cardId?: string) {
    try {
      const normalizedId = transactionId.trim();
      const transaction = await prisma.transactions.findFirst({
        where: {
          OR: [
            { id: normalizedId },
            { transactionId: normalizedId },
            { ocppTransactionId: normalizedId }
          ]
        },
        include: { 
          User: {
            include: { 
              paymentCards: {
                where: { deletedAt: null }
              }
            }
          }
        }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (!transaction.totalCost || transaction.totalCost <= 0) {
        throw new Error('Invalid transaction amount');
      }

      // Get payment card
      let paymentCard;
      if (cardId) {
        paymentCard = transaction.User.paymentCards.find(card => card.id === cardId);
      } else {
        paymentCard = transaction.User.paymentCards.find(card => card.isDefault);
      }

      if (!paymentCard) {
        throw new Error('No payment card found');
      }

      if (!transaction.User.omiseCustomerId) {
        throw new Error('User is missing Omise customer ID');
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
          amount: transaction.totalCost,
          status: PaymentStatus.PENDING,
        }
      });

      // Create 3DS Source first (card + 3ds)
      const amountSatang = Math.round(transaction.totalCost * 100);
      const rawBaseUrl = process.env.BASE_URL || process.env.FRONTEND_URL;
      if (!rawBaseUrl) {
        throw new Error('BASE_URL or FRONTEND_URL must be configured for 3DS return');
      }
      // Sanitize possible stray backticks/spaces and trailing slash
      const baseUrl = rawBaseUrl.trim().replace(/^`+|`+$/g, '');
      const baseUrlNoSlash = baseUrl.replace(/\/+$/, '');
      const returnUri = `${baseUrlNoSlash}/api/payment/3ds/return`;

      console.log('💳 Creating 3DS Source...', {
        amount: amountSatang,
        currency: 'THB',
        transactionId: transaction.transactionId,
        paymentId: payment.id,
        cardId: paymentCard.omiseCardId,
        returnUri
      });

      let source: OmiseSource | null = null;
      try {
        source = await createThreeDSSource(
          paymentCard.omiseCardId,
          amountSatang,
          returnUri
        );
      } catch (e: any) {
        console.warn('⚠️  3DS Source creation failed, falling back to charge with customer+card', {
          error: e?.message || e,
          details: e?.details || null
        });
        // Log the source creation error
        await prisma.paymentLog.create({
          data: {
            paymentId: payment.id,
            eventType: 'SOURCE_CREATE_ERROR',
            rawRequest: { amount: amountSatang, currency: 'THB', cardId: paymentCard.omiseCardId, returnUri } as any,
            rawResponse: { error: e?.message, details: e?.details } as any,
          }
        });
      }

      // Log the source request/response
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          eventType: 'SOURCE_CREATE',
          rawRequest: { amount: amountSatang, currency: 'THB', cardId: paymentCard.omiseCardId } as any,
          rawResponse: source as any
        }
      });

      // Create Omise charge (prefer Source for 3DS; fallback to customer+card)
      let charge: any;
      if (source && (source as OmiseSource).id) {
        console.log('💳 Creating Omise charge with Source...', {
          amount: amountSatang,
          currency: 'THB',
          sourceId: (source as OmiseSource).id,
          transactionId: transaction.transactionId,
          paymentId: payment.id
        });

        charge = await omise.charges.create({
          amount: amountSatang,
          currency: 'THB',
          source: (source as OmiseSource).id,
          return_uri: returnUri,
          description: `Payment for transaction ${transaction.transactionId}`,
          metadata: {
            transactionId: transaction.id,
            paymentId: payment.id,
            userId: transaction.userId
          }
        });
      } else {
        console.log('💳 Creating Omise charge with customer+card (fallback)...', {
          amount: amountSatang,
          currency: 'THB',
          customerId: transaction.User.omiseCustomerId,
          cardId: paymentCard.omiseCardId,
          transactionId: transaction.transactionId,
          paymentId: payment.id,
          returnUri
        });

        charge = await omise.charges.create({
          amount: amountSatang,
          currency: 'THB',
          customer: transaction.User.omiseCustomerId,
          card: paymentCard.omiseCardId,
          return_uri: returnUri,
          description: `Payment for transaction ${transaction.transactionId}`,
          metadata: {
            transactionId: transaction.id,
            paymentId: payment.id,
            userId: transaction.userId
          }
        });
      }

      console.log('💳 Charge created:', {
        chargeId: charge.id,
        status: charge.status,
        paid: charge.paid,
        authorize_uri: charge.authorize_uri ? 'present' : 'none'
      });

      // Update payment with charge info
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          chargeId: charge.id,
          cardId: paymentCard.omiseCardId,
        }
      });

      // Log the charge request/response
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          eventType: source ? 'CHARGE_CREATE' : 'CHARGE_CREATE_FALLBACK',
          rawRequest: { charge_request: charge } as any,
          rawResponse: charge as any
        }
      });

      // Handle 3D Secure: use ONLY charge.authorize_uri
      const authorizeUri = (charge as any).authorize_uri;
      if (authorizeUri) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PENDING, authorizeUri }
        });

        return {
          success: true,
          requiresAction: true,
          authorizeUri,
          paymentId: payment.id,
          chargeId: charge.id
        };
      }

      // If a 3DS Source was created but authorize_uri is missing, log a diagnostic event
      if (source && (source as OmiseSource).id && !(charge as any).authorize_uri) {
        await prisma.paymentLog.create({
          data: {
            paymentId: payment.id,
            eventType: 'MISSING_AUTHORIZE_URI',
            rawRequest: { sourceId: (source as OmiseSource).id, chargeId: charge.id } as any,
            rawResponse: { charge } as any,
          }
        });
      }

      // Handle successful payment
      if (charge.paid) {
        await this.handleSuccessfulPayment(payment.id, charge);
        return {
          success: true,
          requiresAction: false,
          paymentId: payment.id,
          chargeId: charge.id
        };
      }

      // Handle failed payment
      if (charge.status === 'failed') {
        await this.handleFailedPayment(payment.id, charge.failure_message || 'Payment failed');
        return {
          success: false,
          error: charge.failure_message || 'Payment failed',
          paymentId: payment.id
        };
      }

      // Payment is pending - wait for webhook
      console.log('💳 Payment is pending, waiting for webhook confirmation...', {
        chargeId: charge.id,
        status: charge.status,
        paid: charge.paid
      });

      return {
        success: true,
        requiresAction: false,
        pending: true,
        paymentId: payment.id,
        chargeId: charge.id
      };

    } catch (error: any) {
      console.error('Error processing payment:', error);
      const message =
        (error && typeof error === 'object' && 'message' in error ? String(error.message) : null) ||
        (error?.details?.message ? String(error.details.message) : null) ||
        'Failed to process payment';
      // Re-throw as a standard Error to ensure controllers return a meaningful 4xx message
      throw new Error(message);
    }
  }

  static async finalizeChargeStatus(
    chargeId: string,
    status: string,
    failureMessage?: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { chargeId }
    });

    if (!payment) {
      throw new Error('Payment not found for charge');
    }

    if (status === 'successful') {
      await this.handleSuccessfulPayment(payment.id, { status });
      return { success: true };
    }

    await this.handleFailedPayment(payment.id, failureMessage || 'Payment failed');
    return { success: false };
  }

  // Handle successful payment
  static async handleSuccessfulPayment(paymentId: string, chargeData: any) {
    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date()
        }
      });

      // Log success
      await prisma.paymentLog.create({
        data: {
          paymentId,
          eventType: 'PAYMENT_SUCCESS',
          rawRequest: {} as any,
          rawResponse: chargeData as any
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  // Handle failed payment
  static async handleFailedPayment(paymentId: string, errorMessage: string) {
    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          failureMessage: errorMessage
        }
      });

      // Log failure
      await prisma.paymentLog.create({
        data: {
          paymentId,
          eventType: 'PAYMENT_FAILED',
          rawRequest: {} as any,
          rawResponse: { error: errorMessage } as any
        }
      });

      return { success: false, error: errorMessage };
    } catch (error) {
      console.error('Error handling failed payment:', error);
      throw error;
    }
  }

  // Handle pending 3DS payment
  static async handlePending3DSPayment(paymentId: string) {
    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PENDING
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error handling pending 3DS payment:', error);
      throw error;
    }
  }

  // Get single payment status, optionally sync from Omise
  static async getPaymentStatus(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // If already terminal state, return immediately
      if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) {
        return {
          id: payment.id,
          status: payment.status,
          failureMessage: payment.failureMessage ?? null,
          chargeId: payment.chargeId ?? null,
        };
      }

      // If pending and we have a chargeId, try to retrieve latest charge state from Omise
      if (payment.status === PaymentStatus.PENDING && payment.chargeId) {
        try {
          const charge = await omise.charges.retrieve(payment.chargeId);

          // Successful payment
          if (charge.paid && charge.status === 'successful') {
            await this.handleSuccessfulPayment(payment.id, charge);
          }
          // Failed payment
          else if (charge.status === 'failed') {
            await this.handleFailedPayment(payment.id, charge.failure_message || 'Payment failed');
          }
          // Otherwise still pending; keep status as is
        } catch (err) {
          console.warn('⚠️ Could not retrieve charge from Omise:', err);
        }

        // Reload payment after potential update
        const updated = await prisma.payment.findUnique({ where: { id: paymentId } });
        return {
          id: updated!.id,
          status: updated!.status,
          failureMessage: updated!.failureMessage ?? null,
          chargeId: updated!.chargeId ?? null,
        };
      }

      return {
        id: payment.id,
        status: payment.status,
        failureMessage: payment.failureMessage ?? null,
        chargeId: payment.chargeId ?? null,
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  // Get payment history
  static async getPaymentHistory(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const payments = await prisma.payment.findMany({
        where: { userId },
        include: {
          transaction: {
            include: {
              charge_points: true,
              connectors: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      const total = await prisma.payment.count({
        where: { userId }
      });

      return {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }
}
