import { IncomingMessage, createServer } from 'http';
import { URL } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { BACKEND_BASE_URL, WS_GATEWAY_API_KEY } from './config/env';
import { handleConnection } from './handlers/connection';
import { gatewaySessionManager } from './handlers/gatewaySessionManager';
import { sessionMonitor } from './handlers/sessionMonitor';
import { subprotocolToVersion } from './handlers/versionNegotiation';
import { UserConnectionManager } from './services/UserConnectionManager';

// ฟังก์ชันจัดการ RemoteStartTransaction
async function handleRemoteStartTransaction(chargePoint: any, data: any, userWs: WebSocket) {
  try {
    console.log(`🔌 Starting transaction for charge point ${chargePoint.chargePointId}:`, data);
    
    // ตรวจสอบสถานะ WebSocket ของ charge point
    if (!chargePoint.ws || chargePoint.ws.readyState !== WebSocket.OPEN) {
      console.error(`❌ Charge Point ${chargePoint.chargePointId} WebSocket is not open. State: ${chargePoint.ws?.readyState}`);
      
      userWs.send(JSON.stringify({
        type: 'RemoteStartTransactionResponse',
        timestamp: new Date().toISOString(),
        data: {
          status: 'failed',
          message: `เครื่องชาร์จ ${chargePoint.chargePointId} ไม่ได้เชื่อมต่อกับระบบ`,
          code: 'CHARGE_POINT_OFFLINE',
          connectorId: data.connectorId || 1,
          idTag: data.idTag || 'FF88888801'
        }
      }));
      return;
    }
    
    // สร้างคำสั่ง RemoteStartTransaction ตามมาตรฐาน OCPP 1.6 (CALL message type 2)
    const messageId = `remote-start-${Date.now()}`;
    const connectorId = data.connectorId || 1;

    // Reset local meter statistics for this connector before starting
    try {
      gatewaySessionManager.resetConnectorMetrics(
        chargePoint.chargePointId,
        connectorId
      );
    } catch (metricError) {
      console.warn(
        `⚠️ ไม่สามารถรีเซ็ตค่ามิเตอร์ของหัวชาร์จ ${connectorId} บน ${chargePoint.chargePointId}:`,
        metricError
      );
    }
    const remoteStartPayload: Record<string, any> = {
      idTag: data.idTag || 'FF88888801'
    };
    if (connectorId) {
      remoteStartPayload.connectorId = connectorId;
    }
    if (data.chargingProfile) {
      remoteStartPayload.chargingProfile = data.chargingProfile;
    }
    const remoteStartRequest = [
      2, // CALL message type
      messageId,
      'RemoteStartTransaction',
      remoteStartPayload
    ];
    
    console.log(`📤 Sending to charge point ${chargePoint.chargePointId}:`, remoteStartRequest);
    
    // ส่งข้อความไปยัง charge point
    chargePoint.ws.send(JSON.stringify(remoteStartRequest));
    
    console.log(`✅ Message sent successfully to charge point ${chargePoint.chargePointId}`);
    
    // ส่งการตอบกลับไปยัง user เพื่อยืนยันว่าคำสั่งถูกส่งไปแล้ว
    userWs.send(JSON.stringify({
      type: 'RemoteStartTransactionResponse',
      timestamp: new Date().toISOString(),
      data: {
        status: 'sent',
        message: 'คำสั่งเริ่มชาร์จถูกส่งไปยัง Charge Point แล้ว',
        messageId,
        connectorId: remoteStartPayload.connectorId,
        idTag: remoteStartPayload.idTag
      }
    }));
  } catch (error) {
    console.error('Error handling RemoteStartTransaction:', error);
    userWs.send(JSON.stringify({
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Failed to start transaction',
        code: 'REMOTE_START_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }));
  }
}

// ฟังก์ชันจัดการ RemoteStopTransaction
async function handleRemoteStopTransaction(chargePoint: any, data: any, userWs: WebSocket) {
  try {
    console.log(`🛑 Stopping transaction for charge point ${chargePoint.chargePointId}:`, data);
    
    const connectorId = typeof data?.connectorId === 'number'
      ? data.connectorId
      : Number.isFinite(Number(data?.connectorId))
        ? Number(data.connectorId)
        : undefined;

    let transactionId = data?.transactionId;

    if (transactionId === undefined || transactionId === null) {
      if (connectorId !== undefined) {
        transactionId = gatewaySessionManager.getActiveTransactionId(
          chargePoint.chargePointId,
          connectorId
        );
      }
    }

    if (transactionId === undefined || transactionId === null) {
      userWs.send(JSON.stringify({
        type: 'RemoteStopTransactionResponse',
        timestamp: new Date().toISOString(),
        data: {
          status: 'failed',
          message: 'ไม่พบข้อมูลธุรกรรมที่กำลังทำงาน',
          code: 'INVALID_REMOTE_STOP_REQUEST'
        }
      }));
      return;
    }

    const numericTransactionId = typeof transactionId === 'number'
      ? transactionId
      : Number(transactionId);

    if (!Number.isFinite(numericTransactionId)) {
      userWs.send(JSON.stringify({
        type: 'RemoteStopTransactionResponse',
        timestamp: new Date().toISOString(),
        data: {
          status: 'failed',
          message: 'หมายเลขธุรกรรมไม่ถูกต้อง',
          code: 'INVALID_TRANSACTION_ID'
        }
      }));
      return;
    }
    
    // ส่งคำสั่ง RemoteStopTransaction ไปยัง charge point (CALL message type 2)
    const messageId = `remote-stop-${Date.now()}`;
    const remoteStopRequest = [
      2,
      messageId,
      'RemoteStopTransaction',
      {
        transactionId: numericTransactionId
      }
    ];
    
    // ส่งข้อความไปยัง charge point
    chargePoint.ws.send(JSON.stringify(remoteStopRequest));
    
    // ส่งการตอบกลับไปยัง user
    userWs.send(JSON.stringify({
      type: 'RemoteStopTransactionResponse',
      timestamp: new Date().toISOString(),
      data: {
        status: 'sent',
        message: 'คำสั่งหยุดชาร์จถูกส่งไปยัง Charge Point แล้ว',
        messageId,
        transactionId: numericTransactionId
      }
    }));

    const resolvedConnectorId = connectorId ?? chargePoint.connectors.find(
      (c: any) => c.metrics?.activeTransactionId === numericTransactionId
    )?.connectorId;

    if (typeof resolvedConnectorId === 'number' && Number.isFinite(resolvedConnectorId)) {
      try {
        gatewaySessionManager.resetConnectorMetrics(
          chargePoint.chargePointId,
          resolvedConnectorId
        );
      } catch (metricError) {
        console.warn(
          `⚠️ ไม่สามารถรีเซ็ตค่ามิเตอร์ของหัวชาร์จ ${resolvedConnectorId} บน ${chargePoint.chargePointId}:`,
          metricError
        );
      }
    }

  } catch (error) {
    console.error('Error handling RemoteStopTransaction:', error);
    userWs.send(JSON.stringify({
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Failed to stop transaction',
        code: 'REMOTE_STOP_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }));
  }
}

// แคชสำหรับเก็บข้อมูล charge point
// Cache for storing charge point data
const chargePointCache = new Map<string, any>();

// สร้าง UserConnectionManager instance
const userConnectionManager = new UserConnectionManager();

// กำหนดค่าการตรวจสอบ heartbeat ของเครื่องชาร์จหลังจากโหลดข้อมูลจากฐานข้อมูล
const HEARTBEAT_CHECK_INITIAL_DELAY_MS = 5000;   // หน่วงเวลา 5 วินาทีหลังเริ่มระบบก่อนเช็กครั้งแรก
const HEARTBEAT_CHECK_INTERVAL_MS = 30000;       // ตรวจสอบทุก ๆ 30 วินาที (เร็วขึ้นจากเดิม 60 วินาที)
const SINGLE_CHARGE_POINT_CHECK_DELAY_MS = 2000; // เวลารอหลังจากมีเครื่องชาร์จเชื่อมต่อใหม่ (เร็วขึ้นจากเดิม 3 วินาที)
const RECONNECTION_HEARTBEAT_DELAY_MS = 1000;    // เวลารอก่อนส่ง heartbeat หลังจากเชื่อมต่อใหม่

let heartbeatCheckInitialTimeout: NodeJS.Timeout | null = null;
let heartbeatCheckInterval: NodeJS.Timeout | null = null;
const pendingHeartbeatChecks = new Map<string, NodeJS.Timeout>();

/**
 * ยกเลิกตัวจับเวลาการตรวจสอบ heartbeat ของเครื่องชาร์จรายตัว
 */
function cancelPendingChargePointHeartbeatCheck(chargePointId: string): void {
  const timeout = pendingHeartbeatChecks.get(chargePointId);
  if (timeout) {
    clearTimeout(timeout);
    pendingHeartbeatChecks.delete(chargePointId);
  }
}

/**
 * ตรวจสอบการตอบสนองของเครื่องชาร์จที่เชื่อมต่ออยู่
 * - ส่ง WebSocket ping frame เพื่อให้เครื่องชาร์จตอบ pong
 * - ส่ง TriggerMessage (Heartbeat) เพื่อกระตุ้นให้เครื่องชาร์จส่ง Heartbeat ตามมาตรฐาน OCPP
 * Enhanced: เพิ่มการตรวจสอบสถานะการเชื่อมต่อและการจัดการ reconnection
 */
function performChargePointHeartbeatCheck(reason: string, targetChargePointIds?: string[]): void {
  const allChargePoints = gatewaySessionManager.getAllChargePoints();
  const targetChargePoints = targetChargePointIds
    ? allChargePoints.filter(cp => targetChargePointIds.includes(cp.chargePointId))
    : allChargePoints;

  if (targetChargePoints.length === 0) {
    if (targetChargePointIds && targetChargePointIds.length > 0) {
      console.log(
        `📡 ข้ามการตรวจสอบ heartbeat (${reason}) - ไม่พบเครื่องชาร์จที่กำหนดไว้: ${targetChargePointIds.join(', ')}`
      );
    } else {
      console.log(`📡 ข้ามการตรวจสอบ heartbeat (${reason}) - ยังไม่มีเครื่องชาร์จที่เชื่อมต่ออยู่`);
    }
    return;
  }

  let pingSentCount = 0;
  let triggerSentCount = 0;
  let reconnectionDetected = 0;

  targetChargePoints.forEach((chargePoint) => {
    if (!chargePoint.ws || chargePoint.ws.readyState !== WebSocket.OPEN) {
      console.log(
        `⚠️ ข้ามการตรวจสอบ ${chargePoint.chargePointId} เพราะสถานะ WebSocket ไม่ใช่ OPEN (state=${chargePoint.ws?.readyState})`
      );
      return;
    }

    // ตรวจสอบว่าเป็นการเชื่อมต่อใหม่หรือไม่ (เชื่อมต่อมาใน 10 วินาทีที่ผ่านมา)
    const connectionTime = chargePoint.connectedAt ? new Date(chargePoint.connectedAt).getTime() : 0;
    const now = Date.now();
    const isRecentConnection = (now - connectionTime) < 10000; // 10 วินาที

    if (isRecentConnection) {
      reconnectionDetected++;
      console.log(`🔄 ตรวจพบการเชื่อมต่อใหม่: ${chargePoint.chargePointId} (เชื่อมต่อเมื่อ ${Math.round((now - connectionTime) / 1000)} วินาทีที่แล้ว)`);
    }

    try {
      // ส่ง WebSocket ping
      chargePoint.ws.ping();
      pingSentCount++;

      // สำหรับการเชื่อมต่อใหม่ ส่ง heartbeat ทันที
      if (isRecentConnection) {
        setTimeout(() => {
          sendImmediateHeartbeat(chargePoint);
        }, RECONNECTION_HEARTBEAT_DELAY_MS);
      }
    } catch (error) {
      console.error(`❌ ส่ง ping ไปยัง ${chargePoint.chargePointId} ไม่สำเร็จ:`, error);
    }

    // ส่ง TriggerMessage สำหรับ Heartbeat
    const messageId = `trigger-heartbeat-${chargePoint.chargePointId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const triggerMessage = [
      2,
      messageId,
      'TriggerMessage',
      {
        requestedMessage: 'Heartbeat'
      }
    ];

    if (gatewaySessionManager.sendMessage(chargePoint.chargePointId, triggerMessage)) {
      triggerSentCount++;
    } else {
      console.log(`⚠️ ส่ง TriggerMessage ไปยัง ${chargePoint.chargePointId} ไม่สำเร็จ`);
    }
  });

  const statusMessage = reconnectionDetected > 0 
    ? `📡 ตรวจสอบ heartbeat (${reason}) เสร็จสิ้น: ping=${pingSentCount}/${targetChargePoints.length}, TriggerMessage=${triggerSentCount}, การเชื่อมต่อใหม่=${reconnectionDetected}`
    : `📡 ตรวจสอบ heartbeat (${reason}) เสร็จสิ้น: ping=${pingSentCount}/${targetChargePoints.length}, TriggerMessage=${triggerSentCount}`;
  
  console.log(statusMessage);
}

/**
 * ส่ง heartbeat ทันทีสำหรับเครื่องชาร์จที่เชื่อมต่อใหม่
 * Send immediate heartbeat for newly connected charge points
 */
function sendImmediateHeartbeat(chargePoint: any): void {
  if (!chargePoint.ws || chargePoint.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    const messageId = `immediate-heartbeat-${chargePoint.chargePointId}-${Date.now()}`;
    const heartbeatMessage = [
      2, // CALL message type
      messageId,
      'TriggerMessage',
      {
        requestedMessage: 'Heartbeat'
      }
    ];

    chargePoint.ws.send(JSON.stringify(heartbeatMessage));
    console.log(`💓 ส่ง immediate heartbeat ไปยัง ${chargePoint.chargePointId} สำหรับการเชื่อมต่อใหม่`);
  } catch (error) {
    console.error(`❌ ส่ง immediate heartbeat ไปยัง ${chargePoint.chargePointId} ไม่สำเร็จ:`, error);
  }
}

/**
 * จัดคิวตรวจสอบ heartbeat สำหรับเครื่องชาร์จที่เพิ่งเชื่อมต่อใหม่
 */
function scheduleChargePointHeartbeatCheck(chargePointId: string, reason: string): void {
  cancelPendingChargePointHeartbeatCheck(chargePointId);

  const timeout = setTimeout(() => {
    pendingHeartbeatChecks.delete(chargePointId);
    performChargePointHeartbeatCheck(`${reason}:${chargePointId}`, [chargePointId]);
  }, SINGLE_CHARGE_POINT_CHECK_DELAY_MS);

  pendingHeartbeatChecks.set(chargePointId, timeout);
}

/**
 * เริ่มการตรวจสอบ heartbeat แบบรอบระยะเวลา
 */
function startChargePointHeartbeatChecks(): void {
  if (heartbeatCheckInitialTimeout || heartbeatCheckInterval) {
    return;
  }

  console.log(
    `📡 กำลังตั้งเวลาตรวจสอบ heartbeat ของเครื่องชาร์จ (เริ่มใน ${HEARTBEAT_CHECK_INITIAL_DELAY_MS / 1000}s, ทุก ${HEARTBEAT_CHECK_INTERVAL_MS / 1000}s)`
  );

  // ตรวจสอบทันทีหลังโหลดข้อมูล เพื่อบันทึกสถานะเริ่มต้น (ถ้ายังไม่มีจะขึ้น log ข้าม)
  performChargePointHeartbeatCheck('initial-cache-load');

  const runPeriodicCheck = () => performChargePointHeartbeatCheck('periodic-scan');

  heartbeatCheckInitialTimeout = setTimeout(() => {
    runPeriodicCheck();
    heartbeatCheckInterval = setInterval(runPeriodicCheck, HEARTBEAT_CHECK_INTERVAL_MS);
  }, HEARTBEAT_CHECK_INITIAL_DELAY_MS);
}

/**
 * หยุดการตรวจสอบ heartbeat และล้างตัวจับเวลา
 */
function stopChargePointHeartbeatChecks(): void {
  if (heartbeatCheckInitialTimeout) {
    clearTimeout(heartbeatCheckInitialTimeout);
    heartbeatCheckInitialTimeout = null;
  }

  if (heartbeatCheckInterval) {
    clearInterval(heartbeatCheckInterval);
    heartbeatCheckInterval = null;
  }

  for (const timeout of pendingHeartbeatChecks.values()) {
    clearTimeout(timeout);
  }
  pendingHeartbeatChecks.clear();
}

// รับฟังเหตุการณ์เครื่องชาร์จเชื่อมต่อ/ตัดการเชื่อมต่อ เพื่อจัดคิวตรวจสอบ heartbeat
gatewaySessionManager.on('chargePointAdded', ({ chargePointId }) => {
  console.log(`🔔 ตรวจพบเครื่องชาร์จเชื่อมต่อใหม่: ${chargePointId} -> จัดคิวตรวจสอบ heartbeat`);
  scheduleChargePointHeartbeatCheck(chargePointId, 'charge-point-added');
});

gatewaySessionManager.on('chargePointRemoved', ({ chargePointId }) => {
  console.log(`🔕 เครื่องชาร์จถูกถอดการเชื่อมต่อ: ${chargePointId} -> ยกเลิกการตรวจสอบที่รออยู่`);
  cancelPendingChargePointHeartbeatCheck(chargePointId);
});

/**
 * ฟังก์ชั่นดึงข้อมูล charge point จากแคชโดยใช้ chargePointId เป็นคีย์หลัก
 * Get charge point from cache using chargePointId as primary key
 * @param chargePointId - รหัสประจำตัว charge point
 * @returns ข้อมูล charge point หรือ undefined หากไม่พบ
 */
export function getChargePointFromCache(chargePointId: string): any {
  return chargePointCache.get(chargePointId);
}

/**
 * ฟังก์ชั่นดึงข้อมูลแคชทั้งหมด
 * Get all cache data
 * @returns Map ของข้อมูลแคชทั้งหมด
 */
export function getAllCacheData(): Map<string, any> {
  return chargePointCache;
}

/**
 * ฟังก์ชั่นเริ่มต้นแคชด้วยข้อมูล charge point จาก API
 * Initialize cache with charge point data from backend API
 * Step 1: เรียก API เพื่อดึงข้อมูล charge points ทั้งหมด
 * Step 2: เก็บข้อมูลลงในแคชโดยใช้ chargePointIdentity เป็นคีย์
 * Step 3: แสดงผลการโหลดข้อมูลในคอนโซล
 */
async function initializeCache() {
  try {
    console.log('Initializing charge point cache...');
    // Step 1: เรียก API เพื่อดึงข้อมูล charge points
    const response = await fetch(`${BACKEND_BASE_URL}/chargepoints/ws-gateway/chargepoints`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WS_GATEWAY_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json() as { success: boolean; data?: any };
    const chargePoints = Array.isArray(result?.data) ? result.data as any[] : null;

    if (!chargePoints) {
      console.error('⚠️ Charge point payload is invalid:', result);
      throw new Error('Charge point API response does not contain a valid data array');
    }

    // Step 2: เก็บข้อมูล charge point ลงในแคชโดยใช้ chargePointIdentity เป็นคีย์หลัก
    chargePoints.forEach(cp => {
      chargePointCache.set(cp.chargePointIdentity, cp);
      console.log(`Cached charge point: ${cp.chargePointIdentity} (Serial: ${cp.serialNumber})`);
    });

// จัดการ HTTP upgrade สำหรับ WebSocket connections
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  console.log('เส้นทาง URL ที่ขอเชื่อมต่อ:', url.pathname);
  
  if (url.pathname.startsWith('/user-cp/')) {
    // Handle user WebSocket upgrade
    console.log('กำลังเปลี่ยนเส้นทางไปยัง User WebSocket server');
    userWss.handleUpgrade(request, socket, head, (ws) => {
      userWss.emit('connection', ws, request);
    });
  } else if (url.pathname.startsWith('/ocpp/')) {
    // Handle OCPP WebSocket upgrade
    console.log('กำลังเปลี่ยนเส้นทางไปยัง OCPP WebSocket server');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // Default to OCPP for backward compatibility (direct /chargePointId)
    console.log('กำลังเปลี่ยนเส้นทางไปยัง OCPP WebSocket server (โหมดรองรับของเดิม)');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

/**
 * จัดการการเชื่อมต่อ User WebSocket สำหรับดูสถานะการชาร์จ
 * Handle User WebSocket connections for monitoring charging status
 */
userWss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
  console.log('มีการพยายามเชื่อมต่อ User WebSocket ใหม่');
  
  try {
    // แยก charge point ID, connector ID และ user ID จาก URL path
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathParts = url.pathname.split('/').filter(part => part !== '');
    
    // ตรวจสอบรูปแบบ URL: /user-cp/{chargePointId}/{connectorId}/{userId}
    if (pathParts.length !== 4 || pathParts[0] !== 'user-cp') {
      console.error('รูปแบบ URL ของผู้ใช้ไม่ถูกต้อง ต้องเป็น /user-cp/{chargePointId}/{connectorId}/{userId}');
      ws.close(1008, 'Invalid URL format');
      return;
    }
    
    const chargePointId = pathParts[1];
    const connectorId = pathParts[2];
    const userId = pathParts[3];
    
    console.log(`เชื่อมต่อผู้ใช้สำหรับ Charge Point: ${chargePointId} หัวชาร์จ: ${connectorId} ผู้ใช้: ${userId}`);
    
    // ตรวจสอบว่า charge point มีอยู่ในระบบหรือไม่
    // ตรวจสอบทั้งใน gatewaySessionManager และ cache
    const chargePoint = gatewaySessionManager.getChargePoint(chargePointId);
    const cachedChargePoint = getChargePointFromCache(chargePointId);
    
    if (!chargePoint && !cachedChargePoint) {
      console.log(`ไม่พบ Charge Point ${chargePointId} ในเซสชันหรือแคช`);
      ws.close(1008, 'Charge point not found or offline');
      return;
    }
    
    // เพิ่ม connection ลงใน UserConnectionManager พร้อม userId
    userConnectionManager.addConnection(ws, chargePointId, connectorId, userId);
    console.log('สถานะ Charge Point ปัจจุบัน:', chargePoint);
    
    // จัดการข้อความที่เข้ามาจาก user WebSocket
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 รับข้อความจากผู้ใช้ ${chargePointId}/${connectorId}:`, message);
        
        // ตรวจสอบว่า charge point ยังเชื่อมต่ออยู่หรือไม่
        const currentChargePoint = gatewaySessionManager.getChargePoint(chargePointId);
        if (!currentChargePoint) {
          ws.send(JSON.stringify({
            type: 'error',
            timestamp: new Date().toISOString(),
            data: {
              message: 'Charge point is not connected',
              code: 'CHARGE_POINT_OFFLINE'
            }
          }));
          return;
        }
        
        // จัดการข้อความตามประเภท
        switch (message.type) {
          case 'RemoteStartTransaction':
            await handleRemoteStartTransaction(currentChargePoint, message.data, ws);
            break;
          case 'RemoteStopTransaction':
            await handleRemoteStopTransaction(currentChargePoint, message.data, ws);
            break;
          default:
            console.log(`ไม่รู้จักประเภทข้อความจากผู้ใช้: ${message.type}`);
            ws.send(JSON.stringify({
              type: 'error',
              timestamp: new Date().toISOString(),
              data: {
                message: `Unknown message type: ${message.type}`,
                code: 'UNKNOWN_MESSAGE_TYPE'
              }
            }));
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดระหว่างประมวลผลข้อความจากผู้ใช้:', error);
        ws.send(JSON.stringify({
          type: 'error',
          timestamp: new Date().toISOString(),
          data: {
            message: 'Failed to process message',
            code: 'MESSAGE_PROCESSING_ERROR'
          }
        }));
      }
    });
    
    // ส่งข้อมูลสถานะเริ่มต้น
    const parsedConnectorId = Number(connectorId);
    const connectorStatus =
      Number.isFinite(parsedConnectorId) && chargePoint
        ? chargePoint.connectors.find(
            (connector) => connector.connectorId === parsedConnectorId
          )?.status
        : undefined;

    const resolvedStatus = connectorStatus ?? (chargePoint ? 'Available' : 'OFFLINE');

    const initialStatus = {
      type: 'status',
      timestamp: new Date().toISOString(),
      data: {
        chargePointId: chargePointId,
        connectorId: parseInt(connectorId),
        status: resolvedStatus,
        isOnline: !!chargePoint, // true ถ้า charge point เชื่อมต่ออยู่
        message: chargePoint
          ? connectorStatus
            ? `เชื่อมต่อสำเร็จ - หัวชาร์จอยู่ในสถานะ ${connectorStatus}`
            : 'เชื่อมต่อสำเร็จ - Charge Point พร้อมใช้งาน'
          : 'เชื่อมต่อสำเร็จ - Charge Point ออฟไลน์',
        chargePointInfo: cachedChargePoint
          ? {
              serialNumber: cachedChargePoint.serialNumber,
              identity: cachedChargePoint.chargePointIdentity
            }
          : undefined
      }
    };
    console.log('ส่งสถานะเริ่มต้นให้ผู้ใช้:', initialStatus);
    ws.send(JSON.stringify(initialStatus));
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาดระหว่างจัดการการเชื่อมต่อ User WebSocket:', error);
    ws.close(1011, 'Internal server error');
  }
});
    
    // Step 3: แสดงผลสรุปการโหลดข้อมูล
    console.log(`✅ Cache initialized with ${chargePoints.length} charge points`);
    
  } catch (error) {
    console.error('❌ Failed to initialize cache:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.log('⚠️ เซิร์ฟเวอร์จะทำงานต่อโดยไม่มีข้อมูลแคช');
  }
}

// สร้าง HTTP server
const server = createServer((req, res) => {
  // ตั้งค่า CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  
  // API Routes สำหรับดูสถานะ WebSocket และข้อมูลใน cache
  if (url.pathname === '/api/health') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    }));
    return;
  }
  
  if (url.pathname === '/api/sessions') {
    // Sessions information endpoint
    try {
      const sessionStats = gatewaySessionManager.getStats();
      const chargePoints = gatewaySessionManager.getAllChargePoints();
      
      const chargePointsInfo = chargePoints.map(cp => {
        const connectors = (cp.connectors || []).map(connector => ({
          connectorId: connector.connectorId,
          type: connector.type ?? null,
          maxCurrent: typeof connector.maxCurrent === 'number' ? connector.maxCurrent : null,
          status: connector.status ?? null,
          metrics: connector.metrics
            ? {
                energyDeliveredKWh: typeof connector.metrics.energyDeliveredKWh === 'number'
                  ? connector.metrics.energyDeliveredKWh
                  : null,
                stateOfChargePercent: typeof connector.metrics.stateOfChargePercent === 'number'
                  ? connector.metrics.stateOfChargePercent
                  : null,
                powerKw: typeof connector.metrics.powerKw === 'number'
                  ? connector.metrics.powerKw
                  : null,
                voltage: typeof connector.metrics.voltage === 'number'
                  ? connector.metrics.voltage
                  : null,
                currentAmp: typeof connector.metrics.currentAmp === 'number'
                  ? connector.metrics.currentAmp
                  : null,
                lastMeterTimestamp: connector.metrics.lastMeterTimestamp instanceof Date
                  ? connector.metrics.lastMeterTimestamp.toISOString()
                  : connector.metrics.lastMeterTimestamp ?? null
              }
            : null
        }));

        return {
          chargePointId: cp.chargePointId,
          serialNumber: cp.serialNumber,
          isAuthenticated: cp.isAuthenticated,
          connectedAt: cp.connectedAt,
          lastSeen: cp.lastSeen,
          lastHeartbeat: cp.lastHeartbeat,
          ocppVersion: cp.ocppVersion,
          messagesSent: cp.messagesSent,
          messagesReceived: cp.messagesReceived,
          connectionDuration: new Date().getTime() - cp.connectedAt.getTime(),
          wsState: cp.ws.readyState,
          pendingMessageCount: cp.pendingMessages.length,
          connectorCount: cp.connectorCount,
          connectors
        };
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          stats: sessionStats,
          chargePoints: chargePointsInfo
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to get session information'
      }));
    }
    return;
  }
  
  if (url.pathname === '/api/sessions/stats') {
    // Session statistics endpoint
    try {
      const sessionStats = gatewaySessionManager.getStats();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: sessionStats
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to get session statistics'
      }));
    }
    return;
  }
  
  if (url.pathname === '/api/cache') {
    // Cache information endpoint
    try {
      const cacheData = Array.from(chargePointCache.entries()).map(([key, value]) => ({
        chargePointId: key,
        ...value
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          count: chargePointCache.size,
          chargePoints: cacheData
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to get cache information'
      }));
    }
    return;
  }
  
  if (url.pathname.startsWith('/api/sessions/')) {
    // Individual session information endpoint
    const chargePointId = url.pathname.split('/')[3];
    
    try {
      const chargePoint = gatewaySessionManager.getChargePoint(chargePointId);
      
      if (!chargePoint) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Session not found'
        }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const connectors = (chargePoint.connectors || []).map(connector => ({
        connectorId: connector.connectorId,
        type: connector.type ?? null,
        maxCurrent: typeof connector.maxCurrent === 'number' ? connector.maxCurrent : null,
        status: connector.status ?? null,
        metrics: connector.metrics
          ? {
              energyDeliveredKWh: typeof connector.metrics.energyDeliveredKWh === 'number'
                ? connector.metrics.energyDeliveredKWh
                : null,
              stateOfChargePercent: typeof connector.metrics.stateOfChargePercent === 'number'
                ? connector.metrics.stateOfChargePercent
                : null,
              powerKw: typeof connector.metrics.powerKw === 'number'
                ? connector.metrics.powerKw
                : null,
              voltage: typeof connector.metrics.voltage === 'number'
                ? connector.metrics.voltage
                : null,
              currentAmp: typeof connector.metrics.currentAmp === 'number'
                ? connector.metrics.currentAmp
                : null,
              lastMeterTimestamp: connector.metrics.lastMeterTimestamp instanceof Date
                ? connector.metrics.lastMeterTimestamp.toISOString()
                : connector.metrics.lastMeterTimestamp ?? null
            }
          : null
      }));

      res.end(JSON.stringify({
        success: true,
        data: {
          chargePointId: chargePoint.chargePointId,
          serialNumber: chargePoint.serialNumber,
          isAuthenticated: chargePoint.isAuthenticated,
          connectedAt: chargePoint.connectedAt,
          lastSeen: chargePoint.lastSeen,
          lastHeartbeat: chargePoint.lastHeartbeat,
          ocppVersion: chargePoint.ocppVersion,
          messagesSent: chargePoint.messagesSent,
          messagesReceived: chargePoint.messagesReceived,
          connectionDuration: new Date().getTime() - chargePoint.connectedAt.getTime(),
          wsState: chargePoint.ws.readyState,
          pendingMessageCount: chargePoint.pendingMessages.length,
          connectorCount: chargePoint.connectorCount,
          connectors
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to get session information'
      }));
    }
    return;
  }
  
  // Default response for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: 'Not found',
    availableEndpoints: [
      '/api/health',
      '/api/sessions',
      '/api/sessions/stats',
      '/api/sessions/{sessionId}',
      '/api/cache'
    ]
  }));
});

