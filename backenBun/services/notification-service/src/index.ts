import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import * as admin from 'firebase-admin';
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

const logger = new SimpleLogger('NotificationService');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'superapp-csms',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk@test.iam.gserviceaccount.com',
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n'
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('Firebase Admin initialized successfully');
} catch (error: any) {
  logger.warn('Firebase Admin initialization failed', error);
}

// In-memory storage for device tokens (use Redis in production)
const deviceTokens = new Map();
const notificationTemplates = new Map();

// Notification templates
notificationTemplates.set('charging_started', {
  title: 'การชาร์จเริ่มต้นแล้ว',
  body: 'การชาร์จรถยนต์ของคุณเริ่มต้นแล้วที่สถานี {stationName}',
  icon: 'charging',
  priority: 'high'
});

notificationTemplates.set('charging_completed', {
  title: 'การชาร์จเสร็จสิ้น',
  body: 'การชาร์จเสร็จสิ้นแล้ว ใช้เวลา {duration} ค่าใช้จ่าย {amount} บาท',
  icon: 'charging_complete',
  priority: 'high'
});

notificationTemplates.set('payment_successful', {
  title: 'การชำระเงินสำเร็จ',
  body: 'การชำระเงิน {amount} บาท สำเร็จแล้ว',
  icon: 'payment_success',
  priority: 'normal'
});

notificationTemplates.set('payment_failed', {
  title: 'การชำระเงินล้มเหลว',
  body: 'ไม่สามารถชำระเงินได้ กรุณาตรวจสอบบัตรเครดิตหรือวิธีการชำระเงิน',
  icon: 'payment_failed',
  priority: 'high'
});

