import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export interface CreateChargePointData {
  chargepointname: string;
  stationId?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  is24Hours?: boolean;
  brand: string;
  serialNumber: string;
  powerRating: number;
  powerSystem?: number;
  connectorCount?: number;
  protocol: 'OCPP16' | 'OCPP20' | 'OCPP21';
  csmsUrl?: string;
  chargePointIdentity: string;
  // เพิ่มฟิลด์ที่ขาดหายไป
  maxPower?: number;
  heartbeatIntervalSec?: number;
  vendor?: string;
  model?: string;
  firmwareVersion?: string;
  ocppProtocolRaw?: string;
  ocppSessionId?: string;
  isWhitelisted?: boolean;
  ownerId?: string;
  ownershipType?: 'PUBLIC' | 'PRIVATE';
  isPublic?: boolean;
  onPeakRate?: number;
  onPeakStartTime?: string;
  onPeakEndTime?: string;
  offPeakRate?: number;
  offPeakStartTime?: string;
  offPeakEndTime?: string;
  urlwebSocket?: string;
}

export interface UpdateChargePointData {
  chargepointname?: string;
  stationId?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  is24Hours?: boolean;
  brand?: string;
  serialNumber?: string;
  powerRating?: number;
  powerSystem?: number;
  connectorCount?: number;
  protocol?: 'OCPP16' | 'OCPP20' | 'OCPP21';
  csmsUrl?: string;
  chargePointIdentity?: string;
  // เพิ่มฟิลด์ที่ขาดหายไป
  maxPower?: number;
  heartbeatIntervalSec?: number;
  vendor?: string;
  model?: string;
  firmwareVersion?: string;
  ocppProtocolRaw?: string;
  ocppSessionId?: string;
  isWhitelisted?: boolean;
  ownerId?: string;
  ownershipType?: 'PUBLIC' | 'PRIVATE';
  isPublic?: boolean;
  onPeakRate?: number;
  onPeakStartTime?: string;
  onPeakEndTime?: string;
  offPeakRate?: number;
  offPeakStartTime?: string;
  offPeakEndTime?: string;
  urlwebSocket?: string;
}

export interface GetChargePointsQuery {
  page?: number;
  limit?: number;
  search?: string;
  stationId?: string;
}

export class AdminChargePointService {
  async createChargePoint(data: CreateChargePointData) {
    try {
      // Validate required fields
      if (!data.chargepointname || !data.location || !data.brand || !data.serialNumber || !data.chargePointIdentity) {
        throw new Error('ข้อมูลที่จำเป็นไม่ครบถ้วน');
      }

      // Check if serial number already exists
      const existingSerial = await prisma.chargePoint.findUnique({
        where: { serialNumber: data.serialNumber }
      });

      if (existingSerial) {
        throw new Error('Serial Number นี้มีอยู่ในระบบแล้ว');
      }

      // Check if charge point identity already exists
      const existingIdentity = await prisma.chargePoint.findUnique({
        where: { chargePointIdentity: data.chargePointIdentity }
      });

      if (existingIdentity) {
        throw new Error('Charge Point Identity นี้มีอยู่ในระบบแล้ว');
      }

      // Validate station if provided
      if (data.stationId) {
        const station = await prisma.station.findUnique({
          where: { id: data.stationId }
        });

        if (!station) {
          throw new Error('ไม่พบสถานีที่ระบุ');
        }
      }

      // Create charge point
      const chargePoint = await prisma.chargePoint.create({
        data: {
          chargepointname: data.chargepointname,
          stationId: data.stationId,
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
          openingHours: data.openingHours,
          is24Hours: data.is24Hours || false,
          brand: data.brand,
          serialNumber: data.serialNumber,
          powerRating: data.powerRating,
          powerSystem: data.powerSystem || 1,
          connectorCount: data.connectorCount || 1,
          protocol: data.protocol,
          csmsUrl: data.csmsUrl,
          chargePointIdentity: data.chargePointIdentity,
          // เพิ่มฟิลด์ที่ขาดหายไป
          maxPower: data.maxPower,
          heartbeatIntervalSec: data.heartbeatIntervalSec,
          vendor: data.vendor,
          model: data.model,
          firmwareVersion: data.firmwareVersion,
          ocppProtocolRaw: data.ocppProtocolRaw,
          ocppSessionId: data.ocppSessionId,
          isWhitelisted: data.isWhitelisted ?? true,
          ownerId: data.ownerId,
          ownershipType: data.ownershipType || 'PUBLIC',
          isPublic: data.isPublic ?? true,
          onPeakRate: data.onPeakRate ?? 10.0,
          onPeakStartTime: data.onPeakStartTime || '10:00',
          onPeakEndTime: data.onPeakEndTime || '12:00',
          offPeakRate: data.offPeakRate ?? 20.0,
          offPeakStartTime: data.offPeakStartTime || '16:00',
          offPeakEndTime: data.offPeakEndTime || '22:00',
          urlwebSocket: data.urlwebSocket
        },
        include: {
          station: true
        }
      });

      logger.info(`Charge point created: ${chargePoint.id}`);

      return chargePoint;
    } catch (error: any) {
      logger.error('Create charge point error:', error);
      throw error;
    }
  }

