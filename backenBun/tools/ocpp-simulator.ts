#!/usr/bin/env bun

import { Logger } from '../shared/utils/logger.js';
import type {
  OCPPMessage,
  OCPPCall,
  OCPPCallResult,
  OCPPCallError,
  BootNotificationRequest,
  HeartbeatRequest,
  AuthorizeRequest,
  StartTransactionRequest,
  StopTransactionRequest,
  StatusNotificationRequest,
  MeterValuesRequest,
  ChangeConfigurationRequest,
  GetConfigurationRequest,
  ClearCacheRequest,
  ResetRequest,
  UnlockConnectorRequest,
  ChangeAvailabilityRequest,
  DataTransferRequest
} from '../shared/types/ocpp.js';

import { OCPPVersion } from '../shared/types/ocpp.js';

const logger = new Logger('OCPPSimulator');

class OCPPSimulator {
  private ws: WebSocket | null = null;
  private chargePointId: string;
  private ocppVersion: OCPPVersion;
  private messageId: number = 1;
  private isConnected: boolean = false;

  constructor(chargePointId: string, ocppVersion: OCPPVersion = OCPPVersion.OCPP_16) {
    this.chargePointId = chargePointId;
    this.ocppVersion = ocppVersion;
  }

  async connect(url: string = 'ws://localhost:4000/ocpp'): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${url}?chargePointId=${this.chargePointId}&version=${this.ocppVersion}`;
      logger.info(`Connecting to OCPP server: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info('Connected to OCPP server');
        this.isConnected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        logger.warn('OCPP connection closed', { code: event.code, reason: event.reason });
        this.isConnected = false;
      };

      this.ws.onerror = (error) => {
        logger.error('OCPP connection error:', error);
        reject(error);
      };
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      logger.info('Message received from server:', message);

      if (Array.isArray(message) && message.length >= 2) {
        const [type, id] = message;

        if (type === 3) { // CALL_RESULT
          logger.info(`Call result received for message ${id}:`, message[2]);
        } else if (type === 4) { // CALL_ERROR
          logger.error(`Call error for message ${id}:`, {
            errorCode: message[2],
            errorDescription: message[3],
            errorDetails: message[4]
          });
        }
      }
    } catch (error) {
      logger.error('Failed to parse message:', error);
    }
  }

  private generateMessageId(): string {
    return (this.messageId++).toString();
  }

  private sendMessage(type: number, id: string, payload?: any, action?: string): void {
    if (!this.ws || !this.isConnected) {
      logger.error('Not connected to OCPP server');
      return;
    }

    let message: any[];

    switch (type) {
      case 2: // CALL
        message = [type, id, action, payload];
        break;
      case 3: // CALL_RESULT
        message = [type, id, payload];
        break;
      case 4: // CALL_ERROR
        message = [type, id, payload];
        break;
      default:
        logger.error(`Unknown message type: ${type}`);
        return;
    }

    const serialized = JSON.stringify(message);
    this.ws.send(serialized);
    logger.info(`Message sent:`, message);
  }

  sendBootNotification(): void {
    const payload: BootNotificationRequest = {
      chargePointVendor: 'SuperApp Simulator',
      chargePointModel: 'EV-Charger-Sim-1.0',
      chargePointSerialNumber: `SIM-${this.chargePointId}`,
      chargeBoxSerialNumber: `BOX-${this.chargePointId}`,
      firmwareVersion: '1.0.0'
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'BootNotification');
  }

  sendHeartbeat(): void {
    const payload: HeartbeatRequest = {};
    this.sendMessage(2, this.generateMessageId(), payload, 'Heartbeat');
  }

  sendAuthorize(idTag: string = 'RFID123456'): void {
    const payload: AuthorizeRequest = {
      idTag
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'Authorize');
  }

  sendStartTransaction(connectorId: number = 1, idTag: string = 'RFID123456'): void {
    const payload: StartTransactionRequest = {
      connectorId,
      idTag,
      timestamp: new Date().toISOString(),
      meterStart: 0,
      reservationId: undefined
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'StartTransaction');
  }

  sendStopTransaction(transactionId: number, idTag: string = 'RFID123456'): void {
    const payload: StopTransactionRequest = {
      transactionId,
      idTag,
      timestamp: new Date().toISOString(),
      meterStop: Math.floor(Math.random() * 10000),
      reason: 'Local'
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'StopTransaction');
  }

  // ============================================
  // EXTENDED OCPP 1.6 METHODS
  // ============================================

  sendStatusNotification(
    connectorId: number = 1,
    status: 'Available' | 'Occupied' | 'Reserved' | 'Unavailable' | 'Faulted' = 'Available',
    errorCode: 'NoError' | 'ConnectorLockFailure' | 'EVCommunicationError' | 'GroundFailure' | 'HighTemperature' | 'InternalError' | 'LocalListConflict' | 'NoError' | 'OverCurrentFailure' | 'OverVoltage' | 'PowerMeterFailure' | 'PowerSwitchFailure' | 'ReaderFailure' | 'ResetFailure' | 'UnderVoltage' | 'WeakSignal' = 'NoError',
    info?: string,
    timestamp?: string,
    vendorId?: string,
    vendorErrorCode?: string
  ): void {
    const payload: StatusNotificationRequest = {
      connectorId,
      errorCode,
      status,
      timestamp: timestamp || new Date().toISOString(),
      info,
      vendorId,
      vendorErrorCode
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'StatusNotification');
  }

  sendMeterValues(
    connectorId: number = 1,
    transactionId?: number,
    meterValues?: Array<{
      timestamp?: string;
      sampledValue: Array<{
        value: string | number;
        context?: 'Sample.Periodic' | 'Sample.Clock' | 'Transaction.Begin' | 'Transaction.End' | 'Sample.Session';
        format?: 'Raw' | 'SignedData';
        measurand?: 'Energy.Active.Import.Register' | 'Energy.Active.Export.Register' | 'Energy.Reactive.Import.Register' | 'Energy.Reactive.Export.Register' | 'Voltage' | 'Current.Import' | 'Current.Export' | 'Power.Active.Import' | 'Power.Active.Export' | 'Power.Reactive.Import' | 'Power.Reactive.Export' | 'Frequency' | 'Temperature' | 'StateOfCharge';
        phase?: 'L1' | 'L2' | 'L3' | 'N' | 'L1-N' | 'L2-N' | 'L3-N' | 'L1-L2' | 'L2-L3' | 'L3-L1';
        location?: 'Inlet' | 'Outlet' | 'Body' | 'Cable';
        unit?: 'Wh' | 'kWh' | 'Varh' | 'kVarh' | 'W' | 'kW' | 'VA' | 'kVA' | 'V' | 'A' | 'Hz' | 'Celsius' | 'Fahrenheit' | 'K' | 'Percent';
      }>;
    }>
  ): void {
    // Generate realistic meter values if not provided
    const defaultMeterValues = meterValues || [
      {
        timestamp: new Date().toISOString(),
        sampledValue: [
          {
            value: Math.floor(Math.random() * 1000).toString(),
            context: 'Sample.Periodic',
            measurand: 'Energy.Active.Import.Register',
            format: 'Raw',
            unit: 'Wh'
          },
          {
            value: (220 + Math.random() * 10).toFixed(1),
            context: 'Sample.Periodic',
            measurand: 'Voltage',
            format: 'Raw',
            unit: 'V',
            phase: 'L1'
          },
          {
            value: (16 + Math.random() * 8).toFixed(1),
            context: 'Sample.Periodic',
            measurand: 'Current.Import',
            format: 'Raw',
            unit: 'A',
            phase: 'L1'
          },
          {
            value: (Math.random() * 22).toFixed(1),
            context: 'Sample.Periodic',
            measurand: 'Power.Active.Import',
            format: 'Raw',
            unit: 'kW'
          }
        ]
      }
    ];

    const payload: MeterValuesRequest = {
      connectorId,
      transactionId,
      meterValue: defaultMeterValues
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'MeterValues');
  }

  sendChangeConfiguration(key: string, value: string): void {
    const payload: ChangeConfigurationRequest = {
      key,
      value
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'ChangeConfiguration');
  }

  sendGetConfiguration(keys?: string[]): void {
    const payload: GetConfigurationRequest = {
      key: keys
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'GetConfiguration');
  }

  sendClearCache(): void {
    const payload: ClearCacheRequest = {};

    this.sendMessage(2, this.generateMessageId(), payload, 'ClearCache');
  }

  sendReset(type: 'Hard' | 'Soft' = 'Soft'): void {
    const payload: ResetRequest = {
      type
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'Reset');
  }

  sendUnlockConnector(connectorId: number = 1): void {
    const payload: UnlockConnectorRequest = {
      connectorId
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'UnlockConnector');
  }

  sendChangeAvailability(
    connectorId: number = 1,
    type: 'Operative' | 'Inoperative' = 'Operative'
  ): void {
    const payload: ChangeAvailabilityRequest = {
      connectorId,
      type
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'ChangeAvailability');
  }

  sendDataTransfer(vendorId: string, messageId?: string, data?: string): void {
    const payload: DataTransferRequest = {
      vendorId,
      messageId,
      data
    };

    this.sendMessage(2, this.generateMessageId(), payload, 'DataTransfer');
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  async runSimulationSequence(): Promise<void> {
    if (!this.isConnected) {
      logger.error('Not connected to server');
      return;
    }

    logger.info('Starting comprehensive OCPP 1.6 simulation sequence...');

    // Step 1: Boot Notification
    logger.info('Step 1: Sending Boot Notification...');
    this.sendBootNotification();
    await this.sleep(2000);

    // Step 2: Send initial status notifications
    logger.info('Step 2: Sending Status Notifications...');
    this.sendStatusNotification(0, 'Available'); // Connector 0 (overall station)
    await this.sleep(1000);
    this.sendStatusNotification(1, 'Available'); // Connector 1
    await this.sleep(1000);
    this.sendStatusNotification(2, 'Available'); // Connector 2
    await this.sleep(2000);

    // Step 3: Authorize
    logger.info('Step 3: Authorizing RFID tag...');
    this.sendAuthorize('RFID123456');
    await this.sleep(2000);

    // Step 4: Get current configuration
    logger.info('Step 4: Getting current configuration...');
    this.sendGetConfiguration(['HeartbeatInterval', 'MeterValueSampleInterval']);
    await this.sleep(2000);

    // Step 5: Start Transaction
    logger.info('Step 5: Starting charging transaction...');
    this.sendStartTransaction(1, 'RFID123456');
    await this.sleep(3000);

    // Step 6: Update status to Occupied
    logger.info('Step 6: Updating connector status to Occupied...');
    this.sendStatusNotification(1, 'Occupied');
    await this.sleep(2000);

    // Step 7: Send periodic meter values during charging
    logger.info('Step 7: Starting periodic meter values...');
    const meterValueInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMeterValues(1, 1); // Connector 1, Transaction ID 1
      } else {
        clearInterval(meterValueInterval);
      }
    }, 10000); // Every 10 seconds

    // Step 8: Send periodic heartbeats
    const heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Step 9: Change configuration during charging
    setTimeout(() => {
      logger.info('Step 9: Changing configuration...');
      this.sendChangeConfiguration('MeterValueSampleInterval', '5');
    }, 15000);

    // Step 10: Test data transfer
    setTimeout(() => {
      logger.info('Step 10: Testing data transfer...');
      this.sendDataTransfer('SuperApp', 'CustomMessage', 'Test data from charge point');
    }, 20000);

    // Step 11: Stop transaction after charging completes
    setTimeout(() => {
      logger.info('Step 11: Stopping transaction...');
      this.sendStopTransaction(1, 'RFID123456');
      clearInterval(meterValueInterval);
    }, 45000);

    // Step 12: Update status back to Available
    setTimeout(() => {
      logger.info('Step 12: Updating connector status to Available...');
      this.sendStatusNotification(1, 'Available');
    }, 50000);

    // Step 13: Test remote commands (these would normally be initiated by CSMS)
    setTimeout(() => {
      logger.info('Step 13: Testing availability change...');
      this.sendChangeAvailability(1, 'Inoperative');
    }, 60000);

    setTimeout(() => {
      logger.info('Step 14: Setting connector back to Operative...');
      this.sendChangeAvailability(1, 'Operative');
    }, 70000);

    // Step 15: Test clear cache
    setTimeout(() => {
      logger.info('Step 15: Testing cache clear...');
      this.sendClearCache();
    }, 80000);

    logger.info('Comprehensive OCPP 1.6 simulation sequence initiated');
  }

  async runProductionTest(): Promise<void> {
    if (!this.isConnected) {
      logger.error('Not connected to server');
      return;
    }

    logger.info('Running production-ready OCPP test sequence...');

    // Production test sequence - more realistic timing
    this.sendBootNotification();
    await this.sleep(3000);

    // Initialize all connectors
    this.sendStatusNotification(0, 'Available');
    await this.sleep(500);
    this.sendStatusNotification(1, 'Available');
    await this.sleep(500);
    this.sendStatusNotification(2, 'Available');
    await this.sleep(2000);

    // Simulate a customer arriving
    this.sendAuthorize('CUSTOMER_CARD_001');
    await this.sleep(2000);

    // Customer plugs in and starts charging
    this.sendStartTransaction(1, 'CUSTOMER_CARD_001');
    await this.sleep(3000);

    this.sendStatusNotification(1, 'Occupied');
    await this.sleep(2000);

    // Simulate realistic charging session with meter values
    let energyConsumed = 0;
    const chargingInterval = setInterval(() => {
      if (this.isConnected) {
        energyConsumed += Math.random() * 0.5; // 0-0.5 kWh per reading

        const customMeterValues = [
          {
            timestamp: new Date().toISOString(),
            sampledValue: [
              {
                value: Math.floor(energyConsumed * 1000).toString(), // Convert to Wh
                context: 'Sample.Periodic',
                measurand: 'Energy.Active.Import.Register',
                format: 'Raw',
                unit: 'Wh'
              },
              {
                value: (220 + Math.random() * 5).toFixed(1),
                context: 'Sample.Periodic',
                measurand: 'Voltage',
                format: 'Raw',
                unit: 'V',
                phase: 'L1'
              },
              {
                value: (16 + Math.random() * 4).toFixed(1),
                context: 'Sample.Periodic',
                measurand: 'Current.Import',
                format: 'Raw',
                unit: 'A',
                phase: 'L1'
              },
              {
                value: (3.3 + Math.random() * 2).toFixed(1),
                context: 'Sample.Periodic',
                measurand: 'Power.Active.Import',
                format: 'Raw',
                unit: 'kW'
              }
            ]
          }
        ];

        this.sendMeterValues(1, 1, customMeterValues);
      } else {
        clearInterval(chargingInterval);
      }
    }, 30000); // Every 30 seconds (realistic)

    // Periodic heartbeats
    const heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 60000); // Every 60 seconds

    // End charging session after 2 hours (simulation)
    setTimeout(() => {
      logger.info('Ending production charging session...');
      this.sendStopTransaction(1, 'CUSTOMER_CARD_001');
      clearInterval(chargingInterval);
      clearInterval(heartbeatInterval);

      setTimeout(() => {
        this.sendStatusNotification(1, 'Available');
        logger.info('Production test sequence completed');
      }, 5000);
    }, 120000); // 2 minutes = 2 hours in simulation

    logger.info('Production OCPP test sequence started');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const chargePointId = args[0] || `SIM_${Date.now()}`;
  const ocppVersion = args[1] as OCPPVersion || OCPPVersion.OCPP_16;
  const serverUrl = args[3] || 'ws://localhost:4000/ocpp';
  const testMode = args[2] || 'comprehensive'; // 'comprehensive' or 'production'

  const simulator = new OCPPSimulator(chargePointId, ocppVersion);

  try {
    await simulator.connect(serverUrl);

    console.log(`\n🔌 OCPP Simulator Started`);
    console.log(`📋 Charge Point ID: ${chargePointId}`);
    console.log(`🔧 OCPP Version: ${ocppVersion}`);
    console.log(`🌐 Server URL: ${serverUrl}`);
    console.log(`🧪 Test Mode: ${testMode}`);
    console.log(`\n📱 Available Commands:`);
    console.log(`   Ctrl+C: Stop simulator`);
    console.log(`   Send manual OCPP messages using simulator methods\n`);

    // Run appropriate test sequence
    if (testMode === 'production') {
      await simulator.runProductionTest();
    } else {
      await simulator.runSimulationSequence();
    }

    // Keep the process running
    process.on('SIGINT', () => {
      logger.info('Shutting down simulator...');
      simulator.disconnect();
      process.exit(0);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      simulator.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to run simulator:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { OCPPSimulator };