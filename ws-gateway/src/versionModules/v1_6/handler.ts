// OCPP 1.6 Message Handler
// Implements logic specific to OCPP 1.6 messages

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

/**
 * Handle StatusNotification messages for OCPP 1.6
 * - Receives connector status information from Charge Point
 * - Updates connector status in backend database
 * - Sends response acknowledging receipt
 */
export async function handleStatusNotification(
  chargePointId: string,
  messageId: string,
  payload: any
): Promise<any> {
  console.log(`🔌 StatusNotification from ${chargePointId}:`, payload);

  try {
    // Check required data
    if (payload.connectorId === undefined || !payload.status) {
      console.error(`❌ Incomplete StatusNotification data from ${chargePointId}`);
      return {};
    }

    // Update connector status in backend (if API endpoint exists)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    console.log(`📤 Updating connector ${payload.connectorId} status to ${payload.status} for ${chargePointId}`);
    
    // Note: May need to add API endpoint for updating connector status in backend
    // const updateResponse = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/connectors/${payload.connectorId}/status`, {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     status: payload.status,
    //     errorCode: payload.errorCode,
    //     timestamp: new Date().toISOString()
    //   })
    // });

    console.log(`✅ Received StatusNotification for ${chargePointId} connector ${payload.connectorId}`);

    // Send response acknowledging receipt
    return {};

  } catch (error) {
    console.error(`💥 Error handling StatusNotification from ${chargePointId}:`, error);
    return {};
  }
}

/**
 * Update connector status in database
 */
async function updateConnectorStatus(chargePointId: string, payload: OCPP16StatusNotificationRequest): Promise<void> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    const updateData = {
      connectorId: payload.connectorId,
      status: payload.status,
      errorCode: payload.errorCode,
      timestamp: payload.timestamp || new Date().toISOString(),
      info: payload.info,
      vendorId: payload.vendorId,
      vendorErrorCode: payload.vendorErrorCode
    };

    console.log(`Updating connector ${payload.connectorId} status for charge point ${chargePointId}:`, updateData);

    const response = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to update connector status: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`Successfully updated connector ${payload.connectorId} status for charge point ${chargePointId}:`, result);
  } catch (error) {
    console.error(`Error updating connector ${payload.connectorId} status for charge point ${chargePointId}:`, error);
  }
}

export function handleMeterValues(payload: OCPP16MeterValuesRequest): any {
  console.log('OCPP 1.6 - Handling MeterValues:', payload);
  
  // Check required fields
  if (!payload.connectorId || !payload.meterValue) {
    throw new Error('Missing required fields in MeterValues');
  }

  // Process meter values
  // TODO: Store meter values in database
  
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
  console.log(`🚀 BootNotification from ${chargePointId}:`, payload);

  try {
    // Check required data
    if (!payload.chargePointVendor || !payload.chargePointModel) {
      console.error(`❌ Incomplete BootNotification data from ${chargePointId}`);
      return {
        status: 'Rejected',
        currentTime: new Date().toISOString(),
        interval: 300
      };
    }

    // Update Charge Point information in backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    console.log(`📤 Updating Charge Point information in backend for ${chargePointId}`);
    
    const updateResponse = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/update-from-boot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      console.error(`❌ Failed to update Charge Point information: ${updateResponse.status}`);
    } else {
      console.log(`✅ Successfully updated Charge Point information for ${chargePointId}`);
    }

    // Send response accepting connection
    return {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 300 // Heartbeat every 5 minutes
    };

  } catch (error) {
    console.error(`💥 Error handling BootNotification from ${chargePointId}:`, error);
    
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
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    const updateData = {
      vendor: payload.chargePointVendor,
      model: payload.chargePointModel,
      firmwareVersion: payload.firmwareVersion,
      serialNumber: payload.chargePointSerialNumber || payload.chargeBoxSerialNumber,
      lastSeen: new Date().toISOString(),
      heartbeatIntervalSec: 300,
      ocppProtocolRaw: 'ocpp1.6'
    };

    console.log(`Updating charge point ${chargePointId} from BootNotification:`, updateData);

    const response = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/update-from-boot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to update charge point from BootNotification: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`Successfully updated charge point ${chargePointId} from BootNotification:`, result);
  } catch (error) {
    console.error(`Error updating charge point ${chargePointId} from BootNotification:`, error);
  }
}

export function handleGetConfiguration(payload: { key?: string[] }, chargePointId?: string): any {
  console.log('OCPP 1.6 - Handling GetConfiguration:', payload);
  
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
      console.error('Failed to fetch charge point configuration:', error);
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
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    console.log(`Fetching configuration for charge point ${chargePointId}`);

    const response = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch charge point configuration: ${response.status} - ${errorText}`);
      return;
    }

    const chargePoint = await response.json();
    console.log(`Successfully fetched charge point ${chargePointId} configuration:`, chargePoint);
    
    // Update configuration based on charge point data
    // This could be used to customize configuration values based on the specific charge point
    
  } catch (error) {
    console.error(`Error fetching charge point ${chargePointId} configuration:`, error);
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
  console.log(`💓 Heartbeat from ${chargePointId}`);

  // Always send response first - OCPP communication should not depend on backend
  const response = {
    currentTime: new Date().toISOString()
  };

  // Try to update backend if available (optional operation)
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const skipBackendUpdate = process.env.SKIP_BACKEND_UPDATE === 'true';
    
    if (skipBackendUpdate) {
      console.log(`⏭️ Skipping backend heartbeat update for ${chargePointId} (SKIP_BACKEND_UPDATE=true)`);
      return response;
    }

    // Set a timeout for backend call to avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const heartbeatResponse = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

/**
 * Update charge point last seen timestamp
 */
async function updateChargePointLastSeen(chargePointId: string): Promise<void> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    const updateData = {
      lastSeen: new Date().toISOString()
    };

    console.log(`Updating last seen for charge point ${chargePointId}`);

    const response = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to update charge point last seen: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`Successfully updated charge point ${chargePointId} last seen:`, result);
  } catch (error) {
    console.error(`Error updating charge point ${chargePointId} last seen:`, error);
  }
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

export async function handleMessage(messageType: string, payload: any, chargePointId?: string, messageId?: string): Promise<any> {
  console.log(`OCPP 1.6 - Handling message type: ${messageType} for charge point: ${chargePointId}`);
  
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
      return handleMeterValues(payload);
    case 'Authorize':
      return handleAuthorize(payload);
    case 'StartTransaction':
      return handleStartTransaction(payload);
    case 'StopTransaction':
      return handleStopTransaction(payload);
    default:
      console.warn(`Unknown OCPP 1.6 message type: ${messageType}`);
      return {
        status: 'Rejected',
        errorCode: 'NotSupported',
        errorDescription: `Message type ${messageType} is not supported`
      };
  }
}