  async updateChargePoint(id: string, data: UpdateChargePointData) {
    try {
      // Check if charge point exists
      const existingChargePoint = await prisma.chargePoint.findUnique({
        where: { id }
      });

      if (!existingChargePoint) {
        throw new Error('ไม่พบจุดชาร์จที่ระบุ');
      }

      // Check if serial number already exists (if updating)
      if (data.serialNumber && data.serialNumber !== existingChargePoint.serialNumber) {
        const existingSerial = await prisma.chargePoint.findUnique({
          where: { serialNumber: data.serialNumber }
        });

        if (existingSerial) {
          throw new Error('Serial Number นี้มีอยู่ในระบบแล้ว');
        }
      }

      // Check if charge point identity already exists (if updating)
      if (data.chargePointIdentity && data.chargePointIdentity !== existingChargePoint.chargePointIdentity) {
        const existingIdentity = await prisma.chargePoint.findUnique({
          where: { chargePointIdentity: data.chargePointIdentity }
        });

        if (existingIdentity) {
          throw new Error('Charge Point Identity นี้มีอยู่ในระบบแล้ว');
        }
      }

      // Validate station if provided
      if (data.stationId) {
        const station = await prisma.station.findUnique({
          where: { id: data.stationId }
        });

        if (!station) {
          throw new Error('ไม่พบสถานีที่ระบุ');
        }
      }

      // Update charge point
      const updatedChargePoint = await prisma.chargePoint.update({
        where: { id },
        data: {
          ...(data.chargepointname && { chargepointname: data.chargepointname }),
          ...(data.stationId !== undefined && { stationId: data.stationId }),
          ...(data.location && { location: data.location }),
          ...(data.latitude !== undefined && { latitude: data.latitude }),
          ...(data.longitude !== undefined && { longitude: data.longitude }),
          ...(data.openingHours !== undefined && { openingHours: data.openingHours }),
          ...(data.is24Hours !== undefined && { is24Hours: data.is24Hours }),
          ...(data.brand && { brand: data.brand }),
          ...(data.serialNumber && { serialNumber: data.serialNumber }),
          ...(data.powerRating !== undefined && { powerRating: data.powerRating }),
          ...(data.powerSystem !== undefined && { powerSystem: data.powerSystem }),
          ...(data.connectorCount !== undefined && { connectorCount: data.connectorCount }),
          ...(data.protocol && { protocol: data.protocol }),
          ...(data.csmsUrl !== undefined && { csmsUrl: data.csmsUrl }),
          ...(data.chargePointIdentity && { chargePointIdentity: data.chargePointIdentity }),
          // เพิ่มฟิลด์ที่ขาดหายไป
          ...(data.maxPower !== undefined && { maxPower: data.maxPower }),
          ...(data.heartbeatIntervalSec !== undefined && { heartbeatIntervalSec: data.heartbeatIntervalSec }),
          ...(data.vendor !== undefined && { vendor: data.vendor }),
          ...(data.model !== undefined && { model: data.model }),
          ...(data.firmwareVersion !== undefined && { firmwareVersion: data.firmwareVersion }),
          ...(data.ocppProtocolRaw !== undefined && { ocppProtocolRaw: data.ocppProtocolRaw }),
          ...(data.ocppSessionId !== undefined && { ocppSessionId: data.ocppSessionId }),
          ...(data.isWhitelisted !== undefined && { isWhitelisted: data.isWhitelisted }),
          ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
          ...(data.ownershipType !== undefined && { ownershipType: data.ownershipType }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          ...(data.onPeakRate !== undefined && { onPeakRate: data.onPeakRate }),
          ...(data.onPeakStartTime !== undefined && { onPeakStartTime: data.onPeakStartTime }),
          ...(data.onPeakEndTime !== undefined && { onPeakEndTime: data.onPeakEndTime }),
          ...(data.offPeakRate !== undefined && { offPeakRate: data.offPeakRate }),
          ...(data.offPeakStartTime !== undefined && { offPeakStartTime: data.offPeakStartTime }),
          ...(data.offPeakEndTime !== undefined && { offPeakEndTime: data.offPeakEndTime }),
          ...(data.urlwebSocket !== undefined && { urlwebSocket: data.urlwebSocket })
        },
        include: {
          station: true
        }
      });

      logger.info(`Charge point updated: ${id}`);

      return updatedChargePoint;
    } catch (error: any) {
      logger.error('Update charge point error:', error);
      throw error;
    }
  }

  async deleteChargePoint(id: string) {
    try {
      // Check if charge point exists
      const existingChargePoint = await prisma.chargePoint.findUnique({
        where: { id }
      });

      if (!existingChargePoint) {
        throw new Error('ไม่พบจุดชาร์จที่ระบุ');
      }

      // Delete charge point
      await prisma.chargePoint.delete({
        where: { id }
      });

      logger.info(`Charge point deleted: ${id}`);
    } catch (error: any) {
      logger.error('Delete charge point error:', error);
      throw error;
    }
  }

  async getChargePoints(query: GetChargePointsQuery = {}) {
    try {
      const { page = 1, limit = 10, search, stationId } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { chargepointname: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (stationId) {
        where.stationId = stationId;
      }

      // Get charge points with pagination
      const [chargePoints, total] = await Promise.all([
        prisma.chargePoint.findMany({
          where,
          include: {
            station: true
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.chargePoint.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        chargePoints,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      logger.error('Get charge points error:', error);
      throw error;
    }
  }

  async getChargePointById(id: string) {
    try {
      const chargePoint = await prisma.chargePoint.findUnique({
        where: { id },
        include: {
          station: true
        }
      });

      if (!chargePoint) {
        throw new Error('ไม่พบจุดชาร์จที่ระบุ');
      }

      return chargePoint;
    } catch (error: any) {
      logger.error('Get charge point by ID error:', error);
      throw error;
    }
  }
}