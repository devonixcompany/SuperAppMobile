import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { getChargePointFromCache } from '../index';
import { handleWebSocketMessage } from './messageRouter';
import { sessionManager } from './sessionManager';

// การติดตามการเชื่อมต่อ (legacy - เก็บไว้เพื่อความเข้ากันได้แบบย้อนหลัง)
// Connection tracking (legacy - kept for backward compatibility)
export interface ConnectionInfo {
  chargePointId: string;        // รหัสประจำตัว charge point
  chargePointIdentity: string;  // ตัวตนของ charge point
  serialNumber: string;         // หมายเลขซีเรียล
  ocppVersion: string;          // เวอร์ชั่น OCPP ที่ใช้
  connectedAt: Date;           // เวลาที่เชื่อมต่อ
  lastSeen: Date;              // เวลาที่เห็นล่าสุด
  ws: WebSocket;               // WebSocket connection
}

// แผนที่เก็บการเชื่อมต่อที่ใช้งานอยู่
const activeConnections = new Map<string, ConnectionInfo>();

/**
 * ตรวจสอบความถูกต้องของ serial ID กับข้อมูลในแคช
 * Validate charge point serial ID against cached data
 * @param serialNumber - หมายเลขซีเรียลที่ต้องการตรวจสอบ
 * @returns true หากพบในแคช, false หากไม่พบ
 */
function validateSerialId(serialNumber: string): boolean {
  const cachedChargePoint = getChargePointFromCache(serialNumber);
  
  if (!cachedChargePoint) {
    console.log(`Serial number ${serialNumber} not found in cache`);
    return false;
  }
  
  console.log(`Found charge point for serial ${serialNumber}:`, cachedChargePoint);
  return true;
}

/**
 * ตรวจสอบ charge point กับ whitelist โดยใช้ serialNumber และ chargePointIdentity
 * Validate charge point against whitelist using serialNumber and chargePointIdentity
 * Step 1: เรียก API /validate-whitelist เพื่อตรวจสอบว่า charge point ได้รับอนุญาตหรือไม่
 * Step 2: ตรวจสอบว่า serialNumber และ chargePointIdentity ตรงกับข้อมูลที่ลงทะเบียนไว้
 * Step 3: คืนค่า isValid และ chargePointId หากพบในระบบ
 * @param serialNumber - หมายเลขซีเรียล
 * @param chargePointIdentity - ตัวตนของ charge point
 * @returns Promise ที่มี isValid และ chargePointId (ถ้ามี)
 */
async function validateChargePointWhitelist(serialNumber: string, chargePointIdentity: string): Promise<{ isValid: boolean; chargePointId?: string }> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    console.log(`🔍 Checking whitelist - Serial: ${serialNumber}, Identity: ${chargePointIdentity}`);
    
    // Step 1: เรียก backend API เพื่อตรวจสอบ whitelist
    const response = await fetch(`${backendUrl}/api/chargepoints/validate-whitelist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serialNumber,
        chargePointIdentity
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whitelist validation failed: ${response.status} - ${errorText}`);
      return { isValid: false };
    }

    // Step 2 & 3: ประมวลผลและคืนค่าผลการตรวจสอบ
    const result = await response.json() as { success: boolean; data: { isValid: boolean; chargePointId?: string } };
    console.log(`✅ Whitelist validation result:`, result);
    
    return {
      isValid: result.success && result.data.isValid,
      chargePointId: result.data.chargePointId
    };
  } catch (error) {
    console.error(`💥 Error in whitelist validation:`, error);
    return { isValid: false };
  }
}

/**
 * แยก serial ID จาก URL หรือ connection headers
 * Extract serial ID from URL or connection headers
 * Step 1: พยายามแยกจาก URL path ก่อน
 * Step 2: ค้นหาใน query parameters
 * Step 3: ค้นหาใน headers
 * Step 4: ใช้ chargePointId เป็น fallback (เพื่อความเข้ากันได้แบบย้อนหลัง)
 * @param request - HTTP request object
 * @param chargePointId - รหัส charge point เป็น fallback
 * @returns serial ID หรือ null หากไม่พบ
 */
