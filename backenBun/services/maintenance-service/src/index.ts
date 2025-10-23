import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';
import cron from 'node-cron';
import moment from 'moment';

const logger = new Logger('MaintenanceService');

// In-memory storage for maintenance data (use database in production)
const maintenanceSchedules = new Map();
const maintenanceLogs = new Map();
const stationStatus = new Map();
const alerts = new Map();

interface MaintenanceSchedule {
  id: string;
  title: string;
  description: string;
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'onetime';
  schedule: string; // cron expression
  stationId?: string;
  connectorId?: number;
  priority: 'LOW' | 'MEDIUM' 'HIGH' | 'CRITICAL';
  isActive: boolean;
  lastRun?: string;
      nextRun?: string;
      createdAt: string;
      updatedAt: string;
}

interface MaintenanceLog {
  id: string;
  scheduleId?: string;
  stationId?: string;
  connectorId?: number;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  title: string;
  description: string;
  performedBy?: string;
      duration?: number;
      status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
      performedAt?: string;
      metadata?: any;
      createdAt: string;
      updatedAt: string;
}

interface StationStatus {
  stationId: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
  lastHeartbeat?: string;
  uptime?: number;
      errorRate?: number;
      connectorStatuses?: {
        [key: number]: string;
        lastHeartbeat?: string;
      };
      createdAt: string;
      updatedAt: string;
}

