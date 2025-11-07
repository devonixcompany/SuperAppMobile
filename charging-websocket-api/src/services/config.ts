import dotenv from 'dotenv';
import { WebSocketConfig } from '@/types';

// Load environment variables
dotenv.config();

export class ConfigService {
  private static instance: ConfigService;
  private config: WebSocketConfig;

  private constructor() {
    this.config = {
      port: parseInt(process.env.WS_API_PORT || '8082'),
      host: process.env.WS_API_HOST || 'localhost',
      gatewayUrl: process.env.WS_GATEWAY_URL || 'ws://localhost:8081',
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'), // 30 seconds
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000') // 1 hour
    };

    this.validateConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  public getGatewayUrl(): string {
    return this.config.gatewayUrl;
  }

  public getJwtSecret(): string {
    return this.config.jwtSecret;
  }

  public getHeartbeatInterval(): number {
    return this.config.heartbeatInterval;
  }

  public getSessionTimeout(): number {
    return this.config.sessionTimeout;
  }

  private validateConfig(): void {
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ Configuration loaded successfully');
    console.log(`🔧 WebSocket API will run on ${this.config.host}:${this.config.port}`);
    console.log(`🌐 Gateway URL: ${this.config.gatewayUrl}`);
    console.log(`💓 Heartbeat interval: ${this.config.heartbeatInterval}ms`);
    console.log(`⏰ Session timeout: ${this.config.sessionTimeout}ms`);
  }
}

export const config = ConfigService.getInstance();
