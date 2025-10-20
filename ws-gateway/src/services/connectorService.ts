import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export interface ConnectorCheckResult {
  hasConnectors: boolean;
  connectorCount: number;
  connectors?: any[];
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
  numberOfConnectors: number
): Promise<CreateConnectorsResult> {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/chargepoints/create-connectors`,
      {
        chargePointIdentity,
        numberOfConnectors
      }
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
  numberOfConnectors: number
): Promise<{ created: boolean; connectors: any[] }> {
  try {
    // ตรวจสอบว่ามี connector data อยู่แล้วหรือไม่
    const checkResult = await checkConnectorData(chargePointIdentity);
    
    if (checkResult.hasConnectors) {
      console.log(`✅ Charge point ${chargePointIdentity} already has ${checkResult.connectorCount} connectors`);
      return {
        created: false,
        connectors: checkResult.connectors || []
      };
    }
    
    // สร้าง connectors ใหม่
    console.log(`🔌 Creating ${numberOfConnectors} connectors for charge point ${chargePointIdentity}`);
    const createResult = await createConnectors(chargePointIdentity, numberOfConnectors);
    
    return {
      created: true,
      connectors: createResult.data.connectors
    };
  } catch (error: any) {
    console.error('Error ensuring connector data:', error);
    throw error;
  }
}