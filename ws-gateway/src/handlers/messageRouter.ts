// Message router for OCPP protocol messages
// ตัวจัดการเส้นทางข้อความสำหรับโปรโตคอล OCPP
import { handleMessage as handleV16Message } from '../versionModules/v1_6/handler';
import { handleMessage as handleV201Message } from '../versionModules/v2_0_1/handler';

// Interface สำหรับข้อความ OCPP
// กำหนดโครงสร้างของข้อความ OCPP ที่ประกอบด้วย messageTypeId, messageId, action และ payload
export interface OCPPMessage {
  messageTypeId: number;  // ประเภทของข้อความ (2=CALL, 3=CALLRESULT, 4=CALLERROR)
  messageId: string;      // รหัสข้อความที่ไม่ซ้ำกัน
  action?: string;        // ชื่อ action (สำหรับ CALL message เท่านั้น)
  payload: any;           // ข้อมูลเนื้อหาของข้อความ
}

// Interface สำหรับข้อมูลการจัดเส้นทาง
// เก็บข้อมูลที่จำเป็นสำหรับการส่งข้อความระหว่าง charge point และ central system
export interface RouteInfo {
  source: string;         // แหล่งที่มาของข้อความ
  destination: string;    // ปลายทางของข้อความ
  version: string;        // เวอร์ชันของ OCPP ที่ใช้
  message: OCPPMessage;   // ข้อความ OCPP
  chargePointId: string;  // รหัส charge point
}

// Interface สำหรับการตอบกลับข้อความ
// กำหนดโครงสร้างของการตอบกลับที่อาจสำเร็จหรือเกิดข้อผิดพลาด
export interface MessageResponse {
  success: boolean;       // สถานะความสำเร็จ
  response?: any;         // ข้อมูลการตอบกลับ (ถ้าสำเร็จ)
  error?: {              // ข้อมูลข้อผิดพลาด (ถ้าไม่สำเร็จ)
    code: string;         // รหัสข้อผิดพลาด
    description: string;  // คำอธิบายข้อผิดพลาด
    details?: any;        // รายละเอียดเพิ่มเติม
  };
}

/**
 * แปลงข้อความ OCPP จากข้อมูล WebSocket
 * Parse OCPP message from WebSocket data
 * 
 * ขั้นตอนการทำงาน:
 * 1. แปลง JSON string เป็น array
 * 2. ตรวจสอบรูปแบบข้อความ OCPP (ต้องเป็น array ที่มีอย่างน้อย 3 elements)
 * 3. แยกข้อมูล messageTypeId, messageId, action และ payload
 * 4. สร้าง OCPPMessage object และส่งคืน
 */
export function parseOCPPMessage(data: string): OCPPMessage | null {
  try {
    // แปลง JSON string เป็น JavaScript object
    const parsed = JSON.parse(data);
    
    // ตรวจสอบว่าเป็น array และมีข้อมูลอย่างน้อย 3 elements
    if (!Array.isArray(parsed) || parsed.length < 3) {
      throw new Error('Invalid OCPP message format');
    }

    // แยกข้อมูลจาก array ตามรูปแบบ OCPP
    const [messageTypeId, messageId, action, payload] = parsed;

    return {
      messageTypeId,
      messageId,
      action: messageTypeId === 2 ? action : undefined, // CALL message มี action
      payload: messageTypeId === 2 ? payload : action // สำหรับ CALL payload อยู่ตำแหน่งที่ 4, สำหรับ CALLRESULT/CALLERROR อยู่ตำแหน่งที่ 3
    };
  } catch (error) {
    console.error('Failed to parse OCPP message:', error);
    return null;
  }
}

/**
 * จัดรูปแบบข้อความตอบกลับ OCPP
 * Format OCPP response message
 * 
 * สร้างข้อความ CALLRESULT ในรูปแบบ: [3, messageId, payload]
 */
export function formatOCPPResponse(messageId: string, payload: any): string {
  // CALLRESULT message format: [3, messageId, payload]
  return JSON.stringify([3, messageId, payload]);
}

/**
 * จัดรูปแบบข้อความข้อผิดพลาด OCPP
 * Format OCPP error message
 * 
 * สร้างข้อความ CALLERROR ในรูปแบบ: [4, messageId, errorCode, errorDescription, errorDetails]
 */
export function formatOCPPError(messageId: string, errorCode: string, errorDescription: string, errorDetails?: any): string {
  // CALLERROR message format: [4, messageId, errorCode, errorDescription, errorDetails]
  return JSON.stringify([4, messageId, errorCode, errorDescription, errorDetails || {}]);
}

