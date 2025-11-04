import { Prisma } from '@prisma/client';
import Omise from 'omise';
import { prisma } from '../../lib/prisma';

const { PaymentStatus } = Prisma;

// Initialize Omise client
const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!,
});

export class PaymentService {
  // Add payment card to user
  static async addPaymentCard(userId: string, token: string) {
    try {
      // Get or create Omise customer
      let user = await prisma.user.findUnique({
        where: { id: userId },
        include: { paymentCards: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      let customer;
      if (user.omiseCustomerId) {
        // Get existing customer
        customer = await omise.customers.retrieve(user.omiseCustomerId);
      } else {
        // Create new customer
        customer = await omise.customers.create({
          email: user.email,
          description: `Customer for user ${user.id}`,
          card: token
        });

        // Update user with Omise customer ID
        await prisma.user.update({
          where: { id: userId },
          data: { omiseCustomerId: customer.id }
        });
      }

      // If customer already exists, add card to customer
      if (user.omiseCustomerId && customer.id === user.omiseCustomerId) {
        await omise.customers.update(customer.id, {
          card: token
        });
        // Refresh customer data
        customer = await omise.customers.retrieve(customer.id);
      }

      // Get the latest card from customer
      const cards = customer.cards.data;
      if (!cards || cards.length === 0) {
        throw new Error('No cards found after adding');
      }

      const latestCard = cards[cards.length - 1];

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
          isDefault: user.paymentCards.length === 0 // First card is default
        }
      });

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
        },
        orderBy: { createdAt: 'desc' }
      });

      return cards;
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

      return { success: true };
    } catch (error) {
      console.error('Error removing payment card:', error);
      throw error;
    }
  }

  // Set default payment card
  static async setDefaultCard(userId: string, cardId: string) {
    try {
      // Unset all cards as default
      await prisma.paymentCard.updateMany({
        where: { 
          userId,
        },
        data: { isDefault: false }
      });

      // Set the selected card as default
      const updatedCard = await prisma.paymentCard.update({
        where: { 
          id: cardId,
        },
        data: { isDefault: true }
      });

      // Update Omise customer default card
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          paymentCards: {
            where: { id: cardId }
          }
        }
      });

      if (user?.omiseCustomerId && user.paymentCards.length > 0) {
        await omise.customers.update(user.omiseCustomerId, {
          default_card: user.paymentCards[0].omiseCardId
        });
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
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { 
          user: {
            include: { paymentCards: true }
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
        paymentCard = transaction.user.paymentCards.find(card => card.id === cardId);
      } else {
        paymentCard = transaction.user.paymentCards.find(card => card.isDefault);
      }

      if (!paymentCard) {
        throw new Error('No payment card found');
      }

      if (!transaction.user.omiseCustomerId) {
        throw new Error('User is missing Omise customer ID');
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          transactionId,
          userId: transaction.userId,
          amount: transaction.totalCost,
          status: PaymentStatus.PENDING,
        }
      });

      // Create Omise charge
      const charge = await omise.charges.create({
        amount: Math.round(transaction.totalCost * 100), // Convert to satang
        currency: 'THB',
        customer: transaction.user.omiseCustomerId,
        card: paymentCard.omiseCardId,
        description: `Payment for transaction ${transaction.transactionId}`,
        return_uri: `${process.env.BASE_URL}/api/payment/3ds/return`,
        metadata: {
          transactionId: transaction.id,
          paymentId: payment.id,
          userId: transaction.userId
        }
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
          eventType: 'CHARGE_CREATE',
          rawRequest: { charge_request: charge } as any,
          rawResponse: charge as any
        }
      });

      // Handle 3D Secure
      if (charge.authorize_uri) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PENDING }
        });

        return {
          success: true,
          requiresAction: true,
          authorizeUri: charge.authorize_uri,
          paymentId: payment.id,
          chargeId: charge.id
        };
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
      await this.handleFailedPayment(payment.id, charge.failure_message || 'Payment failed');
      return {
        success: false,
        error: charge.failure_message || 'Payment failed',
        paymentId: payment.id
      };

    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
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

  // Get payment history
  static async getPaymentHistory(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const payments = await prisma.payment.findMany({
        where: { userId },
        include: {
          transaction: {
            include: {
              chargePoint: true,
              connector: true
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