/**
 * สร้าง WebSocket server พร้อมการตรวจสอบ client และ subprotocol negotiation
 * Create WebSocket server with client verification and subprotocol negotiation
 * Step 1: กำหนดค่า server options
 * Step 2: ตั้งค่า verifyClient callback สำหรับตรวจสอบการเชื่อมต่อ
 * Step 3: จัดการ subprotocol negotiation สำหรับ OCPP
 */
// WebSocket Server สำหรับ OCPP connections
const wss = new WebSocketServer({ 
  noServer: true,
  verifyClient: (info: any): boolean => {
    // การตรวจสอบพื้นฐาน - สามารถขยายได้
    // Basic verification - can be extended
    return true;
  },
  handleProtocols: (protocols: Set<string>, request: any) => {
    console.log('Handling subprotocol negotiation:', Array.from(protocols));
    
    // รายการ subprotocols ที่รองรับ
    const supportedProtocols = ['ocpp1.6', 'ocpp2.0', 'ocpp2.0.1'];
    
    // หา subprotocol แรกที่รองรับ
    for (const protocol of protocols) {
      if (supportedProtocols.includes(protocol)) {
        console.log(`Selected subprotocol: ${protocol}`);
        return protocol;
      }
    }
    
    // ถ้าไม่มี subprotocol ที่รองรับ ใช้ ocpp1.6 เป็นค่าเริ่มต้น
    console.log('No supported subprotocol found, defaulting to ocpp1.6');
    return 'ocpp1.6';
  }
});

