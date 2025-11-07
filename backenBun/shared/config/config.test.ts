import { describe, test, expect } from 'bun:test';
import { Config } from '../config/index';

describe('Config', () => {
  const config = Config.getInstance();

  describe('getInstance', () => {
    test('should return singleton instance', () => {
      const instance1 = Config.getInstance();
      const instance2 = Config.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('get', () => {
    test('should return default value when env var is not set', () => {
      const value = config.get('NON_EXISTENT_VAR', 'default');
      expect(value).toBe('default');
    });

    test('should throw error when env var is not set and no default', () => {
      expect(() => config.get('NON_EXISTENT_VAR_NO_DEFAULT')).toThrow();
    });
  });

  describe('getDatabase', () => {
    test('should return database config with defaults', () => {
      const dbConfig = config.getDatabase();
      expect(dbConfig.url).toBeDefined();
      expect(typeof dbConfig.maxConnections).toBe('number');
      expect(typeof dbConfig.ssl).toBe('boolean');
    });
  });

  describe('getRedis', () => {
    test('should return redis config with defaults', () => {
      const redisConfig = config.getRedis();
      expect(redisConfig.url).toBeDefined();
      expect(typeof redisConfig.maxRetries).toBe('number');
    });
  });

  describe('getService', () => {
    test('should return service config', () => {
      const serviceConfig = config.getService('test-service', 3000);
      expect(serviceConfig.name).toBe('test-service');
      expect(serviceConfig.port).toBe(3000);
      expect(serviceConfig.environment).toBeDefined();
    });
  });

  describe('getMonitoring', () => {
    test('should return monitoring config with defaults', () => {
      const monitoringConfig = config.getMonitoring();
      expect(typeof monitoringConfig.enabled).toBe('boolean');
      expect(typeof monitoringConfig.metricsInterval).toBe('number');
    });
  });

  describe('environment checks', () => {
    test('isDevelopment should return boolean', () => {
      expect(typeof config.isDevelopment()).toBe('boolean');
    });

    test('isProduction should return boolean', () => {
      expect(typeof config.isProduction()).toBe('boolean');
    });

    test('isTest should return boolean', () => {
      expect(typeof config.isTest()).toBe('boolean');
    });
  });
});
