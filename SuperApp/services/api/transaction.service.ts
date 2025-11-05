import { http } from './client';
import type { ApiResponse } from './client';
import API_CONFIG from '@/config/api.config';
import type { PaymentProcessingResult } from './payment.service';

export interface CreateTransactionRequest {
  chargePointIdentity: string;
  connectorId: number;
  userId: string;
  vehicleId?: string;
  startTime?: string;
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

  async processTransactionPayment(
    transactionId: string,
    data: ProcessTransactionPaymentRequest
  ): Promise<ApiResponse<PaymentProcessingResult>> {
    return http.post<PaymentProcessingResult>(
      `/api/transactions/${encodeURIComponent(transactionId)}/payment`,
      data
    );
  }
}

export const transactionService = new TransactionService();
