import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import cron from 'node-cron';

// Simple logger for now
class SimpleLogger {
  constructor(private serviceName: string) {}

  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }

  error(message: string, error?: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: this.serviceName,
      message,
      ...(error && { error })
    }));
  }

  warn(message: string, meta?: any) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }
}

const logger = new SimpleLogger('AnalyticsService');

// In-memory storage for analytics data (use proper database in production)
const chargingEvents = new Map();
const userActivities = new Map();
const stationMetrics = new Map();
const paymentEvents = new Map();
const aggregatedMetrics = new Map();

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Analytics Service is healthy',
      timestamp: new Date(),
      service: 'analytics-service'
    };
  })

  // Event Tracking
  .group('/events', (app) =>
    app
      .post('/charging', ({ body }) => {
        try {
          const {
            userId,
            stationId,
            sessionId,
            eventType, // started, stopped, completed
            timestamp,
            metadata
          } = body as any;

          const event = {
            id: `${sessionId}_${eventType}_${Date.now()}`,
            userId,
            stationId,
            sessionId,
            eventType,
            timestamp: timestamp || new Date().toISOString(),
            metadata: metadata || {}
          };

          chargingEvents.set(event.id, event);

          logger.info('Charging event tracked', {
            eventType,
            userId,
            stationId,
            sessionId
          });

          return {
            success: true,
            data: event,
            message: 'Charging event tracked successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to track charging event', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to track charging event',
            timestamp: new Date()
          };
        }
      })

      .post('/user-activity', ({ body }) => {
        try {
          const {
            userId,
            activity, // app_open, charging_start, payment, station_search, etc.
            timestamp,
            metadata
          } = body as any;

          const event = {
            id: `user_${userId}_${activity}_${Date.now()}`,
            userId,
            activity,
            timestamp: timestamp || new Date().toISOString(),
            metadata: metadata || {}
          };

          userActivities.set(event.id, event);

          logger.info('User activity tracked', {
            userId,
            activity
          });

          return {
            success: true,
            data: event,
            message: 'User activity tracked successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to track user activity', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to track user activity',
            timestamp: new Date()
          };
        }
      })

      .post('/station-metrics', ({ body }) => {
        try {
          const {
            stationId,
            connectorId,
            metrics, // uptime, usage_time, energy_delivered, etc.
            timestamp,
            metadata
          } = body as any;

          const event = {
            id: `station_${stationId}_${connectorId}_${Date.now()}`,
            stationId,
            connectorId,
            metrics,
            timestamp: timestamp || new Date().toISOString(),
            metadata: metadata || {}
          };

          stationMetrics.set(event.id, event);

          logger.info('Station metrics tracked', {
            stationId,
            connectorId
          });

          return {
            success: true,
            data: event,
            message: 'Station metrics tracked successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to track station metrics', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to track station metrics',
            timestamp: new Date()
          };
        }
      })

      .post('/payment', ({ body }) => {
        try {
          const {
            userId,
            sessionId,
            paymentId,
            amount,
            currency,
            paymentMethod,
            status, // initiated, completed, failed, refunded
            timestamp,
            metadata
          } = body as any;

          const event = {
            id: `payment_${paymentId}_${Date.now()}`,
            userId,
            sessionId,
            paymentId,
            amount,
            currency,
            paymentMethod,
            status,
            timestamp: timestamp || new Date().toISOString(),
            metadata: metadata || {}
          };

          paymentEvents.set(event.id, event);

          logger.info('Payment event tracked', {
            paymentId,
            userId,
            amount,
            status
          });

          return {
            success: true,
            data: event,
            message: 'Payment event tracked successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to track payment event', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to track payment event',
            timestamp: new Date()
          };
        }
      })
  )

  // Analytics Dashboard Data
  .group('/dashboard', (app) =>
    app
      .get('/overview', ({ query }) => {
        try {
          const { period = '24h' } = query as { period: string };

          const now = new Date();
          let startTime: Date;

          switch (period) {
            case '1h':
              startTime = new Date(now.getTime() - 60 * 60 * 1000);
              break;
            case '24h':
              startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '7d':
              startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '30d':
              startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            default:
              startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }

          // Filter events by period
          const recentChargingEvents = Array.from(chargingEvents.values())
            .filter(event => new Date(event.timestamp) >= startTime);

          const recentPaymentEvents = Array.from(paymentEvents.values())
            .filter(event => new Date(event.timestamp) >= startTime);

          const recentUserActivities = Array.from(userActivities.values())
            .filter(event => new Date(event.timestamp) >= startTime);

          // Calculate metrics
          const totalSessions = recentChargingEvents.filter(e => e.eventType === 'started').length;
          const completedSessions = recentChargingEvents.filter(e => e.eventType === 'completed').length;
          const totalRevenue = recentPaymentEvents
            .filter(e => e.status === 'completed')
            .reduce((sum, e) => sum + e.amount, 0);
          const activeUsers = new Set(recentUserActivities.map(e => e.userId)).size;
          const successfulPayments = recentPaymentEvents.filter(e => e.status === 'completed').length;
          const failedPayments = recentPaymentEvents.filter(e => e.status === 'failed').length;

          const overview = {
            period,
            startTime: startTime.toISOString(),
            endTime: now.toISOString(),
            metrics: {
              totalSessions,
              completedSessions,
              completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
              totalRevenue,
              averageSessionValue: completedSessions > 0 ? totalRevenue / completedSessions : 0,
              activeUsers,
              successfulPayments,
              failedPayments,
              paymentSuccessRate: (successfulPayments + failedPayments) > 0
                ? (successfulPayments / (successfulPayments + failedPayments)) * 100
                : 0
            }
          };

          return {
            success: true,
            data: overview,
            message: 'Dashboard overview retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get dashboard overview', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get dashboard overview',
            timestamp: new Date()
          };
        }
      })

      .get('/stations', ({ query }) => {
        try {
          const { period = '24h' } = query as { period: string };

          const now = new Date();
          let startTime: Date;

          switch (period) {
            case '1h':
              startTime = new Date(now.getTime() - 60 * 60 * 1000);
              break;
            case '24h':
              startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '7d':
              startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '30d':
              startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            default:
              startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }

          // Filter metrics by period
          const recentMetrics = Array.from(stationMetrics.values())
            .filter(event => new Date(event.timestamp) >= startTime);

          // Group by station
          const stationStats = new Map();

          recentMetrics.forEach(event => {
            const stationId = event.stationId;
            if (!stationStats.has(stationId)) {
              stationStats.set(stationId, {
                stationId,
                totalSessions: 0,
                totalEnergyDelivered: 0,
                totalUptime: 0,
                connectorStats: new Map()
              });
            }

            const stats = stationStats.get(stationId);
            const metrics = event.metrics;

            // Update station stats
            stats.totalSessions += metrics.sessions || 0;
            stats.totalEnergyDelivered += metrics.energy_delivered || 0;
            stats.totalUptime += metrics.uptime || 0;

            // Update connector stats
            const connectorId = event.connectorId;
            if (!stats.connectorStats.has(connectorId)) {
              stats.connectorStats.set(connectorId, {
                connectorId,
                usageTime: 0,
                energyDelivered: 0,
                sessions: 0
              });
            }

            const connectorStats = stats.connectorStats.get(connectorId);
            connectorStats.usageTime += metrics.usage_time || 0;
            connectorStats.energyDelivered += metrics.energy_delivered || 0;
            connectorStats.sessions += metrics.sessions || 0;
          });

          // Convert to array and format
          const stationsData = Array.from(stationStats.values()).map(station => ({
            ...station,
            connectorStats: Array.from(station.connectorStats.values()),
            averageSessionEnergy: station.totalSessions > 0
              ? station.totalEnergyDelivered / station.totalSessions
              : 0
          }));

          return {
            success: true,
            data: {
              period,
              stations: stationsData
            },
            message: 'Station analytics retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get station analytics', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get station analytics',
            timestamp: new Date()
          };
        }
      })

      .get('/users', ({ query }) => {
        try {
          const { period = '24h' } = query as { period: string };

          const now = new Date();
          let startTime: Date;

          switch (period) {
            case '1h':
              startTime = new Date(now.getTime() - 60 * 60 * 1000);
              break;
            case '24h':
              startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '7d':
              startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '30d':
              startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            default:
              startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }

          // Filter activities by period
          const recentActivities = Array.from(userActivities.values())
            .filter(event => new Date(event.timestamp) >= startTime);

          const recentChargingEvents = Array.from(chargingEvents.values())
            .filter(event => new Date(event.timestamp) >= startTime);

          const recentPayments = Array.from(paymentEvents.values())
            .filter(event => new Date(event.timestamp) >= startTime);

          // Group by user
          const userStats = new Map();

          recentActivities.forEach(activity => {
            const userId = activity.userId;
            if (!userStats.has(userId)) {
              userStats.set(userId, {
                userId,
                totalActivities: 0,
                activities: new Map()
              });
            }

            const stats = userStats.get(userId);
            stats.totalActivities++;

            const activityType = activity.activity;
            if (!stats.activities.has(activityType)) {
              stats.activities.set(activityType, 0);
            }
            stats.activities.set(activityType, stats.activities.get(activityType) + 1);
          });

          // Add charging and payment stats
          recentChargingEvents.forEach(event => {
            const userId = event.userId;
            if (!userStats.has(userId)) {
              userStats.set(userId, {
                userId,
                totalActivities: 0,
                activities: new Map(),
                totalSessions: 0,
                completedSessions: 0
              });
            }

            const stats = userStats.get(userId);
            stats.totalSessions = (stats.totalSessions || 0) + 1;
            if (event.eventType === 'completed') {
              stats.completedSessions = (stats.completedSessions || 0) + 1;
            }
          });

          recentPayments.forEach(payment => {
            const userId = payment.userId;
            if (!userStats.has(userId)) {
              userStats.set(userId, {
                userId,
                totalActivities: 0,
                activities: new Map(),
                totalSpent: 0,
                totalPayments: 0
              });
            }

            const stats = userStats.get(userId);
            stats.totalSpent = (stats.totalSpent || 0) + payment.amount;
            stats.totalPayments = (stats.totalPayments || 0) + 1;
          });

          // Convert to array and format
          const usersData = Array.from(userStats.values()).map(user => ({
            ...user,
            activities: Object.fromEntries(user.activities),
            completionRate: user.totalSessions > 0
              ? ((user.completedSessions || 0) / user.totalSessions) * 100
              : 0,
            averagePayment: user.totalPayments > 0
              ? (user.totalSpent || 0) / user.totalPayments
              : 0
          }));

          // Sort by total activity
          usersData.sort((a, b) => b.totalActivities - a.totalActivities);

          return {
            success: true,
            data: {
              period,
              totalActiveUsers: usersData.length,
              users: usersData.slice(0, 100) // Limit to top 100
            },
            message: 'User analytics retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get user analytics', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get user analytics',
            timestamp: new Date()
          };
        }
      })
  )

  // Reports
  .group('/reports', (app) =>
    app
      .get('/revenue', ({ query }) => {
        try {
          const { period = '30d', groupBy = 'day' } = query as { period: string, groupBy: string };

          const now = new Date();
          let startTime: Date;

          switch (period) {
            case '7d':
              startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '30d':
              startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case '90d':
              startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            default:
              startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          }

          const completedPayments = Array.from(paymentEvents.values())
            .filter(event =>
              event.status === 'completed' &&
              new Date(event.timestamp) >= startTime
            );

          // Group by time period
          const revenueData = new Map();

          completedPayments.forEach(payment => {
            const date = new Date(payment.timestamp);
            let key: string;

            switch (groupBy) {
              case 'hour':
                key = date.toISOString().slice(0, 13) + ':00';
                break;
              case 'day':
                key = date.toISOString().slice(0, 10);
                break;
              case 'week':
                const weekStart = new Date(date.getTime() - (date.getDay() * 24 * 60 * 60 * 1000));
                key = weekStart.toISOString().slice(0, 10);
                break;
              case 'month':
                key = date.toISOString().slice(0, 7);
                break;
              default:
                key = date.toISOString().slice(0, 10);
            }

            if (!revenueData.has(key)) {
              revenueData.set(key, {
                period: key,
                revenue: 0,
                transactions: 0,
                averageTransaction: 0
              });
            }

            const periodData = revenueData.get(key);
            periodData.revenue += payment.amount;
            periodData.transactions += 1;
          });

          // Calculate averages
          revenueData.forEach(data => {
            data.averageTransaction = data.transactions > 0 ? data.revenue / data.transactions : 0;
          });

          return {
            success: true,
            data: {
              period,
              groupBy,
              revenueData: Array.from(revenueData.values()).sort((a, b) =>
                a.period.localeCompare(b.period)
              )
            },
            message: 'Revenue report retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get revenue report', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get revenue report',
            timestamp: new Date()
          };
        }
      })
  )

  // Cleanup old data (runs daily at 3 AM)
  .onAfterHandle(() => {
    cron.schedule('0 3 * * *', () => {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      let cleanedCharging = 0;
      let cleanedUserActivities = 0;
      let cleanedStationMetrics = 0;
      let cleanedPayments = 0;

      for (const [id, event] of chargingEvents.entries()) {
        if (new Date(event.timestamp) < cutoffTime) {
          chargingEvents.delete(id);
          cleanedCharging++;
        }
      }

      for (const [id, event] of userActivities.entries()) {
        if (new Date(event.timestamp) < cutoffTime) {
          userActivities.delete(id);
          cleanedUserActivities++;
        }
      }

      for (const [id, event] of stationMetrics.entries()) {
        if (new Date(event.timestamp) < cutoffTime) {
          stationMetrics.delete(id);
          cleanedStationMetrics++;
        }
      }

      for (const [id, event] of paymentEvents.entries()) {
        if (new Date(event.timestamp) < cutoffTime) {
          paymentEvents.delete(id);
          cleanedPayments++;
        }
      }

      if (cleanedCharging > 0 || cleanedUserActivities > 0 || cleanedStationMetrics > 0 || cleanedPayments > 0) {
        logger.info('Cleaned up old analytics data', {
          cleanedCharging,
          cleanedUserActivities,
          cleanedStationMetrics,
          cleanedPayments
        });
      }
    });
  })

  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3007);

console.log('📊 Analytics Service is running on port 3007');
console.log('🔑 Health check: http://localhost:3007/health');
console.log('📈 Events API: http://localhost:3007/events');
console.log('📊 Dashboard API: http://localhost:3007/dashboard');
console.log('📋 Reports API: http://localhost:3007/reports');