function extractSerialId(request: any, chargePointId: string): string | null {
  // Step 1: พยายามแยกจาก URL path ก่อน
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathParts = url.pathname.split('/');
  
  // Step 2: ค้นหา serial ใน query parameters
  const serialFromQuery = url.searchParams.get('serial');
  if (serialFromQuery) {
    return serialFromQuery;
  }
  
  // Step 3: พยายามแยกจาก headers
  const serialFromHeader = request.headers['x-serial-number'] || request.headers['serial-number'];
  if (serialFromHeader) {
    return serialFromHeader;
  }
  
  // Step 4: Fallback - ใช้ chargePointId เป็น serial (เพื่อความเข้ากันได้แบบย้อนหลัง)
  return chargePointId;
}

/**
 * ตรวจสอบความเข้ากันได้ของ Charge Point กับ OCPP version ที่รองรับ
 * Validate Charge Point compatibility with supported OCPP version
 * Step 1: แปลงรูปแบบ version ให้ถูกต้อง (1.6 -> ocpp1.6)
 * Step 2: เรียก API /validate-ocpp เพื่อตรวจสอบว่า Charge Point รองรับ OCPP version นี้หรือไม่
 * Step 3: ตรวจสอบว่า Charge Point มีอยู่ในระบบและสถานะการเชื่อมต่อ
 * @param chargePointId - รหัส charge point
 * @param ocppVersion - เวอร์ชั่น OCPP
 * @returns Promise<boolean> - true หากผ่านการตรวจสอบ
 */
async function validateChargePoint(chargePointId: string, ocppVersion: string): Promise<boolean> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    // Step 1: แปลงรูปแบบ version หากจำเป็น (1.6 -> ocpp1.6)
    const formattedVersion = ocppVersion.startsWith('ocpp') ? ocppVersion : `ocpp${ocppVersion}`;
    
    console.log(`🔍 Validating Charge Point - ID: ${chargePointId}, OCPP Version: ${formattedVersion}`);
    
    // Step 2: เรียก backend API เพื่อตรวจสอบ Charge Point และ OCPP version
    const response = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/validate-ocpp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ocppVersion: formattedVersion
      })
    });

    if (!response.ok) {
      console.error(`❌ Charge Point validation failed: ${response.status}`);
      return false;
    }

    // Step 3: ประมวลผลการตรวจสอบ
    const result = await response.json() as { success: boolean };
    console.log(`✅ Charge Point validation result: ${result.success}`);
    
    return result.success;
  } catch (error) {
    console.error(`💥 Error in Charge Point validation:`, error);
    return false;
  }
}

/**
 * อัปเดตสถานะการเชื่อมต่อของ Charge Point ใน Backend
 * Update Charge Point connection status in Backend
 * Step 1: เตรียมข้อมูลสถานะการเชื่อมต่อ
 * Step 2: เรียก API /connection-status เพื่ออัปเดตสถานะ online/offline
 * Step 3: ใช้สำหรับติดตามสถานะการเชื่อมต่อแบบ real-time
 * @param chargePointId - รหัส charge point
 * @param isConnected - สถานะการเชื่อมต่อ (true = เชื่อมต่อ, false = ตัดการเชื่อมต่อ)
 */
async function updateConnectionStatus(chargePointId: string, isConnected: boolean): Promise<void> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    console.log(`🔄 Updating connection status - ID: ${chargePointId}, Connected: ${isConnected}`);
    
    // Step 1 & 2: เรียก backend API เพื่ออัปเดตสถานะการเชื่อมต่อ
    const response = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/connection-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isConnected
      })
    });

    if (!response.ok) {
      console.error(`❌ Connection status update failed: ${response.status}`);
      return;
    }

    // Step 3: แสดงผลสำเร็จ
    console.log(`✅ Connection status updated successfully`);
  } catch (error) {
    console.error(`💥 Error updating connection status:`, error);
  }
}

/**
 * ลงทะเบียน Charge Point ใหม่ในระบบ
 * Register new Charge Point in system
 * Step 1: ตรวจสอบว่า Charge Point มีอยู่ในระบบแล้วหรือไม่
 * Step 2: หากไม่มี ให้ลงทะเบียน Charge Point ใหม่พร้อมข้อมูลพื้นฐาน
 * Step 3: ตั้งค่า OCPP protocol version ตามที่ระบุใน WebSocket connection
 * @param chargePointId - รหัส charge point
 * @param ocppVersion - เวอร์ชั่น OCPP
 * @returns Promise<boolean> - true หากลงทะเบียนสำเร็จ
 */
