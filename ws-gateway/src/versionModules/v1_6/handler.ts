// OCPP 1.6 Message Handler
// Implements logic specific to OCPP 1.6 messages

import { BACKEND_URL, WS_GATEWAY_API_KEY } from '../../config/env';

const withGatewayHeaders = (headers: Record<string, string> = {}) => ({
  'X-Api-Key': WS_GATEWAY_API_KEY,
  ...headers
});

export interface OCPP16StatusNotificationRequest {
  connectorId: number;
  errorCode: string;
  status: string;
  timestamp?: string;
  info?: string;
  vendorId?: string;
  vendorErrorCode?: string;
}

export interface OCPP16MeterValuesRequest {
  connectorId: number;
  transactionId?: number;
  meterValue: Array<{
    timestamp: string;
    sampledValue: Array<{
      value: string;
      context?: string;
      format?: string;
      measurand?: string;
      phase?: string;
      location?: string;
      unit?: string;
    }>;
  }>;
}

export interface OCPP16BootNotificationRequest {
  chargePointVendor: string;
  chargePointModel: string;
  chargePointSerialNumber?: string;
  chargeBoxSerialNumber?: string;
  firmwareVersion?: string;
  iccid?: string;
  imsi?: string;
  meterType?: string;
  meterSerialNumber?: string;
}

// Backend API Response Interfaces
export interface BackendApiResponse {
  data?: {
    status?: string;
    reason?: string;
    transaction?: {
      transactionId?: number | string;
    };
  };
}

/**
 * Handle StatusNotification messages for OCPP 1.6
 * - Receives connector status information from Charge Point
 * - Updates connector status in gateway session manager
 * - Sends response acknowledging receipt
 */
