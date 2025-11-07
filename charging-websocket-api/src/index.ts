import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { connectionManager } from './services/connectionManager';
import { config } from './services/config';

// Load environment variables
dotenv.config();

class ChargingWebSocketAPI {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private port: number;
  private host: string;

  constructor() {
    const cfg = config.getConfig();
    this.port = cfg.port;
    this.host = cfg.host;

    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws'
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    }));

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📝 ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const stats = connectionManager.getStats();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        websocket: {
          totalConnections: stats.totalConnections,
          authenticatedConnections: stats.authenticatedConnections,
          totalUsers: stats.totalUsers,
          gatewayConnections: stats.gatewayConnections
        }
      });
    });

    // API status endpoint
    this.app.get('/api/status', (req, res) => {
      const cfg = config.getConfig();
      res.json({
        success: true,
        data: {
          api: 'Charging WebSocket API',
          version: '1.0.0',
          websocketUrl: `ws://${this.host}:${this.port}/ws`,
          config: {
            heartbeatInterval: cfg.heartbeatInterval,
            sessionTimeout: cfg.sessionTimeout,
            gatewayUrl: cfg.gatewayUrl
          }
        }
      });
    });

    // Get connection stats
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = connectionManager.getStats();
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get connection statistics'
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Express error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  /**
   * Setup WebSocket server
   */
  private setupWebSocket(): void {
    // Initialize connection manager
    connectionManager.initialize(this.wss);

    this.wss.on('connection', (ws, request) => {
      console.log(`🔗 New WebSocket connection from ${request.socket.remoteAddress}`);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    console.log('🌐 WebSocket server setup completed');
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        console.log('🚀 Charging WebSocket API Server started successfully!');
        console.log(`📍 HTTP Server: http://${this.host}:${this.port}`);
        console.log(`🔌 WebSocket Server: ws://${this.host}:${this.port}/ws`);
        console.log(`📊 Health Check: http://${this.host}:${this.port}/health`);
        console.log(`📈 API Status: http://${this.host}:${this.port}/api/status`);
        console.log('');
        console.log('🎯 Available WebSocket Message Types:');
        console.log('   - auth_request: Authenticate with JWT token');
        console.log('   - start_charging_request: Start charging session');
        console.log('   - stop_charging_request: Stop charging session');
        console.log('   - heartbeat: Keep connection alive');
        console.log('');
        resolve();
      });

      this.server.on('error', (error: Error) => {
        console.error('❌ Failed to start server:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    console.log('🛑 Stopping Charging WebSocket API Server...');

    // Cleanup connection manager
    connectionManager.cleanup();

    // Close WebSocket server
    this.wss.close(() => {
      console.log('🔌 WebSocket server closed');
    });

    // Close HTTP server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🌐 HTTP server closed');
        console.log('✅ Server stopped successfully');
        resolve();
      });
    });
  }

  /**
   * Get server instance
   */
  public getServer(): any {
    return this.server;
  }

  /**
   * Get WebSocket server instance
   */
  public getWebSocketServer(): WebSocketServer {
    return this.wss;
  }
}

// Handle process signals
process.on('SIGTERM', async () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
async function main() {
  try {
    const api = new ChargingWebSocketAPI();
    await api.start();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}

export { ChargingWebSocketAPI };
