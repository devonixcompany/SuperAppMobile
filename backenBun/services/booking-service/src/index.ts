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

const logger = new SimpleLogger('BookingService');

// In-memory storage for bookings (use database in production)
const bookings = new Map();
const stationAvailability = new Map();

interface Booking {
  id: string;
  userId: string;
  stationId: string;
  connectorId: number;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  status: 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface StationAvailability {
  stationId: string;
  connectorId: number;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';
  nextAvailableTime?: string;
  bookedUntil?: string;
}

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Booking Service is healthy',
      timestamp: new Date(),
      service: 'booking-service'
    };
  })

  // Booking Management
  .group('/bookings', (app) =>
    app
      .post('/', ({ body }) => {
        try {
          const {
            userId,
            stationId,
            connectorId,
            startTime,
            duration = 30, // default 30 minutes
            metadata
          } = body as any;

          if (!userId || !stationId || !connectorId || !startTime) {
            return {
              success: false,
              error: 'Missing required fields: userId, stationId, connectorId, startTime',
              timestamp: new Date()
            };
          }

          // Calculate end time
          const startDateTime = new Date(startTime);
          const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

          // Check if connector is available for the requested time
          const availabilityKey = `${stationId}_${connectorId}`;
          const availability = stationAvailability.get(availabilityKey);

          if (availability && availability.status === 'RESERVED') {
            if (new Date(availability.bookedUntil!) > startDateTime) {
              return {
                success: false,
                error: 'Connector is already booked for this time slot',
                timestamp: new Date()
              };
            }
          }

          const booking: Booking = {
            id: `BOOK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            stationId,
            connectorId,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            duration,
            status: 'RESERVED',
            metadata: metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          bookings.set(booking.id, booking);

          // Update station availability
          stationAvailability.set(availabilityKey, {
            stationId,
            connectorId,
            status: 'RESERVED',
            bookedUntil: booking.endTime,
            nextAvailableTime: booking.endTime
          } as StationAvailability);

          logger.info('Booking created', {
            bookingId: booking.id,
            userId,
            stationId,
            connectorId,
            startTime: booking.startTime,
            endTime: booking.endTime
          });

          return {
            success: true,
            data: booking,
            message: 'Booking created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create booking', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create booking',
            timestamp: new Date()
          };
        }
      })

      .get('/:id', ({ params }) => {
        try {
          const booking = bookings.get(params.id);
          if (!booking) {
            return {
              success: false,
              error: 'Booking not found',
              timestamp: new Date()
            };
          }

          return {
            success: true,
            data: booking,
            message: 'Booking retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get booking', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get booking',
            timestamp: new Date()
          };
        }
      })

      .put('/:id', ({ params, body }) => {
        try {
          const booking = bookings.get(params.id);
          if (!booking) {
            return {
              success: false,
              error: 'Booking not found',
              timestamp: new Date()
            };
          }

          const { status, metadata } = body as any;

          if (status) {
            booking.status = status;

            // Update station availability based on status
            const availabilityKey = `${booking.stationId}_${booking.connectorId}`;
            const availability = stationAvailability.get(availabilityKey);

            if (status === 'CANCELLED' || status === 'COMPLETED' || status === 'EXPIRED') {
              // Make connector available again
              stationAvailability.set(availabilityKey, {
                stationId: booking.stationId,
                connectorId: booking.connectorId,
                status: 'AVAILABLE',
                nextAvailableTime: new Date().toISOString()
              } as StationAvailability);
            } else if (status === 'CONFIRMED') {
              // Mark as occupied
              stationAvailability.set(availabilityKey, {
                stationId: booking.stationId,
                connectorId: booking.connectorId,
                status: 'OCCUPIED',
                bookedUntil: booking.endTime,
                nextAvailableTime: booking.endTime
              } as StationAvailability);
            }
          }

          if (metadata) {
            booking.metadata = { ...booking.metadata, ...metadata };
          }

          booking.updatedAt = new Date().toISOString();

          bookings.set(params.id, booking);

          logger.info('Booking updated', {
            bookingId: params.id,
            status: booking.status
          });

          return {
            success: true,
            data: booking,
            message: 'Booking updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update booking', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update booking',
            timestamp: new Date()
          };
        }
      })

      .delete('/:id', ({ params }) => {
        try {
          const booking = bookings.get(params.id);
          if (!booking) {
            return {
              success: false,
              error: 'Booking not found',
              timestamp: new Date()
            };
          }

          // Cancel the booking
          booking.status = 'CANCELLED';
          booking.updatedAt = new Date().toISOString();

          // Update station availability
          const availabilityKey = `${booking.stationId}_${booking.connectorId}`;
          stationAvailability.set(availabilityKey, {
            stationId: booking.stationId,
            connectorId: booking.connectorId,
            status: 'AVAILABLE',
            nextAvailableTime: new Date().toISOString()
          } as StationAvailability);

          bookings.set(params.id, booking);

          logger.info('Booking cancelled', {
            bookingId: params.id,
            userId: booking.userId
          });

          return {
            success: true,
            data: booking,
            message: 'Booking cancelled successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to cancel booking', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to cancel booking',
            timestamp: new Date()
          };
        }
      })

      .get('/', ({ query }) => {
        try {
          const { userId, stationId, status, limit = 50, offset = 0 } = query as any;

          let filteredBookings = Array.from(bookings.values());

          if (userId) {
            filteredBookings = filteredBookings.filter(b => b.userId === userId);
          }

          if (stationId) {
            filteredBookings = filteredBookings.filter(b => b.stationId === stationId);
          }

          if (status) {
            filteredBookings = filteredBookings.filter(b => b.status === status);
          }

          // Sort by creation time (newest first)
          filteredBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Apply pagination
          const paginatedBookings = filteredBookings.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
          );

          return {
            success: true,
            data: {
              bookings: paginatedBookings,
              total: filteredBookings.length,
              limit: parseInt(limit),
              offset: parseInt(offset)
            },
            message: 'Bookings retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get bookings', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get bookings',
            timestamp: new Date()
          };
        }
      })
  )

  // Station Availability
  .group('/stations', (app) =>
    app
      .get('/:stationId/availability', ({ params, query }) => {
        try {
          const { date } = query as { date?: string };
          const targetDate = date ? new Date(date) : new Date();

          // Get all connectors for the station
          const stationConnectors = Array.from(stationAvailability.values())
            .filter(avail => avail.stationId === params.stationId);

          const availabilityData = stationConnectors.map(connector => {
            // Find active bookings for this connector
            const activeBookings = Array.from(bookings.values())
              .filter(booking =>
                booking.stationId === params.stationId &&
                booking.connectorId === connector.connectorId &&
                booking.status === 'RESERVED' &&
                new Date(booking.startTime) <= targetDate &&
                new Date(booking.endTime) > targetDate
              );

            return {
              connectorId: connector.connectorId,
              status: activeBookings.length > 0 ? 'RESERVED' : connector.status,
              nextAvailableTime: connector.nextAvailableTime,
              currentBooking: activeBookings[0] || null
            };
          });

          return {
            success: true,
            data: {
              stationId: params.stationId,
              date: targetDate.toISOString().split('T')[0],
              connectors: availabilityData
            },
            message: 'Station availability retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get station availability', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get station availability',
            timestamp: new Date()
          };
        }
      })

      .get('/:stationId/slots', ({ params, query }) => {
        try {
          const { date, duration = 30 } = query as { date?: string, duration?: number };
          const targetDate = date ? new Date(date) : new Date();

          // Generate available time slots for the day
          const slots = [];
          const startOfDay = new Date(targetDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(targetDate);
          endOfDay.setHours(23, 59, 59, 999);

          const slotDuration = 30; // 30 minutes slots
          const durationInMinutes = parseInt(duration.toString());

          // Get all connectors for the station
          const stationConnectors = Array.from(stationAvailability.values())
            .filter(avail => avail.stationId === params.stationId)
            .map(avail => avail.connectorId);

          for (const connectorId of stationConnectors) {
            const connectorSlots = [];

            // Get existing bookings for this connector
            const existingBookings = Array.from(bookings.values())
              .filter(booking =>
                booking.stationId === params.stationId &&
                booking.connectorId === connectorId &&
                booking.status === 'RESERVED' &&
                new Date(booking.startTime).toDateString() === targetDate.toDateString()
              );

            let currentTime = new Date(startOfDay);

            while (currentTime < endOfDay) {
              const slotEndTime = new Date(currentTime.getTime() + durationInMinutes * 60 * 1000);

              // Check if this slot conflicts with any existing booking
              const hasConflict = existingBookings.some(booking => {
                const bookingStart = new Date(booking.startTime);
                const bookingEnd = new Date(booking.endTime);
                return (
                  (currentTime < bookingEnd && slotEndTime > bookingStart)
                );
              });

              if (!hasConflict && slotEndTime <= endOfDay) {
                connectorSlots.push({
                  startTime: currentTime.toISOString(),
                  endTime: slotEndTime.toISOString(),
                  available: true
                });
              }

              currentTime = new Date(currentTime.getTime() + slotDuration * 60 * 1000);
            }

            slots.push({
              connectorId,
              slots: connectorSlots
            });
          }

          return {
            success: true,
            data: {
              stationId: params.stationId,
              date: targetDate.toISOString().split('T')[0],
              duration: durationInMinutes,
              connectors: slots
            },
            message: 'Available slots retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get available slots', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get available slots',
            timestamp: new Date()
          };
        }
      })
  )

  // Auto-cleanup expired bookings (runs every 5 minutes)
  .onAfterHandle(() => {
    cron.schedule('*/5 * * * *', () => {
      const now = new Date();
      let expiredCount = 0;

      for (const [bookingId, booking] of bookings.entries()) {
        if (
          booking.status === 'RESERVED' &&
          new Date(booking.startTime) < now
        ) {
          // Mark as expired if start time has passed
          booking.status = 'EXPIRED';
          booking.updatedAt = now.toISOString();
          bookings.set(bookingId, booking);

          // Update station availability
          const availabilityKey = `${booking.stationId}_${booking.connectorId}`;
          stationAvailability.set(availabilityKey, {
            stationId: booking.stationId,
            connectorId: booking.connectorId,
            status: 'AVAILABLE',
            nextAvailableTime: now.toISOString()
          } as StationAvailability);

          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        logger.info('Expired bookings cleaned up', { expiredCount });
      }
    });
  })

  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3008);

console.log('📅 Booking Service is running on port 3008');
console.log('🔑 Health check: http://localhost:3008/health');
console.log('📋 Bookings API: http://localhost:3008/bookings');
console.log('🏠 Stations API: http://localhost:3008/stations');