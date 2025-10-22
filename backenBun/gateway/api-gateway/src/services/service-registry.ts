import { Logger } from '../../../shared/utils/logger.js';
import { HttpClient } from '../../../shared/utils/http-client.js';
import type { ServiceRegistration, ServiceHealth } from '../../../shared/types/index.js';

export class ServiceRegistry {
  private services: Map<string, ServiceRegistration> = new Map();
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  private logger: Logger;
  private httpClient: HttpClient;

  constructor() {
    this.logger = new Logger('ServiceRegistry');
    this.httpClient = new HttpClient('http://consul:8500');
  }

  async registerService(service: ServiceRegistration): Promise<void> {
    try {
      this.services.set(service.name, service);

      // Register with Consul
      await this.httpClient.put(`/v1/agent/service/register`, {
        ID: service.name,
        Name: service.name,
        Address: service.url.replace('http://', ''),
        Port: service.port,
        Check: {
          HTTP: service.healthCheck,
          Interval: '10s'
        },
        Tags: service.tags
      });

      this.logger.info(`Service registered: ${service.name}`, service);

      // Start health check
      this.startHealthCheck(service);
    } catch (error) {
      this.logger.error(`Failed to register service: ${service.name}`, error);
      throw error;
    }
  }

  async discoverService(serviceName: string): Promise<ServiceRegistration | null> {
    try {
      // Check local cache first
      if (this.services.has(serviceName)) {
        return this.services.get(serviceName)!;
      }

      // Query Consul
      const response = await this.httpClient.get<any[]>(`/v1/catalog/service/${serviceName}`);

      if (response.success && response.data && response.data.length > 0) {
        const service = response.data[0];
        const registration: ServiceRegistration = {
          name: serviceName,
          url: `http://${service.Address}`,
          port: service.ServicePort,
          healthCheck: `http://${service.Address}:${service.ServicePort}/health`,
          tags: service.ServiceTags || []
        };

        this.services.set(serviceName, registration);
        this.startHealthCheck(registration);

        return registration;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to discover service: ${serviceName}`, error);
      return null;
    }
  }

  getServiceUrl(serviceName: string): string | null {
    const service = this.services.get(serviceName);
    return service ? `${service.url}:${service.port}` : null;
  }

  private startHealthCheck(service: ServiceRegistration): void {
    // Clear existing health check
    if (this.healthChecks.has(service.name)) {
      clearInterval(this.healthChecks.get(service.name)!);
    }

    // Start new health check
    const interval = setInterval(async () => {
      try {
        const response = await fetch(service.healthCheck);
        if (!response.ok) {
          this.logger.warn(`Service unhealthy: ${service.name}`);
        }
      } catch (error) {
        this.logger.warn(`Health check failed for service: ${service.name}`, error);
      }
    }, 30000); // Check every 30 seconds

    this.healthChecks.set(service.name, interval);
  }

  async getAllServices(): Promise<string[]> {
    return Array.from(this.services.keys());
  }

  async deregisterService(serviceName: string): Promise<void> {
    try {
      this.services.delete(serviceName);

      // Stop health check
      if (this.healthChecks.has(serviceName)) {
        clearInterval(this.healthChecks.get(serviceName)!);
        this.healthChecks.delete(serviceName);
      }

      // Deregister from Consul
      await this.httpClient.put(`/v1/agent/service/deregister/${serviceName}`);

      this.logger.info(`Service deregistered: ${serviceName}`);
    } catch (error) {
      this.logger.error(`Failed to deregister service: ${serviceName}`, error);
    }
  }
}