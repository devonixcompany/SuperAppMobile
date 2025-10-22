// Main entry point for use-connect WebSocket system
// จุดเริ่มต้นหลักสำหรับระบบ WebSocket use-connect

import { FrontendWebSocketServer } from './frontendWebSocketServer';
import { sessionValidator } from './sessionValidator';
import { realTimeDataManager } from './realTimeDataManager';

// Export ทุกอย่างที่จำเป็น
export * from './types';
export * from './frontendWebSocketServer';
export * from './sessionValidator';
export * from './realTimeDataManager';

// สร้าง WebSocket server instance
let frontendServer: FrontendWebSocketServer | null = null;

/**
 * เริ่มต้นระบบ WebSocket สำหรับ frontend
 * Initialize WebSocket system for frontend
 */
export function startFrontendWebSocketSystem(port: number = 8081): FrontendWebSocketServer {
  if (frontendServer) {
    console.log('⚠️ Frontend WebSocket server กำลังทำงานอยู่แล้ว');
    return frontendServer;
  }

  console.log('🚀 เริ่มต้นระบบ WebSocket สำหรับ Frontend...');
  
  // เริ่มต้น session validator
  console.log('📋 เริ่มต้น Session Validator...');
  
  // เริ่มต้น real-time data manager
  console.log('📊 เริ่มต้น Real-time Data Manager...');
  
  // สร้าง WebSocket server
  frontendServer = new FrontendWebSocketServer(port);
  
  console.log(`✅ ระบบ WebSocket สำหรับ Frontend พร้อมใช้งานที่พอร์ต ${port}`);
  console.log(`🔗 Frontend สามารถเชื่อมต่อได้ที่: ws://localhost:${port}/{chargePointId}/{connectorId}`);
  
  return frontendServer;
}

/**
 * หยุดระบบ WebSocket สำหรับ frontend
 * Stop WebSocket system for frontend
 */
export function stopFrontendWebSocketSystem(): void {
  if (!frontendServer) {
    console.log('⚠️ Frontend WebSocket server ไม่ได้ทำงานอยู่');
    return;
  }

  console.log('🛑 หยุดระบบ WebSocket สำหรับ Frontend...');
  
  // หยุด WebSocket server
  frontendServer.stop();
  frontendServer = null;
  
  // หยุด real-time data manager
  realTimeDataManager.stop();
  
  // หยุด session validator
  sessionValidator.stopOfflineChecking();
  
  console.log('✅ ระบบ WebSocket สำหรับ Frontend หยุดทำงานแล้ว');
}

/**
 * ดึงสถิติของระบบ
 * Get system statistics
 */
export function getSystemStats(): any {
  return {
    server: frontendServer ? frontendServer.getStats() : null,
    sessionValidator: sessionValidator.getValidationStats(),
    realTimeDataManager: realTimeDataManager.getStats(),
    isRunning: frontendServer !== null
  };
}

/**
 * ดึง WebSocket server instance ปัจจุบัน
 * Get current WebSocket server instance
 */
export function getFrontendWebSocketServer(): FrontendWebSocketServer | null {
  return frontendServer;
}

// เริ่มต้นระบบอัตโนมัติหากไม่ได้อยู่ในโหมดทดสอบ
if (process.env.NODE_ENV !== 'test' && !process.env.DISABLE_AUTO_START) {
  // เริ่มต้นระบบเมื่อ import module นี้
  const port = parseInt(process.env.FRONTEND_WS_PORT || '8081');
  startFrontendWebSocketSystem(port);
  
  // จัดการการปิดโปรแกรม
  process.on('SIGINT', () => {
    console.log('\n🛑 ได้รับสัญญาณหยุดโปรแกรม...');
    stopFrontendWebSocketSystem();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 ได้รับสัญญาณยุติโปรแกรม...');
    stopFrontendWebSocketSystem();
    process.exit(0);
  });
}