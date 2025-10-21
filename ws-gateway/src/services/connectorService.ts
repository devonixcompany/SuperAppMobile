import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export interface ConnectorCheckResult {
  hasConnectors: boolean;
  connectorCount: number;
  connectors?: any[];
}

export interface ConnectorDetail {
  connectorId: number;
  type?: string;
  maxCurrent?: number;
}

export interface CreateConnectorsResult {
  success: boolean;
  data: {
    message: string;
    connectors: any[];
  };
}

/**
 * ตรวจสอบว่าเครื่องชาร์จมีข้อมูล connectors ในฐานข้อมูลหรือไม่
 */
export async function checkConnectorData(chargePointIdentity: string): Promise<ConnectorCheckResult> {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/chargepoints/check-connectors/${chargePointIdentity}`
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to check connector data');
    }
  } catch (error: any) {
    console.error('Error checking connector data:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Charge point not found');
    }
    
    throw new Error(`Failed to check connector data: ${error.message}`);
  }
}

/**
 * สร้าง connectors สำหรับเครื่องชาร์จ
 */
export async function createConnectors(
  chargePointIdentity: string, 
  numberOfConnectors: number,
  connectorDetails?: ConnectorDetail[]
): Promise<CreateConnectorsResult> {
  try {
    const payload: Record<string, any> = {
      chargePointIdentity,
      numberOfConnectors
    };

    if (connectorDetails && connectorDetails.length > 0) {
      payload.connectorDetails = connectorDetails;
    }

    const response = await axios.post(
      `${BACKEND_URL}/api/chargepoints/create-connectors`,
      payload
    );
    
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.error || 'Failed to create connectors');
    }
  } catch (error: any) {
    console.error('Error creating connectors:', error);
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw new Error(`Failed to create connectors: ${error.message}`);
  }
}

/**
 * ตรวจสอบและสร้าง connectors หากจำเป็น
 */
export async function ensureConnectorData(
  chargePointIdentity: string,
  numberOfConnectors: number,
  connectorDetails?: ConnectorDetail[]
): Promise<{ created: boolean; updated: boolean; connectors: any[] }> {
  try {
    if (!numberOfConnectors || numberOfConnectors < 1) {
      console.warn(`⚠️ Skipping connector sync for ${chargePointIdentity} - invalid connector count (${numberOfConnectors})`);
      return { created: false, updated: false, connectors: [] };
    }

    const sanitizedDetails = connectorDetails
      ?.filter(detail => Number.isInteger(detail.connectorId) && detail.connectorId > 0)
      .map(detail => ({
        connectorId: detail.connectorId,
        type: detail.type?.trim(),
        maxCurrent: typeof detail.maxCurrent === 'number' ? detail.maxCurrent : undefined
      }))
      .sort((a, b) => a.connectorId - b.connectorId);

    // ตรวจสอบว่ามี connector data อยู่แล้วหรือไม่
    const checkResult = await checkConnectorData(chargePointIdentity);

    const shouldSyncDetails = Boolean(sanitizedDetails && sanitizedDetails.length > 0);
    
    if (!checkResult.hasConnectors || shouldSyncDetails) {
      const actionText = checkResult.hasConnectors ? 'Syncing' : 'Creating';
      console.log(`🔌 ${actionText} ${numberOfConnectors} connectors for charge point ${chargePointIdentity}`);

      const createResult = await createConnectors(
        chargePointIdentity,
        numberOfConnectors,
        sanitizedDetails
      );
      
      return {
        created: !checkResult.hasConnectors,
        updated: checkResult.hasConnectors,
        connectors: createResult.data.connectors
      };
    }

    console.log(`✅ Charge point ${chargePointIdentity} already has ${checkResult.connectorCount} connectors`);
    return {
      created: false,
      updated: false,
      connectors: checkResult.connectors || []
    };
  } catch (error: any) {
    console.error('Error ensuring connector data:', error);
    throw error;
  }
}
