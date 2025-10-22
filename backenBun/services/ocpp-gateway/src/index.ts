import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../../shared/utils/logger.js';
import { ConnectionManager } from './websocket/connection-manager.js';
import { OCPPProtocolManager } from './protocol/protocol-manager.js';
import { BootNotificationHandler, HeartbeatHandler, AuthorizeHandler, StartTransactionHandler, StopTransactionHandler } from './protocol/ocpp16-handlers.js';
import { OCPPVersion, type ChargePointConnection } from '../../../../shared/types/ocpp.js';

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

const logger = new Logger('OCPPGateway');
const connectionManager = new ConnectionManager();

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
  .get('/connections/:chargePointId', ({ params }) => {
    const connections = connectionManager.getConnectionsByChargePointId(params.chargePointId);

    return {
      success: true,
      data: {
        chargePointId: params.chargePointId,
        connections: connections.map(conn => ({
          id: conn.id,
          ocppVersion: conn.ocppVersion,
          status: conn.status,
          connectedAt: conn.connectedAt,
          lastHeartbeat: conn.lastHeartbeat
        }))
      },
      timestamp: new Date()
    };
  })
  .post('/connections/:chargePointId/send', async ({ params, body }) => {
    const { message } = body as { message: any };

    // Create OCPP message
    const protocolManager = connectionManager.getProtocolManager(OCPPVersion.OCPP_16);
    if (!protocolManager) {
      return {
        success: false,
        error: 'Protocol manager not found',
        timestamp: new Date()
      };
    }

    const serialized = protocolManager.serializeMessage(message);
    const sentCount = connectionManager.broadcastMessage(params.chargePointId, message);

    return {
      success: sentCount > 0,
      data: {
        sentCount,
        message: serialized
      },
      timestamp: new Date()
    };
  })
  .delete('/connections/:chargePointId', ({ params }) => {
    const removedCount = connectionManager.removeConnectionsByChargePointId(params.chargePointId);

    return {
      success: removedCount > 0,
      data: {
        removedCount
      },
      message: removedCount > 0 ? 'Connections removed' : 'No connections found',
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
  .ws('/ocpp/:chargePointId', {
    open(ws) {
      const chargePointId = ws.data.params?.chargePointId || 'unknown';
      logger.info(`WebSocket connection initiated for charge point: ${chargePointId}`);
    },
    message(ws, message) {
      // This will be handled by the connection manager
      logger.debug(`WebSocket message received: ${message}`);
    },
    close(ws, code, reason) {
      logger.info(`WebSocket connection closed: ${code} - ${reason}`);
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
  const protocolManager = connectionManager.getProtocolManager(OCPPVersion.OCPP_16);
  if (!protocolManager) return;

  protocolManager.registerHandler('BootNotification', new BootNotificationHandler());
  protocolManager.registerHandler('Heartbeat', new HeartbeatHandler());
  protocolManager.registerHandler('Authorize', new AuthorizeHandler());
  protocolManager.registerHandler('StartTransaction', new StartTransactionHandler());
  protocolManager.registerHandler('StopTransaction', new StopTransactionHandler());

  logger.info('OCPP 1.6 handlers registered');
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

// Enhanced WebSocket server setup
function setupWebSocketServer() {
  logger.info('WebSocket server configured for OCPP communication');
  logger.info('WebSocket endpoint: ws://localhost:4000/ocpp?chargePointId=YOUR_ID&version=1.6');
  logger.info('Note: Full WebSocket implementation requires proper WebSocket library');
  
  // For now, the Elysia WebSocket route at line 114 will handle basic WebSocket connections
  // In production, consider using a dedicated WebSocket server library
}

// Initialize everything
setupOCPP16Handlers();
startCleanupRoutine();

// Start the server
app.listen(4000);

console.log('🔌 OCPP Gateway Service is running on port 4000');
console.log('📊 Health check: http://localhost:4000/health');
console.log('🔌 WebSocket: ws://localhost:4000/ocpp?chargePointId=YOUR_ID&version=1.6');
console.log('📈 Statistics: http://localhost:4000/statistics');