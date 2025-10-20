// Version negotiation handler
// ตัวจัดการการเจรจาเวอร์ชัน
// Implements subprotocol and version negotiation logic for OCPP
// ใช้งานตรรกะการเจรจา subprotocol และเวอร์ชันสำหรับ OCPP

// Interface สำหรับข้อมูลเวอร์ชัน
// กำหนดโครงสร้างข้อมูลของเวอร์ชัน OCPP ที่รองรับ
export interface VersionInfo {
  version: string;      // หมายเลขเวอร์ชัน (เช่น "1.6", "2.0")
  subprotocol: string;  // ชื่อ subprotocol (เช่น "ocpp1.6", "ocpp2.0")
  features: string[];   // รายการฟีเจอร์ที่รองรับในเวอร์ชันนี้
}

// เวอร์ชัน OCPP ที่รองรับและฟีเจอร์ของแต่ละเวอร์ชัน
// Supported OCPP versions and their features
const SUPPORTED_VERSIONS: Record<string, VersionInfo> = {
  'ocpp1.6': {
    version: '1.6',
    subprotocol: 'ocpp1.6',
    features: [
      // ฟีเจอร์สำหรับการควบคุมระยะไกล
      'RemoteStartTransaction',      // เริ่มการชาร์จระยะไกล
      'RemoteStopTransaction',       // หยุดการชาร์จระยะไกล
      'GetConfiguration',            // ดึงค่าการตั้งค่า
      'ChangeConfiguration',         // เปลี่ยนค่าการตั้งค่า
      'Reset',                       // รีเซ็ตระบบ
      'UnlockConnector',            // ปลดล็อคหัวชาร์จ
      'GetDiagnostics',             // ดึงข้อมูลการวินิจฉัย
      'UpdateFirmware',             // อัปเดต firmware
      'ReserveNow',                 // จองการใช้งาน
      'CancelReservation',          // ยกเลิกการจอง
      
      // ฟีเจอร์สำหรับการทำธุรกรรม
      'StartTransaction',           // เริ่มธุรกรรม
      'StopTransaction',            // หยุดธุรกรรม
      'Authorize',                  // ตรวจสอบสิทธิ์
      
      // ฟีเจอร์สำหรับการแจ้งสถานะ
      'BootNotification',           // แจ้งการเริ่มระบบ
      'DataTransfer',               // ส่งข้อมูล
      'DiagnosticsStatusNotification', // แจ้งสถานะการวินิจฉัย
      'FirmwareStatusNotification', // แจ้งสถานะ firmware
      'Heartbeat',                  // สัญญาณชีพ
      'MeterValues',                // ค่าจากมิเตอร์
      'StatusNotification'          // แจ้งสถานะ
    ]
  },
  'ocpp2.0': {
    version: '2.0',
    subprotocol: 'ocpp2.0',
    features: [
      // ฟีเจอร์สำหรับการควบคุมระยะไกล (OCPP 2.0)
      'RequestStartTransaction',     // ขอเริ่มการชาร์จ
      'RequestStopTransaction',      // ขอหยุดการชาร์จ
      'GetVariables',               // ดึงค่าตัวแปร
      'SetVariables',               // ตั้งค่าตัวแปร
      'Reset',                      // รีเซ็ตระบบ
      'UnlockConnector',           // ปลดล็อคหัวชาร์จ
      'GetLog',                    // ดึงข้อมูล log
      'UpdateFirmware',            // อัปเดต firmware
      'ReserveNow',                // จองการใช้งาน
      'CancelReservation',         // ยกเลิกการจอง
      
      // ฟีเจอร์สำหรับการทำธุรกรรม (OCPP 2.0)
      'TransactionEvent',          // เหตุการณ์ธุรกรรม
      'Authorize',                 // ตรวจสอบสิทธิ์
      
      // ฟีเจอร์สำหรับการแจ้งสถานะ (OCPP 2.0)
      'BootNotification',          // แจ้งการเริ่มระบบ
      'DataTransfer',              // ส่งข้อมูล
      'LogStatusNotification',     // แจ้งสถานะ log
      'FirmwareStatusNotification', // แจ้งสถานะ firmware
      'Heartbeat',                 // สัญญาณชีพ
      'NotifyReport',              // แจ้งรายงาน
      'StatusNotification',        // แจ้งสถานะ
      'SecurityEventNotification'  // แจ้งเหตุการณ์ความปลอดภัย
    ]
  },
  'ocpp2.0.1': {
    version: '2.0.1',
    subprotocol: 'ocpp2.0.1',
    features: [
      // ฟีเจอร์เดียวกับ OCPP 2.0 พร้อมฟีเจอร์เพิ่มเติม
      'RequestStartTransaction',
      'RequestStopTransaction',
      'GetVariables',
      'SetVariables',
      'Reset',
      'UnlockConnector',
      'GetLog',
      'UpdateFirmware',
      'ReserveNow',
      'CancelReservation',
      'TransactionEvent',
      'Authorize',
      'BootNotification',
      'DataTransfer',
      'LogStatusNotification',
      'FirmwareStatusNotification',
      'Heartbeat',
      'NotifyReport',
      'StatusNotification',
      'SecurityEventNotification',
      
      // ฟีเจอร์เพิ่มเติมใน OCPP 2.0.1
      'Get15118EVCertificate',     // ดึงใบรับรอง EV ตาม ISO 15118
      'GetCertificateStatus'       // ดึงสถานะใบรับรอง
    ]
  }
};

