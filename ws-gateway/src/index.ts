import { IncomingMessage, createServer } from 'http';
import { URL } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { handleConnection } from './handlers/connection';
import { sessionManager } from './handlers/sessionManager';
import { sessionMonitor } from './handlers/sessionMonitor';
import { subprotocolToVersion } from './handlers/versionNegotiation';

// แคชสำหรับเก็บข้อมูล charge point
// Cache for storing charge point data
const chargePointCache = new Map<string, any>();

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
    const response = await fetch('http://localhost:8080/api/chargepoints/ws-gateway/chargepoints');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json() as { success: boolean; data: any[] };
    const chargePoints = result.data as any[];
    
    // Step 2: เก็บข้อมูล charge point ลงในแคชโดยใช้ chargePointIdentity เป็นคีย์หลัก
    chargePoints.forEach(cp => {
      chargePointCache.set(cp.chargePointIdentity, cp);
      console.log(`Cached charge point: ${cp.chargePointIdentity} (Serial: ${cp.serialNumber})`);
    });
    
    // Step 3: แสดงผลสรุปการโหลดข้อมูล
    console.log(`Cache initialized with ${chargePoints.length} charge points`);
  } catch (error) {
    console.error('Failed to initialize cache:', error);
    console.log('Cache will remain empty - charge points will be validated via API calls');
  }
}

// สร้าง HTTP server
// Create HTTP server
const server = createServer();

/**
 * สร้าง WebSocket server พร้อมการตรวจสอบ client
 * Create WebSocket server with client verification
 * Step 1: กำหนดค่า server options
 * Step 2: ตั้งค่า verifyClient callback สำหรับตรวจสอบการเชื่อมต่อ
 */
const wss = new WebSocketServer({ 
  server,
  verifyClient: (info: any) => {
    console.log('Verifying client connection:', info.req.url);
    // การตรวจสอบพื้นฐาน - สามารถขยายได้
    // Basic verification - can be extended
    return true;
  }
});

/**
 * จัดการการเชื่อมต่อ WebSocket ใหม่
 * Handle new WebSocket connections
 * Step 1: แยก charge point ID จาก URL path
 * Step 2: ตรวจสอบความถูกต้องของ charge point ID
 * Step 3: แยก OCPP version จาก subprotocol
 * Step 4: เรียกใช้ handleConnection เพื่อจัดการการเชื่อมต่อ
 */
wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
  console.log('New WebSocket connection attempt');
  
  try {
    // Step 1: แยก charge point ID จาก URL path
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathParts = url.pathname.split('/');
    const chargePointId = pathParts[pathParts.length - 1];
    
    // Step 2: ตรวจสอบว่ามี charge point ID หรือไม่
    if (!chargePointId || chargePointId === 'ocpp') {
      console.error('No charge point ID provided in URL');
      ws.close(1008, 'Charge point ID required');
      return;
    }
    console.log("websocket detail:",  ws)
        console.log("websocket protocol:",  ws.protocol)
    // Step 3: แยก OCPP version จาก subprotocol หรือใช้ค่าเริ่มต้น 1.6
    const subprotocol = ws.protocol || 'ocpp1.6';
    const ocppVersion = subprotocolToVersion(subprotocol) || '1.6';
    
    console.log(`Attempting connection for charge point: ${chargePointId} with OCPP ${ocppVersion}`);
    
    // Step 4: จัดการการเชื่อมต่อ
    await handleConnection(ws, request, chargePointId, ocppVersion);
    
  } catch (error) {
    console.error('Error handling WebSocket connection:', error);
    ws.close(1011, 'Internal server error');
  }
});

/**
 * จัดการข้อผิดพลาดของ WebSocket server
 * Handle WebSocket server errors
 */
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

/**
 * เริ่มต้นการตรวจสอบ session
 * Start session monitoring every 30 seconds
 */
sessionMonitor.startMonitoring(3000); // Monitor every 30 seconds

/**
 * ทำความสะอาด session ที่หมดอายุทุก 5 นาที
 * Cleanup stale sessions periodically every 5 minutes
 */
setInterval(() => {
  const cleanedCount = sessionManager.cleanupStaleSessions();
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} stale sessions`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * จัดการการปิดโปรแกรมอย่างสุภาพเมื่อได้รับสัญญาณ SIGTERM
 * Graceful shutdown on SIGTERM signal
 * Step 1: หยุดการตรวจสอบ session
 * Step 2: ปิด session ที่ยังใช้งานอยู่ทั้งหมด
 * Step 3: ปิด WebSocket server
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Step 1: หยุดการตรวจสอบ session
  sessionMonitor.stopMonitoring();
  
  // Step 2: ปิด session ที่ยังใช้งานอยู่ทั้งหมด
  const activeSessions = sessionManager.getActiveSessions();
  activeSessions.forEach(session => {
    sessionManager.closeSession(session.sessionId);
  });
  
  // Step 3: ปิด WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

/**
 * จัดการการปิดโปรแกรมอย่างสุภาพเมื่อได้รับสัญญาณ SIGINT (Ctrl+C)
 * Graceful shutdown on SIGINT signal (Ctrl+C)
 * Step 1: หยุดการตรวจสอบ session
 * Step 2: ปิด session ที่ยังใช้งานอยู่ทั้งหมด
 * Step 3: ปิด WebSocket server
 */
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  // Step 1: หยุดการตรวจสอบ session
  sessionMonitor.stopMonitoring();
  
  // Step 2: ปิด session ที่ยังใช้งานอยู่ทั้งหมด
  const activeSessions = sessionManager.getActiveSessions();
  activeSessions.forEach(session => {
    sessionManager.closeSession(session.sessionId);
  });
  
  // Step 3: ปิด WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
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
const PORT = process.env.PORT || 8081;
server.listen(PORT, async () => {
  // Step 1 & 2: เริ่มต้น server และแสดงข้อมูล
  console.log(`OCPP WebSocket server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ocpp/{chargePointId}`);
  console.log('Session monitoring started');
  
  // Step 3: เริ่มต้นแคชด้วยข้อมูล charge point
  await initializeCache();
  
  // Step 4: แสดงสถิติ session เริ่มต้นหลังจาก 1 วินาที
  setTimeout(() => {
    const stats = sessionManager.getStats();
    console.log('Initial session stats:', stats);
  }, 1000);
});

// ส่งออก server สำหรับการทดสอบ
// Export server for testing
export { server, wss };
