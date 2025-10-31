import { http } from './client';
import type { ApiResponse } from './client';

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
  accessToken: string;
}

class ChargepointService {
  /**
   * Get WebSocket URL for chargepoint
   * @param chargePointIdentity - Chargepoint identity
   * @param connectorId - Connector ID
   * @param params - API parameters including userId and accessToken
   */
  async getWebSocketUrl(
    chargePointIdentity: string,
    connectorId: number,
    params: ChargepointApiParams
  ): Promise<ApiResponse<ChargepointWebSocketResponse>> {
    try {
      console.log('Chargepoint Service - ChargePoint Identity:', chargePointIdentity);
      console.log('Chargepoint Service - Connector ID:', connectorId);
      console.log('Chargepoint Service - Params:', { userId: params.userId, hasToken: !!params.accessToken });
      
      // Construct the API endpoint
      const endpoint = `/api/chargepoints/${encodeURIComponent(chargePointIdentity)}/${connectorId}/websocket-url?userId=${encodeURIComponent(params.userId)}`;
      
      const response = await http.get<ChargepointWebSocketResponse>(
        endpoint,
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Chargepoint Service - Response:', response);
      
      return response;
    } catch (error) {
      console.error('Chargepoint Service Error:', error);
      throw error;
    }
  }

  /**
   * Get chargepoint status
   * @param chargePointIdentity - Chargepoint identity
   * @param params - User ID and access token
   * @returns Promise with chargepoint status
   */
  async getStatus(
    chargePointIdentity: string,
    params: ChargepointApiParams
  ): Promise<ApiResponse<any>> {
    try {
      const response = await http.get(
        `/api/chargepoints/${encodeURIComponent(chargePointIdentity)}/status?userId=${params.userId}`,
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Chargepoint Status Error:', error);
      throw error;
    }
  }

  /**
   * Start charging session
   * @param chargePointIdentity - Chargepoint identity
   * @param connectorId - Connector ID
   * @param params - User ID and access token
   * @returns Promise with charging session data
   */
  async startCharging(
    chargePointIdentity: string,
    connectorId: number,
    params: ChargepointApiParams
  ): Promise<ApiResponse<any>> {
    try {
      const response = await http.post(
        `/api/chargepoints/${encodeURIComponent(chargePointIdentity)}/${connectorId}/start`,
        { userId: params.userId },
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Start Charging Error:', error);
      throw error;
    }
  }

  /**
   * Stop charging session
   * @param chargePointIdentity - Chargepoint identity
   * @param connectorId - Connector ID
   * @param params - User ID and access token
   * @returns Promise with stop charging result
   */
  async stopCharging(
    chargePointIdentity: string,
    connectorId: number,
    params: ChargepointApiParams
  ): Promise<ApiResponse<any>> {
    try {
      const response = await http.post(
        `/api/chargepoints/${encodeURIComponent(chargePointIdentity)}/${connectorId}/stop`,
        { userId: params.userId },
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Stop Charging Error:', error);
      throw error;
    }
  }
}

export const chargepointService = new ChargepointService();