// WebSocket Server สำหรับ User connections (ดูสถานะการชาร์จ)
const userWss = new WebSocketServer({ 
  noServer: true,
  verifyClient: (info: any): boolean => {
    // ตรวจสอบว่าเป็น user connection
    const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
    return url.pathname.startsWith('/user-cp/');
  }
});

/**
 * จัดการการเชื่อมต่อ WebSocket ใหม่สำหรับ OCPP
 * Handle new OCPP WebSocket connections
 * Step 1: แยก charge point ID และ connector ID จาก URL path
 * Step 2: ตรวจสอบความถูกต้องของ charge point ID
 * Step 3: แยก OCPP version จาก subprotocol
 * Step 4: จัดการการเชื่อมต่อ
 */
wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
  console.log('New OCPP WebSocket connection attempt');
  
  try {
    // Step 1: แยก charge point ID จาก URL path
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathParts = url.pathname.split('/').filter(part => part !== '');
    console.log("OCPP URL path parts:", pathParts);
    
    let chargePointId: string;
    
    // ตรวจสอบรูปแบบ URL สำหรับ OCPP
    if (url.pathname.startsWith('/ocpp/')) {
      // รูปแบบใหม่: /ocpp/chargePointId
      if (pathParts.length >= 2) {
        chargePointId = pathParts[1]; // pathParts[0] = 'ocpp', pathParts[1] = chargePointId
      } else {
        console.error('Invalid OCPP URL format. Expected /ocpp/{chargePointId}');
        ws.close(1008, 'Invalid OCPP URL format. Expected /ocpp/{chargePointId}');
        return;
      }
    } else {
      // รูปแบบเก่า (backward compatibility): /chargePointId
      if (pathParts.length === 1) {
        chargePointId = pathParts[0];
      } else if (pathParts.length === 2) {
        // ถ้าเป็น /chargePointId/connectorId ให้แนะนำใช้ user-cp endpoint
        console.log('Frontend connection detected, should use /user-cp/ endpoint instead');
        ws.close(1008, 'Use /user-cp/{chargePointId}/{connectorId} for frontend connections');
        return;
      } else {
        console.error('Invalid URL format. Expected /chargePointId for OCPP connections');
        ws.close(1008, 'Invalid URL format');
        return;
      }
    }
    
    console.log('Charge Point ID สำหรับการเชื่อมต่อ OCPP:', chargePointId);
    
    // Step 2: ตรวจสอบว่ามี charge point ID หรือไม่
    if (!chargePointId || chargePointId === 'ocpp') {
      console.error('ไม่ได้ส่ง Charge Point ID มาพร้อม URL');
      ws.close(1008, 'Charge point ID required');
      return;
    }
    
    console.log('โปรโตคอลที่เครื่องชาร์จเลือกใช้:', ws.protocol);
    // Step 3: แยก OCPP version จาก subprotocol หรือใช้ค่าเริ่มต้น 1.6
    const subprotocol = ws.protocol || 'ocpp1.6';
    const ocppVersion = subprotocolToVersion(subprotocol) || '1.6';
    
    console.log(`กำลังเชื่อมต่อ OCPP กับ Charge Point ${chargePointId} โดยใช้เวอร์ชัน ${ocppVersion}`);
    
    // Step 4: OCPP connection - จัดการการเชื่อมต่อปกติ
    await handleConnection(ws, request, chargePointId, ocppVersion);
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาดระหว่างจัดการการเชื่อมต่อ OCPP WebSocket:', error);
    ws.close(1011, 'Internal server error');
  }
});

