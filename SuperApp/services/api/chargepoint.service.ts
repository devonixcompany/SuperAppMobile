import { API_CONFIG } from '../../config/api.config';
import type { ApiResponse } from './client';
import { http } from './client';

export interface PaymentCardRequiredError {
  success: false;
  error: string;
  code: 'NO_PAYMENT_CARDS';
  message: string;
  action: 'ADD_PAYMENT_CARD';
}

export interface ChargingInitiateResponse {
  chargePoint?: {
    id?: string;
    chargePointIdentity?: string;
    chargePointName?: string;
    brand?: string;
    model?: string;
    protocol?: string;
  };
  connector?: {
    connectorId?: number;
    type?: string;
    maxPower?: number;
    maxCurrent?: number;
    status?: string;
  };
  station?: {
    id?: string;
    stationName?: string;
    location?: string;
  };
  session?: {
    sessionId?: string;
    status?: string;
  };
  pricing?: {
    pricePerKwh?: number;
    currency?: string;
    basicRate?: number;
  };
  paymentCard?: {
    id?: string;
    lastDigits?: string;
    brand?: string;
  };
  powerRating?: number;
  user?: any;
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
  userId?: string; // Optional since not all endpoints need it
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
   * @param connectorIdOrParams - หมายเลขหัวชาร์จ หรือ params (เพื่อความเข้ากันได้แบบย้อนหลัง)
   * @param maybeParams - ข้อมูลอ้างอิงผู้ใช้ (ใช้เฉพาะ userId) - ต้องระบุเมื่อ connectorIdOrParams เป็น connectorId
   */
  async getStatus(
    chargePointIdentity: string,
    connectorIdOrParams: number | ChargepointApiParams,
    maybeParams?: ChargepointApiParams
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
   * เริ่มต้นเซสชัน - เรียกครั้งแรกเมื่อสแกน QR เพื่อเตรียมและดู status
   * @param chargePointIdentity - รหัสเครื่องชาร์จ
   * @param connectorId - หมายเลขหัวชาร์จ
   */
  async initiateCharging(
    chargePointIdentity: string,
    connectorId: number
  ): Promise<ApiResponse<any>> {
    try {
      console.log('🚀 [SERVICE] initiateCharging called with:', {
        chargePointIdentity,
        connectorId,
        endpoint: API_CONFIG.ENDPOINTS.CHARGING.INITIATE
      });

      const response = await http.post(
        API_CONFIG.ENDPOINTS.CHARGING.INITIATE,
        {
          chargePointId: chargePointIdentity,
          connectorId: connectorId
        }
      );

      console.log('🚀 [SERVICE] initiateCharging response:', response);
      return response;
    } catch (error: any) {
      console.error('🚀 [SERVICE] Initiate Charging Error:', error);
      
      // Log detailed error information
      if (error?.response?.data) {
        console.error('🚀 [SERVICE] Error Response Data:', error.response.data);
      }
      if (error?.data) {
        console.error('🚀 [SERVICE] Error Data:', error.data);
      }
      
      throw error;
    }
  }

  /**
   * เริ่มชาร์จจริง - เรียกเมื่อกดปุ่ม "เริ่มชาร์จ"
   * @param chargePointIdentity - รหัสเครื่องชาร์จ
   * @param connectorId - หมายเลขหัวชาร์จ
   */
  async startCharging(
    chargePointIdentity: string,
    connectorId: number
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
   * หยุดเซสชันการชาร์จ (ใช้ endpoint ใหม่)
   * @param transactionId - รหัสธุรกรรมการชาร์จ
   * @param reason - เหตุผลการหยุดชาร์จ (default: "User requested")
   */
  async stopCharging(
    transactionId: string,
    reason: string = "User requested"
  ): Promise<ApiResponse<any>> {
    try {
      const response = await http.post(
        `/api/v1/user/chargepoints/${encodeURIComponent(chargePointIdentity)}/${connectorId}/stop`,
        { userId: params.userId }
      );

      return response;
    } catch (error: any) {
      console.error('Stop Charging Error:', error);
      
      // Log detailed error information
      if (error?.response?.data) {
        console.error('Stop Charging Error Response Data:', error.response.data);
      }
      if (error?.data) {
        console.error('Stop Charging Error Data:', error.data);
      }
      
      throw error;
    }
  }
}

export const chargepointService = new ChargepointService();