export async function handleStatusNotification(
  chargePointId: string,
  messageId: string,
  payload: any
): Promise<any> {
  console.log(
    `🔌 [OCPP] รับ StatusNotification จาก ${chargePointId}: connector=${payload.connectorId}, status=${payload.status}, errorCode=${payload.errorCode || 'ไม่มี'}`
  );

  try {
    // Check required data
    if (payload.connectorId === undefined || !payload.status) {
      console.error(`❌ ข้อมูล StatusNotification จาก ${chargePointId} ไม่ครบถ้วน`);
      return {};
    }

    // Import gatewaySessionManager here to avoid circular dependency
    const { gatewaySessionManager } = await import('../../handlers/gatewaySessionManager');
    
    // Update connector status in gateway session manager
    const updateResult = gatewaySessionManager.updateConnectorStatus(
      chargePointId,
      payload.connectorId,
      payload.status,
      payload.errorCode
    );

    if (updateResult) {
      console.log(
        `🧾 [OCPP] ผลอัปเดตใน GatewaySession: สำเร็จ (connector=${payload.connectorId}, status=${payload.status})`
      );
    } else {
      console.warn(`⚠️ อัปเดตสถานะหัวชาร์จของ ${chargePointId} ไม่สำเร็จ (connector=${payload.connectorId})`);
    }

    // Update connector status in backend database
    console.log(
      `📤 [OCPP] กำลังอัพเดทฐานข้อมูล: connector=${payload.connectorId}, status=${payload.status} ของ ${chargePointId}`
    );
    
    try {
      const updateResponse = await fetch(`${BACKEND_URL}/chargepoints/${chargePointId}/status`, {
        method: 'POST',
        headers: withGatewayHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          connectorId: payload.connectorId,
          status: payload.status,
          errorCode: payload.errorCode || 'NoError',
          timestamp: payload.timestamp || new Date().toISOString(),
          info: payload.info,
          vendorId: payload.vendorId,
          vendorErrorCode: payload.vendorErrorCode
        })
      });

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log(`✅ [DB] อัพเดทฐานข้อมูลสำเร็จ: ${chargePointId} connector=${payload.connectorId} status=${payload.status}`);
      } else {
        const errorText = await updateResponse.text();
        console.error(`❌ [DB] อัพเดทฐานข้อมูลไม่สำเร็จ (${updateResponse.status}): ${errorText}`);
      }
    } catch (dbError) {
      console.error(`💥 [DB] เกิดข้อผิดพลาดในการเรียก API ฐานข้อมูล:`, dbError);
    }

    const statusUpper = typeof payload.status === 'string' ? payload.status.toString() : '';
    const shouldAutoStop =
      statusUpper === 'SuspendedEV' || statusUpper === 'SuspendedEVSE';

    if (shouldAutoStop) {
      const connectorNumericId = Number(payload.connectorId ?? 0);

      if (Number.isFinite(connectorNumericId) && connectorNumericId > 0) {
        const activeTransactionId = gatewaySessionManager.getActiveTransactionId(
          chargePointId,
          connectorNumericId
        );

        if (typeof activeTransactionId === 'number' && Number.isFinite(activeTransactionId)) {
          const wasMarked = gatewaySessionManager.markRemoteStopRequested(
            chargePointId,
            connectorNumericId
          );

          if (wasMarked) {
            const messageId = `auto-stop-${chargePointId}-${Date.now()}`;
            const remoteStopRequest = [
              2,
              messageId,
              'RemoteStopTransaction',
              {
                transactionId: Number(activeTransactionId)
              }
            ];

            if (gatewaySessionManager.sendMessage(chargePointId, remoteStopRequest)) {
              console.log(
                `🤖 [AutoStop] ส่ง RemoteStopTransaction สำหรับ ${chargePointId} หัวชาร์จ ${connectorNumericId} (transaction ${activeTransactionId})`
              );

              gatewaySessionManager.emit('chargePointUpdated', {
                chargePointId,
                type: 'remoteStop',
                connectorId: connectorNumericId,
                transactionId: activeTransactionId,
                initiatedBy: 'auto',
                reason: statusUpper,
                requestedAt: new Date().toISOString()
              });
            } else {
              console.warn(
                `⚠️ [AutoStop] ส่ง RemoteStopTransaction ไปยัง ${chargePointId} ไม่สำเร็จ`
              );
            }
          } else {
            console.log(
              `ℹ️ [AutoStop] มีการร้องขอ RemoteStopTransaction สำหรับ ${chargePointId} หัวชาร์จ ${connectorNumericId} ไปก่อนแล้ว`
            );
          }
        } else {
          console.log(
            `ℹ️ [AutoStop] ไม่พบ activeTransactionId สำหรับ ${chargePointId} หัวชาร์จ ${connectorNumericId} ขณะสถานะ ${statusUpper}`
          );
        }
      } else {
        console.warn(
          `⚠️ [AutoStop] ไม่สามารถระบุหมายเลขหัวชาร์จจากค่า ${payload.connectorId}`
        );
      }
    }

    console.log(`✅ [OCPP] ประมวลผล StatusNotification ของ ${chargePointId} หัวชาร์จ ${payload.connectorId} เสร็จสิ้น`);

    // Send response acknowledging receipt
    return {};

  } catch (error) {
    console.error(`💥 เกิดข้อผิดพลาดระหว่างประมวลผล StatusNotification จาก ${chargePointId}:`, error);
    return {};
  }
}

/**
 * Update connector status in database
 */
async function updateConnectorStatus(chargePointId: string, payload: OCPP16StatusNotificationRequest): Promise<void> {
  try {
    const updateData = {
      connectorId: payload.connectorId,
      status: payload.status,
      errorCode: payload.errorCode,
      timestamp: payload.timestamp || new Date().toISOString(),
      info: payload.info,
      vendorId: payload.vendorId,
      vendorErrorCode: payload.vendorErrorCode
    };

    console.log(`กำลังอัปเดตสถานะหัวชาร์จ ${payload.connectorId} ของ ${chargePointId}:`, updateData);

    const response = await fetch(`${BACKEND_URL}/chargepoints/${chargePointId}/status`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`อัปเดตสถานะหัวชาร์จไม่สำเร็จ: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`อัปเดตสถานะหัวชาร์จ ${payload.connectorId} ของ ${chargePointId} ในฐานข้อมูลสำเร็จ:`, result);
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดระหว่างอัปเดตสถานะหัวชาร์จ ${payload.connectorId} ของ ${chargePointId}:`, error);
  }
}

