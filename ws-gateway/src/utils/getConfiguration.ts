import { randomUUID } from 'crypto';
import WebSocket from 'ws';

export interface GetConfigurationRequest {
  key?: string[];
}

export interface GetConfigurationResponse {
  configurationKey: Array<{
    key: string;
    readonly: boolean;
    value?: string;
  }>;
  unknownKey?: string[];
}

export interface ConnectorConfiguration {
  connectorId: number;
  type?: string;
  maxCurrent?: number;
}

/**
 * ส่ง GetConfiguration message ไปยังเครื่องชาร์จ
 */
export async function sendGetConfiguration(
  ws: WebSocket,
  keys?: string[]
): Promise<GetConfigurationResponse> {
  return new Promise((resolve, reject) => {
    const messageId = randomUUID();
    const payload: GetConfigurationRequest = keys ? { key: keys } : {};
    
    const message = [2, messageId, 'GetConfiguration', payload];
    
    console.log(`📤 Sending GetConfiguration to charge point:`, JSON.stringify(message));
    
    // ตั้งค่า timeout สำหรับการรอ response
    const timeout = setTimeout(() => {
      reject(new Error('GetConfiguration request timeout'));
    }, 30000); // 30 วินาที
    
    // ฟังก์ชันสำหรับจัดการ response
    const handleMessage = (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());
        
        // ตรวจสอบว่าเป็น CALLRESULT สำหรับ messageId ที่เราส่งไป
        if (Array.isArray(response) && response[0] === 3 && response[1] === messageId) {
          clearTimeout(timeout);
          ws.removeListener('message', handleMessage);
          
          const configurationData = response[2] as GetConfigurationResponse;
          console.log(`📥 Received GetConfiguration response:`, configurationData);
          
          resolve(configurationData);
        }
        // ตรวจสอบว่าเป็น CALLERROR สำหรับ messageId ที่เราส่งไป
        else if (Array.isArray(response) && response[0] === 4 && response[1] === messageId) {
          clearTimeout(timeout);
          ws.removeListener('message', handleMessage);
          
          const [, , errorCode, errorDescription] = response;
          reject(new Error(`GetConfiguration error: ${errorCode} - ${errorDescription}`));
        }
      } catch (error) {
        // ไม่ต้องทำอะไร หากไม่ใช่ JSON หรือไม่ใช่ message ที่เราต้องการ
      }
    };
    
    // เพิ่ม listener สำหรับ response
    ws.on('message', handleMessage);
    
    // ส่ง message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      clearTimeout(timeout);
      ws.removeListener('message', handleMessage);
      reject(new Error('WebSocket is not open'));
    }
  });
}

/**
 * ดึงจำนวน connectors จาก GetConfiguration response
 */
export function extractNumberOfConnectors(configResponse: GetConfigurationResponse): number | null {
  const numberOfConnectorsKey = configResponse.configurationKey.find(
    key => key.key === 'NumberOfConnectors'
  );
  
  if (numberOfConnectorsKey && numberOfConnectorsKey.value) {
    const numberOfConnectors = parseInt(numberOfConnectorsKey.value, 10);
    return isNaN(numberOfConnectors) ? null : numberOfConnectors;
  }
  
  return null;
}

/**
 * ดึงข้อมูล connectors (ชนิดและกระแสสูงสุด) จาก GetConfiguration response
 */
export function extractConnectorDetails(configResponse: GetConfigurationResponse): ConnectorConfiguration[] {
  const connectorsMap = new Map<number, ConnectorConfiguration>();

  for (const entry of configResponse.configurationKey) {
    if (!entry.key) continue;

    const match = entry.key.match(/^Connector(\d+)-(Type|MaxCurrent)$/i);
    if (!match) continue;

    const connectorId = parseInt(match[1], 10);
    if (Number.isNaN(connectorId)) continue;

    const field = match[2].toLowerCase();
    const connector = connectorsMap.get(connectorId) ?? { connectorId };

    if (field === 'type') {
      connector.type = entry.value?.trim();
    } else if (field === 'maxcurrent') {
      const parsedCurrent = entry.value ? parseFloat(entry.value) : NaN;
      if (!Number.isNaN(parsedCurrent)) {
        connector.maxCurrent = parsedCurrent;
      }
    }

    connectorsMap.set(connectorId, connector);
  }

  return Array.from(connectorsMap.values()).sort((a, b) => a.connectorId - b.connectorId);
}

/**
 * ส่ง GetConfiguration เพื่อดึงข้อมูล connectors ทั้งหมดพร้อมชนิดและกระแสสูงสุด
 */
export async function getConnectorConfiguration(ws: WebSocket): Promise<{
  numberOfConnectors: number;
  connectors: ConnectorConfiguration[];
  rawConfiguration: GetConfigurationResponse;
}> {
  try {
    const response = await sendGetConfiguration(ws);
    const numberOfConnectorsFromConfig = extractNumberOfConnectors(response);
    const connectorDetails = extractConnectorDetails(response);

    let totalConnectors = numberOfConnectorsFromConfig || 0;
    if (totalConnectors === 0 && connectorDetails.length > 0) {
      totalConnectors = connectorDetails.reduce(
        (max, connector) => Math.max(max, connector.connectorId),
        0
      );
    }

    const connectorsById = new Map<number, ConnectorConfiguration>();
    connectorDetails.forEach(detail => {
      connectorsById.set(detail.connectorId, { ...detail });
    });

    const normalizedConnectors: ConnectorConfiguration[] = [];

    for (let i = 1; i <= totalConnectors; i++) {
      const detail = connectorsById.get(i);
      if (detail) {
        normalizedConnectors.push(detail);
      } else {
        normalizedConnectors.push({ connectorId: i });
      }
    }

    // Include any additional connectors that might have non-sequential IDs
    connectorDetails.forEach(detail => {
      if (!normalizedConnectors.find(connector => connector.connectorId === detail.connectorId)) {
        normalizedConnectors.push(detail);
      }
    });

    normalizedConnectors.sort((a, b) => a.connectorId - b.connectorId);

    if (totalConnectors === 0) {
      console.warn('⚠️ ไม่พบค่า NumberOfConnectors ในผลลัพธ์การขอข้อมูลการตั้งค่า');
    } else {
      console.log(
        `🔌 ตรวจพบข้อมูลหัวชาร์จทั้งหมด ${totalConnectors} หัว`,
        normalizedConnectors
      );
    }

    return {
      numberOfConnectors: totalConnectors,
      connectors: normalizedConnectors,
      rawConfiguration: response
    };
  } catch (error) {
    console.error('เกิดข้อผิดพลาดระหว่างเรียกข้อมูลการตั้งค่าหัวชาร์จ:', error);
    throw error;
  }
}

/**
 * ส่ง GetConfiguration เพื่อดึงข้อมูล NumberOfConnectors
 */
export async function getNumberOfConnectors(ws: WebSocket): Promise<number> {
  try {
    const response = await sendGetConfiguration(ws, ['NumberOfConnectors']);
    const numberOfConnectors = extractNumberOfConnectors(response);
    
    if (numberOfConnectors === null) {
      throw new Error('NumberOfConnectors not found in configuration');
    }
    
    console.log(`🔌 จำนวนหัวชาร์จทั้งหมด: ${numberOfConnectors}`);
    return numberOfConnectors;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดระหว่างดึงจำนวนหัวชาร์จ:', error);
    throw error;
  }
}