/**
 * จัดการข้อผิดพลาดของ WebSocket server
 * Handle WebSocket server errors
 */
wss.on('error', (error) => {
  console.error('เกิดข้อผิดพลาดในระดับ WebSocket server:', error);
});

/**
 * เริ่มต้นการตรวจสอบ session
 * Start session monitoring every 30 seconds
 */
sessionMonitor.startMonitoring(30000); // Monitor every 30 seconds

/**
 * Cleanup stale sessions periodically every 5 minutes
 */
setInterval(() => {
  const cleanedCount = gatewaySessionManager.cleanupStaleChargePoints();
  if (cleanedCount > 0) {
    console.log(`ทำความสะอาด Charge Point ที่ไม่ใช้งานจำนวน ${cleanedCount} รายการ`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * ส่งข้อความแจ้งเตือนการเริ่มต้น server ไปยังเครื่องชาร์จที่เชื่อมต่อใหม่
 * Send server startup notification to newly connected charge points
 */
async function notifyChargePointsServerStartup(): Promise<void> {
  // รอให้ charge points เชื่อมต่อเข้ามาก่อน
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const activeChargePoints = gatewaySessionManager.getAllChargePoints();
  
  if (activeChargePoints.length === 0) {
    console.log('📡 ยังไม่มีเครื่องชาร์จเชื่อมต่อ ข้ามการแจ้งเตือนการเริ่มต้น server');
    return;
  }

  console.log(`📡 กำลังส่งข้อความแจ้งเตือนการเริ่มต้น server ไปยังเครื่องชาร์จ ${activeChargePoints.length} เครื่อง...`);
  
  const notifications = activeChargePoints.map(async (chargePoint) => {
    if (!chargePoint.ws || chargePoint.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // ส่ง DataTransfer message เพื่อแจ้งเตือนการเริ่มต้น server
      const messageId = `startup-notify-${chargePoint.chargePointId}-${Date.now()}`;
      const startupNotification = [
        2, // CALL message type
        messageId,
        'DataTransfer',
        {
          vendorId: 'SuperApp',
          messageId: 'ServerStartup',
          data: JSON.stringify({
            message: 'Server has started successfully',
            timestamp: new Date().toISOString(),
            serverVersion: '1.0.0'
          })
        }
      ];

      chargePoint.ws.send(JSON.stringify(startupNotification));
      console.log(`✅ ส่งข้อความแจ้งเตือนการเริ่มต้นไปยัง ${chargePoint.chargePointId} แล้ว`);
      
    } catch (error) {
      console.error(`❌ ไม่สามารถส่งข้อความแจ้งเตือนการเริ่มต้นไปยัง ${chargePoint.chargePointId}:`, error);
    }
  });

  await Promise.all(notifications);
  console.log('📡 ส่งข้อความแจ้งเตือนการเริ่มต้น server เสร็จสิ้น');
}

/**
 * ส่ง TriggerMessage เพื่อขอสถานะปัจจุบันจากเครื่องชาร์จ
 * Send TriggerMessage to request current status from charge points
 */
async function requestChargePointsStatus(): Promise<void> {
  // รอให้ charge points เชื่อมต่อเข้ามาก่อน
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const activeChargePoints = gatewaySessionManager.getAllChargePoints();
  
  if (activeChargePoints.length === 0) {
    console.log('📊 ยังไม่มีเครื่องชาร์จเชื่อมต่อ ข้ามการขอสถานะ');
    return;
  }

  console.log(`📊 กำลังขอสถานะปัจจุบันจากเครื่องชาร์จ ${activeChargePoints.length} เครื่อง...`);
  
  const statusRequests = activeChargePoints.map(async (chargePoint) => {
    if (!chargePoint.ws || chargePoint.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // ส่ง TriggerMessage เพื่อขอ StatusNotification
      const messageId = `trigger-status-${chargePoint.chargePointId}-${Date.now()}`;
      const triggerStatusMessage = [
        2, // CALL message type
        messageId,
        'TriggerMessage',
        {
          requestedMessage: 'StatusNotification'
        }
      ];

      chargePoint.ws.send(JSON.stringify(triggerStatusMessage));
      console.log(`📊 ขอสถานะจาก ${chargePoint.chargePointId} แล้ว`);
      
      // ส่ง TriggerMessage เพื่อขอ MeterValues ด้วย
      const meterMessageId = `trigger-meter-${chargePoint.chargePointId}-${Date.now()}`;
      const triggerMeterMessage = [
        2, // CALL message type
        meterMessageId,
        'TriggerMessage',
        {
          requestedMessage: 'MeterValues'
        }
      ];

      // รอสักครู่ก่อนส่งคำขอถัดไป
      await new Promise(resolve => setTimeout(resolve, 200));
      chargePoint.ws.send(JSON.stringify(triggerMeterMessage));
      console.log(`📊 ขอค่ามิเตอร์จาก ${chargePoint.chargePointId} แล้ว`);
      
    } catch (error) {
      console.error(`❌ ไม่สามารถขอสถานะจาก ${chargePoint.chargePointId}:`, error);
    }
  });

  await Promise.all(statusRequests);
  console.log('📊 ขอสถานะจากเครื่องชาร์จเสร็จสิ้น');
}
async function notifyChargePointsBeforeShutdown(): Promise<void> {
  const activeChargePoints = gatewaySessionManager.getAllChargePoints();
  
  if (activeChargePoints.length === 0) {
    console.log('ไม่มีเครื่องชาร์จที่เชื่อมต่ออยู่ ข้ามการแจ้งเตือน');
    return;
  }

  console.log(`กำลังส่งข้อความแจ้งเตือนไปยังเครื่องชาร์จ ${activeChargePoints.length} เครื่อง...`);
  
  const notifications = activeChargePoints.map(async (chargePoint) => {
    if (!chargePoint.ws || chargePoint.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // ส่ง DataTransfer message เพื่อแจ้งเตือนการปิด server
      const messageId = `shutdown-notify-${chargePoint.chargePointId}-${Date.now()}`;
      const shutdownNotification = [
        2, // CALL message type
        messageId,
        'DataTransfer',
        {
          vendorId: 'SuperApp',
          messageId: 'ServerShutdown',
          data: JSON.stringify({
            message: 'Server is shutting down gracefully',
            timestamp: new Date().toISOString(),
            reconnectExpected: true
          })
        }
      ];

      chargePoint.ws.send(JSON.stringify(shutdownNotification));
      console.log(`✅ ส่งข้อความแจ้งเตือนไปยัง ${chargePoint.chargePointId} แล้ว`);
      
      // รอสักครู่เพื่อให้ข้อความถูกส่งไป
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ ไม่สามารถส่งข้อความแจ้งเตือนไปยัง ${chargePoint.chargePointId}:`, error);
    }
  });

  await Promise.all(notifications);
  
  // รอเพิ่มเติมเพื่อให้แน่ใจว่าข้อความถูกส่งไปแล้ว
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('ส่งข้อความแจ้งเตือนเสร็จสิ้น');
}

/**
 * จัดการการปิดโปรแกรมอย่างสุภาพเมื่อได้รับสัญญาณ SIGTERM
 * Graceful shutdown on SIGTERM signal
 * Step 1: แจ้งเตือนเครื่องชาร์จก่อนปิด server
 * Step 2: หยุดการตรวจสอบ session
 * Step 3: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
 * Step 4: ปิด WebSocket server
 */
process.on('SIGTERM', async () => {
  console.log('ได้รับสัญญาณ SIGTERM กำลังปิดระบบอย่างปลอดภัย...');
  
  // Step 1: แจ้งเตือนเครื่องชาร์จก่อนปิด server
  await notifyChargePointsBeforeShutdown();
  
  // Step 2: หยุดการตรวจสอบ session
  stopChargePointHeartbeatChecks();
  sessionMonitor.stopMonitoring();
  
  // Step 3: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
  const activeChargePoints = gatewaySessionManager.getAllChargePoints();
  activeChargePoints.forEach(chargePoint => {
    gatewaySessionManager.removeChargePoint(chargePoint.chargePointId);
  });
  
  // Step 4: ปิด WebSocket server
  wss.close(() => {
    console.log('ปิด WebSocket server เรียบร้อย');
    
    // Step 5: ปิด HTTP server
    server.close(() => {
      console.log('ปิด HTTP server เรียบร้อย');
      process.exit(0);
    });
  });
});

/**
 * จัดการการปิดโปรแกรมอย่างสุภาพเมื่อได้รับสัญญาณ SIGINT (Ctrl+C)
 * Graceful shutdown on SIGINT signal (Ctrl+C)
 * Step 1: แจ้งเตือนเครื่องชาร์จก่อนปิด server
 * Step 2: หยุดการตรวจสอบ session
 * Step 3: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
 * Step 4: ปิด WebSocket server
 */
process.on('SIGINT', async () => {
  console.log('ได้รับสัญญาณ SIGINT กำลังปิดระบบอย่างปลอดภัย...');
  
  // Step 1: แจ้งเตือนเครื่องชาร์จก่อนปิด server
  await notifyChargePointsBeforeShutdown();
  
  // Step 2: หยุดการตรวจสอบ session
  stopChargePointHeartbeatChecks();
  sessionMonitor.stopMonitoring();
  
  // Step 3: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
  const activeChargePoints = gatewaySessionManager.getAllChargePoints();
  activeChargePoints.forEach(chargePoint => {
    gatewaySessionManager.removeChargePoint(chargePoint.chargePointId);
  });
  
  // Step 4: ปิด WebSocket server
  wss.close(() => {
    console.log('ปิด WebSocket server เรียบร้อย');
    
    // Step 5: ปิด HTTP server
    server.close(() => {
      console.log('ปิด HTTP server เรียบร้อย');
      process.exit(0);
    });
  });
});

/**
 * เริ่มต้น server และทำการตั้งค่าเริ่มต้น
 * Start the server and perform initial setup
 * Step 1: เริ่มต้น HTTP server บนพอร์ตที่กำหนด
 * Step 2: แสดงข้อมูล server ในคอนโซล
 * Step 3: เริ่มต้นแคชด้วยข้อมูล charge point
 * Step 4: แสดงสถิติ session เริ่มต้น
 */
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // รับการเชื่อมต่อจากทุก IP address
server.listen(Number(PORT), HOST, async () => {
  // Step 1 & 2: เริ่มต้น server และแสดงข้อมูล
  console.log(`OCPP WebSocket server เปิดใช้งานบน ${HOST}:${PORT}`);
  console.log(`ปลายทาง OCPP WebSocket: ws://<your-ip-address>:${PORT}/ocpp/{chargePointId}`);
  console.log(`ปลายทาง User WebSocket: ws://<your-ip-address>:${PORT}/user-cp/{chargePointId}/{connectorId}`);
  console.log(`ปลายทาง OCPP แบบเดิม: ws://<your-ip-address>:${PORT}/{chargePointId}`);
  console.log('เริ่มระบบติดตามสถานะเซสชันแล้ว');
    // ✅ Step 3.1: เคลียร์ cache ก่อนเริ่มต้นใหม่
 chargePointCache.clear();
  console.log('🧹 ล้างข้อมูลแคชเดิมก่อนเริ่มใช้งาน');
  // Step 3: เริ่มต้นแคชด้วยข้อมูล charge point
  await initializeCache();
  startChargePointHeartbeatChecks();
  
  // Step 4: แสดงสถิติ session เริ่มต้นหลังจาก 1 วินาที
  setTimeout(() => {
    const stats = gatewaySessionManager.getStats();
    console.log('สถิติเบื้องต้นของ gateway session:', stats);
  }, 1000);

  // Step 5: ส่งข้อความแจ้งเตือนการเริ่มต้น server และขอสถานะจากเครื่องชาร์จ
  notifyChargePointsServerStartup().catch(error => {
    console.error('❌ เกิดข้อผิดพลาดในการส่งข้อความแจ้งเตือนการเริ่มต้น server:', error);
  });

  requestChargePointsStatus().catch(error => {
    console.error('❌ เกิดข้อผิดพลาดในการขอสถานะจากเครื่องชาร์จ:', error);
  });
});

// ส่งออก server สำหรับการทดสอบ
// Export server for testing
export { server, wss };
