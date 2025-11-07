import { PaymentStatus } from '@prisma/client';
import Omise from 'omise';
import { prisma } from '../../lib/prisma';

// Initialize Omise client
const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!,
});

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

      let customer;
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
        await omise.customers.update(customer.id, {
          card: token
        });
        // Refresh customer data to get the new card
        customer = await omise.customers.retrieve(customer.id);
        console.log('✅ Added card to existing customer:', customer.id);
      }

      const shouldSetDefault = Boolean(setDefault) || user.paymentCards.length === 0;

      // Get the latest card from customer
      const cards = customer.cards.data;
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
          default_card: latestCard.id
        });
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
            default_card: nextDefault.omiseCardId
          });
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
          default_card: targetCard.omiseCardId
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

      // Create Omise charge
      const charge = await omise.charges.create({
        amount: Math.round(transaction.totalCost * 100), // Convert to satang
        currency: 'THB',
        customer: transaction.User.omiseCustomerId,
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
