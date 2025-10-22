// OCPP Message Types
export enum OCPPMessageType {
  CALL = 2,
  CALL_RESULT = 3,
  CALL_ERROR = 4
}

export enum OCPPVersion {
  OCPP_16 = '1.6',
  OCPP_201 = '2.0.1',
  OCPP_21 = '2.1'
}

// Base OCPP Message
export interface OCPPMessage {
  type: OCPPMessageType;
  id: string;
}

export interface OCPPCall extends OCPPMessage {
  type: OCPPMessageType.CALL;
  action: string;
  payload: any;
}

export interface OCPPCallResult extends OCPPMessage {
  type: OCPPMessageType.CALL_RESULT;
  payload: any;
}

export interface OCPPCallError extends OCPPMessage {
  type: OCPPMessageType.CALL_ERROR;
  errorCode: OCPPErrorCode;
  errorDescription?: string;
  errorDetails?: any;
}

export enum OCPPErrorCode {
  NOT_IMPLEMENTED = 'NotImplemented',
  NOT_SUPPORTED = 'NotSupported',
  INTERNAL_ERROR = 'InternalError',
  PROTOCOL_ERROR = 'ProtocolError',
  SECURITY_ERROR = 'SecurityError',
  FORMATION_VIOLATION = 'FormationViolation',
  PROPERTY_CONSTRAINT_VIOLATION = 'PropertyConstraintViolation',
  OCCURRENENCE_CONSTRAINT_VIOLATION = 'OccurrenceConstraintViolation',
  TYPE_CONSTRAINT_VIOLATION = 'TypeConstraintViolation',
  GENERIC_ERROR = 'GenericError'
}

// Charge Point Connection
export interface ChargePointConnection {
  id: string;
  chargePointId: string;
  socket: WebSocket;
  ocppVersion: OCPPVersion;
  connectedAt: Date;
  lastHeartbeat: Date;
  status: ChargePointStatus;
}

export enum ChargePointStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  UNAVAILABLE = 'UNAVAILABLE',
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  FAULTED = 'FAULTED'
}

// OCPP 1.6 Messages
export interface BootNotificationRequest {
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

export interface BootNotificationResponse {
  status: 'Accepted' | 'Pending' | 'Rejected';
  currentTime: string;
  interval: number;
}

export interface HeartbeatRequest {
  // Empty payload
}

export interface HeartbeatResponse {
  currentTime: string;
}

export interface AuthorizeRequest {
  idTag: string;
}

export interface AuthorizeResponse {
  idTagInfo: {
    status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
    expiryDate?: string;
    parentIdTag?: string;
  };
}

export interface StartTransactionRequest {
  connectorId: number;
  idTag: string;
  timestamp: string;
  meterStart: number;
  reservationId?: number;
}

export interface StartTransactionResponse {
  transactionId: number;
  idTagInfo: {
    status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
    expiryDate?: string;
    parentIdTag?: string;
  };
}

export interface StopTransactionRequest {
  transactionId: number;
  idTag?: string;
  timestamp: string;
  meterStop: number;
  reason?: string;
}

export interface StopTransactionResponse {
  idTagInfo?: {
    status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
    expiryDate?: string;
    parentIdTag?: string;
  };
}

// Transaction Management
export interface ChargingTransaction {
  id: number;
  transactionId: string;
  chargePointId: string;
  connectorId: number;
  idTag: string;
  startTimestamp: Date;
  stopTimestamp?: Date;
  startMeterValue: number;
  stopMeterValue?: number;
  energyConsumed?: number;
  status: TransactionStatus;
  reason?: string;
}

export enum TransactionStatus {
  STARTED = 'STARTED',
  STOPPED = 'STOPPED',
  SUSPENDED = 'SUSPENDED'
}

// Charging Station Info
export interface ChargingStation {
  id: string;
  chargePointId: string;
  vendor: string;
  model: string;
  serialNumber?: string;
  firmwareVersion?: string;
  status: ChargePointStatus;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  connectors: Connector[];
  lastSeen: Date;
}

export interface Connector {
  id: number;
  type: ConnectorType;
  status: ConnectorStatus;
  maxCurrent: number;
  maxPower: number;
}

export enum ConnectorType {
  TYPE_2 = 'TYPE_2',
  CHADEMO = 'CHADEMO',
  CCS = 'CCS',
  TESLA = 'TESLA',
  DOMESTIC = 'DOMESTIC'
}

export enum ConnectorStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  RESERVED = 'Reserved',
  UNAVAILABLE = 'Unavailable',
  FAULTED = 'Faulted'
}

// Meter Values
export interface MeterValue {
  timestamp: string;
  sampledValue: SampledValue[];
}

export interface SampledValue {
  value: string;
  context: MeterValueContext;
  format?: MeterValueFormat;
  measurand?: MeterValueMeasurand;
  phase?: MeterValuePhase;
  location?: MeterValueLocation;
  unit?: string;
}

export enum MeterValueContext {
  INTERRUPTION_BEGIN = 'Interruption.Begin',
  INTERRUPTION_END = 'Interruption.End',
  SAMPLE_CLOCK = 'Sample.Clock',
  SAMPLE_PERIODIC = 'Sample.Periodic',
  TRANSACTION_BEGIN = 'Transaction.Begin',
  TRANSACTION_END = 'Transaction.End',
  TRIGGER_VALUE = 'Trigger.Value'
}

export enum MeterValueFormat {
  RAW = 'Raw',
  SIGNED_DATA = 'SignedData'
}

export enum MeterValueMeasurand {
  ENERGY_ACTIVE_EXPORT_REGISTER = 'Energy.Active.Export.Register',
  ENERGY_ACTIVE_IMPORT_REGISTER = 'Energy.Active.Import.Register',
  ENERGY_REACTIVE_EXPORT_REGISTER = 'Energy.Reactive.Export.Register',
  ENERGY_REACTIVE_IMPORT_REGISTER = 'Energy.Reactive.Import.Register',
  ENERGY_ACTIVE_EXPORT_INTERVAL = 'Energy.Active.Export.Interval',
  ENERGY_ACTIVE_IMPORT_INTERVAL = 'Energy.Active.Import.Interval',
  ENERGY_REACTIVE_EXPORT_INTERVAL = 'Energy.Reactive.Export.Interval',
  ENERGY_REACTIVE_IMPORT_INTERVAL = 'Energy.Reactive.Import.Interval',
  FREQUENCY = 'Frequency',
  POWER_ACTIVE_EXPORT = 'Power.Active.Export',
  POWER_ACTIVE_IMPORT = 'Power.Active.Import',
  POWER_FACTOR = 'Power.Factor',
  POWER_REACTIVE_EXPORT = 'Power.Reactive.Export',
  POWER_REACTIVE_IMPORT = 'Power.Reactive.Import',
  CURRENT_EXPORT = 'Current.Export',
  CURRENT_IMPORT = 'Current.Import',
  CURRENT_OFFERED = 'Current.Offered',
  VOLTAGE = 'Voltage',
  STATE_OF_CHARGE = 'StateOfCharge',
  TEMPERATURE = 'Temperature'
}

export enum MeterValuePhase {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  N = 'N',
  L1_N = 'L1-N',
  L2_N = 'L2-N',
  L3_N = 'L3-N',
  L1_L2 = 'L1-L2',
  L2_L3 = 'L2-L3',
  L3_L1 = 'L3-L1'
}

export enum MeterValueLocation {
  BODY = 'Body',
  CABLE = 'Cable',
  EV = 'EV',
  INLET = 'Inlet',
  OUTLET = 'Outlet'
}