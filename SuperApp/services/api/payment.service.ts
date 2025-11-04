/**
 * Payment Service
 * Handles all payment-related API calls
 */

import { http } from './client';
import type { ApiResponse } from './client';
import API_CONFIG from '@/config/api.config';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last_digits?: string;
  name?: string;
  expiration_month?: number;
  expiration_year?: number;
  is_default: boolean;
  created_at: string;
}

export interface AddPaymentMethodRequest {
  token: string;
  is_default?: boolean;
}

export interface ProcessPaymentRequest {
  amount: number;
  currency: string;
  payment_method_id?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed';
  payment_method: PaymentMethod;
  created_at: string;
  failure_code?: string;
  failure_message?: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed';
  description?: string;
  payment_method: PaymentMethod;
  transaction_id?: string;
  created_at: string;
  failure_code?: string;
  failure_message?: string;
}

export interface ProcessTransactionPaymentRequest {
  payment_method_id?: string;
}

class PaymentService {
  /**
   * Get user's payment methods
   */
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    return http.get<PaymentMethod[]>(API_CONFIG.ENDPOINTS.PAYMENT.METHODS);
  }

  /**
   * Add a new payment method
   */
  async addPaymentMethod(data: AddPaymentMethodRequest): Promise<ApiResponse<PaymentMethod>> {
    return http.post<PaymentMethod>(API_CONFIG.ENDPOINTS.PAYMENT.ADD_METHOD, data);
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(methodId: string): Promise<ApiResponse<{ message: string }>> {
    return http.delete<{ message: string }>(API_CONFIG.ENDPOINTS.PAYMENT.REMOVE_METHOD(methodId));
  }

  /**
   * Process a payment
   */
  async processPayment(data: ProcessPaymentRequest): Promise<ApiResponse<ProcessPaymentResponse>> {
    return http.post<ProcessPaymentResponse>(API_CONFIG.ENDPOINTS.PAYMENT.PROCESS_PAYMENT, data);
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(): Promise<ApiResponse<PaymentHistory[]>> {
    return http.get<PaymentHistory[]>(API_CONFIG.ENDPOINTS.PAYMENT.PAYMENT_HISTORY);
  }

  /**
   * Process payment for a specific transaction
   */
  async processTransactionPayment(
    transactionId: string, 
    data: ProcessTransactionPaymentRequest
  ): Promise<ApiResponse<ProcessPaymentResponse>> {
    return http.post<ProcessPaymentResponse>(
      `/api/transactions/${encodeURIComponent(transactionId)}/payment`,
      data
    );
  }
}

export const paymentService = new PaymentService();