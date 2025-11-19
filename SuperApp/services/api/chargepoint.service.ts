import type { ApiResponse } from './client';
import { http } from './client';

export interface PaymentCardRequiredError {
  success: false;
  error: string;
  code: 'NO_PAYMENT_CARDS';
  message: string;
  action: 'ADD_PAYMENT_CARD';
}

export interface ChargepointWebSocketResponse {
  websocketUrl?: string;
  websocketURL?: string;
  data?: {
    websocketUrl?: string;
    websocketURL?: string;
    chargePoint?: {
      chargePointIdentity: string;
      name?: string;
      stationName?: string;
      location?: string;
      powerRating?: number;
      brand?: string;
      protocol?: string;
    };
    connector?: {
      connectorId: number;
    };
    pricingTier?: any;
  };
  chargePoint?: {
    chargePointIdentity: string;
    name?: string;
  };
  connector?: {
    connectorId: number;
  };
  pricingTier?: any;
}

export interface ChargepointApiParams {
  userId: string;
}

class ChargepointService {
  /**
   * ขอ WebSocket URL สำหรับเครื่องชาร์จที่สแกนได้
   * @param chargePointIdentity - รหัสเครื่องชาร์จ
   * @param connectorId - หมายเลขหัวชาร์จ
   * @param params - ข้อมูลอ้างอิงผู้ใช้ (ใช้เฉพาะ userId)
   */
  async getWebSocketUrl(
    chargePointIdentity: string,
    connectorId: number,
    params: ChargepointApiParams
  ): Promise<ApiResponse<ChargepointWebSocketResponse> | PaymentCardRequiredError> {
    try {
      console.log('Chargepoint Service - ChargePoint Identity:', chargePointIdentity);
      console.log('Chargepoint Service - Connector ID:', connectorId);
      console.log('Chargepoint Service - Params:', { userId: params.userId });
      
      // Construct the API endpoint
      const endpoint = `/api/v1/user/chargepoints/${encodeURIComponent(chargePointIdentity)}/${connectorId}/websocket-url?userId=${encodeURIComponent(params.userId)}`;
      
      const response = await http.get<ChargepointWebSocketResponse>(
        endpoint
      );

      console.log('Chargepoint Service - Response:', response);
      
      return response;
    } catch (error) {
      console.error('Chargepoint Service Error:', error);
      throw error;
    }
  }

  /**
   * ขอข้อมูลสถานะของเครื่องชาร์จ
   * @param chargePointIdentity - รหัสเครื่องชาร์จ
   * @param params - ข้อมูลอ้างอิงผู้ใช้ (ใช้เฉพาะ userId)
   */
  async getStatus(
    chargePointIdentity: string,
    params: ChargepointApiParams
  ): Promise<ApiResponse<any>> {
    try {
      const response = await http.get(
        `/api/v1/user/chargepoints/${encodeURIComponent(chargePointIdentity)}/status?userId=${params.userId}`
      );

      return response;
    } catch (error) {
      console.error('Chargepoint Status Error:', error);
      throw error;
    }
  }

  /**
   * เริ่มต้นเซสชันการชาร์จ
   * @param chargePointIdentity - รหัสเครื่องชาร์จ
   * @param connectorId - หมายเลขหัวชาร์จ
   * @param params - ข้อมูลอ้างอิงผู้ใช้ (ใช้เฉพาะ userId)
   */
  async startCharging(
    chargePointIdentity: string,
    connectorId: number,
    params: ChargepointApiParams
  ): Promise<ApiResponse<any>> {
    try {
      const response = await http.post(
        `/api/v1/user/chargepoints/${encodeURIComponent(chargePointIdentity)}/${connectorId}/start`,
        { userId: params.userId }
      );

      return response;
    } catch (error) {
      console.error('Start Charging Error:', error);
      throw error;
    }
  }

  /**
   * หยุดเซสชันการชาร์จ
   * @param chargePointIdentity - รหัสเครื่องชาร์จ
   * @param connectorId - หมายเลขหัวชาร์จ
   * @param params - ข้อมูลอ้างอิงผู้ใช้ (ใช้เฉพาะ userId)
   */
  async stopCharging(
    chargePointIdentity: string,
    connectorId: number,
    params: ChargepointApiParams
  ): Promise<ApiResponse<any>> {
    try {
      const response = await http.post(
        `/api/v1/user/chargepoints/${encodeURIComponent(chargePointIdentity)}/${connectorId}/stop`,
        { userId: params.userId }
      );

      return response;
    } catch (error) {
      console.error('Stop Charging Error:', error);
      throw error;
    }
  }
}

export const chargepointService = new ChargepointService();