notificationTemplates.set('station_available', {
  title: 'สถานีว่างพร้อมใช้งาน',
  body: 'สถานี {stationName} ว่างพร้อมให้บริการแล้ว',
  icon: 'station',
  priority: 'normal'
});

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Notification Service is healthy',
      timestamp: new Date(),
      service: 'notification-service',
      firebase: admin.apps.length > 0
    };
  })

  // Device Token Management
  .group('/device-tokens', (app) =>
    app
      .post('/register', ({ body }) => {
        try {
          const { userId, token, deviceInfo } = body as any;

          if (!userId || !token) {
            return {
              success: false,
              error: 'userId and token are required',
              timestamp: new Date()
            };
          }

          const tokenData = {
            userId,
            token,
            deviceInfo,
            registeredAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          };

          deviceTokens.set(token, tokenData);

          logger.info('Device token registered', { userId, token, deviceInfo });

          return {
            success: true,
            data: { token, userId, registeredAt: tokenData.registeredAt },
            message: 'Device token registered successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to register device token', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to register device token',
            timestamp: new Date()
          };
        }
      })

      .post('/unregister', ({ body }) => {
        try {
          const { userId, token } = body as any;

          if (deviceTokens.has(token)) {
            deviceTokens.delete(token);
            logger.info('Device token unregistered', { userId, token });
          }

          return {
            success: true,
            message: 'Device token unregistered successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to unregister device token', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to unregister device token',
            timestamp: new Date()
          };
        }
      })

      .get('/:userId', ({ params }) => {
        try {
          const userTokens = Array.from(deviceTokens.values())
            .filter(token => token.userId === params.userId);

          return {
            success: true,
            data: userTokens,
            message: 'Device tokens retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get device tokens', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get device tokens',
            timestamp: new Date()
          };
        }
      })
  )

  // Push Notification Management
  .group('/notifications', (app) =>
    app
      .post('/send', async ({ body }) => {
        try {
          const {
            userId,
            title,
            body,
            data,
            priority = 'normal',
            icon = 'default'
          } = body as any;

          const userTokens = Array.from(deviceTokens.values())
            .filter(token => token.userId === userId)
            .map(token => token.token);

          if (userTokens.length === 0) {
            return {
              success: false,
              error: 'No device tokens found for user',
              timestamp: new Date()
            };
          }

          const message = {
            notification: {
              title,
              body,
              icon
            },
            data: data || {},
            priority,
            tokens: userTokens
          };

          const response = await admin.messaging().sendMulticast(message);

          logger.info('Push notification sent', {
            userId,
            successCount: response.successCount,
            failureCount: response.failureCount
          });

          return {
            success: true,
            data: {
              successCount: response.successCount,
              failureCount: response.failureCount,
              responses: response.responses
            },
            message: 'Push notifications sent successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to send push notification', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to send push notification',
            timestamp: new Date()
          };
        }
      })

      .post('/send-template', async ({ body }) => {
        try {
          const {
            userId,
            template,
            variables = {},
            data,
            priority
          } = body as any;

          const templateData = notificationTemplates.get(template);
          if (!templateData) {
            return {
              success: false,
              error: 'Template not found',
              timestamp: new Date()
            };
          }

          // Replace variables in title and body
          let title = templateData.title;
          let body = templateData.body;

          Object.entries(variables).forEach(([key, value]) => {
            title = title.replace(`{${key}}`, String(value));
            body = body.replace(`{${key}}`, String(value));
          });

          const userTokens = Array.from(deviceTokens.values())
            .filter(token => token.userId === userId)
            .map(token => token.token);

          if (userTokens.length === 0) {
            return {
              success: false,
              error: 'No device tokens found for user',
              timestamp: new Date()
            };
          }

          const message = {
            notification: {
              title,
              body,
              icon: templateData.icon
            },
            data: {
              template,
              ...data
            },
            priority: priority || templateData.priority,
            tokens: userTokens
          };

          const response = await admin.messaging().sendMulticast(message);

          logger.info('Template push notification sent', {
            userId,
            template,
            successCount: response.successCount,
            failureCount: response.failureCount
          });

          return {
            success: true,
            data: {
              template,
              title,
              body,
              successCount: response.successCount,
              failureCount: response.failureCount,
              responses: response.responses
            },
            message: 'Template push notification sent successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to send template push notification', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to send template push notification',
            timestamp: new Date()
          };
        }
      })

      .post('/broadcast', async ({ body }) => {
        try {
          const {
            title,
            body,
            data,
            priority = 'normal',
            targetUsers = [] // If empty, send to all users
          } = body as any;

          let targetTokens: string[] = [];

          if (targetUsers.length > 0) {
            targetTokens = Array.from(deviceTokens.values())
              .filter(token => targetUsers.includes(token.userId))
              .map(token => token.token);
          } else {
            // Send to all users
            targetTokens = Array.from(deviceTokens.keys());
          }

          if (targetTokens.length === 0) {
            return {
              success: false,
              error: 'No device tokens found',
              timestamp: new Date()
            };
          }

          const message = {
            notification: {
              title,
              body
            },
            data: data || {},
            priority,
            tokens: targetTokens
          };

          const response = await admin.messaging().sendMulticast(message);

          logger.info('Broadcast push notification sent', {
            targetUsers: targetUsers.length,
            successCount: response.successCount,
            failureCount: response.failureCount
          });

          return {
            success: true,
            data: {
              targetUsers: targetUsers.length,
              successCount: response.successCount,
              failureCount: response.failureCount,
              responses: response.responses
            },
            message: 'Broadcast push notifications sent successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to send broadcast push notification', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to send broadcast push notification',
            timestamp: new Date()
          };
        }
      })
  )

  // Notification Templates Management
  .group('/templates', (app) =>
    app
      .get('/', () => {
        try {
          const templates = Object.fromEntries(notificationTemplates);

          return {
            success: true,
            data: templates,
            message: 'Notification templates retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get notification templates', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get notification templates',
            timestamp: new Date()
          };
        }
      })

      .post('/', ({ body }) => {
        try {
          const { name, title, body, icon, priority } = body as any;

          notificationTemplates.set(name, {
            title,
            body,
            icon: icon || 'default',
            priority: priority || 'normal'
          });

          logger.info('Notification template created', { name });

          return {
            success: true,
            data: { name, title, body, icon, priority },
            message: 'Notification template created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create notification template', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create notification template',
            timestamp: new Date()
          };
        }
      })
  )

  // Cleanup old tokens (runs daily at 2 AM)
  .onAfterHandle(() => {
    // Schedule cleanup task
    cron.schedule('0 2 * * *', () => {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      let cleanedCount = 0;
      for (const [token, tokenData] of deviceTokens.entries()) {
        if (new Date(tokenData.registeredAt) < cutoffTime) {
          deviceTokens.delete(token);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up old device tokens', { cleanedCount });
      }
    });
  })

  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3006);

console.log('🔔 Notification Service is running on port 3006');
console.log('🔑 Health check: http://localhost:3006/health');
console.log('📱 Device Tokens API: http://localhost:3006/device-tokens');
console.log('📢 Notifications API: http://localhost:3006/notifications');
console.log('📋 Templates API: http://localhost:3006/templates');