import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

// Simple logger for now
class SimpleLogger {
  constructor(private serviceName: string) {}

  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }

  error(message: string, error?: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: this.serviceName,
      message,
      ...(error && { error })
    }));
  }

  debug(message: string, meta?: any) {
    console.debug(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }

  warn(message: string, meta?: any) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }
}

const logger = new SimpleLogger('OCPPGateway');

// Simplified OCPP types for now
enum OCPPVersion {
  OCPP_16 = '1.6',
  OCPP_201 = '2.0.1'
}

interface ChargePointConnection {
  id: string;
  chargePointId: string;
  ocppVersion: OCPPVersion;
  ws: WebSocket;
  status: 'connected' | 'disconnected';
  connectedAt: Date;
  lastHeartbeat: Date;
}

// Simple connection manager
class SimpleConnectionManager {
  private connections = new Map<string, ChargePointConnection>();

  addConnection(connection: ChargePointConnection) {
    this.connections.set(connection.id, connection);
    logger.info(`Added connection: ${connection.chargePointId}`);
  }

  removeConnection(id: string) {
    const removed = this.connections.delete(id);
    if (removed) {
      logger.info(`Removed connection: ${id}`);
    }
    return removed;
  }

  getConnection(id: string): ChargePointConnection | undefined {
    return this.connections.get(id);
  }

  getAllConnections(): ChargePointConnection[] {
    return Array.from(this.connections.values());
  }

