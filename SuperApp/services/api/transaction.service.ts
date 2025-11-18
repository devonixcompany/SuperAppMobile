import { API_CONFIG } from '@/config/api.config';
import type { ApiResponse } from './client';
import { http } from './client';
import type { PaymentProcessingResult } from './payment.service';
import { webhookService, type WebhookPaymentData } from './webhook.service';

export interface CreateTransactionRequest {
  chargePointIdentity: string;
  connectorId: number;
  userId: string;
  vehicleId?: string;
  startTime?: string;
  websocketUrl?: string;
}

export interface CreateTransactionResponse {
  transactionId: string;
  ocppTransactionId?: number | null;
  status: string;
}

export interface TransactionSummaryResponse {
  transactionId: string;
  chargePointIdentity?: string | null;
  connectorNumber?: number | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  totalEnergy: number | null;
  meterStart: number | null;
  meterStop: number | null;
  totalCost: number | null;
  appliedRate: number | null;
  stopReason?: string | null;
}

export interface ProcessTransactionPaymentRequest {
  cardId?: string;
  returnUri?: string; // Optional return URI for 3DS flow
  force3DS?: boolean; // Force 3DS authentication for testing
}

export interface SelectCardRequest {
  cardId: string;
}

export interface ProcessPaymentRequest {
  returnUri?: string; // Optional return URI for 3DS flow
  force3DS?: boolean; // Force 3DS authentication for testing
}

export interface LatestCompletedTransactionResponse {
  id: string;
  userId: string;
  amount: number;
  startTime: string;
  endTime: string;
  energyConsumed: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  station: {
    id: string;
    name: string;
    location: string;
    lat: number;
    lng: number;
  };
  chargePoint: {
    id: string;
    connectorId: number;
    powerKw: number;
    connectorType: string;
  };
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    omiseChargeId?: string;
    createdAt: string;
  }>;
}

class TransactionService {
  async createTransaction(
    payload: CreateTransactionRequest
  ): Promise<ApiResponse<CreateTransactionResponse>> {
    return http.post<CreateTransactionResponse>(API_CONFIG.ENDPOINTS.TRANSACTIONS.CREATE, payload);
  }

  async getTransactionSummary(
    transactionId: string
  ): Promise<ApiResponse<TransactionSummaryResponse>> {
    return http.get<TransactionSummaryResponse>(
      API_CONFIG.ENDPOINTS.TRANSACTIONS.SUMMARY(transactionId)
    );
  }

  /**
   * Step 1: Select card for transaction
   */
  async selectCard(
    transactionId: string,
    data: SelectCardRequest
  ): Promise<ApiResponse<{ success: boolean }>> {
    return http.post<{ success: boolean }>(
      API_CONFIG.ENDPOINTS.PAYMENT.SELECT_CARD(transactionId),
      {
        cardId: data.cardId
      }
    );
  }

  /**
   * Step 2: Process payment for transaction
   */
  async processPayment(
    transactionId: string,
    data: ProcessPaymentRequest = {}
  ): Promise<ApiResponse<PaymentProcessingResult>> {
    const requestBody: any = {};
    
    if (data.returnUri) {
      requestBody.returnUri = data.returnUri;
    }
    
    if (data.force3DS) {
      requestBody.force3DS = data.force3DS;
    }
    
    return http.post<PaymentProcessingResult>(
      API_CONFIG.ENDPOINTS.PAYMENT.PROCESS_TRANSACTION_PAYMENT(transactionId),
      requestBody
    );
  }

  /**
   * Process transaction payment using new two-step flow
   * This method combines both steps: select card and process payment
   */
  async processTransactionPayment(
    transactionId: string,
    data: ProcessTransactionPaymentRequest
  ): Promise<ApiResponse<PaymentProcessingResult>> {
    if (!data.cardId) {
      throw new Error('cardId is required for processing payment');
    }
    
    try {
      // Step 1: Select card
      const selectResult = await this.selectCard(transactionId, { cardId: data.cardId });
      
      console.log('🔍 [SELECT CARD] Response:', JSON.stringify(selectResult, null, 2));
      
      // The HTTP call completed successfully (200 status), proceed to payment
      console.log('✅ [SELECT CARD] Card selected successfully');

      // Step 2: Process payment
      const paymentResult = await this.processPayment(transactionId, {
        returnUri: data.returnUri,
        force3DS: data.force3DS
      });

      console.log('🔍 [PROCESS PAYMENT] Response:', JSON.stringify(paymentResult, null, 2));
      console.log('✅ [PROCESS PAYMENT] Payment processed successfully');

      // Send webhook notification if payment was successful
      if (paymentResult.success && (paymentResult as any).data?.payment) {
        try {
          const payment = (paymentResult as any).data.payment;
          const webhookData: WebhookPaymentData = {
            key: "payment_success",
            data: {
              paymentId: payment.id,
              transactionId: transactionId,
              chargeId: payment.chargeId, // เพิ่ม chargeId ที่ backend ต้องการ
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              provider: payment.provider,
              timestamp: new Date().toISOString()
            }
          };
          
          console.log('📡 [WEBHOOK] Sending payment success notification');
          await webhookService.sendPaymentWebhook(webhookData);
          console.log('✅ [WEBHOOK] Payment webhook sent successfully');
        } catch (webhookError) {
          console.warn('⚠️ [WEBHOOK] Failed to send webhook:', webhookError);
          // Don't fail the payment process if webhook fails
        }
      }

      // Transform response to match UI expectations
      const transformedResult: PaymentProcessingResult = {
        success: paymentResult.success,
        requiresAction: false, // New API doesn't require 3DS action
        authorizeUri: (paymentResult as any).data?.authorizeUri,
        paymentId: (paymentResult as any).data?.payment?.id || '',
        chargeId: (paymentResult as any).data?.payment?.chargeId,
        error: paymentResult.success ? undefined : paymentResult.message
      };

      console.log('🔄 [TRANSFORM] Transformed response for UI:', JSON.stringify(transformedResult, null, 2));

      return { 
        ...paymentResult,
        data: transformedResult
      };
    } catch (error) {
      console.error('Error in processTransactionPayment:', error);
      throw error;
    }
  }

  async getLatestCompletedTransaction() {
    try {
      console.log('📊 [API] Fetching latest completed transaction');
      const response = await http.get(
        `${API_CONFIG.BASE_URL}/api/v1/user/payments/charging-history/latest-completed`
      );
      console.log('✅ [API] Latest completed transaction fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ [API] Error fetching latest completed transaction:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();
