// OCPP 2.0.1 message handler
// Implements version-specific logic for OCPP 2.0.1 messages

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

export function handleStatusNotification(payload: OCPP201StatusNotificationRequest): any {
  console.log('OCPP 2.0.1 - Handling StatusNotification:', payload);
  
  // Validate required fields
  if (!payload.timestamp || !payload.connectorStatus || !payload.evseId || !payload.connectorId) {
    throw new Error('Missing required fields in StatusNotification');
  }

  // Process status notification
  // TODO: Update connector status in database
  
  return {}; // Empty response for StatusNotification
}

export function handleTransactionEvent(payload: OCPP201TransactionEventRequest): any {
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

export function handleHeartbeat(payload: any): any {
  console.log('OCPP 2.0.1 - Handling Heartbeat:', payload);
  
  return {
    currentTime: new Date().toISOString()
  };
}

export function handleAuthorize(payload: {
  idToken: {
    idToken: string;
    type: string;
  };
  certificate?: string;
  iso15118CertificateHashData?: any[];
}): any {
  console.log('OCPP 2.0.1 - Handling Authorize:', payload);
  
  if (!payload.idToken?.idToken || !payload.idToken?.type) {
    throw new Error('Missing idToken in Authorize request');
  }

  // TODO: Validate ID token against database
  
  return {
    idTokenInfo: {
      status: 'Accepted'
    }
  };
}

export function handleMeterValues(payload: {
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

  // Process meter values
  // TODO: Store meter values in database
  
  return {}; // Empty response for MeterValues
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

export async function handleMessage(messageType: string, payload: any): Promise<any> {
  console.log(`OCPP 2.0.1 - Routing message type: ${messageType}`);
  
  switch (messageType) {
    case 'BootNotification':
      return handleBootNotification(payload);
    
    case 'StatusNotification':
      return handleStatusNotification(payload);
    
    case 'TransactionEvent':
      return handleTransactionEvent(payload);
    
    case 'Heartbeat':
      return handleHeartbeat(payload);
    
    case 'Authorize':
      return handleAuthorize(payload);
    
    case 'MeterValues':
      return handleMeterValues(payload);
    
    case 'NotifyReport':
      return handleNotifyReport(payload);
    
    default:
      console.warn(`OCPP 2.0.1 - Unknown message type: ${messageType}`);
      throw new Error(`Unsupported message type: ${messageType}`);
  }
}