  getStatistics() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(
        conn => conn.status === 'connected'
      ).length
    };
  }

  cleanupStaleConnections(maxAgeMinutes: number): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, connection] of this.connections) {
      const ageMinutes = (now.getTime() - connection.lastHeartbeat.getTime()) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        this.removeConnection(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Import WebSocket server types
interface WebSocketServer {
  options: any;
  on(event: string, listener: (ws: WebSocket, request: any) => void): void;
  on(event: string, listener: (error: Error) => void): void;
}

declare global {
  var WebSocketServer: new (options: any) => WebSocketServer;
  var WebSocket: new (url: string, protocols?: string | string[]) => WebSocket;
}

const connectionManager = new SimpleConnectionManager();

// Import all OCPP handlers
import {
  BootNotificationHandler,
  HeartbeatHandler,
  AuthorizeHandler,
  StartTransactionHandler,
  StopTransactionHandler,
  StatusNotificationHandler,
  MeterValuesHandler,
  RemoteStartTransactionHandler,
  RemoteStopTransactionHandler,
  ChangeConfigurationHandler,
  GetConfigurationHandler,
  ClearCacheHandler,
  SetChargingProfileHandler,
  ClearChargingProfileHandler,
  GetCompositeScheduleHandler,
  ResetHandler,
  UnlockConnectorHandler,
  ChangeAvailabilityHandler,
  DataTransferHandler,
  GetLocalListVersionHandler,
  SendLocalListHandler
} from './protocol/ocpp16-handlers.js';

// Initialize handlers
const handlers = new Map([
  ['BootNotification', new BootNotificationHandler()],
  ['Heartbeat', new HeartbeatHandler()],
  ['Authorize', new AuthorizeHandler()],
  ['StartTransaction', new StartTransactionHandler()],
  ['StopTransaction', new StopTransactionHandler()],
  ['StatusNotification', new StatusNotificationHandler()],
  ['MeterValues', new MeterValuesHandler()],
  ['RemoteStartTransaction', new RemoteStartTransactionHandler()],
  ['RemoteStopTransaction', new RemoteStopTransactionHandler()],
  ['ChangeConfiguration', new ChangeConfigurationHandler()],
  ['GetConfiguration', new GetConfigurationHandler()],
  ['ClearCache', new ClearCacheHandler()],
  ['SetChargingProfile', new SetChargingProfileHandler()],
  ['ClearChargingProfile', new ClearChargingProfileHandler()],
  ['GetCompositeSchedule', new GetCompositeScheduleHandler()],
  ['Reset', new ResetHandler()],
  ['UnlockConnector', new UnlockConnectorHandler()],
  ['ChangeAvailability', new ChangeAvailabilityHandler()],
  ['DataTransfer', new DataTransferHandler()],
  ['GetLocalListVersion', new GetLocalListVersionHandler()],
  ['SendLocalList', new SendLocalListHandler()]
]);

// Handle OCPP Call messages
async function handleOCPPCall(ws: WebSocket, messageId: string, action: string, payload: any) {
  logger.info(`Handling OCPP Call: ${action}`, payload);

  try {
    const handler = handlers.get(action);
    if (handler) {
      const response = await handler.handleCall({
        type: 2, // CALL
        id: messageId,
        action,
        payload
      });

      sendOCPPResponse(ws, messageId, response.payload);
    } else {
      logger.warn(`Unknown OCPP action: ${action}`);
      sendOCPPError(ws, messageId, 'NotImplemented', `Action ${action} not implemented`);
    }
  } catch (error) {
    logger.error(`Error handling OCPP Call ${action}:`, error);
    sendOCPPError(ws, messageId, 'InternalError', 'Internal server error');
  }
}

// Send OCPP response
function sendOCPPResponse(ws: WebSocket, messageId: string, payload: any) {
  try {
    const response = [3, messageId, payload]; // CALL_RESULT
    ws.send(JSON.stringify(response));
    logger.info(`Sent OCPP response for message ID: ${messageId}`);
  } catch (error) {
    logger.error(`Failed to send OCPP response:`, error);
  }
}

// Send OCPP error
function sendOCPPError(ws: WebSocket, messageId: string, errorCode: string, errorDescription: string) {
  try {
    const errorResponse = [4, messageId, errorCode, errorDescription, null]; // CALL_ERROR
    ws.send(JSON.stringify(errorResponse));
    logger.info(`Sent OCPP error for message ID: ${messageId} - ${errorCode}`);
  } catch (error) {
    logger.error(`Failed to send OCPP error:`, error);
  }
}

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'OCPP Gateway Service is healthy',
      timestamp: new Date(),
      service: 'ocpp-gateway',
      connections: connectionManager.getStatistics()
    };
  })
  .get('/connections', () => {
    return {
      success: true,
      data: {
        connections: connectionManager.getAllConnections().map(conn => ({
          id: conn.id,
          chargePointId: conn.chargePointId,
          ocppVersion: conn.ocppVersion,
          status: conn.status,
          connectedAt: conn.connectedAt,
          lastHeartbeat: conn.lastHeartbeat
        })),
        statistics: connectionManager.getStatistics()
      },
      timestamp: new Date()
    };
  })
  .get('/statistics', () => {
    return {
      success: true,
      data: connectionManager.getStatistics(),
      timestamp: new Date()
    };
  })
  .ws('/ocpp', {
    open(ws) {
      // For now, use hardcoded values
      const chargePointId = 'CP001';
      const version = '1.6';

      logger.info(`WebSocket connection initiated for charge point: ${chargePointId}, version: ${version}`);

      const connectionId = `${chargePointId}_${Date.now()}`;
      const connection: ChargePointConnection = {
        id: connectionId,
        chargePointId,
        ocppVersion: version as OCPPVersion,
        ws: ws as any,
        status: 'connected',
        connectedAt: new Date(),
        lastHeartbeat: new Date()
      };

      connectionManager.addConnection(connection);

      // Send welcome message
      try {
        ws.send(JSON.stringify([3, connectionId, { status: "Accepted", currentTime: new Date().toISOString() }]));
        logger.info(`Sent welcome message to charge point: ${chargePointId}`);
      } catch (error) {
        logger.error(`Failed to send welcome message:`, error);
      }
    },
    message(ws, message) {
      try {
        logger.info(`WebSocket message received: ${message}`);
        // Parse OCPP message format [messageType, messageId, action, payload]
        const parsed = JSON.parse(message.toString());

        if (Array.isArray(parsed) && parsed.length >= 3) {
          const [messageType, messageId, action, payload] = parsed;
          logger.info(`OCPP Message: ${messageType}, ID: ${messageId}, Action: ${action}`);

          // Handle different message types
          switch (messageType) {
            case 2: // CALL
              handleOCPPCall(ws, messageId, action, payload);
              break;
            default:
              logger.warn(`Unknown message type: ${messageType}`);
          }
        }
      } catch (error) {
        logger.error(`Error parsing WebSocket message:`, error);
      }
    },
    close(ws, code, reason) {
      logger.info(`WebSocket connection closed: ${code} - ${reason}`);
      // Remove connection from manager
      const connections = connectionManager.getAllConnections();
      const toRemove = connections.filter(conn => conn.ws === ws);
      toRemove.forEach(conn => connectionManager.removeConnection(conn.id));
    },
    error(ws, error) {
      logger.error(`WebSocket error:`, error);
    }
  })
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  });

// Setup OCPP 1.6 handlers
function setupOCPP16Handlers() {
  logger.info('OCPP 1.6 handlers initialized', {
    totalHandlers: handlers.size,
    supportedActions: Array.from(handlers.keys())
  });
}

// Cleanup routine for stale connections
function startCleanupRoutine() {
  setInterval(() => {
    try {
      const cleanedCount = connectionManager.cleanupStaleConnections(5);
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} stale connections`);
      }
    } catch (error) {
      logger.error('Error during connection cleanup:', error);
    }
  }, 60000); // Run every minute
}

// Initialize everything
setupOCPP16Handlers();
startCleanupRoutine();

// Start server
app.listen(4000);

console.log('🔌 OCPP Gateway Service is running on port 4000');
console.log('📊 Health check: http://localhost:4000/health');
console.log('🔌 WebSocket: ws://localhost:4000/ocpp?chargePointId=YOUR_ID&version=1.6');
console.log('📈 Statistics: http://localhost:4000/statistics');