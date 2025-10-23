/**
 * Centralized Configuration Management
 * Provides type-safe configuration for all services
 */

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  ssl?: boolean;
}

export interface RedisConfig {
  url: string;
  maxRetries?: number;
}

export interface ServiceConfig {
  port: number;
  name: string;
  environment: 'development' | 'production' | 'test';
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval?: number;
  healthCheckInterval?: number;
}

export interface ServiceDiscoveryConfig {
  enabled: boolean;
  registryUrl?: string;
  heartbeatInterval?: number;
}

export class Config {
  private static instance: Config;

  private constructor() {}

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key "${key}" is not defined`);
    }
    
    // Try to parse JSON values
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  getDatabase(): DatabaseConfig {
    return {
      url: this.get<string>('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/superapp'),
      maxConnections: this.get<number>('DB_MAX_CONNECTIONS', 10),
      ssl: this.get<boolean>('DB_SSL', false)
    };
  }

  getRedis(): RedisConfig {
    return {
      url: this.get<string>('REDIS_URL', 'redis://localhost:6379'),
      maxRetries: this.get<number>('REDIS_MAX_RETRIES', 3)
    };
  }

  getService(serviceName: string, defaultPort: number): ServiceConfig {
    return {
      port: this.get<number>('PORT', defaultPort),
      name: serviceName,
      environment: this.get<'development' | 'production' | 'test'>('NODE_ENV', 'development')
    };
  }

  getMonitoring(): MonitoringConfig {
    return {
      enabled: this.get<boolean>('MONITORING_ENABLED', true),
      metricsInterval: this.get<number>('METRICS_INTERVAL', 60000),
      healthCheckInterval: this.get<number>('HEALTH_CHECK_INTERVAL', 30000)
    };
  }

  getServiceDiscovery(): ServiceDiscoveryConfig {
    return {
      enabled: this.get<boolean>('SERVICE_DISCOVERY_ENABLED', false),
      registryUrl: this.get<string>('SERVICE_REGISTRY_URL', undefined),
      heartbeatInterval: this.get<number>('HEARTBEAT_INTERVAL', 30000)
    };
  }

  getJwtSecret(): string {
    return this.get<string>('JWT_SECRET', 'your-secret-key');
  }

  isProduction(): boolean {
    return this.get<string>('NODE_ENV', 'development') === 'production';
  }

  isDevelopment(): boolean {
    return this.get<string>('NODE_ENV', 'development') === 'development';
  }

  isTest(): boolean {
    return this.get<string>('NODE_ENV', 'development') === 'test';
  }
}

export const config = Config.getInstance();