/**
 * เจรจาเวอร์ชัน OCPP ที่เหมาะสม
 * Negotiate appropriate OCPP version
 * 
 * ฟังก์ชันนี้จะเลือกเวอร์ชัน OCPP ที่เหมาะสมที่สุดจากรายการที่ client ร้องขอ
 * โดยจะให้ความสำคัญกับเวอร์ชันที่ใหม่กว่าก่อน
 * 
 * @param requestedVersions - รายการเวอร์ชันที่ client ร้องขอ
 * @returns ข้อมูลเวอร์ชันที่เลือก หรือ null ถ้าไม่มีเวอร์ชันที่รองรับ
 */
export function negotiateVersion(requestedVersions: string[]): VersionInfo | null {
  console.log('Negotiating OCPP version from:', requestedVersions);
  
  // ลำดับความสำคัญในการเลือกเวอร์ชัน (ให้ความสำคัญกับเวอร์ชันใหม่กว่า)
  // Priority order for version selection (prefer newer versions)
  const versionPriority = ['ocpp2.0.1', 'ocpp2.0', 'ocpp1.6'];
  
  // หาเวอร์ชันที่มีความสำคัญสูงสุดที่รองรับทั้ง client และ server
  // Find the highest priority version that's supported by both client and server
  for (const preferredVersion of versionPriority) {
    if (requestedVersions.includes(preferredVersion) && SUPPORTED_VERSIONS[preferredVersion]) {
      console.log(`Selected OCPP version: ${preferredVersion}`);
      return SUPPORTED_VERSIONS[preferredVersion];
    }
  }
  
  console.log('No compatible OCPP version found');
  return null;
}

/**
 * ดึงรายการเวอร์ชันที่รองรับ
 * Get list of supported versions
 * 
 * @returns รายการเวอร์ชัน OCPP ที่ระบบรองรับ
 */
export function getSupportedVersions(): string[] {
  return Object.keys(SUPPORTED_VERSIONS);
}

/**
 * ดึงข้อมูลเวอร์ชันที่ระบุ
 * Get information for specified version
 * 
 * @param version - เวอร์ชันที่ต้องการข้อมูล
 * @returns ข้อมูลเวอร์ชัน หรือ null ถ้าไม่รองรับ
 */
export function getVersionInfo(version: string): VersionInfo | null {
  return SUPPORTED_VERSIONS[version] || null;
}

/**
 * ตรวจสอบว่าเวอร์ชันที่ระบุรองรับหรือไม่
 * Check if specified version is supported
 * 
 * @param version - เวอร์ชันที่ต้องการตรวจสอบ
 * @returns true ถ้ารองรับ, false ถ้าไม่รองรับ
 */
export function isVersionSupported(version: string): boolean {
  return version in SUPPORTED_VERSIONS;
}

/**
 * แปลงเวอร์ชัน OCPP เป็นรูปแบบ subprotocol
 * Convert OCPP version string to subprotocol format
 * 
 * @param version - เวอร์ชันในรูปแบบตัวเลข (เช่น "1.6", "2.0")
 * @returns subprotocol ในรูปแบบ "ocpp" prefix (เช่น "ocpp1.6", "ocpp2.0")
 */
export function versionToSubprotocol(version: string): string {
  switch (version) {
    case '1.6':
      return 'ocpp1.6';
    case '2.0':
      return 'ocpp2.0';
    case '2.0.1':
      return 'ocpp2.0.1';
    default:
      return version; // ส่งคืนตามเดิมถ้าอยู่ในรูปแบบ subprotocol แล้ว
  }
}

/**
 * แปลง subprotocol เป็นเวอร์ชันในรูปแบบตัวเลข
 * Convert subprotocol to version string
 * 
 * @param subprotocol - subprotocol ในรูปแบบ "ocpp" prefix
 * @returns เวอร์ชันในรูปแบบตัวเลข
 */
export function subprotocolToVersion(subprotocol: string): string {
  switch (subprotocol) {
    case 'ocpp1.6':
      return '1.6';
    case 'ocpp2.0':
      return '2.0';
    case 'ocpp2.0.1':
      return '2.0.1';
    default:
      return subprotocol; // ส่งคืนตามเดิมถ้าอยู่ในรูปแบบเวอร์ชันแล้ว
  }
}