async function registerChargePoint(chargePointId: string, ocppVersion: string): Promise<boolean> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    console.log(`🔍 Checking Charge Point existence - ID: ${chargePointId}`);
    
    // Step 1: ตรวจสอบว่า Charge Point มีอยู่แล้วหรือไม่
    const checkResponse = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (checkResponse.ok) {
      console.log(`✅ Charge Point ${chargePointId} already exists in system`);
      return true;
    }
    
    if (checkResponse.status !== 404) {
      console.error(`❌ Error checking Charge Point: ${checkResponse.status}`);
      return false;
    }

    console.log(`📝 Registering new Charge Point - ID: ${chargePointId}, OCPP Version: ${ocppVersion}`);
    
    // Step 2: แปลงรูปแบบ OCPP version (เช่น ocpp1.6 -> OCPP16)
    let protocolVersion = 'OCPP16'; // ค่าเริ่มต้น
    if (ocppVersion.includes('1.6')) {
      protocolVersion = 'OCPP16';
    } else if (ocppVersion.includes('2.0.1')) {
      protocolVersion = 'OCPP21';
    } else if (ocppVersion.includes('2.0')) {
      protocolVersion = 'OCPP20';
    }

    // Step 3: ลงทะเบียน Charge Point ใหม่
    const response = await fetch(`${backendUrl}/api/chargepoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: chargePointId,
        name: `Charge Point ${chargePointId}`,
        stationName: `Station ${chargePointId}`,
        location: 'Unknown',
        serialNumber: chargePointId,
        chargePointIdentity: chargePointId,
        protocol: protocolVersion,
        brand: 'Unknown',
        powerRating: 0,
        isWhitelisted: false // ต้องได้รับการอนุมัติก่อน
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Charge Point registered successfully - ID: ${chargePointId}:`, result);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Charge Point registration failed: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`💥 Error registering Charge Point:`, error);
    return false;
  }
}

/**
 * จัดการการเชื่อมต่อ WebSocket สำหรับ Charge Point
 * Handle WebSocket connection for Charge Point
 * Step 1: ตรวจสอบ chargePointId กับข้อมูลในแคช
 * Step 2: ตรวจสอบ OCPP version ที่รองรับ
 * Step 3: สร้าง session และจัดการ message routing
 * Step 4: อัปเดตสถานะการเชื่อมต่อแบบ real-time
 * Step 5: ตั้งค่า event handlers สำหรับ message, close, error
 * Step 6: เริ่ม heartbeat monitoring
 * @param ws - WebSocket connection
 * @param request - HTTP request object
 * @param chargePointId - รหัส charge point
 * @param ocppVersion - เวอร์ชั่น OCPP
 */
