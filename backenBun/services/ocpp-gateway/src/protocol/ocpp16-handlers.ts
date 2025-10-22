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

// Additional OCPP 1.6 handlers can be added here:
// - StatusNotification
// - MeterValues
// - RemoteStartTransaction
// - RemoteStopTransaction
// - ChangeAvailability
// - ClearCache
// - ChangeConfiguration
// - GetConfiguration
// - SetChargingProfile
// - ClearChargingProfile
// - GetCompositeSchedule
// - GetLocalListVersion
// - SendLocalList
// - DataTransfer
// - Reset
// - UnlockConnector