interface Alert {
  id: string;
  type: 'HARDWARE_FAILURE' | 'SOFTWARE_ERROR' | 'SECURITY' | 'PERFORMANCE' | 'MAINTENANCE_DUE';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  stationId?: string;
  connectorId?: number;
  title: string;
  message: string;
  details?: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Maintenance Service is healthy',
      timestamp: new Date(),
      service: 'maintenance-service',
      statistics: {
        totalSchedules: maintenanceSchedules.size,
        activeSchedules: Array.from(maintenanceSchedules.values()).filter(s => s.isActive).length,
        totalLogs: maintenanceLogs.size,
        openAlerts: Array.from(alerts.values()).filter(a => !a.resolved).length,
        onlineStations: Array.from(stationStatus.values()).filter(s => s.status === 'ONLINE').length
      }
    };
  })
  .group('/schedules', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { isActive, priority, stationId, limit = 100, offset = 0 } = query as any;

          let filteredSchedules = Array.from(maintenanceSchedules.values());

          if (isActive !== undefined) {
            filteredSchedules = filteredSchedules.filter(s => s.isActive === (isActive === 'true'));
          }

          if (priority) {
            filteredSchedules = filteredSchedules.filter(s => s.priority === priority);
          }

          if (stationId) {
            filteredSchedules = filteredSchedules.filter(s => !s.stationId || s.stationId === stationId);
          }

          // Apply pagination
          const paginatedSchedules = filteredSchedules.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
          );

          return {
            success: true,
            data: {
              schedules: paginatedSchedules,
              total: filteredSchedules.length,
              limit: parseInt(limit),
              offset: parseInt(offset)
            },
            message: 'Maintenance schedules retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get maintenance schedules', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get maintenance schedules',
            timestamp: new Date()
          };
        }
      })
      .get('/:id', ({ params }) => {
        try {
          const schedule = maintenanceSchedules.get(params.id);
          if (!schedule) {
            return {
              success: false,
              error: 'Maintenance schedule not found',
              timestamp: new Date()
            };
          }

          return {
            success: true,
            data: schedule,
            message: 'Maintenance schedule retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get maintenance schedule', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get maintenance schedule',
            timestamp: new Date()
          };
        }
      })
      .post('/', ({ body }) => {
        try {
          const {
            title,
            description,
            scheduleType = 'weekly',
            schedule = '0 2 * * * 0', // Every Sunday at 2 AM
            stationId,
            connectorId,
            priority = 'MEDIUM',
            properties
          } = body as any;

          if (!title || !description) {
            return {
              success: false,
              error: 'Missing required fields: title, description',
              timestamp: new Date()
            };
          }

          // Validate cron expression
          try {
            // This is a simple validation - in production, use proper cron validation
            new Date(schedule);
          } catch (error) {
            return {
              success: false,
              error: 'Invalid cron expression',
              message: 'Failed to validate cron schedule',
              timestamp: new Date()
            };
          }

          const schedule: MaintenanceSchedule = {
            id: `MAINT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title,
            description,
            scheduleType,
            schedule,
            stationId,
            connectorId,
            priority,
            properties: properties || {},
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Calculate next run time
          schedule.nextRun = calculateNextRun(schedule);

          maintenanceSchedules.set(schedule.id, schedule);

          logger.info('Maintenance schedule created', {
            scheduleId: schedule.id,
            title,
            scheduleType,
            stationId
          });

          return {
            success: true,
            data: schedule,
            message: 'Maintenance schedule created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create maintenance schedule', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create maintenance schedule',
            timestamp: new Date()
          };
        }
      })
      .put('/:id', ({ params, body }) => {
        try {
          const schedule = maintenanceSchedules.get(params.id);
          if (!schedule) {
            return {
              success: false,
              error: 'Maintenance schedule not found',
              timestamp: new Date()
            };
          }

          const updates = body as any;
          const updatedSchedule = {
            ...schedule,
            ...updates,
            updatedAt: new Date().toISOString()
          };

          // Recalculate next run time if schedule changed
          if (updates.schedule || updates.stationId) {
            updatedSchedule.nextRun = calculateNextRun(updatedSchedule);
          }

          maintenanceSchedules.set(params.id, updatedSchedule);

          logger.info('Maintenance schedule updated', { scheduleId: params.id });

          return {
            success: true,
            data: updatedSchedule,
            message: 'Maintenance schedule updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update maintenance schedule', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update maintenance schedule',
            timestamp: new Date()
          };
        }
      })
      .delete('/:id', ({ params }) => {
        try {
          const schedule = maintenanceSchedules.get(params.id);
          if (!schedule) {
            return {
              success: false,
              error: 'Maintenance schedule not found',
              timestamp: new Date()
            };
          }

          // Soft delete
          const deletedSchedule = {
            ...schedule,
            isActive: false,
            updatedAt: new Date().toISOString()
          };

          maintenanceSchedules.set(params.id, deletedSchedule);

          logger.info('Maintenance schedule deactivated', { scheduleId: params.id });

          return {
            success: true,
            data: deletedSchedule,
            message: 'Maintenance schedule deactivated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to delete maintenance schedule', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to delete maintenance schedule',
            timestamp: new Date()
          };
        }
      })
      .post('/:id/execute', ({ params }) => {
        try {
          const schedule = maintenanceSchedules.get(params.id);
          if (!schedule || !schedule.isActive) {
            return {
              success: false,
              error: 'Schedule not found or inactive',
              timestamp: new Date()
            };
          }

          // Create maintenance log
          const log: MaintenanceLog = {
            id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            scheduleId: schedule.id,
            stationId: schedule.stationId,
            connectorId: schedule.connectorId,
            type: 'CORRECTIVE',
            title: schedule.title,
            description: `Executing maintenance: ${schedule.description}`,
            status: 'IN_PROGRESS',
            performedBy: 'SYSTEM',
            duration: 0,
            status: 'COMPLETED',
            performedAt: new Date().toISOString(),
            metadata: schedule.properties,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          maintenanceLogs.set(log.id, log);

          // Update last run time
          const updatedSchedule = {
            ...schedule,
            lastRun: new Date().toISOString(),
            nextRun: calculateNextRun(schedule)
          };

          maintenanceSchedules.set(schedule.id, updatedSchedule);

          logger.info('Maintenance executed', {
            scheduleId: params.id,
            title: schedule.title
          });

          return {
            success: true,
            data: {
              log,
              schedule: updatedSchedule
            },
            message: 'Maintenance executed successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to execute maintenance', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to execute maintenance',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/logs', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { limit = 100, offset = 0, stationId, type, status, startDate, endDate } = query as any;

          let filteredLogs = Array.from(maintenanceLogs.values());

          if (stationId) {
            filteredLogs = filteredLogs.filter(log => !log.stationId || log.stationId === stationId);
          }

          if (type) {
            filteredLogs = filteredLogs.filter(log => log.type === type);
          }

          if (status) {
            filteredLogs = filteredLogs.filter(log => log.status === status);
          }

          if (startDate) {
            const start = new Date(startDate);
            filteredLogs = filteredLogs.filter(log => new Date(log.performedAt) >= start);
          }

          if (endDate) {
            const end = new Date(endDate);
            filteredLogs = filteredLogs.filter(log => new Date(log.performedAt) <= end);
          }

          // Apply pagination
          const paginatedLogs = filteredLogs.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
          );

          return {
            success: true,
            data: {
              logs: paginatedLogs,
              total: filteredLogs.length,
              limit: parseInt(limit),
              offset: parseInt(offset)
            },
            message: 'Maintenance logs retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get maintenance logs', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get maintenance logs',
            timestamp: new Date()
          };
        }
      })
      .post('/', ({ body }) => {
        try {
          const {
            logType = 'CORRECTIVE',
            title,
            description,
            stationId,
            connectorId,
            performedBy,
            duration,
            metadata
          } = body as any;

          const log: MaintenanceLog = {
            id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            logType,
            stationId,
            connectorId,
            type: logType || 'CORRECTIVE',
            title,
            description: description,
            status: 'COMPLETED',
            performedBy: performedBy || 'UNKNOWN',
            duration: duration || 0,
            status: 'COMPLETED',
            performedAt: new Date().toISOString(),
            metadata: metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          maintenanceLogs.set(log.id, log);

          logger.info('Maintenance log created', { logId: log.id, title });

          return {
            success: true,
            data: log,
            message: 'Maintenance log created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create maintenance log', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create maintenance log',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/station-status', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { status } = query as any;

          let filteredStatus = Array.from(stationStatus.values());

          if (status) {
            filteredStatus = filteredStatus.filter(s => s.status === status);
          }

          return {
            success: true,
            data: filteredStatus,
            message: 'Station status retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get station status', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get station status',
            timestamp: new Date()
          };
        }
      })
      .post('/heartbeat/:stationId', ({ params }) => {
        try {
          const stationId = params.stationId;

          let station = stationStatus.get(stationId);
          const now = new Date();

          if (!station) {
            // Create station status record
            station = {
              stationId,
              status: 'ONLINE',
              lastHeartbeat: now.toISOString(),
              uptime: 0,
              errorRate: 0,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            };
            stationStatus.set(stationId, station);
          } else {
            // Update heartbeat
            const uptime = station.uptime || 0;
            station = {
              ...station,
              lastHeartbeat: now.toISOString(),
              uptime: uptime + 1,
              updatedAt: now.toISOString()
            };
            stationStatus.set(stationId, station);
          }

          logger.debug('Heartbeat received', { stationId, status: station.status });

          return {
            success: true,
            data: station,
            message: 'Heartbeat received successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to process heartbeat', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to process heartbeat',
            timestamp: new Date()
          };
        }
      })
      .put('/:stationId/status', ({ params, body }) => {
        try {
          const stationId = params.stationId;
          const { status } = body as any;

          if (!stationId || !status) {
            return {
              success: false,
              error: 'Missing required fields: stationId, status',
              timestamp: new Date()
            };
          }

          const station = stationStatus.get(stationId);
          if (!station) {
            return {
              success: false,
              error: 'Station not found',
              timestamp: new Date()
            };
          }

          const validStatuses = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR'];

          if (!validStatuses.includes(status)) {
            return {
              success: false,
              error: 'Invalid status. Valid options: ' + validStatuses.join(', '),
              timestamp: new Date()
            };
          }

          const updatedStation = {
            ...station,
            status,
            updatedAt: new Date().toISOString()
          };

          stationStatus.set(stationId, updatedStation);

          logger.info('Station status updated', { stationId, newStatus: status });

          return {
            success: true,
            data: updatedStation,
            message: 'Station status updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update station status', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update station status',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/alerts', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { severity, stationId, acknowledged, limit = 100, offset = 0 } = query as any;

          let filteredAlerts = Array.from(alerts.values());

          if (severity) {
            filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
          }

          if (stationId) {
            filteredAlerts = filteredAlerts.filter(a => !a.stationId || a.stationId === stationId);
          }

          if (acknowledged !== undefined) {
            filteredAlerts = filteredAlerts.filter(a => a.acknowledged === (acknowledged === 'true'));
          }

          // Apply pagination
          const paginatedAlerts = filteredAlerts.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
          );

          return {
            success: true,
            data: {
              alerts: paginatedAlerts,
              total: filteredAlerts.length,
              limit: parseInt(limit),
              offset: parseInt(offset)
            },
            message: 'Alerts retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get alerts', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get alerts',
            timestamp: new Date()
          };
        }
      })
      .post('/', ({ body }) => {
        try {
          const {
            type,
            severity = 'INFO',
            stationId,
            connectorId,
            title,
            message,
            details
          } = body as any;

          const alert: Alert = {
            id: `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            severity,
            stationId,
            connectorId,
            title,
            message,
            details: details || {},
            acknowledged: false,
            resolved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          alerts.set(alert.id, alert);

          logger.warn('Alert created', {
            alertId: alert.id,
            type,
            severity,
            stationId,
            title
          });

          return {
            success: true,
            data: alert,
            message: 'Alert created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create alert', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create alert',
            timestamp: new Date()
          };
        }
      })
      .put('/:id/acknowledge', ({ params, body }) => {
        try {
          const alert = alerts.get(params.id);
          if (!alert) {
            return {
              success: false,
              error: 'Alert not found',
              timestamp: new Date()
            };
          }

          const { acknowledgedBy } = body as any;

          const updatedAlert = {
            ...alert,
            acknowledged: true,
            acknowledgedBy,
            acknowledgedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          alerts.set(params.id, updatedAlert);

          logger.info('Alert acknowledged', {
            alertId: params.id,
            acknowledgedBy
          });

          return {
            success: true,
            data: updatedAlert,
            message: 'Alert acknowledged successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to acknowledge alert', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to acknowledge alert',
            timestamp: new Date()
          };
        }
      })
      .put('/:id/resolve', ({ params, body }) => {
        try {
          const alert = alerts.get(params.id);
          if (!alert) {
            return {
              success: false,
              error: 'Alert not found',
              timestamp: new Date()
            };
          }

          const { resolvedBy, resolution } = body as any;

          const updatedAlert = {
            ...alert,
            resolved: true,
            resolvedBy,
            resolvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          alerts.set(params.id, updatedAlert);

          logger.info('Alert resolved', {
            alertId: params.id,
            resolvedBy
          });

          return {
            success: true,
            data: updatedAlert,
            message: 'Alert resolved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to resolve alert', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to resolve alert',
            timestamp: new Date()
          };
        }
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3010);

// Helper function to calculate next run time for maintenance schedule
function calculateNextRun(schedule: MaintenanceSchedule): string {
  try {
    const cron = require('node-cron');
    const job = cron.schedule(schedule.schedule, {
      scheduled: true,
      timezone: 'Asia/Bangkok'
    });

    const next = job.nextDate();
    return next.toISOString();
  } catch (error) {
      // Fallback to simple calculation
      const now = new Date();
      let next = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours

      if (schedule.scheduleType === 'daily') {
        next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (schedule.scheduleType === 'weekly') {
        next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate() + 7);
      } else if (schedule.scheduleType === 'monthly') {
        next = new Date(now.getFullYear(), now.getMonth() + 1);
      } else if (schedule.scheduleType === 'yearly') {
        next = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      }

      return next.toISOString();
    }
  } catch (error) {
      logger.error('Failed to calculate next run time', error);
      return new Date(Date.now().toISOString());
    }
  }
}

// Schedule maintenance status checks
cron.schedule('*/5 * * * *', () => {
  try {
    logger.info('Running station status check...');

    // Check if stations are offline and create alerts
    Array.from(stationStatus.values()).forEach(station => {
      const lastHeartbeat = station.lastHeartbeat ? new Date(station.lastHeartbeat) : null;
      const timeSinceHeartbeat = lastHeartbeat ? Date.now() - lastHeartbeat.getTime() : 0;

      // Mark station as offline if no heartbeat for 5 minutes
      if (timeSinceHeartbeat > 5 * 60 * 1000) {
        if (station.status !== 'OFFLINE') {
          const alert: Alert = {
            id: `ALERT_OFFLINE_${station.stationId}`,
            type: 'HARDWARE_FAILURE',
            severity: 'HIGH',
            stationId: station.stationId,
            title: 'Station Offline',
            message: `Station ${station.stationId} is not responding`,
            details: {
              lastSeen: station.lastHeartbeat
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          alerts.set(alert.id, alert);

          // Update station status
          const offlineStation = {
            ...station,
            status: 'OFFLINE',
            updatedAt: new Date().toISOString()
          };

          stationStatus.set(station.stationId, offlineStation);
          logger.warn(`Station ${station.stationId} marked as offline`);
        }
      }
    });
  } catch (error) {
    logger.error('Failed to run station status check', error);
  }
});

// Clean up old maintenance logs (daily at midnight)
cron.schedule('0 0 * * * *', () => {
  try {
    const cutoffTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    let cleanedCount = 0;

    for (const [id, log] of maintenanceLogs.entries()) {
      if (new Date(log.performedAt) < cutoffTime) {
        maintenanceLogs.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old maintenance logs`);
    }
  } catch (error) {
    logger.error('Failed to clean up maintenance logs', error);
  }
});

console.log('🔧 Maintenance Service is running on port 3010');
console.log('🔧 Health check: http://localhost:3010/health');
console.log('📅 Maintenance Schedules API: http://localhost:3010/schedules');
console.log('📊 Maintenance Logs API: http://localhost:3010/logs');
console.log('🏠 Station Status API: http://localhost:3010/station-status');
console.log('🚨 Alerts API: http://localhost:3010/alerts');
console.log('🔍 Search API: http://localhost:3010/search');