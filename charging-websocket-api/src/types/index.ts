// WebSocket Message Types for Charging Control API

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  timestamp: string;
  data?: any;
  error?: ErrorInfo;
}

export enum MessageType {
  // Authentication
  AUTH_REQUEST = 'auth_request',
  AUTH_RESPONSE = 'auth_response',

  // Charging Control
  START_CHARGING_REQUEST = 'start_charging_request',
  START_CHARGING_RESPONSE = 'start_charging_response',
  STOP_CHARGING_REQUEST = 'stop_charging_request',
  STOP_CHARGING_RESPONSE = 'stop_charging_response',

  // Status Updates
  CHARGING_STATUS_UPDATE = 'charging_status_update',
  CONNECTOR_STATUS_UPDATE = 'connector_status_update',

  // Real-time Data
  METER_VALUES_UPDATE = 'meter_values_update',
  HEARTBEAT = 'heartbeat',

  // Error Handling
  ERROR = 'error',
  VALIDATION_ERROR = 'validation_error'
}

export interface AuthRequest {
  token: string;
  userId: string;
}

export interface AuthResponse {
  success: boolean;
  userId: string;
  sessionId: string;
  expiresAt: string;
}

export interface StartChargingRequest {
  chargePointId: string;
  connectorId: number;
  idTag: string;
  userId: string;
}

export interface StartChargingResponse {
  success: boolean;
  transactionId?: number;
  connectorId: number;
  status: 'Accepted' | 'Rejected' | 'InProgress';
  message: string;
}

export interface StopChargingRequest {
  chargePointId: string;
  transactionId: number;
  userId: string;
  reason?: 'EmergencyStop' | 'UserStop' | 'DeAuthorized' | 'RemoteStop';
}

export interface StopChargingResponse {
  success: boolean;
  transactionId: number;
  status: 'Accepted' | 'Rejected';
  message: string;
}

export interface ChargingStatusUpdate {
  chargePointId: string;
  connectorId: number;
  status: ConnectorStatus;
  transactionId?: number;
  timestamp: string;
}

export enum ConnectorStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  RESERVED = 'Reserved',
  UNAVAILABLE = 'Unavailable',
  FAULTED = 'Faulted',
  CHARGING = 'Charging',
  PREPARING = 'Preparing',
  FINISHING = 'Finishing',
  SUSPENDED_EV = 'SuspendedEV',
  SUSPENDED_EVSE = 'SuspendedEVSE'
}

export interface MeterValuesUpdate {
  chargePointId: string;
  connectorId: number;
  transactionId?: number;
  meterValue: {
    energyImportKWh: number;
    powerKw: number;
    voltage: number;
    current: number;
    timestamp: string;
    stateOfCharge?: number;
  };
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
}

export interface ConnectedClient {
  id: string;
  userId: string;
  sessionId: string;
  socket: any;
  connectedAt: string;
  lastActivity: string;
  authorizedChargePoints: string[];
}

export interface ChargePointInfo {
  chargePointId: string;
  status: string;
  connectors: ConnectorInfo[];
  lastHeartbeat: string;
}

export interface ConnectorInfo {
  connectorId: number;
  status: ConnectorStatus;
  currentTransactionId?: number;
  energyDeliveredKWh?: number;
  powerKw?: number;
  stateOfChargePercent?: number;
}

// OCPP Message Types (for communication with ws-gateway)
export interface OCPPMessage {
  [key: number]: any;
}

export type OCPPCall = [2, string, string, any];
export type OCPPCallResult = [3, string, any];
export type OCPPCallError = [4, string, string, any?];

// Configuration
export interface WebSocketConfig {
  port: number;
  host: string;
  gatewayUrl: string;
  jwtSecret: string;
  heartbeatInterval: number;
  sessionTimeout: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorInfo;
  timestamp: string;
}