export async function handleMeterValues(chargePointId: string, payload: OCPP16MeterValuesRequest): Promise<any> {
  console.log('OCPP 1.6 - กำลังประมวลผล MeterValues:', payload);
  
  // Check required fields
  if (!payload.connectorId || !payload.meterValue) {
    throw new Error('Missing required fields in MeterValues');
  }

  try {
    const { gatewaySessionManager } = await import('../../handlers/gatewaySessionManager');
    const updateResult = gatewaySessionManager.updateConnectorMeterValues(
      chargePointId,
      payload.connectorId,
      payload.meterValue,
      payload.transactionId
    );

    if (updateResult) {
      console.log(`✅ บันทึกค่ามิเตอร์ของหัวชาร์จ ${payload.connectorId} สำหรับ ${chargePointId} แล้ว`);
    } else {
      console.warn(`⚠️ ไม่มีข้อมูลมิเตอร์ที่ถูกบันทึกสำหรับหัวชาร์จ ${payload.connectorId} ของ ${chargePointId}`);
    }
  } catch (error) {
    console.error(`💥 เกิดข้อผิดพลาดระหว่างอัปเดตค่ามิเตอร์ของ ${chargePointId}:`, error);
  }

  return {}; // Empty response for MeterValues
}

/**
 * Handle BootNotification messages for OCPP 1.6
 * - Validates required data from BootNotification payload
 * - Updates Charge Point information in database via backend API
 * - Sends response with "Accepted" status and heartbeat interval
 */
export async function handleBootNotification(
  chargePointId: string,
  messageId: string,
  payload: OCPP16BootNotificationRequest
): Promise<any> {
  console.log(`🚀 รับ BootNotification จาก ${chargePointId}:`, payload);

  try {
    // Check required data
    if (!payload.chargePointVendor || !payload.chargePointModel) {
      console.error(`❌ ข้อมูล BootNotification จาก ${chargePointId} ไม่ครบถ้วน`);
      return {
        status: 'Rejected',
        currentTime: new Date().toISOString(),
        interval: 300
      };
    }

    // Update Charge Point information in backend
    console.log(`📤 กำลังอัปเดตข้อมูล Charge Point ในระบบหลังบ้านสำหรับ ${chargePointId}`);
    
    const updateResponse = await fetch(`${BACKEND_URL}/chargepoints/${chargePointId}/update-from-boot`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        vendor: payload.chargePointVendor,
        model: payload.chargePointModel,
        firmwareVersion: payload.firmwareVersion || 'Unknown',
        chargePointIdentity:  chargePointId,
        serialNumber: payload.chargePointSerialNumber || 'Unknown',
        lastSeen: new Date().toISOString(),
        heartbeatIntervalSec: 300, // 5 minutes
        ocppProtocolRaw: 'OCPP16'
      })
    });

    if (!updateResponse.ok) {
      console.error(`❌ อัปเดตข้อมูล Charge Point ไม่สำเร็จ: ${updateResponse.status}`);
    } else {
      console.log(`✅ อัปเดตข้อมูล Charge Point สำหรับ ${chargePointId} ในระบบหลังบ้านเรียบร้อย`);
    }

    // Send response accepting connection
    return {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 300 // Heartbeat every 5 minutes
    };

  } catch (error) {
    console.error(`💥 เกิดข้อผิดพลาดระหว่างประมวลผล BootNotification จาก ${chargePointId}:`, error);
    
    return {
      status: 'Rejected',
      currentTime: new Date().toISOString(),
      interval: 300
    };
  }
}

/**
 * Update charge point information from BootNotification
 */
