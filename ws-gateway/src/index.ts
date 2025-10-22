import { IncomingMessage, createServer } from 'http';
import { URL } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { handleConnection } from './handlers/connection';
import { gatewaySessionManager } from './handlers/gatewaySessionManager';
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
    console.log(`✅ Cache initialized with ${chargePoints.length} charge points`);
    
  } catch (error) {
    console.error('❌ Failed to initialize cache:', error);
    console.log('⚠️ Server will continue without cache data');
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
      
      const chargePointsInfo = chargePoints.map(cp => ({
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
        pendingMessageCount: cp.pendingMessages.length
      }));
      
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
          pendingMessageCount: chargePoint.pendingMessages.length
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
const wss = new WebSocketServer({ 
  server,
  verifyClient: (info: any) => {
   
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
    console.log("chargePointId connect:", chargePointId)
    // Step 2: ตรวจสอบว่ามี charge point ID หรือไม่
    if (!chargePointId || chargePointId === 'ocpp') {
      console.error('No charge point ID provided in URL');
      ws.close(1008, 'Charge point ID required');
      return;
    }
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
sessionMonitor.startMonitoring(30000); // Monitor every 30 seconds

/**
 * Cleanup stale sessions periodically every 5 minutes
 */
setInterval(() => {
  const cleanedCount = gatewaySessionManager.cleanupStaleChargePoints();
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} stale charge points`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * จัดการการปิดโปรแกรมอย่างสุภาพเมื่อได้รับสัญญาณ SIGTERM
 * Graceful shutdown on SIGTERM signal
 * Step 1: หยุดการตรวจสอบ session
 * Step 2: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
 * Step 3: ปิด WebSocket server
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Step 1: หยุดการตรวจสอบ session
  sessionMonitor.stopMonitoring();
  
  // Step 2: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
  const activeChargePoints = gatewaySessionManager.getAllChargePoints();
  activeChargePoints.forEach(chargePoint => {
    gatewaySessionManager.removeChargePoint(chargePoint.chargePointId);
  });
  
  // Step 3: ปิด WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    
    // Step 4: ปิด HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

/**
 * จัดการการปิดโปรแกรมอย่างสุภาพเมื่อได้รับสัญญาณ SIGINT (Ctrl+C)
 * Graceful shutdown on SIGINT signal (Ctrl+C)
 * Step 1: หยุดการตรวจสอบ session
 * Step 2: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
 * Step 3: ปิด WebSocket server
 */
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  // Step 1: หยุดการตรวจสอบ session
  sessionMonitor.stopMonitoring();
  
  // Step 2: ปิด charge points ที่ยังใช้งานอยู่ทั้งหมด
  const activeChargePoints = gatewaySessionManager.getAllChargePoints();
  activeChargePoints.forEach(chargePoint => {
    gatewaySessionManager.removeChargePoint(chargePoint.chargePointId);
  });
  
  // Step 3: ปิด WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    
    // Step 4: ปิด HTTP server
    server.close(() => {
      console.log('HTTP server closed');
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
const PORT = process.env.PORT || 8081;
server.listen(PORT, async () => {
  // Step 1 & 2: เริ่มต้น server และแสดงข้อมูล
  console.log(`OCPP WebSocket server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ocpp/{chargePointId}`);
  console.log('Session monitoring started');
    // ✅ Step 3.1: เคลียร์ cache ก่อนเริ่มต้นใหม่
  // chargePointCache.clear();
  console.log('🧹 Cleared old cache before initialization');
  // Step 3: เริ่มต้นแคชด้วยข้อมูล charge point
  await initializeCache();
  
  // Step 4: แสดงสถิติ session เริ่มต้นหลังจาก 1 วินาที
  setTimeout(() => {
    const stats = gatewaySessionManager.getStats();
    console.log('Initial gateway session stats:', stats);
  }, 1000);
});

// ส่งออก server สำหรับการทดสอบ
// Export server for testing
export { server, wss };
