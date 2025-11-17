// OCPP 2.0.1 message handler
// Implements version-specific logic for OCPP 2.0.1 messages

import { BACKEND_URL, WS_GATEWAY_API_KEY } from '../../config/env';
import { gatewaySessionManager } from '../../handlers/gatewaySessionManager';

const withGatewayHeaders = (headers: Record<string, string> = {}) => ({
  'X-Api-Key': WS_GATEWAY_API_KEY,
  ...headers
});

export interface OCPP201BootNotificationRequest {
  chargingStation: {
    model: string;
    vendorName: string;
    serialNumber?: string;
    firmwareVersion?: string;
    modem?: {
      iccid?: string;
      imsi?: string;
    };
  };
  reason: 'ApplicationReset' | 'FirmwareUpdate' | 'LocalReset' | 'PowerUp' | 'RemoteReset' | 'ScheduledReset' | 'Triggered' | 'Unknown' | 'Watchdog';
}

export interface OCPP201StatusNotificationRequest {
  timestamp: string;
  connectorStatus: 'Available' | 'Occupied' | 'Reserved' | 'Unavailable' | 'Faulted';
  evseId: number;
  connectorId: number;
}

export interface OCPP201TransactionEventRequest {
  eventType: 'Ended' | 'Started' | 'Updated';
  timestamp: string;
  triggerReason: string;
  seqNo: number;
  transactionInfo: {
    transactionId: string;
    chargingState?: 'Charging' | 'EVConnected' | 'SuspendedEV' | 'SuspendedEVSE' | 'Idle';
    timeSpentCharging?: number;
    stoppedReason?: string;
    remoteStartId?: number;
  };
  evse?: {
    id: number;
    connectorId?: number;
  };
  idToken?: {
    idToken: string;
    type: 'Central' | 'eMAID' | 'ISO14443' | 'ISO15693' | 'KeyCode' | 'Local' | 'MacAddress' | 'NoAuthorization';
  };
  meterValue?: Array<{
    timestamp: string;
    sampledValue: Array<{
      value: number;
      context?: string;
      measurand?: string;
      phase?: string;
      location?: string;
      unitOfMeasure?: {
        unit?: string;
        multiplier?: number;
      };
    }>;
  }>;
}

export function handleBootNotification(payload: OCPP201BootNotificationRequest): any {
  console.log('OCPP 2.0.1 - Handling BootNotification:', payload);
  
  // Validate required fields
  if (!payload.chargingStation?.model || !payload.chargingStation?.vendorName || !payload.reason) {
    throw new Error('Missing required fields in BootNotification');
  }

  // Process boot notification
  // TODO: Update charge point information in database
  
  return {
    status: 'Accepted',
    currentTime: new Date().toISOString(),
    interval: 300, // Heartbeat interval in seconds
    statusInfo: {
      reasonCode: 'NoError'
    }
  };
}

export function handleStatusNotification(chargePointId: string, payload: OCPP201StatusNotificationRequest): any {
  console.log('OCPP 2.0.1 - Handling StatusNotification:', payload);
  
  // Validate required fields
  if (!payload.timestamp || !payload.connectorStatus || !payload.evseId || !payload.connectorId) {
    throw new Error('Missing required fields in StatusNotification');
  }
  try {
    gatewaySessionManager.updateConnectorStatus(chargePointId, payload.connectorId, payload.connectorStatus);
  } catch {}
  return {};
}

export function handleTransactionEvent(chargePointId: string, payload: OCPP201TransactionEventRequest): any {
  console.log('OCPP 2.0.1 - Handling TransactionEvent:', payload);
  
  // Validate required fields
  if (!payload.eventType || !payload.timestamp || !payload.triggerReason || 
      payload.seqNo === undefined || !payload.transactionInfo?.transactionId) {
    throw new Error('Missing required fields in TransactionEvent');
  }

  // Process transaction event
  // TODO: Update transaction in database based on event type
  
  let response: any = {};

  if (payload.eventType === 'Started') {
    response = {
      idTokenInfo: {
        status: 'Accepted'
      }
    };
  } else if (payload.eventType === 'Ended') {
    response = {
      idTokenInfo: {
        status: 'Accepted'
      }
    };
  }

  return response;
}

export async function handleGet15118EVCertificate(
  chargePointId: string,
  payload: {
    iso15118SchemaVersion: string;
    action: 'Install' | 'Update';
    exiRequest: string;
  }
): Promise<any> {
  console.log('OCPP 2.0.1 - Handling Get15118EVCertificate:', payload);
  if (!payload.iso15118SchemaVersion || !payload.action || !payload.exiRequest) {
    throw new Error('Missing required fields in Get15118EVCertificate');
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${BACKEND_URL}/api/iso15118/get-ev-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WS_GATEWAY_API_KEY
      },
      body: JSON.stringify({ chargePointId, ...payload }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { status: 'Failed', exiResponse: '' };
    }
    const data: any = await res.json().catch(() => ({} as any));
    const exiResponse = typeof data.exiResponse === 'string' ? data.exiResponse : '';
    return { status: 'Accepted', exiResponse };
  } catch {
    return { status: 'Failed', exiResponse: '' };
  }
}

