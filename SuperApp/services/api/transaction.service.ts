import API_CONFIG from '@/config/api.config';
import type { ApiResponse } from './client';
import { http } from './client';
import type { PaymentProcessingResult } from './payment.service';

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
}

export interface GetChargingHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
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

  async getChargingHistory(
    params?: GetChargingHistoryParams
  ): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.status) queryParams.append('status', params.status);

    const url = queryParams.toString() 
      ? `${API_CONFIG.ENDPOINTS.TRANSACTIONS.LIST}?${queryParams.toString()}`
      : API_CONFIG.ENDPOINTS.TRANSACTIONS.LIST;

    return http.get<any[]>(url);
  }

  async processTransactionPayment(
    transactionId: string,
    data: ProcessTransactionPaymentRequest
  ): Promise<ApiResponse<PaymentProcessingResult>> {
    return http.post<PaymentProcessingResult>(
      `/api/v1/user/transactions/${encodeURIComponent(transactionId)}/payment`,
      data
    );
  }

  async getTransactionHistory(
    transactionId: string
  ): Promise<ApiResponse<any>> {
    return http.get<any>(
      `/api/v1/user/transactions/history/${encodeURIComponent(transactionId)}`
    );
  }
}

export const transactionService = new TransactionService();