async function updateChargePointFromBootNotification(chargePointId: string, payload: OCPP16BootNotificationRequest): Promise<void> {
  try {
    const updateData = {
      vendor: payload.chargePointVendor,
      model: payload.chargePointModel,
      firmwareVersion: payload.firmwareVersion,
      serialNumber: payload.chargePointSerialNumber || payload.chargeBoxSerialNumber,
      lastSeen: new Date().toISOString(),
      heartbeatIntervalSec: 300,
      ocppProtocolRaw: 'ocpp1.6'
    };

    console.log(`กำลังอัปเดตข้อมูล Charge Point ${chargePointId} จาก BootNotification:`, updateData);

    const response = await fetch(`${BACKEND_URL}/chargepoints/${chargePointId}/update-from-boot`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`อัปเดต Charge Point จาก BootNotification ไม่สำเร็จ: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`อัปเดต Charge Point ${chargePointId} จาก BootNotification สำเร็จ:`, result);
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดระหว่างอัปเดต Charge Point ${chargePointId} จาก BootNotification:`, error);
  }
}

export function handleGetConfiguration(payload: { key?: string[] }, chargePointId?: string): any {
  console.log('OCPP 1.6 - กำลังประมวลผล GetConfiguration:', payload);
  
  // Default configuration values for OCPP 1.6
  const defaultConfiguration: Record<string, string> = {
    'NumberOfConnectors': '2',
    'ConnectorPhaseRotation': '0.RST,1.RST,2.RST',
    'ConnectorPhaseRotationMaxLength': '50',
    'HeartbeatInterval': '300',
    'MeterValueSampleInterval': '60',
    'ClockAlignedDataInterval': '900',
    'MeterValuesAlignedData': 'Energy.Active.Import.Register',
    'MeterValuesSampledData': 'Energy.Active.Import.Register',
    'StopTransactionOnEVSideDisconnect': 'true',
    'StopTransactionOnInvalidId': 'true',
    'UnlockConnectorOnEVSideDisconnect': 'true',
    'AuthorizeRemoteTxRequests': 'true',
    'LocalAuthorizeOffline': 'true',
    'LocalPreAuthorize': 'false',
    'SupportedFeatureProfiles': 'Core,FirmwareManagement,LocalAuthListManagement,Reservation,SmartCharging,RemoteTrigger',
    'ChargeProfileMaxStackLevel': '10',
    'ChargingScheduleAllowedChargingRateUnit': 'Current,Power',
    'ChargingScheduleMaxPeriods': '5',
    'MaxChargingProfilesInstalled': '10'
  };

  let configurationKey: any[] = [];
  
  if (payload.key && payload.key.length > 0) {
    // Return only requested keys
    payload.key.forEach(key => {
      if (defaultConfiguration[key]) {
        configurationKey.push({
          key: key,
          readonly: false,
          value: defaultConfiguration[key]
        });
      }
    });
  } else {
    // Return all configuration keys
    Object.entries(defaultConfiguration).forEach(([key, value]) => {
      configurationKey.push({
        key: key,
        readonly: false,
        value: value
      });
    });
  }

  // If chargePointId exists, fetch specific configuration from database
  if (chargePointId) {
    fetchChargePointConfiguration(chargePointId).catch(error => {
      console.error('ดึงข้อมูลการตั้งค่า Charge Point ไม่สำเร็จ:', error);
    });
  }

  return {
    configurationKey,
    unknownKey: [] // Unsupported keys
  };
}

/**
 * Fetch specific charge point configuration from database
 */
