/**
 * OCPP 2.0.1 Adapter
 * 
 * แปลงข้อความจาก OCPP 2.0.1 ให้เป็น Internal Standard Message
 */

import { OCPPMessage, InternalStandardMessage } from '../types';
import { EventEmitter } from 'events';

export interface OCPP20Payload {
  [key: string]: any;
}

export class OCPP20Adapter extends EventEmitter {
  /**
   * แปลงข้อความจาก OCPP 2.0.1 เป็น Internal Standard Message
   */
  convertToInternal(ocppMessage: OCPPMessage, chargePointId: string): InternalStandardMessage {
    const { messageId, messageType, action, payload } = ocppMessage;
    
    // OCPP 2.0.1 ใช้ messageType 2 = CALL, 3 = CALLRESULT, 4 = CALLERROR
    if (messageType === 2 && action) {
      return this.convertCallToInternal(messageId, chargePointId, action, payload);
    }
    
    return {
      messageId,
      chargePointId,
      action: action || `response_${messageType}`,
      payload,
      timestamp: new Date(),
      protocol: 'OCPP20'
    };
  }

  /**
   * แปลงข้อความจาก Internal Standard Message เป็น OCPP 2.0.1
   */
  convertFromInternal(internalMessage: InternalStandardMessage): OCPPMessage {
    const { messageId, action, payload } = internalMessage;
    
    const messageType = this.getMessageTypeFromAction(action);
    
    return {
      messageId,
      messageType,
      action,
      payload
    };
  }

  /**
   * แปลง CALL message จาก OCPP 2.0.1
   */
  private convertCallToInternal(messageId: string, chargePointId: string, action: string, payload: OCPP20Payload): InternalStandardMessage {
    let convertedPayload = payload;
    
    // Convert specific OCPP 2.0.1 actions to internal format
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
      case 'TransactionEvent':
        convertedPayload = this.convertTransactionEvent(payload);
        break;
      case 'MeterValues':
        convertedPayload = this.convertMeterValues(payload);
        break;
      case 'StatusNotification':
        convertedPayload = this.convertStatusNotification(payload);
        break;
      case 'RequestStartTransaction':
        convertedPayload = this.convertRequestStartTransaction(payload);
        break;
      case 'RequestStopTransaction':
        convertedPayload = this.convertRequestStopTransaction(payload);
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
      protocol: 'OCPP20'
    };
  }

  /**
   * กำหนด messageType จาก action
   */
  private getMessageTypeFromAction(action: string): number {
    const callActions = [
      'Reset', 'ClearCache', 'UnlockConnector', 'ChangeAvailability',
      'SetVariables', 'GetVariables', 'RequestStartTransaction', 'RequestStopTransaction',
      'SetChargingProfile', 'ClearChargingProfile'
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
  private convertBootNotification(payload: OCPP20Payload): any {
    return {
      chargingStation: {
        model: payload.chargingStation?.model,
        vendorName: payload.chargingStation?.vendorName,
        serialNumber: payload.chargingStation?.serialNumber,
        firmwareVersion: payload.chargingStation?.firmwareVersion,
        modem: payload.chargingStation?.modem
      },
      reason: payload.reason
    };
  }

  /**
   * แปลง Heartbeat payload
   */
  private convertHeartbeat(payload: OCPP20Payload): any {
    return {
      timestamp: new Date()
    };
  }

  /**
   * แปลง Authorize payload
   */
  private convertAuthorize(payload: OCPP20Payload): any {
    return {
      idToken: {
        idToken: payload.idToken?.idToken,
        type: payload.idToken?.type,
        additionalInfo: payload.idToken?.additionalInfo
      },
      certificate: payload.certificate
    };
  }

  /**
   * แปลง TransactionEvent payload
   */
  private convertTransactionEvent(payload: OCPP20Payload): any {
    return {
      eventType: payload.eventType,
      timestamp: new Date(payload.timestamp),
      triggerReason: payload.triggerReason,
      seqNo: payload.seqNo,
      transactionInfo: payload.transactionInfo,
      evse: payload.evse,
      idToken: payload.idToken,
      meterValue: payload.meterValue
    };
  }

  /**
   * แปลง MeterValues payload
   */
  private convertMeterValues(payload: OCPP20Payload): any {
    return {
      evseId: payload.evseId,
      meterValue: payload.meterValue
    };
  }

  /**
   * แปลง StatusNotification payload
   */
  private convertStatusNotification(payload: OCPP20Payload): any {
    return {
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      connectorStatus: payload.connectorStatus,
      evseId: payload.evseId,
      connectorId: payload.connectorId
    };
  }

  /**
   * แปลง RequestStartTransaction payload
   */
  private convertRequestStartTransaction(payload: OCPP20Payload): any {
    return {
      remoteStartId: payload.remoteStartId,
      idToken: payload.idToken,
      evseId: payload.evseId,
      chargingProfile: payload.chargingProfile
    };
  }

  /**
   * แปลง RequestStopTransaction payload
   */
  private convertRequestStopTransaction(payload: OCPP20Payload): any {
    return {
      transactionId: payload.transactionId
    };
  }
}