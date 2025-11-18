/**
 * Payment Service
 * Handles all payment-related API calls
 */

import { API_CONFIG } from '@/config/api.config';
import type { ApiResponse } from './client';
import { http } from './client';

export interface PaymentCard {
  id: string;
  omiseCardId: string;
  omiseCustomerId?: string | null;
  brand: string | null;
  lastDigits: string | null;
  expirationMonth: number | null;
  expirationYear: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddPaymentCardRequest {
  token: string;
  setDefault?: boolean;
}

export interface PaymentProcessingResult {
  success: boolean;
  requiresAction: boolean;
  authorizeUri?: string;
  paymentId: string;
  chargeId?: string;
  error?: string;
}

export interface ProcessPaymentRequest {
  transactionId: string;
  cardId?: string;
}

export interface PaymentHistoryEntry {
  id: string;
  amount: number;
  currency: string;
  status: string;
  chargeId?: string | null;
  cardId?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  transaction?: {
    transactionId: string;
    totalCost?: number | null;
  } | null;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProcessTransactionPaymentRequest {
  cardId?: string;
}

export interface ChargePaymentRequest {
  transactionId: string;
  cardId: string;
}

class PaymentService {
  /**
   * Retrieve saved payment cards
   */
  async getPaymentCards(): Promise<ApiResponse<PaymentCard[]>> {
    return http.get<PaymentCard[]>(API_CONFIG.ENDPOINTS.PAYMENT.CARDS);
  }

  /**
   * Add a new payment card
   */
  async addPaymentCard(payload: AddPaymentCardRequest): Promise<ApiResponse<PaymentCard>> {
    return http.post<PaymentCard>(API_CONFIG.ENDPOINTS.PAYMENT.ADD_CARD, payload);
  }

  /**
   * Remove a payment card
   */
  async removePaymentCard(cardId: string): Promise<ApiResponse<{ success: boolean }>> {
    return http.delete<{ success: boolean }>(API_CONFIG.ENDPOINTS.PAYMENT.REMOVE_CARD(cardId));
  }

  /**
   * Set default payment card
   */
  async setDefaultCard(cardId: string): Promise<ApiResponse<PaymentCard>> {
    return http.put<PaymentCard>(API_CONFIG.ENDPOINTS.PAYMENT.SET_DEFAULT_CARD(cardId), {});
  }

  /**
   * Process payment directly through payment controller
   */
  async processPayment(payload: ProcessPaymentRequest): Promise<ApiResponse<PaymentProcessingResult>> {
    return http.post<PaymentProcessingResult>(API_CONFIG.ENDPOINTS.PAYMENT.PROCESS_PAYMENT, payload);
  }

  /**
   * Retrieve payment history
   */
  async getPaymentHistory(): Promise<ApiResponse<PaymentHistoryResponse>> {
    return http.get<PaymentHistoryResponse>(API_CONFIG.ENDPOINTS.PAYMENT.PAYMENT_HISTORY);
  }

  /**
   * Retrieve single payment status (syncs with Omise if needed)
   */
  async getPaymentStatus(paymentId: string): Promise<ApiResponse<{ id: string; status: string; failureMessage?: string | null; chargeId?: string | null }>> {
    return http.get<{ id: string; status: string; failureMessage?: string | null; chargeId?: string | null }>(
      API_CONFIG.ENDPOINTS.PAYMENT.STATUS(paymentId)
    );
  }

  /**
   * Process payment for a specific transaction (Legacy endpoint - deprecated)
   * @deprecated Use processChargePayment instead
   */
  async processTransactionPayment(
    transactionId: string,
    payload: ProcessTransactionPaymentRequest,
  ): Promise<ApiResponse<PaymentProcessingResult>> {
    return http.post<PaymentProcessingResult>(
      `/api/transactions/${encodeURIComponent(transactionId)}/payment`,
      payload,
    );
  }

  /**
   * Process charging payment using new endpoint
   */
  async processChargePayment(
    payload: ChargePaymentRequest,
  ): Promise<ApiResponse<PaymentProcessingResult>> {
    return http.post<PaymentProcessingResult>(
      API_CONFIG.ENDPOINTS.PAYMENT.CHARGE_PAYMENT,
      payload,
    );
  }
}

export const paymentService = new PaymentService();
