import WebSocket from 'ws';
import { randomUUID } from 'crypto';

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
 * ส่ง GetConfiguration เพื่อดึงข้อมูล NumberOfConnectors
 */
export async function getNumberOfConnectors(ws: WebSocket): Promise<number> {
  try {
    const response = await sendGetConfiguration(ws, ['NumberOfConnectors']);
    const numberOfConnectors = extractNumberOfConnectors(response);
    
    if (numberOfConnectors === null) {
      throw new Error('NumberOfConnectors not found in configuration');
    }
    
    console.log(`🔌 Number of connectors: ${numberOfConnectors}`);
    return numberOfConnectors;
  } catch (error) {
    console.error('Error getting number of connectors:', error);
    throw error;
  }
}