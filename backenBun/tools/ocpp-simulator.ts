#!/usr/bin/env bun

import { Logger } from '../shared/utils/logger.js';
import type {
  OCPPMessage,
  OCPPCall,
  OCPPCallResult,
  OCPPCallError,
  OCPPVersion,
  BootNotificationRequest,
  HeartbeatRequest,
  AuthorizeRequest,
  StartTransactionRequest,
  StopTransactionRequest
} from '../shared/types/ocpp.js';

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

    logger.info('Starting OCPP simulation sequence...');

    // Step 1: Boot Notification
    this.sendBootNotification();
    await this.sleep(2000);

    // Step 2: Authorize
    this.sendAuthorize();
    await this.sleep(2000);

    // Step 3: Start Transaction
    this.sendStartTransaction();
    await this.sleep(3000);

    // Step 4: Send periodic heartbeats
    const heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Step 5: Stop transaction after some time
    setTimeout(() => {
      this.sendStopTransaction(1); // Assuming transaction ID is 1
    }, 10000);

    logger.info('OCPP simulation sequence initiated');
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
  const serverUrl = args[2] || 'ws://localhost:4000/ocpp';

  const simulator = new OCPPSimulator(chargePointId, ocppVersion);

  try {
    await simulator.connect(serverUrl);
    await simulator.runSimulationSequence();

    // Keep the process running
    process.on('SIGINT', () => {
      logger.info('Shutting down simulator...');
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