async function fetchChargePointConfiguration(chargePointId: string): Promise<void> {
  try {
    console.log(`กำลังดึงข้อมูลการตั้งค่าสำหรับ Charge Point ${chargePointId}`);

    const response = await fetch(`${BACKEND_URL}/chargepoints/${chargePointId}`, {
      method: 'GET',
      headers: withGatewayHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ดึงข้อมูลการตั้งค่า Charge Point ไม่สำเร็จ: ${response.status} - ${errorText}`);
      return;
    }

    const chargePoint = await response.json();
    console.log(`ดึงข้อมูลการตั้งค่า Charge Point ${chargePointId} สำเร็จ:`, chargePoint);
    
    // Update configuration based on charge point data
    // This could be used to customize configuration values based on the specific charge point
    
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดระหว่างดึงข้อมูลการตั้งค่า Charge Point ${chargePointId}:`, error);
  }
}

/**
 * Handle Heartbeat messages for OCPP 1.6
 * - Updates lastSeen timestamp of Charge Point
 * - Calls backend API to record latest heartbeat time (optional)
 * - Sends response with currentTime
 */
export async function handleHeartbeat(
  chargePointId: string,
  messageId: string,
  payload: any
): Promise<any> {
  console.log(`💓 รับ Heartbeat จาก ${chargePointId}`);

  // Always send response first - OCPP communication should not depend on backend
  const response = {
    currentTime: new Date().toISOString()
  };

  // Try to update backend if available (optional operation)
  try {
    const skipBackendUpdate = process.env.SKIP_BACKEND_UPDATE === 'true';
    
    if (skipBackendUpdate) {
      console.log(`⏭️ ข้ามการอัปเดต Heartbeat ไปยัง backend สำหรับ ${chargePointId} (SKIP_BACKEND_UPDATE=true)`);
      return response;
    }

    // สร้างค่า timestamp ที่จะส่งให้ backend
    const heartbeatTimestamp = new Date().toISOString();

    // Set a timeout for backend call to avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const heartbeatResponse = await fetch(`${BACKEND_URL}/chargepoints/${chargePointId}/heartbeat`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        lastSeen: heartbeatTimestamp
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!heartbeatResponse.ok) {
      const errorText = await heartbeatResponse.text().catch(() => 'Unknown error');
      console.warn(`⚠️ อัปเดต Heartbeat ไปยัง backend สำหรับ ${chargePointId} ไม่สำเร็จ: ${heartbeatResponse.status} - ${errorText}`);
      console.log(`ℹ️ ส่งคำตอบ OCPP Heartbeat กลับไปยังเครื่องชาร์จแล้ว แม้ backend จะผิดพลาด`);
    } else {
      console.log(`✅ อัปเดต Heartbeat ของ ${chargePointId} ใน backend สำเร็จ`);
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`⏰ การอัปเดต Heartbeat ไปยัง backend ของ ${chargePointId} ใช้เวลานานเกินกำหนด`);
    } else if (error.code === 'ECONNREFUSED') {
      console.warn(`🔌 ไม่สามารถเชื่อมต่อ backend เพื่ออัปเดต Heartbeat (${chargePointId})`);
    } else {
      console.warn(`⚠️ เกิดข้อผิดพลาดระหว่างอัปเดต Heartbeat ไปยัง backend สำหรับ ${chargePointId}:`, error.message);
    }
    console.log(`ℹ️ ส่งคำตอบ OCPP Heartbeat กลับไปยังเครื่องชาร์จเรียบร้อย แม้ backend จะผิดพลาด`);
  }

  return response;
}

/**
 * Update charge point last seen timestamp
 */
async function updateChargePointLastSeen(chargePointId: string): Promise<void> {
  try {
    const updateData = {
      lastSeen: new Date().toISOString()
    };

    console.log(`กำลังอัปเดตเวลาที่เห็นล่าสุด (lastSeen) สำหรับ Charge Point ${chargePointId}`);

    const response = await fetch(`${BACKEND_URL}/chargepoints/${chargePointId}/heartbeat`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`อัปเดต lastSeen ของ Charge Point ไม่สำเร็จ: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`อัปเดต lastSeen ของ Charge Point ${chargePointId} สำเร็จ:`, result);
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดระหว่างอัปเดต lastSeen ของ Charge Point ${chargePointId}:`, error);
  }
}

