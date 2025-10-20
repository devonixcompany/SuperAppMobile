// OCPP 1.6 message handler
// Implements version-specific logic for OCPP 1.6 messages

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

export function handleStatusNotification(payload: OCPP16StatusNotificationRequest): any {
  console.log('OCPP 1.6 - Handling StatusNotification:', payload);
  
  // Validate required fields
  if (!payload.connectorId || !payload.errorCode || !payload.status) {
    throw new Error('Missing required fields in StatusNotification');
  }

  // Process status notification
  // TODO: Update connector status in database
  
  return {}; // Empty response for StatusNotification
}

export function handleMeterValues(payload: OCPP16MeterValuesRequest): any {
  console.log('OCPP 1.6 - Handling MeterValues:', payload);
  
  // Validate required fields
  if (!payload.connectorId || !payload.meterValue) {
    throw new Error('Missing required fields in MeterValues');
  }

  // Process meter values
  // TODO: Store meter values in database
  
  return {}; // Empty response for MeterValues
}

export function handleBootNotification(payload: OCPP16BootNotificationRequest): any {
  console.log('OCPP 1.6 - Handling BootNotification:', payload);
  
  // Validate required fields
  if (!payload.chargePointVendor || !payload.chargePointModel) {
    throw new Error('Missing required fields in BootNotification');
  }

  // Process boot notification
  // TODO: Update charge point information in database
  
  return {
    status: 'Accepted',
    currentTime: new Date().toISOString(),
    interval: 300 // Heartbeat interval in seconds
  };
}

export function handleHeartbeat(payload: any): any {
  console.log('OCPP 1.6 - Handling Heartbeat:', payload);
  
  return {
    currentTime: new Date().toISOString()
  };
}

export function handleAuthorize(payload: { idTag: string }): any {
  console.log('OCPP 1.6 - Handling Authorize:', payload);
  
  if (!payload.idTag) {
    throw new Error('Missing idTag in Authorize request');
  }

  // TODO: Validate ID tag against database
  
  return {
    idTagInfo: {
      status: 'Accepted'
    }
  };
}

export function handleStartTransaction(payload: {
  connectorId: number;
  idTag: string;
  meterStart: number;
  timestamp: string;
  reservationId?: number;
}): any {
  console.log('OCPP 1.6 - Handling StartTransaction:', payload);
  
  if (!payload.connectorId || !payload.idTag || payload.meterStart === undefined || !payload.timestamp) {
    throw new Error('Missing required fields in StartTransaction');
  }

  // TODO: Create transaction in database
  
  return {
    idTagInfo: {
      status: 'Accepted'
    },
    transactionId: Math.floor(Math.random() * 1000000) // Generate transaction ID
  };
}

export function handleStopTransaction(payload: {
  transactionId: number;
  timestamp: string;
  meterStop: number;
  idTag?: string;
  reason?: string;
  transactionData?: any[];
}): any {
  console.log('OCPP 1.6 - Handling StopTransaction:', payload);
  
  if (!payload.transactionId || !payload.timestamp || payload.meterStop === undefined) {
    throw new Error('Missing required fields in StopTransaction');
  }

  // TODO: Update transaction in database
  
  return {
    idTagInfo: {
      status: 'Accepted'
    }
  };
}

export async function handleMessage(messageType: string, payload: any): Promise<any> {
  console.log(`OCPP 1.6 - Routing message type: ${messageType}`);
  
  switch (messageType) {
    case 'StatusNotification':
      return handleStatusNotification(payload);
    
    case 'MeterValues':
      return handleMeterValues(payload);
    
    case 'BootNotification':
      return handleBootNotification(payload);
    
    case 'Heartbeat':
      return handleHeartbeat(payload);
    
    case 'Authorize':
      return handleAuthorize(payload);
    
    case 'StartTransaction':
      return handleStartTransaction(payload);
    
    case 'StopTransaction':
      return handleStopTransaction(payload);
    
    default:
      console.warn(`OCPP 1.6 - Unknown message type: ${messageType}`);
      throw new Error(`Unsupported message type: ${messageType}`);
  }
}