export async function handleHeartbeat(
  chargePointId: string,
  messageId: string,
  payload: any
): Promise<any> {
  console.log(`💓 OCPP 2.0.1 - Heartbeat from ${chargePointId}`);

  // Always send response first - OCPP communication should not depend on backend
  const response = {
    currentTime: new Date().toISOString()
  };

  // Try to update backend if available (optional operation)
  try {
    const skipBackendUpdate = process.env.SKIP_BACKEND_UPDATE === 'true';
    
    if (skipBackendUpdate) {
      console.log(`⏭️ Skipping backend heartbeat update for ${chargePointId} (SKIP_BACKEND_UPDATE=true)`);
      return response;
    }

    // Set a timeout for backend call to avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const heartbeatResponse = await fetch(`${BACKEND_URL}/api/chargepoints/${chargePointId}/heartbeat`, {
      method: 'POST',
      headers: withGatewayHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!heartbeatResponse.ok) {
      const errorText = await heartbeatResponse.text().catch(() => 'Unknown error');
      console.warn(`⚠️ Backend heartbeat update failed for ${chargePointId}: ${heartbeatResponse.status} - ${errorText}`);
      console.log(`ℹ️ OCPP heartbeat response sent successfully despite backend error`);
    } else {
      console.log(`✅ Successfully updated heartbeat for ${chargePointId} in backend`);
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`⏰ Backend heartbeat update timeout for ${chargePointId}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.warn(`🔌 Backend not available for heartbeat update (${chargePointId})`);
    } else {
      console.warn(`⚠️ Backend heartbeat update error for ${chargePointId}:`, error.message);
    }
    console.log(`ℹ️ OCPP heartbeat response sent successfully despite backend error`);
  }

  return response;
}

export function handleAuthorize(payload: {
  idToken: {
    idToken: string;
    type: string;
  };
  certificate?: string;
  iso15118CertificateHashData?: any[];
}, chargePointId?: string): any {
  console.log('OCPP 2.0.1 - Handling Authorize:', payload);
  
  if (!payload.idToken?.idToken || !payload.idToken?.type) {
    throw new Error('Missing idToken in Authorize request');
  }

  try {
    if (chargePointId && payload.idToken?.type === 'MacAddress') {
      const cp = gatewaySessionManager.getChargePoint(chargePointId);
      if (cp) {
        const first = cp.connectors.find(c => c.connectorId === 1);
        if (first && first.metrics) {
          first.metrics.transactionIdTag = payload.idToken.idToken;
        }
      }
    }
  } catch {}
  
  return {
    idTokenInfo: {
      status: 'Accepted'
    }
  };
}

export function handleMeterValues(chargePointId: string, payload: {
  evseId: number;
  meterValue: Array<{
    timestamp: string;
    sampledValue: Array<{
      value: number;
      context?: string;
      measurand?: string;
      phase?: string;
      location?: string;
      unitOfMeasure?: {
        unit?: string;
        multiplier?: number;
      };
    }>;
  }>;
}): any {
  console.log('OCPP 2.0.1 - Handling MeterValues:', payload);
  
  // Validate required fields
  if (!payload.evseId || !payload.meterValue) {
    throw new Error('Missing required fields in MeterValues');
  }
  try {
    const converted = (payload.meterValue || []).map(mv => ({
      timestamp: mv.timestamp,
      sampledValue: (mv.sampledValue || []).map(sv => ({
        value: String(sv.value),
        measurand: sv.measurand,
        unit: sv.unitOfMeasure?.unit
      }))
    }));
    gatewaySessionManager.updateConnectorMeterValues(chargePointId, payload.evseId, converted);
  } catch {}
  return {};
}

export function handleNotifyReport(payload: {
  requestId: number;
  generatedAt: string;
  reportData?: Array<{
    component: {
      name: string;
      instance?: string;
      evse?: {
        id: number;
        connectorId?: number;
      };
    };
    variable: {
      name: string;
      instance?: string;
    };
    variableAttribute: Array<{
      type?: string;
      value?: string;
      mutability?: string;
      persistent?: boolean;
      constant?: boolean;
    }>;
    variableCharacteristics?: {
      unit?: string;
      dataType: string;
      minLimit?: number;
      maxLimit?: number;
      valuesList?: string;
      supportsMonitoring: boolean;
    };
  }>;
  tbc?: boolean;
  seqNo: number;
}): any {
  console.log('OCPP 2.0.1 - Handling NotifyReport:', payload);
  
  // Validate required fields
  if (payload.requestId === undefined || !payload.generatedAt || payload.seqNo === undefined) {
    throw new Error('Missing required fields in NotifyReport');
  }

  // Process report data
  // TODO: Store report data in database
  
  return {}; // Empty response for NotifyReport
}

export async function handleMessage(
  messageType: string, 
  payload: any, 
  chargePointId?: string, 
  messageId?: string
): Promise<any> {
  console.log(`OCPP 2.0.1 - Routing message type: ${messageType}`);
  
  switch (messageType) {
    case 'BootNotification':
      return handleBootNotification(payload);
    
    case 'StatusNotification':
      return handleStatusNotification(chargePointId || 'unknown', payload);
    
    case 'TransactionEvent':
      return handleTransactionEvent(chargePointId || 'unknown', payload);
    
    case 'Heartbeat':
      return handleHeartbeat(chargePointId || 'unknown', messageId || 'unknown', payload);
    
    case 'Authorize':
      return handleAuthorize(payload, chargePointId);
    
    case 'MeterValues':
      return handleMeterValues(chargePointId || 'unknown', payload);
    
    case 'Get15118EVCertificate':
      return handleGet15118EVCertificate(chargePointId || 'unknown', payload);
    
    case 'InstallCertificate':
      return { status: 'Accepted' };
    
    case 'CertificateSigned':
      return { status: 'Accepted' };
    
    case 'GetCertificateStatus':
      return { status: 'Accepted' };
    
    case 'NotifyReport':
      return handleNotifyReport(payload);
    
    default:
      console.warn(`OCPP 2.0.1 - Unknown message type: ${messageType}`);
      throw new Error(`Unsupported message type: ${messageType}`);
  }
}