/**
 * จัดเส้นทางข้อความ OCPP ไปยัง handler ที่เหมาะสมตามเวอร์ชัน
 * Route OCPP message to appropriate version handler
 * 
 * ขั้นตอนการทำงาน:
 * 1. ตรวจสอบประเภทข้อความ (จัดการเฉพาะ CALL messages)
 * 2. เลือก handler ตามเวอร์ชัน OCPP
 * 3. ส่งข้อความไปยัง handler ที่เหมาะสม
 * 4. ส่งคืนผลลัพธ์หรือข้อผิดพลาด
 */
export async function routeMessage(routeInfo: RouteInfo): Promise<MessageResponse> {
  const { version, message, chargePointId } = routeInfo;
  
  try {
    console.log(`Routing ${message.action || 'response'} message for charge point ${chargePointId} using OCPP ${version}`);

    // จัดการเฉพาะ CALL messages (messageTypeId = 2)
    if (message.messageTypeId !== 2) {
      console.log('Ignoring non-CALL message');
      return { success: true };
    }

    let response: any = null;

    // เลือก handler ตามเวอร์ชัน OCPP
    switch (version) {
      case '1.6':
      case 'OCPP16':
      case 'ocpp1.6':
        // ใช้ handler สำหรับ OCPP 1.6
        response = await handleV16Message(message.action!, message.payload, chargePointId, message.messageId);
        break;
      
      case '2.0':
      case '2.0.1':
      case 'OCPP20':
      case 'OCPP201':
      case 'ocpp2.0':
      case 'ocpp2.0.1':
        // ใช้ handler สำหรับ OCPP 2.0/2.0.1
        response = await handleV201Message(message.action!, message.payload);
        break;
      
      default:
        // เวอร์ชันที่ไม่รองรับ
        throw new Error(`Unsupported OCPP version: ${version}`);
    }

    return {
      success: true,
      response
    };

  } catch (error: any) {
    console.error('Message routing error:', error);
    return {
      success: false,
      error: {
        code: 'InternalError',
        description: error.message || 'Internal server error',
        details: error
      }
    };
  }
}

/**
 * จัดการข้อความ WebSocket ที่เข้ามา
 * Handle incoming WebSocket message
 * 
 * ขั้นตอนการทำงาน:
 * 1. แปลงข้อความจาก WebSocket เป็น OCPP message
 * 2. สร้าง RouteInfo สำหรับการจัดเส้นทาง
 * 3. ส่งข้อความไปยัง message router
 * 4. ส่งการตอบกลับกลับไปยัง charge point (สำหรับ CALL messages)
 */
export async function handleWebSocketMessage(
  data: string,           // ข้อมูลข้อความจาก WebSocket
  chargePointId: string,  // รหัส charge point
  ocppVersion: string,    // เวอร์ชัน OCPP
  sendResponse: (message: string) => void  // ฟังก์ชันสำหรับส่งการตอบกลับ
): Promise<void> {
  // แปลงข้อความเป็น OCPP message
  const message = parseOCPPMessage(data);
  
  if (!message) {
    console.error('Failed to parse message from charge point:', chargePointId);
    return;
  }

  // สร้างข้อมูลสำหรับการจัดเส้นทาง
  const routeInfo: RouteInfo = {
    source: chargePointId,
    destination: 'central_system',
    version: ocppVersion,
    message,
    chargePointId
  };

  // ส่งข้อความไปยัง router
  const result = await routeMessage(routeInfo);

  // ส่งการตอบกลับกลับไปยัง charge point สำหรับ CALL messages
  if (message.messageTypeId === 2) {
    let responseMessage: string;

    if (result.success && result.response !== null) {
      // สร้างข้อความ CALLRESULT
      responseMessage = formatOCPPResponse(message.messageId, result.response);
    } else if (!result.success && result.error) {
      // สร้างข้อความ CALLERROR
      responseMessage = formatOCPPError(
        message.messageId,
        result.error.code,
        result.error.description,
        result.error.details
      );
    } else {
      // การตอบกลับเริ่มต้นสำหรับข้อความที่ไม่ต้องการข้อมูลตอบกลับ
      responseMessage = formatOCPPResponse(message.messageId, {});
    }

    // ส่งการตอบกลับไปยัง charge point
    sendResponse(responseMessage);
  }
}