export async function handleAuthorize(payload: { idTag: string }): Promise<any> {
  console.log('OCPP 1.6 - กำลังประมวลผล Authorize:', payload);
  
  if (!payload.idTag) {
    throw new Error('Missing idTag in Authorize request');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/transactions/authorize`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ idTag: payload.idTag }),
    });

    if (!response.ok) {
      console.error(
        `Authorize ตรวจสอบ idTag ไม่สำเร็จ: ${response.status} ${response.statusText}`
      );
      return {
        idTagInfo: {
          status: 'Invalid',
        },
      };
    }

    const result = await response.json() as BackendApiResponse;
    const backendStatus =
      result?.data?.status && typeof result.data.status === 'string'
        ? result.data.status
        : 'Rejected';

    const ocppStatus = backendStatus === 'Accepted' ? 'Accepted' : 'Invalid';

    if (ocppStatus !== 'Accepted') {
      const reason = result?.data?.reason || 'NOT_AUTHORIZED';
      console.warn(
        `รหัส idTag ${payload.idTag} ไม่ผ่านการตรวจสอบ (${backendStatus}) - เหตุผล: ${reason}`
      );
    }

    return {
      idTagInfo: {
        status: ocppStatus,
      },
    };
  } catch (error) {
    console.error('เกิดข้อผิดพลาดขณะตรวจสอบ idTag กับ backend:', error);
    return {
      idTagInfo: {
        status: 'Invalid',
      },
    };
  }
}

export async function handleStartTransaction(
  chargePointId: string,
  payload: {
  connectorId: number;
  idTag: string;
  meterStart: number;
  timestamp: string;
  reservationId?: number;
}
): Promise<any> {
  console.log('OCPP 1.6 - กำลังประมวลผล StartTransaction:', payload);
  
  if (!payload.connectorId || !payload.idTag || payload.meterStart === undefined || !payload.timestamp) {
    throw new Error('Missing required fields in StartTransaction');
  }

  let transactionId = Math.floor(Math.random() * 1000000);
  let authorized = false;

  try {
    const authResponse = await fetch(`${BACKEND_URL}/transactions/authorize`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ idTag: payload.idTag }),
    });

    if (!authResponse.ok) {
      console.warn(
        `ไม่สามารถยืนยันธุรกรรมก่อนเริ่มจาก backend ได้: ${authResponse.status}`
      );
      return {
        idTagInfo: {
          status: 'Invalid',
        },
        transactionId: 0,
      };
    }

    const authResult = await authResponse.json() as BackendApiResponse;
    const backendStatus =
      authResult?.data?.status && typeof authResult.data.status === 'string'
        ? authResult.data.status
        : 'Rejected';

    const isAccepted = backendStatus === 'Accepted';

    if (!isAccepted) {
      const reason = authResult?.data?.reason || 'NOT_AUTHORIZED';
      console.warn(
        `ธุรกรรม idTag ${payload.idTag} ไม่ได้รับอนุญาต: ${backendStatus} (reason=${reason})`
      );
      return {
        idTagInfo: {
          status: 'Invalid',
        },
        transactionId: 0,
      };
    }

    authorized = true;
    const backendTransactionId = authResult?.data?.transaction?.transactionId;
    const parsedId = backendTransactionId ? Number(backendTransactionId) : NaN;

    if (Number.isFinite(parsedId)) {
      transactionId = parsedId;
    } else {
      console.warn(
        `transactionId จาก backend ไม่สามารถแปลงเป็นตัวเลขได้: ${backendTransactionId}`
      );
    }
  } catch (authError) {
    console.error('เกิดข้อผิดพลาดระหว่างตรวจสอบธุรกรรมก่อนเริ่ม:', authError);
    return {
      idTagInfo: {
        status: 'Invalid',
      },
      transactionId: 0,
    };
  }

  try {
    const startResponse = await fetch(
      `${BACKEND_URL}/transactions/${encodeURIComponent(payload.idTag)}/start`,
      {
        method: 'POST',
        headers: withGatewayHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          ocppTransactionId: transactionId,
          meterStart: payload.meterStart,
          timestamp: payload.timestamp,
        }),
      }
    );

    if (!startResponse.ok && authorized) {
      const errorText = await startResponse.text();
      console.error(
        `ไม่สามารถอัปเดตธุรกรรมเริ่มต้นใน backend ได้: ${startResponse.status} - ${errorText}`
      );
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดระหว่างบันทึก StartTransaction ไปยัง backend:', error);
  }

  try {
    const { gatewaySessionManager } = await import('../../handlers/gatewaySessionManager');
    gatewaySessionManager.startConnectorTransaction(
      chargePointId,
      payload.connectorId,
      transactionId,
      {
        idTag: payload.idTag,
        meterStart: payload.meterStart,
        startedAt: payload.timestamp
      }
    );
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดระหว่างอัปเดตเซสชันสำหรับ StartTransaction ของ ${chargePointId}:`, error);
  }

  return {
    idTagInfo: {
      status: 'Accepted'
    },
    transactionId
  };
}

