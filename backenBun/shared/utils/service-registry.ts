/**
 * Service Registry for Service Discovery
 * Enables services to discover and communicate with each other
 */

import { Logger } from './logger.js';
import { HttpClient } from './http-client.js';

export interface ServiceInfo {
  name: string;
  url: string;
  health: string;
  lastHeartbeat: Date;
  metadata?: Record<string, any>;
}

export interface ServiceRegistration {
  name: string;
  url: string;
  metadata?: Record<string, any>;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServiceInfo>;
  private logger: Logger;
  private heartbeatInterval?: NodeJS.Timeout;

  private constructor() {
    this.services = new Map();
    this.logger = new Logger('ServiceRegistry');
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  register(registration: ServiceRegistration): void {
    const serviceInfo: ServiceInfo = {
      name: registration.name,
      url: registration.url,
      health: 'unknown',
      lastHeartbeat: new Date(),
      metadata: registration.metadata
    };

    this.services.set(registration.name, serviceInfo);
    this.logger.info(`Service registered: ${registration.name} at ${registration.url}`);
  }

  unregister(serviceName: string): boolean {
    const result = this.services.delete(serviceName);
    if (result) {
      this.logger.info(`Service unregistered: ${serviceName}`);
    }
    return result;
  }

  getService(serviceName: string): ServiceInfo | undefined {
    return this.services.get(serviceName);
  }

  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  getHealthyServices(): ServiceInfo[] {
    return Array.from(this.services.values()).filter(
      service => service.health === 'healthy' || service.health === 'degraded'
    );
  }

  async updateServiceHealth(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    try {
      const client = new HttpClient(service.url);
      const response = await client.get<any>('/health');
      
      if (response.success) {
        service.health = 'healthy';
        service.lastHeartbeat = new Date();
      } else {
        service.health = 'unhealthy';
      }
    } catch (error) {
      service.health = 'unhealthy';
      this.logger.warn(`Health check failed for ${serviceName}`, error);
    }
  }

  startHealthChecks(intervalMs: number = 30000): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      const services = Array.from(this.services.keys());
      for (const serviceName of services) {
        await this.updateServiceHealth(serviceName);
      }
    }, intervalMs);

    this.logger.info(`Health checks started with interval: ${intervalMs}ms`);
  }

  stopHealthChecks(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
      this.logger.info('Health checks stopped');
    }
  }

  getServiceUrl(serviceName: string): string | undefined {
    // Try to get from registry first
    const service = this.services.get(serviceName);
    if (service && service.health === 'healthy') {
      return service.url;
    }

    // Fallback to environment variables
    const envKey = `${serviceName.toUpperCase().replace(/-/g, '_')}_URL`;
    return process.env[envKey];
  }

  async discoverService(serviceName: string): Promise<string | undefined> {
    // First, try local registry
    let url = this.getServiceUrl(serviceName);
    if (url) return url;

    // If service discovery is enabled, try to fetch from registry
    const registryUrl = process.env.SERVICE_REGISTRY_URL;
    if (registryUrl) {
      try {
        const client = new HttpClient(registryUrl);
        const response = await client.get<ServiceInfo>(`/services/${serviceName}`);
        if (response.success && response.data) {
          // Cache the discovered service
          this.register({
            name: serviceName,
            url: response.data.url,
            metadata: response.data.metadata
          });
          return response.data.url;
        }
      } catch (error) {
        this.logger.error(`Failed to discover service ${serviceName}`, error);
      }
    }

    return undefined;
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
