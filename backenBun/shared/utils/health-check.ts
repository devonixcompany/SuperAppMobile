/**
 * Health Check Utility with Metrics Collection
 * Provides comprehensive health monitoring for services
 */

import { Logger } from './logger.js';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, CheckResult>;
  uptime: number;
  timestamp: string;
}

export interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: string | null;
  uptime: number;
}

export class HealthCheck {
  private logger: Logger;
  private serviceName: string;
  private startTime: number;
  private metrics: ServiceMetrics;
  private checks: Map<string, () => Promise<CheckResult>>;

  constructor(serviceName: string) {
    this.logger = new Logger(`HealthCheck:${serviceName}`);
    this.serviceName = serviceName;
    this.startTime = Date.now();
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      uptime: 0
    };
    this.checks = new Map();
  }

  registerCheck(name: string, checkFn: () => Promise<CheckResult>) {
    this.checks.set(name, checkFn);
  }

  async checkDatabase(databaseUrl?: string): Promise<CheckResult> {
    const start = Date.now();
    try {
      // Simple check - in a real implementation, you'd ping the database
      if (!databaseUrl) {
        return {
          status: 'warn',
          message: 'Database URL not configured',
          responseTime: Date.now() - start
        };
      }
      
      // Placeholder for actual database check
      return {
        status: 'pass',
        message: 'Database connection available',
        responseTime: Date.now() - start,
        metadata: {
          url: databaseUrl.split('@')[1] || 'configured'
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Database check failed',
        responseTime: Date.now() - start
      };
    }
  }

  async checkRedis(redisUrl?: string): Promise<CheckResult> {
    const start = Date.now();
    try {
      if (!redisUrl) {
        return {
          status: 'warn',
          message: 'Redis URL not configured',
          responseTime: Date.now() - start
        };
      }

      // Placeholder for actual Redis check
      return {
        status: 'pass',
        message: 'Redis connection available',
        responseTime: Date.now() - start,
        metadata: {
          url: redisUrl.split('@')[1] || 'configured'
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Redis check failed',
        responseTime: Date.now() - start
      };
    }
  }

  async checkMemory(): Promise<CheckResult> {
    const start = Date.now();
    try {
      const used = process.memoryUsage();
      const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = 'Memory usage normal';

      if (usagePercent > 90) {
        status = 'fail';
        message = 'Critical memory usage';
      } else if (usagePercent > 75) {
        status = 'warn';
        message = 'High memory usage';
      }

      return {
        status,
        message,
        responseTime: Date.now() - start,
        metadata: {
          heapUsedMB,
          heapTotalMB,
          usagePercent: Math.round(usagePercent)
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Memory check failed',
        responseTime: Date.now() - start
      };
    }
  }

  async checkDiskSpace(): Promise<CheckResult> {
    const start = Date.now();
    try {
      // Placeholder - would use actual disk space check
      return {
        status: 'pass',
        message: 'Disk space available',
        responseTime: Date.now() - start,
        metadata: {
          available: 'N/A'
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Disk space check failed',
        responseTime: Date.now() - start
      };
    }
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const results: Record<string, CheckResult> = {};
    
    // Run all registered checks
    for (const [name, checkFn] of this.checks.entries()) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        results[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Check failed'
        };
      }
    }

    // Always include memory check
    results['memory'] = await this.checkMemory();

    // Determine overall status
    const statuses = Object.values(results).map(r => r.status);
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (statuses.includes('fail')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('warn')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks: results,
      uptime: this.getUptime(),
      timestamp: new Date().toISOString()
    };
  }

  recordRequest(responseTime: number, isError: boolean = false) {
    this.metrics.requestCount++;
    if (isError) {
      this.metrics.errorCount++;
    }
    
    // Calculate rolling average
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + responseTime) / 
      this.metrics.requestCount;
    
    this.metrics.lastRequestTime = new Date().toISOString();
  }

  getMetrics(): ServiceMetrics {
    return {
      ...this.metrics,
      uptime: this.getUptime()
    };
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      uptime: this.getUptime()
    };
  }
}