export async function handleStopTransaction(
  chargePointId: string,
  payload: {
  transactionId: number;
  timestamp: string;
  meterStop: number;
  idTag?: string;
  reason?: string;
  transactionData?: any[];
}
): Promise<any> {
  console.log('OCPP 1.6 - กำลังประมวลผล StopTransaction:', payload);
  
  if (!payload.transactionId || !payload.timestamp || payload.meterStop === undefined) {
    throw new Error('Missing required fields in StopTransaction');
  }

  try {
    const stopResponse = await fetch(
      `${BACKEND_URL}/transactions/ocpp/${encodeURIComponent(String(payload.transactionId))}/stop`,
      {
        method: 'POST',
        headers: withGatewayHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          meterStop: payload.meterStop,
          timestamp: payload.timestamp,
          idTag: payload.idTag,
          reason: payload.reason,
          transactionData: payload.transactionData,
        }),
      }
    );

    if (!stopResponse.ok) {
      const errorText = await stopResponse.text();
      console.error(
        `ไม่สามารถอัปเดตธุรกรรมสิ้นสุดใน backend ได้: ${stopResponse.status} - ${errorText}`
      );
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดระหว่างบันทึก StopTransaction ไปยัง backend:', error);
  }

  try {
    const { gatewaySessionManager } = await import('../../handlers/gatewaySessionManager');
    gatewaySessionManager.stopConnectorTransaction(
      chargePointId,
      payload.transactionId,
      {
        meterStop: payload.meterStop,
        stoppedAt: payload.timestamp
      }
    );
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดระหว่างอัปเดตเซสชันสำหรับ StopTransaction ของ ${chargePointId}:`, error);
  }
  
  return {
    idTagInfo: {
      status: 'Accepted'
    }
  };
}

export async function handleMessage(messageType: string, payload: any, chargePointId?: string, messageId?: string): Promise<any> {
  console.log(`OCPP 1.6 - กำลังประมวลผลข้อความชนิด ${messageType} สำหรับ Charge Point: ${chargePointId}`);
  
  switch (messageType) {
    case 'BootNotification':
      return handleBootNotification(chargePointId || '', messageId || '', payload);
    case 'GetConfiguration':
      return handleGetConfiguration(payload, chargePointId);
    case 'Heartbeat':
      return handleHeartbeat(chargePointId || '', messageId || '', payload);
    case 'StatusNotification':
      return handleStatusNotification(chargePointId || '', messageId || '', payload);
    case 'MeterValues':
      return handleMeterValues(chargePointId || '', payload);
    case 'Authorize':
      return handleAuthorize(payload);
    case 'StartTransaction':
      return handleStartTransaction(chargePointId || '', payload);
    case 'StopTransaction':
      return handleStopTransaction(chargePointId || '', payload);
    default:
      console.warn(`ไม่รู้จักข้อความ OCPP 1.6 ประเภท: ${messageType}`);
      return {
        status: 'Rejected',
        errorCode: 'NotSupported',
        errorDescription: `Message type ${messageType} is not supported`
      };
  }
}