export async function handleConnection(ws: WebSocket, request: any, chargePointId: string, ocppVersion: string): Promise<void> {
  const connectionId = uuidv4();
  
  console.log(`🔌 New connection - Charge Point ID: ${chargePointId}, OCPP Version: ${ocppVersion}`);

  // Step 1: ดึงข้อมูล charge point จากแคชโดยใช้ chargePointId
  const cachedChargePoint = getChargePointFromCache(chargePointId);
  
  if (!cachedChargePoint) {
    console.log(`❌ No Charge Point with ID ${chargePointId} found in cache`);
    ws.close(1008, 'Charge point not registered');
    return;
  }

  console.log(`✅ Found Charge Point in cache: ${chargePointId}`);
  console.log(`📊 Cached data:`, cachedChargePoint);

  // Step 2: ตรวจสอบ charge point โดยใช้ backend API
  const isValid = await validateChargePoint(chargePointId, ocppVersion);
  if (!isValid) {
    console.log(`❌ Invalid Charge Point: ${chargePointId}`);
    ws.close(1008, 'Invalid charge point or OCPP version');
    return;
  }

  // Step 3: เก็บข้อมูลการเชื่อมต่อ (legacy)
  const connectionInfo: ConnectionInfo = {
    chargePointId,
    chargePointIdentity: chargePointId,
    serialNumber: cachedChargePoint.serialNumber || chargePointId, // ใช้ cached serial หรือ fallback เป็น chargePointId
    ocppVersion,
    connectedAt: new Date(),
    lastSeen: new Date(),
    ws
  };

  // สร้าง session โดยใช้ session manager ใหม่
  const session = sessionManager.createSession(
    chargePointId,
    cachedChargePoint.serialNumber || chargePointId,
    ws,
    ocppVersion
  );

  activeConnections.set(chargePointId, connectionInfo);
  console.log(`🎉 Charge Point ${chargePointId} connected successfully with OCPP ${ocppVersion}`);

  // Step 4: อัปเดต backend เกี่ยวกับการเชื่อมต่อ
  await updateConnectionStatus(chargePointId, true);

  // Step 5: จัดการข้อความที่เข้ามา
  ws.on('message', async (data: Buffer) => {
    try {
      const message = data.toString();
      console.log(`📨 Message from ${chargePointId}:`, message);

      // อัปเดต last seen ทั้งใน legacy และ session manager
      connectionInfo.lastSeen = new Date();
      sessionManager.updateLastSeen(session.sessionId);
      sessionManager.incrementReceivedMessages(session.sessionId);

      // ประมวลผลข้อความผ่าน router
      await handleWebSocketMessage(
        message,
        chargePointId,
        ocppVersion,
        (response: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            // ใช้ session manager เพื่อส่งการตอบกลับ
            sessionManager.sendMessage(session.sessionId, response);
          }
        }
      );

    } catch (error) {
      console.error(`💥 Error processing message from ${chargePointId}:`, error);
    }
  });

  // จัดการการปิดการเชื่อมต่อ
  ws.on('close', async (code: number, reason: Buffer) => {
    console.log(`🔌 Charge Point ${chargePointId} disconnected: ${code} - ${reason.toString()}`);
    activeConnections.delete(chargePointId);
    sessionManager.closeSession(session.sessionId);
    await updateConnectionStatus(chargePointId, false);
  });

  // จัดการข้อผิดพลาดของการเชื่อมต่อ
  ws.on('error', async (error: Error) => {
    console.error(`💥 WebSocket error for ${chargePointId}:`, error);
    activeConnections.delete(chargePointId);
    sessionManager.closeSession(session.sessionId);
    await updateConnectionStatus(chargePointId, false);
  });

  // Step 6: ส่ง heartbeat เป็นระยะ
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      // อัปเดต last seen ทั้งใน legacy และ session manager
      connectionInfo.lastSeen = new Date();
      sessionManager.updateLastSeen(session.sessionId);
    } else {
      clearInterval(heartbeatInterval);
      activeConnections.delete(chargePointId);
      sessionManager.closeSession(session.sessionId);
    }
  }, 30000); // ทุก 30 วินาที

  // ทำความสะอาดเมื่อปิดการเชื่อมต่อ
  ws.on('close', () => {
    clearInterval(heartbeatInterval);
  });
}

/**
 * ดึงการเชื่อมต่อที่ใช้งานอยู่ทั้งหมด
 * Get all active connections
 * @returns Array ของ ConnectionInfo ทั้งหมดที่ใช้งานอยู่
 */
export function getActiveConnections(): ConnectionInfo[] {
  return Array.from(activeConnections.values());
}

/**
 * ดึงการเชื่อมต่อตาม charge point ID
 * Get connection by charge point ID
 * @param chargePointId - รหัส charge point ที่ต้องการค้นหา
 * @returns ConnectionInfo หรือ undefined หากไม่พบ
 */
export function getConnectionByChargePointId(chargePointId: string): ConnectionInfo | undefined {
  return Array.from(activeConnections.values()).find(conn => conn.chargePointId === chargePointId);
}

/**
 * ตัดการเชื่อมต่อ charge point
 * Disconnect charge point
 * @param chargePointId - รหัส charge point ที่ต้องการตัดการเชื่อมต่อ
 * @returns true หากตัดการเชื่อมต่อสำเร็จ, false หากไม่พบการเชื่อมต่อ
 */
export function disconnectChargePoint(chargePointId: string): boolean {
  const connection = getConnectionByChargePointId(chargePointId);
  if (connection) {
    activeConnections.delete(chargePointId); // ใช้ chargePointId เป็นคีย์
    return true;
  }
  return false;
}