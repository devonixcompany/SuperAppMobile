import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';

const logger = new Logger('DriverService');

// In-memory storage for drivers (use database in production)
const drivers = new Map();
const rfidCards = new Map();

interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  membershipLevel: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  creditBalance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLACKLISTED';
  createdAt: string;
  updatedAt: string;
}

interface RfidCard {
  id: string;
  driverId: string;
  cardId: string;
  cardType: 'PASSIVE' | 'ACTIVE' | 'HYBRID';
  status: 'ACTIVE' | 'INACTIVE' | 'LOST' | 'STOLEN' | 'DAMAGED' | 'EXPIRED';
  issuedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Driver Management Service is healthy',
      timestamp: new Date(),
      service: 'driver-service',
      statistics: {
        totalDrivers: drivers.size,
        totalRfidCards: rfidCards.size
      }
    };
  })
  .group('/drivers', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: Array.from(drivers.values()),
          message: 'Drivers fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:id', ({ params }) => {
        const driver = drivers.get(params.id);
        if (!driver) {
          return {
            success: false,
            error: 'Driver not found',
            timestamp: new Date()
          };
        }

        return {
          success: true,
          data: driver,
          message: 'Driver retrieved successfully',
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        try {
          const { userId, name, email, phone, licenseNumber, membershipLevel = 'BASIC' } = body as any;

          if (!userId || !name || !email) {
            return {
              success: false,
              error: 'Missing required fields: userId, name, email',
              timestamp: new Date()
            };
          }

          // Check if driver already exists
          const existingDriver = Array.from(drivers.values()).find(d => d.userId === userId);
          if (existingDriver) {
            return {
              success: false,
              error: 'Driver with this userId already exists',
              timestamp: new Date()
            };
          }

          const driver: Driver = {
            id: `DRV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            name,
            email,
            phone,
            licenseNumber,
            membershipLevel,
            creditBalance: 0,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          drivers.set(driver.id, driver);

          logger.info('Driver created', { driverId: driver.id, userId, name });

          return {
            success: true,
            data: driver,
            message: 'Driver created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create driver', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create driver',
            timestamp: new Date()
          };
        }
      })
      .put('/:id', ({ params, body }) => {
        try {
          const driver = drivers.get(params.id);
          if (!driver) {
            return {
              success: false,
              error: 'Driver not found',
              timestamp: new Date()
            };
          }

          const updates = body as any;
          const updatedDriver = {
            ...driver,
            ...updates,
            updatedAt: new Date().toISOString()
          };

          drivers.set(params.id, updatedDriver);

          logger.info('Driver updated', { driverId: params.id });

          return {
            success: true,
            data: updatedDriver,
            message: 'Driver updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update driver', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update driver',
            timestamp: new Date()
          };
        }
      })
      .delete('/:id', ({ params }) => {
        try {
          const driver = drivers.get(params.id);
          if (!driver) {
            return {
              success: false,
              error: 'Driver not found',
              timestamp: new Date()
            };
          }

          // Soft delete by changing status
          const deletedDriver = {
            ...driver,
            status: 'INACTIVE' as const,
            updatedAt: new Date().toISOString()
          };

          drivers.set(params.id, deletedDriver);

          logger.info('Driver deleted', { driverId: params.id });

          return {
            success: true,
            data: deletedDriver,
            message: 'Driver deleted successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to delete driver', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to delete driver',
            timestamp: new Date()
          };
        }
      })
      .get('/:id/transactions', ({ params }) => {
        try {
          const driver = drivers.get(params.id);
          if (!driver) {
            return {
              success: false,
              error: 'Driver not found',
              timestamp: new Date()
            };
          }

          // Mock transaction data - in production, query from billing service
          const transactions = [
            {
              id: `TXN_${Date.now()}_1`,
              driverId: driver.id,
              stationId: 'STATION_001',
              amount: 125.50,
              currency: 'THB',
              status: 'COMPLETED',
              createdAt: new Date().toISOString()
            }
          ];

          return {
            success: true,
            data: transactions,
            message: 'Driver transactions retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get driver transactions', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get driver transactions',
            timestamp: new Date()
          };
        }
      })
      .post('/:id/credit/add', ({ params, body }) => {
        try {
          const driver = drivers.get(params.id);
          if (!driver) {
            return {
              success: false,
              error: 'Driver not found',
              timestamp: new Date()
            };
          }

          const { amount, currency = 'THB', description } = body as any;

          if (!amount || amount <= 0) {
            return {
              success: false,
              error: 'Invalid amount',
              timestamp: new Date()
            };
          }

          const updatedDriver = {
            ...driver,
            creditBalance: driver.creditBalance + amount,
            updatedAt: new Date().toISOString()
          };

          drivers.set(params.id, updatedDriver);

          logger.info('Credit added to driver', {
            driverId: params.id,
            amount,
            currency,
            newBalance: updatedDriver.creditBalance
          });

          return {
            success: true,
            data: {
              driverId: updatedDriver.id,
              previousBalance: driver.creditBalance,
              addedAmount: amount,
              newBalance: updatedDriver.creditBalance,
              currency,
              description,
              timestamp: new Date().toISOString()
            },
            message: 'Credit added successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to add credit', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to add credit',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/rfid-cards', (app) =>
    app
      .get('/', () => {
        return {
          success: true,
          data: Array.from(rfidCards.values()),
          message: 'RFID cards fetched successfully',
          timestamp: new Date()
        };
      })
      .get('/:cardId', ({ params }) => {
        const card = Array.from(rfidCards.values()).find(c => c.cardId === params.cardId);
        if (!card) {
          return {
            success: false,
            error: 'RFID card not found',
            timestamp: new Date()
          };
        }

        return {
          success: true,
          data: card,
          message: 'RFID card retrieved successfully',
          timestamp: new Date()
        };
      })
      .post('/', ({ body }) => {
        try {
          const { driverId, cardId, cardType = 'PASSIVE' } = body as any;

          if (!driverId || !cardId) {
            return {
              success: false,
              error: 'Missing required fields: driverId, cardId',
              timestamp: new Date()
            };
          }

          // Check if driver exists
          const driver = drivers.get(driverId);
          if (!driver) {
            return {
              success: false,
              error: 'Driver not found',
              timestamp: new Date()
            };
          }

          // Check if card already exists
          const existingCard = Array.from(rfidCards.values()).find(c => c.cardId === cardId);
          if (existingCard) {
            return {
              success: false,
              error: 'RFID card already exists',
              timestamp: new Date()
            };
          }

          const now = new Date();
          const expiresAt = new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000); // 3 years

          const rfidCard: RfidCard = {
            id: `RFID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            driverId,
            cardId,
            cardType,
            status: 'ACTIVE',
            issuedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          };

          rfidCards.set(rfidCard.id, rfidCard);

          logger.info('RFID card created', { cardId, driverId });

          return {
            success: true,
            data: rfidCard,
            message: 'RFID card created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create RFID card', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create RFID card',
            timestamp: new Date()
          };
        }
      })
      .post('/validate', ({ body }) => {
        try {
          const { cardId, driverId } = body as any;

          if (!cardId) {
            return {
              success: false,
              error: 'Missing required field: cardId',
              timestamp: new Date()
            };
          }

          const card = Array.from(rfidCards.values()).find(c => c.cardId === cardId);
          if (!card) {
            return {
              success: false,
              error: 'RFID card not found',
              timestamp: new Date()
            };
          }

          // Check card status
          if (card.status !== 'ACTIVE') {
            return {
              success: false,
              error: `RFID card is ${card.status}`,
              timestamp: new Date()
            };
          }

          // Check expiration
          const now = new Date();
          const expiresAt = new Date(card.expiresAt);
          if (now > expiresAt) {
            return {
              success: false,
              error: 'RFID card has expired',
              timestamp: new Date()
            };
          }

          // Get driver information
          const driver = drivers.get(card.driverId);
          if (!driver) {
            return {
              success: false,
              error: 'Driver not found for this RFID card',
              timestamp: new Date()
            };
          }

          // Check if specific driverId is requested
          if (driverId && driver.userId !== driverId) {
            return {
              success: false,
              error: 'RFID card does not match specified driver',
              timestamp: new Date()
            };
          }

          // Check driver status
          if (driver.status !== 'ACTIVE') {
            return {
              success: false,
              error: `Driver is ${driver.status}`,
              timestamp: new Date()
            };
          }

          logger.info('RFID card validated', {
            cardId,
            driverId: driver.userId,
            membershipLevel: driver.membershipLevel
          });

          return {
            success: true,
            data: {
              valid: true,
              driverId: driver.id,
              userId: driver.userId,
              name: driver.name,
              membershipLevel: driver.membershipLevel,
              creditBalance: driver.creditBalance,
              expiresAt: card.expiresAt
            },
            message: 'RFID card validated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to validate RFID card', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to validate RFID card',
            timestamp: new Date()
          };
        }
      })
      .put('/:cardId/status', ({ params, body }) => {
        try {
          const card = Array.from(rfidCards.values()).find(c => c.cardId === params.cardId);
          if (!card) {
            return {
              success: false,
              error: 'RFID card not found',
              timestamp: new Date()
            };
          }

          const { status } = body as any;
          const validStatuses = ['ACTIVE', 'INACTIVE', 'LOST', 'STOLEN', 'DAMAGED', 'EXPIRED'];

          if (!validStatuses.includes(status)) {
            return {
              success: false,
              error: 'Invalid status',
              timestamp: new Date()
            };
          }

          const updatedCard = {
            ...card,
            status,
            updatedAt: new Date().toISOString()
          };

          rfidCards.set(card.id, updatedCard);

          logger.info('RFID card status updated', {
            cardId: params.cardId,
            newStatus: status
          });

          return {
            success: true,
            data: updatedCard,
            message: 'RFID card status updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update RFID card status', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update RFID card status',
            timestamp: new Date()
          };
        }
      })
      .get('/driver/:driverId', ({ params }) => {
        try {
          const cards = Array.from(rfidCards.values()).filter(c => c.driverId === params.driverId);

          return {
            success: true,
            data: cards,
            message: 'Driver RFID cards retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get driver RFID cards', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get driver RFID cards',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/search', (app) =>
    app
      .get('/drivers', ({ query }) => {
        try {
          const { name, email, membershipLevel, status } = query as any;

          let filteredDrivers = Array.from(drivers.values());

          if (name) {
            filteredDrivers = filteredDrivers.filter(d =>
              d.name.toLowerCase().includes(name.toLowerCase())
            );
          }

          if (email) {
            filteredDrivers = filteredDrivers.filter(d =>
              d.email.toLowerCase().includes(email.toLowerCase())
            );
          }

          if (membershipLevel) {
            filteredDrivers = filteredDrivers.filter(d => d.membershipLevel === membershipLevel);
          }

          if (status) {
            filteredDrivers = filteredDrivers.filter(d => d.status === status);
          }

          return {
            success: true,
            data: filteredDrivers,
            message: 'Drivers search completed successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to search drivers', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to search drivers',
            timestamp: new Date()
          };
        }
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3002);

console.log('👨‍💼 Driver Management Service is running on port 3002');
console.log('📊 Health check: http://localhost:3002/health');
console.log('👥 Drivers API: http://localhost:3002/drivers');
console.log('🎫 RFID Cards API: http://localhost:3002/rfid-cards');
console.log('🔍 Search API: http://localhost:3002/search');