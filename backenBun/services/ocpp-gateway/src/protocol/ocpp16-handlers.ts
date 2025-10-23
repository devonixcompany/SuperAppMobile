import { Logger } from '../../../../shared/utils/logger.js';
import type { OCPPMessageHandler } from './protocol-manager.js';
import type {
  OCPPCall,
  OCPPCallResult,
  OCPPCallError,
  BootNotificationRequest,
  BootNotificationResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  AuthorizeRequest,
  AuthorizeResponse,
  StartTransactionRequest,
  StartTransactionResponse,
  StopTransactionRequest,
  StopTransactionResponse,
  StatusNotificationRequest,
  StatusNotificationResponse,
  MeterValuesRequest,
  MeterValuesResponse,
  RemoteStartTransactionRequest,
  RemoteStartTransactionResponse,
  RemoteStopTransactionRequest,
  RemoteStopTransactionResponse,
  ChangeConfigurationRequest,
  ChangeConfigurationResponse,
  GetConfigurationRequest,
  GetConfigurationResponse,
  ClearCacheRequest,
  ClearCacheResponse,
  SetChargingProfileRequest,
  SetChargingProfileResponse,
  ClearChargingProfileRequest,
  ClearChargingProfileResponse,
  GetCompositeScheduleRequest,
  GetCompositeScheduleResponse,
  ResetRequest,
  ResetResponse,
  UnlockConnectorRequest,
  UnlockConnectorResponse,
  ChangeAvailabilityRequest,
  ChangeAvailabilityResponse,
  DataTransferRequest,
  DataTransferResponse,
  GetLocalListVersionRequest,
  GetLocalListVersionResponse,
  SendLocalListRequest,
  SendLocalListResponse,
  OCPPErrorCode
} from '../../../../shared/types/ocpp.js';

const logger = new Logger('OCPP16Handlers');

