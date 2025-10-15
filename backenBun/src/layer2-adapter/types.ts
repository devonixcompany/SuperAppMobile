/**
 * Internal Standard Message Types
 * 
 * กำหนดรูปแบบข้อความมาตรฐานภายในที่ใช้ระหว่าง Layer 2 และ Layer 3
 */

export interface InternalStandardMessage {
  messageId: string;
  chargePointId: string;
  action: string;
  payload: any;
  timestamp: Date;
  protocol: 'OCPP16' | 'OCPP20' | 'OCPP21';
}

export interface OCPPMessage {
  messageId: string;
  messageType: number;
  action?: string;
  payload?: any;
}

export interface ChargePointStatus {
  chargePointId: string;
  status: 'Available' | 'Occupied' | 'Unavailable' | 'Faulted';
  timestamp: Date;
  errorCode?: string;
  info?: string;
}

export interface TransactionData {
  transactionId: string;
  chargePointId: string;
  connectorId: number;
  idTag: string;
  startTimestamp: Date;
  stopTimestamp?: Date;
  meterStart: number;
  meterStop?: number;
  reason?: string;
}

export interface MeterValue {
  timestamp: Date;
  value: number;
  unit: string;
  context?: string;
  measurand?: string;
  location?: string;
}

export interface AuthorizationData {
  idTag: string;
  status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
  parentIdTag?: string;
  expiryDate?: Date;
}

export interface RemoteStartRequest {
  chargePointId: string;
  connectorId?: number;
  idTag: string;
  chargingProfile?: any;
}

export interface RemoteStopRequest {
  chargePointId: string;
  transactionId: string;
}

export interface ClearCacheRequest {
  chargePointId: string;
}

export interface UnlockConnectorRequest {
  chargePointId: string;
  connectorId: number;
}

export interface ResetRequest {
  chargePointId: string;
  type: 'Hard' | 'Soft';
}

export interface ChangeAvailabilityRequest {
  chargePointId: string;
  connectorId: number;
  type: 'Operative' | 'Inoperative';
}

export interface ChangeConfigurationRequest {
  chargePointId: string;
  key: string;
  value: string;
}

export interface GetConfigurationRequest {
  chargePointId: string;
  key?: string[];
}

export interface SetChargingProfileRequest {
  chargePointId: string;
  connectorId: number;
  csChargingProfiles: any;
}

export interface ClearChargingProfileRequest {
  chargePointId: string;
  connectorId?: number;
  chargingProfilePurpose?: string;
  stackLevel?: number;
}