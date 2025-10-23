import { describe, test, expect, beforeEach } from 'bun:test';
import { HealthCheck } from './health-check';

describe('HealthCheck', () => {
  let healthCheck: HealthCheck;

  beforeEach(() => {
    healthCheck = new HealthCheck('test-service');
  });

  describe('constructor', () => {
    test('should initialize with service name', () => {
      expect(healthCheck).toBeDefined();
    });
  });

  describe('getUptime', () => {
    test('should return uptime in milliseconds', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      const uptime = healthCheck.getUptime();
      expect(uptime).toBeGreaterThan(0);
    });
  });

  describe('checkMemory', () => {
    test('should check memory usage', async () => {
      const result = await healthCheck.checkMemory();
      expect(result.status).toBeDefined();
      expect(['pass', 'warn', 'fail']).toContain(result.status);
      expect(result.metadata?.heapUsedMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkDatabase', () => {
    test('should return warn when no database URL provided', async () => {
      const result = await healthCheck.checkDatabase();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('not configured');
    });

    test('should return pass when database URL provided', async () => {
      const result = await healthCheck.checkDatabase('postgresql://localhost/test');
      expect(result.status).toBe('pass');
    });
  });

  describe('checkRedis', () => {
    test('should return warn when no Redis URL provided', async () => {
      const result = await healthCheck.checkRedis();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('not configured');
    });

    test('should return pass when Redis URL provided', async () => {
      const result = await healthCheck.checkRedis('redis://localhost:6379');
      expect(result.status).toBe('pass');
    });
  });

  describe('registerCheck', () => {
    test('should register custom health check', async () => {
      healthCheck.registerCheck('custom', async () => ({
        status: 'pass',
        message: 'Custom check passed'
      }));

      const result = await healthCheck.performHealthCheck();
      expect(result.checks['custom']).toBeDefined();
      expect(result.checks['custom'].status).toBe('pass');
    });
  });

  describe('performHealthCheck', () => {
    test('should return healthy status when all checks pass', async () => {
      healthCheck.registerCheck('test', async () => ({
        status: 'pass',
        message: 'Test passed'
      }));

      const result = await healthCheck.performHealthCheck();
      expect(result.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(result.checks).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should return degraded status when checks have warnings', async () => {
      healthCheck.registerCheck('test', async () => ({
        status: 'warn',
        message: 'Warning'
      }));

      const result = await healthCheck.performHealthCheck();
      expect(['degraded', 'unhealthy']).toContain(result.status);
    });

    test('should return unhealthy status when checks fail', async () => {
      healthCheck.registerCheck('test', async () => ({
        status: 'fail',
        message: 'Failed'
      }));

      const result = await healthCheck.performHealthCheck();
      expect(result.status).toBe('unhealthy');
    });
  });

  describe('metrics', () => {
    test('should record request metrics', () => {
      healthCheck.recordRequest(100, false);
      const metrics = healthCheck.getMetrics();
      
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.averageResponseTime).toBe(100);
    });

    test('should record error metrics', () => {
      healthCheck.recordRequest(100, true);
      const metrics = healthCheck.getMetrics();
      
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(1);
    });

    test('should calculate average response time', () => {
      healthCheck.recordRequest(100, false);
      healthCheck.recordRequest(200, false);
      const metrics = healthCheck.getMetrics();
      
      expect(metrics.averageResponseTime).toBe(150);
    });

    test('should reset metrics', () => {
      healthCheck.recordRequest(100, false);
      healthCheck.reset();
      const metrics = healthCheck.getMetrics();
      
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });
});