export class BootNotificationHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as BootNotificationRequest;

    logger.info(`Boot notification from charge point`, {
      chargePointVendor: payload.chargePointVendor,
      chargePointModel: payload.chargePointModel,
      chargePointSerialNumber: payload.chargePointSerialNumber
    });

    // Here you would:
    // 1. Validate the charge point
    // 2. Register it in your system
    // 3. Send configuration if needed

    const response: BootNotificationResponse = {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 60 // Heartbeat interval in seconds
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class HeartbeatHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as HeartbeatRequest;

    logger.debug(`Heartbeat received from charge point`);

    const response: HeartbeatResponse = {
      currentTime: new Date().toISOString()
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class AuthorizeHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as AuthorizeRequest;

    logger.info(`Authorization request for ID tag: ${payload.idTag}`);

    // Here you would:
    // 1. Validate the RFID tag / app user
    // 2. Check if user is allowed to charge
    // 3. Check for blocking flags

    // For now, accept all authorizations
    const response: AuthorizeResponse = {
      idTagInfo: {
        status: 'Accepted',
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class StartTransactionHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as StartTransactionRequest;

    logger.info(`Start transaction request`, {
      connectorId: payload.connectorId,
      idTag: payload.idTag,
      meterStart: payload.meterStart,
      timestamp: payload.timestamp
    });

    // Here you would:
    // 1. Create a transaction record
    // 2. Assign transaction ID
    // 3. Update connector status
    // 4. Start billing/monitoring

    const transactionId = Math.floor(Math.random() * 1000000) + 1;

    const response: StartTransactionResponse = {
      transactionId,
      idTagInfo: {
        status: 'Accepted'
      }
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class StopTransactionHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as StopTransactionRequest;

    logger.info(`Stop transaction request`, {
      transactionId: payload.transactionId,
      idTag: payload.idTag,
      meterStop: payload.meterStop,
      timestamp: payload.timestamp,
      reason: payload.reason
    });

    // Here you would:
    // 1. Finalize the transaction
    // 2. Calculate energy consumption
    // 3. Generate billing
    // 4. Update connector status

    const response: StopTransactionResponse = {
      idTagInfo: {
        status: 'Accepted'
      }
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// STATUS NOTIFICATION HANDLER
// ============================================
export class StatusNotificationHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as StatusNotificationRequest;

    logger.info(`Status notification`, {
      connectorId: payload.connectorId,
      status: payload.status,
      errorCode: payload.errorCode,
      timestamp: payload.timestamp
    });

    // Here you would:
    // 1. Update connector status in database
    // 2. Notify monitoring service
    // 3. Trigger alerts if needed
    // 4. Update booking system

    const response: StatusNotificationResponse = {};

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// METER VALUES HANDLER
// ============================================
export class MeterValuesHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as MeterValuesRequest;

    logger.info(`Meter values received`, {
      connectorId: payload.connectorId,
      transactionId: payload.transactionId,
      meterValueCount: payload.meterValue?.length || 0
    });

    // Here you would:
    // 1. Store meter values in database
    // 2. Calculate real-time energy consumption
    // 3. Update billing calculations
    // 4. Send to analytics service
    // 5. Check for thresholds and alerts

    // Process each meter value
    payload.meterValue?.forEach((meterValue, index) => {
      logger.debug(`Processing meter value ${index + 1}`, {
        timestamp: meterValue.timestamp,
        sampledValueCount: meterValue.sampledValue?.length || 0
      });

      meterValue.sampledValue?.forEach((sampledValue) => {
        logger.debug(`Sampled value`, {
          value: sampledValue.value,
          context: sampledValue.context,
          format: sampledValue.format,
          measurand: sampledValue.measurand,
          phase: sampledValue.phase,
          location: sampledValue.location,
          unit: sampledValue.unit
        });
      });
    });

    const response: MeterValuesResponse = {};

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// REMOTE START TRANSACTION HANDLER
// ============================================
export class RemoteStartTransactionHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as RemoteStartTransactionRequest;

    logger.info(`Remote start transaction request`, {
      connectorId: payload.connectorId,
      idTag: payload.idTag,
      chargingProfile: payload.chargingProfile
    });

    // Here you would:
    // 1. Validate idTag authorization
    // 2. Check connector availability
    // 3. Validate charging profile if provided
    // 4. Send start command to charge point
    // 5. Create transaction record

    // For demo purposes, always accept
    const response: RemoteStartTransactionResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// REMOTE STOP TRANSACTION HANDLER
// ============================================
export class RemoteStopTransactionHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as RemoteStopTransactionRequest;

    logger.info(`Remote stop transaction request`, {
      transactionId: payload.transactionId
    });

    // Here you would:
    // 1. Validate transaction exists
    // 2. Check if transaction can be stopped
    // 3. Send stop command to charge point
    // 4. Finalize billing
    // 5. Update transaction status

    // For demo purposes, always accept
    const response: RemoteStopTransactionResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// CONFIGURATION MANAGEMENT HANDLERS
// ============================================

export class ChangeConfigurationHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as ChangeConfigurationRequest;

    logger.info(`Change configuration request`, {
      key: payload.key,
      value: payload.value
    });

    // Here you would:
    // 1. Validate configuration key
    // 2. Check if key is writable
    // 3. Validate value format and range
    // 4. Apply configuration change
    // 5. Store new configuration

    const response: ChangeConfigurationResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class GetConfigurationHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as GetConfigurationRequest;

    logger.info(`Get configuration request`, {
      keys: payload.key
    });

    // Here you would:
    // 1. Retrieve configuration values
    // 2. Filter by requested keys if provided
    // 3. Return configuration with read/write status

    const response: GetConfigurationResponse = {
      configurationKey: [
        {
          key: 'HeartbeatInterval',
          readonly: false,
          value: '60'
        },
        {
          key: 'ConnectionTimeOut',
          readonly: false,
          value: '300'
        },
        {
          key: 'MeterValueSampleInterval',
          readonly: false,
          value: '10'
        }
      ],
      unknownKey: []
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class ClearCacheHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as ClearCacheRequest;

    logger.info(`Clear cache request`);

    // Here you would:
    // 1. Clear local authorization cache
    // 2. Clear configuration cache
    // 3. Clear any other cached data

    const response: ClearCacheResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// SMART CHARGING HANDLERS
// ============================================

export class SetChargingProfileHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as SetChargingProfileRequest;

    logger.info(`Set charging profile request`, {
      connectorId: payload.connectorId,
      csChargingProfilesId: payload.csChargingProfiles.csChargingProfilesId,
      chargingProfilePurpose: payload.csChargingProfiles.chargingProfilePurpose,
      chargingProfileKind: payload.csChargingProfiles.chargingProfileKind,
      chargingScheduleCount: payload.csChargingProfiles.chargingSchedule?.length || 0
    });

    // Here you would:
    // 1. Validate charging profile
    // 2. Check for conflicts with existing profiles
    // 3. Store charging profile
    // 4. Apply to specified connector

    const response: SetChargingProfileResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class ClearChargingProfileHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as ClearChargingProfileRequest;

    logger.info(`Clear charging profile request`, {
      id: payload.id,
      connectorId: payload.connectorId,
      chargingProfilePurpose: payload.chargingProfilePurpose,
      stackLevel: payload.stackLevel
    });

    // Here you would:
    // 1. Find matching charging profiles
    // 2. Remove specified profiles
    // 3. Update connector configuration

    const response: ClearChargingProfileResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class GetCompositeScheduleHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as GetCompositeScheduleRequest;

    logger.info(`Get composite schedule request`, {
      connectorId: payload.connectorId,
      duration: payload.duration,
      chargingRateUnit: payload.chargingRateUnit
    });

    // Here you would:
    // 1. Combine all active charging profiles
    // 2. Calculate composite schedule
    // 3. Return schedule for specified duration

    const response: GetCompositeScheduleResponse = {
      status: 'Accepted',
      connectorId: payload.connectorId,
      scheduleStart: new Date().toISOString(),
      chargingSchedule: {
        duration: payload.duration,
        chargingRateUnit: payload.chargingRateUnit,
        chargingSchedulePeriod: [
          {
            startPeriod: 0,
            limit: 16.0
          },
          {
            startPeriod: 3600,
            limit: 32.0
          }
        ]
      }
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// SECURITY & MANAGEMENT HANDLERS
// ============================================

export class ResetHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as ResetRequest;

    logger.info(`Reset request`, {
      type: payload.type
    });

    // Here you would:
    // 1. Validate reset request
    // 2. Stop all active transactions
    // 3. Save current state
    // 4. Initiate reset process
    // 5. Send reset command to hardware

    const response: ResetResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class UnlockConnectorHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as UnlockConnectorRequest;

    logger.info(`Unlock connector request`, {
      connectorId: payload.connectorId
    });

    // Here you would:
    // 1. Validate connector ID
    // 2. Check if connector is locked
    // 3. Send unlock command
    // 4. Monitor unlock status
    // 5. Update connector status

    const response: UnlockConnectorResponse = {
      status: 'Unlocked'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class ChangeAvailabilityHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as ChangeAvailabilityRequest;

    logger.info(`Change availability request`, {
      connectorId: payload.connectorId,
      type: payload.type
    });

    // Here you would:
    // 1. Validate connector ID
    // 2. Check current status
    // 3. Check for active transactions
    // 4. Change availability if possible
    // 5. Notify other systems

    const response: ChangeAvailabilityResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class DataTransferHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as DataTransferRequest;

    logger.info(`Data transfer request`, {
      vendorId: payload.vendorId,
      messageId: payload.messageId,
      data: payload.data
    });

    // Here you would:
    // 1. Validate vendor ID
    // 2. Process vendor-specific data
    // 3. Return appropriate response

    const response: DataTransferResponse = {
      status: 'Accepted',
      data: 'Data processed successfully'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

// ============================================
// LOCAL AUTHORIZATION HANDLERS
// ============================================

export class GetLocalListVersionHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as GetLocalListVersionRequest;

    logger.info(`Get local list version request`);

    // Here you would:
    // 1. Retrieve current local authorization list version
    // 2. Return version number

    const response: GetLocalListVersionResponse = {
      listVersion: 1
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}

export class SendLocalListHandler implements OCPPMessageHandler {
  async handleCall(message: OCPPCall): Promise<OCPPCallResult> {
    const payload = message.payload as SendLocalListRequest;

    logger.info(`Send local list request`, {
      listVersion: payload.listVersion,
      updateType: payload.updateType,
      localAuthorizationListCount: payload.localAuthorizationList?.length || 0
    });

    // Here you would:
    // 1. Validate list version
    // 2. Process update type (FULL, DIFFERENTIAL)
    // 3. Update local authorization list
    // 4. Handle authorization data updates

    const response: SendLocalListResponse = {
      status: 'Accepted'
    };

    return {
      type: 3, // CALL_RESULT
      id: message.id,
      payload: response
    };
  }
}