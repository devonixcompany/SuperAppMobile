/**
 * OCPP 1.6 Adapter
 * 
 * แปลงข้อความจาก OCPP 1.6 ให้เป็น Internal Standard Message
 */

import { OCPPMessage, InternalStandardMessage } from '../types';
import { EventEmitter } from 'events';

export interface OCPP16Payload {
  [key: string]: any;
}

export class OCPP16Adapter extends EventEmitter {
  /**
   * แปลงข้อความจาก OCPP 1.6 เป็น Internal Standard Message
   */
  convertToInternal(ocppMessage: OCPPMessage, chargePointId: string): InternalStandardMessage {
    const { messageId, messageType, action, payload } = ocppMessage;
    
    // OCPP 1.6 ใช้ messageType 2 = CALL, 3 = CALLRESULT, 4 = CALLERROR
    if (messageType === 2 && action) {
      return this.convertCallToInternal(messageId, chargePointId, action, payload);
    }
    
    // For CALLRESULT and CALLERROR, we'll handle them differently
    return {
      messageId,
      chargePointId,
      action: action || `response_${messageType}`,
      payload,
      timestamp: new Date(),
      protocol: 'OCPP16'
    };
  }

  /**
   * แปลงข้อความจาก Internal Standard Message เป็น OCPP 1.6
   */
  convertFromInternal(internalMessage: InternalStandardMessage): OCPPMessage {
    const { messageId, action, payload } = internalMessage;
    
    // Determine message type based on action
    const messageType = this.getMessageTypeFromAction(action);
    
    return {
      messageId,
      messageType,
      action,
      payload
    };
  }

  /**
   * แปลง CALL message จาก OCPP 1.6
   */
  private convertCallToInternal(messageId: string, chargePointId: string, action: string, payload: OCPP16Payload): InternalStandardMessage {
    let convertedPayload = payload;
    
    // Convert specific OCPP 1.6 actions to internal format
    switch (action) {
      case 'BootNotification':
        convertedPayload = this.convertBootNotification(payload);
        break;
      case 'Heartbeat':
        convertedPayload = this.convertHeartbeat(payload);
        break;
      case 'Authorize':
        convertedPayload = this.convertAuthorize(payload);
        break;
      case 'StartTransaction':
        convertedPayload = this.convertStartTransaction(payload);
        break;
      case 'StopTransaction':
        convertedPayload = this.convertStopTransaction(payload);
        break;
      case 'MeterValues':
        convertedPayload = this.convertMeterValues(payload);
        break;
      case 'StatusNotification':
        convertedPayload = this.convertStatusNotification(payload);
        break;
      default:
        // For unknown actions, pass through as-is
        break;
    }
    
    return {
      messageId,
      chargePointId,
      action,
      payload: convertedPayload,
      timestamp: new Date(),
      protocol: 'OCPP16'
    };
  }

  /**
   * กำหนด messageType จาก action
   */
  private getMessageTypeFromAction(action: string): number {
    // For commands sent to charge point, use CALL (2)
    // For responses, use CALLRESULT (3)
    // For errors, use CALLERROR (4)
    
    const callActions = [
      'Reset', 'ClearCache', 'UnlockConnector', 'ChangeAvailability',
      'ChangeConfiguration', 'GetConfiguration', 'SetChargingProfile',
      'ClearChargingProfile', 'RemoteStartTransaction', 'RemoteStopTransaction'
    ];
    
    if (callActions.includes(action)) {
      return 2; // CALL
    }
    
    if (action.startsWith('response_')) {
      return 3; // CALLRESULT
    }
    
    return 2; // Default to CALL
  }

  /**
   * แปลง BootNotification payload
   */
  private convertBootNotification(payload: OCPP16Payload): any {
    return {
      chargePointVendor: payload.chargePointVendor,
      chargePointModel: payload.chargePointModel,
      chargePointSerialNumber: payload.chargePointSerialNumber,
      chargeBoxSerialNumber: payload.chargeBoxSerialNumber,
      firmwareVersion: payload.firmwareVersion,
      iccid: payload.iccid,
      imsi: payload.imsi,
      meterType: payload.meterType,
      meterSerialNumber: payload.meterSerialNumber
    };
  }

  /**
   * แปลง Heartbeat payload
   */
  private convertHeartbeat(payload: OCPP16Payload): any {
    return {
      timestamp: new Date()
    };
  }

  /**
   * แปลง Authorize payload
   */
  private convertAuthorize(payload: OCPP16Payload): any {
    return {
      idTag: payload.idTag
    };
  }

  /**
   * แปลง StartTransaction payload
   */
  private convertStartTransaction(payload: OCPP16Payload): any {
    return {
      connectorId: payload.connectorId,
      idTag: payload.idTag,
      timestamp: new Date(payload.timestamp),
      meterStart: payload.meterStart,
      reservationId: payload.reservationId
    };
  }

  /**
   * แปลง StopTransaction payload
   */
  private convertStopTransaction(payload: OCPP16Payload): any {
    return {
      transactionId: payload.transactionId,
      idTag: payload.idTag,
      timestamp: new Date(payload.timestamp),
      meterStop: payload.meterStop,
      reason: payload.reason,
      transactionData: payload.transactionData
    };
  }

  /**
   * แปลง MeterValues payload
   */
  private convertMeterValues(payload: OCPP16Payload): any {
    return {
      connectorId: payload.connectorId,
      transactionId: payload.transactionId,
      meterValue: payload.meterValue
    };
  }

  /**
   * แปลง StatusNotification payload
   */
  private convertStatusNotification(payload: OCPP16Payload): any {
    return {
      connectorId: payload.connectorId,
      status: payload.status,
      errorCode: payload.errorCode,
      info: payload.info,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      vendorId: payload.vendorId,
      vendorErrorCode: payload.vendorErrorCode
    };
  }
}