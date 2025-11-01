import { http } from './client';
import type { ApiResponse } from './client';
import API_CONFIG from '@/config/api.config';

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
}

export const transactionService = new TransactionService();
