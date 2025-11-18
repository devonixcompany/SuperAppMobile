/**
 * Webhook Service สำหรับจัดการ payment webhooks และ notifications
 */

import API_CONFIG from '@/config/api.config';
import type { ApiResponse } from './client';
import { http } from './client';

export interface WebhookPaymentData {
  key?: string;
  data?: {
    paymentId?: string;
    transactionId?: string;
    chargeId?: string; // เพิ่ม chargeId เพื่อให้ backend หา payment ได้
    amount?: number;
    currency?: string;
    status?: string;
    provider?: string;
    timestamp?: string;
    [key: string]: any;
  };
  eventType?: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  processed?: boolean;
}

class WebhookService {
  /**
   * Send payment webhook notification
   */
  async sendPaymentWebhook(
    webhookData: WebhookPaymentData
  ): Promise<ApiResponse<WebhookResponse>> {
    return http.post<WebhookResponse>(
      API_CONFIG.ENDPOINTS.WEBHOOKS.PAYMENTS,
      webhookData
    );
  }

  /**
   * Process incoming webhook (for testing purposes)
   */
  async processWebhook(
    endpoint: string,
    data: any
  ): Promise<ApiResponse<any>> {
    return http.post<any>(endpoint, data);
  }
}

export const webhookService = new WebhookService();