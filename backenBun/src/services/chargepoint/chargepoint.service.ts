import { ChargePointStatus, OCPPVersion, OwnershipType, PricingTierType, PricingPeriod } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';

export interface CreateChargePointData {
  name: string;
  stationName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  is24Hours?: boolean;
  brand: string;
  serialNumber: string;
  powerRating: number;
  protocol: OCPPVersion;
  chargePointIdentity: string;
  urlwebSocket: string; // เพิ่มฟิลด์ URL WebSocket ที่ผู้ใช้ระบุ
  maxPower?: number;
  connectorCount?: number;
  ownerId?: string;
  ownershipType?: OwnershipType;
  isPublic?: boolean;
  // Pricing fields
  baseRate: number;
  peakRate?: number;
  offPeakRate?: number;
  // Time period fields
  peakStartTime?: string;
  peakEndTime?: string;
  offPeakStartTime?: string;
  offPeakEndTime?: string;
}

export interface UpdateChargePointData {
  name?: string;
  stationName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  is24Hours?: boolean;
  brand?: string;
  serialNumber?: string;
  powerRating?: number;
  protocol?: OCPPVersion;
  chargePointIdentity?: string;
  status?: ChargePointStatus;
  maxPower?: number;
  connectorCount?: number;
  ownershipType?: OwnershipType;
  isPublic?: boolean;
}

export class ChargePointService {
  /**
   * ดึงข้อมูลเครื่องชาร์จทั้งหมดสำหรับ ws-gateway
   */
  async getAllChargePointsForWSGateway() {
    return await prisma.chargePoint.findMany({
      select: {
        id: true,
        serialNumber: true,
        urlwebSocket: true,
        chargePointIdentity: true
      }
    });
  }

  /**
   * สร้าง WebSocket URL สำหรับเครื่องชาร์จ
   */
  private generateWebSocketUrl(chargePointId: string, protocol: OCPPVersion): string {
    const wsGatewayUrl = process.env.WS_GATEWAY_URL || 'ws://localhost:8081';
    const protocolVersion = protocol.toLowerCase().replace('ocpp', '');
    return `${wsGatewayUrl}/ocpp/${protocolVersion}/${chargePointId}`;
  }

  /**
   * สร้างเครื่องชาร์จใหม่
   */
  async createChargePoint(data: CreateChargePointData) {
    const chargePointId = `CP_${Date.now()}_${randomUUID().substring(0, 8).toUpperCase()}`;
    
    // ใช้ URL WebSocket ที่ผู้ใช้ระบุ
    const urlwebSocket = data.urlwebSocket;

    const chargePoint = await prisma.chargePoint.create({
      data: {
        id: chargePointId,
        name: data.name,
        stationName: data.stationName,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        openingHours: data.openingHours,
        is24Hours: data.is24Hours || false,
        brand: data.brand,
        serialNumber: data.serialNumber,
        powerRating: data.powerRating,
        protocol: data.protocol,
        chargePointIdentity: data.chargePointIdentity,
        status: ChargePointStatus.AVAILABLE,
        maxPower: data.maxPower || data.powerRating,
        connectorCount: data.connectorCount || 1,
        ownerId: data.ownerId,
        ownershipType: data.ownershipType || OwnershipType.PUBLIC,
        isPublic: data.isPublic ?? true,
        urlwebSocket
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        connectors: true,
        _count: {
          select: {
            sessions: true,
            transactions: true
          }
        }
      }
    });

    // สร้าง connectors ตามจำนวนที่กำหนด
    if (data.connectorCount && data.connectorCount > 0) {
      const connectors = [];
      for (let i = 1; i <= data.connectorCount; i++) {
        connectors.push({
          chargePointId: chargePointId,
          connectorId: i,
          type: 'TYPE_2' as any, // Default connector type
          status: 'AVAILABLE' as any,
          maxPower: data.maxPower || data.powerRating,
          maxCurrent: (data.maxPower || data.powerRating) ? (data.maxPower || data.powerRating) / 230 : undefined // Approximate current calculation
        });
      }

      await prisma.connector.createMany({
        data: connectors
      });
    }

    // สร้าง PricingTier สำหรับเครื่องชาร์จนี้
    const pricingTierData = {
      chargePointId: chargePointId,
      name: `แพ็กเกจราคา ${data.name}`,
      description: `แพ็กเกจราคาสำหรับ ${data.stationName}`,
      baseRate: data.baseRate,
      currency: 'THB',
      isActive: true,
      tierType: (data.peakRate && data.offPeakRate) ? PricingTierType.PEAK_OFF_PEAK : PricingTierType.STANDARD,
      peakRate: data.peakRate || null,
      offPeakRate: data.offPeakRate || null
    };

    const pricingTier = await prisma.pricingTier.create({
      data: pricingTierData
    });

    // สร้าง PricingSchedule ถ้ามี peakRate และ offPeakRate
    if (data.peakRate && data.offPeakRate) {
      const peakStart = data.peakStartTime || '09:00';
      const peakEnd = data.peakEndTime || '17:00';
      const offPeakStart = data.offPeakStartTime || '22:00';
      const offPeakEnd = data.offPeakEndTime || '06:00';

      await prisma.pricingSchedule.createMany({
        data: [
          {
            pricingTierId: pricingTier.id,
            startTime: peakStart,
            endTime: peakEnd,
            periodType: PricingPeriod.PEAK,
            rate: data.peakRate,
            isActive: true
          },
          {
            pricingTierId: pricingTier.id,
            startTime: offPeakStart,
            endTime: offPeakEnd,
            periodType: PricingPeriod.OFF_PEAK,
            rate: data.offPeakRate,
            isActive: true
          }
        ]
      });
    }

    // อัปเดต ChargePoint ให้มี defaultPricingTierId
    const updatedChargePoint = await prisma.chargePoint.update({
      where: { id: chargePointId },
      data: { defaultPricingTierId: pricingTier.id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        connectors: true,
        _count: {
          select: {
            sessions: true,
            transactions: true
          }
        }
      }
    });

    return updatedChargePoint;
  }

  /**
   * ค้นหาเครื่องชาร์จทั้งหมด
   */
  async findAllChargePoints(options?: {
    page?: number;
    limit?: number;
    status?: ChargePointStatus;
    protocol?: OCPPVersion;
    ownerId?: string;
    isPublic?: boolean;
  }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (options?.status) where.status = options.status;
    if (options?.protocol) where.protocol = options.protocol;
    if (options?.ownerId) where.ownerId = options.ownerId;
    if (options?.isPublic !== undefined) where.isPublic = options.isPublic;

    const [chargePoints, total] = await Promise.all([
      prisma.chargePoint.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          connectors: true,
          _count: {
            select: {
              sessions: true,
              transactions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.chargePoint.count({ where })
    ]);

    return {
      chargePoints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * ค้นหาเครื่องชาร์จตาม ID
   */
  async findChargePointById(id: string) {
    return await prisma.chargePoint.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        connectors: true,
        sessions: {
          take: 5,
          orderBy: {
            startTime: 'desc'
          }
        },
        transactions: {
          take: 5,
          orderBy: {
            startTime: 'desc'
          }
        },
        _count: {
          select: {
            sessions: true,
            transactions: true
          }
        }
      }
    });
  }

  /**
   * อัปเดตข้อมูลเครื่องชาร์จ
   */
  async updateChargePoint(id: string, data: UpdateChargePointData) {
    const updateData: any = { ...data };

    // ถ้ามีการเปลี่ยน protocol ให้สร้าง WebSocket URL ใหม่
    if (data.protocol) {
      updateData.urlwebSocket = this.generateWebSocketUrl(id, data.protocol);
    }

    return await prisma.chargePoint.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        connectors: true,
        _count: {
          select: {
            sessions: true,
            transactions: true
          }
        }
      }
    });
  }

  /**
   * ลบเครื่องชาร์จ (เปลี่ยนสถานะเป็น UNAVAILABLE)
   */
  async deleteChargePoint(id: string) {
    return await prisma.chargePoint.update({
      where: { id },
      data: {
        status: ChargePointStatus.UNAVAILABLE,
        isPublic: false
      }
    });
  }

  /**
   * ตรวจสอบการเชื่อมต่อ OCPP version
   */
  async validateOCPPConnection(chargePointId: string, requestedVersion: OCPPVersion): Promise<{
    isValid: boolean;
    expectedVersion: OCPPVersion;
    message: string;
  }> {
    const chargePoint = await this.findChargePointById(chargePointId);
    
    if (!chargePoint) {
      return {
        isValid: false,
        expectedVersion: OCPPVersion.OCPP16,
        message: 'ไม่พบเครื่องชาร์จที่ระบุ'
      };
    }

    const isValid = chargePoint.protocol === requestedVersion;
    
    return {
      isValid,
      expectedVersion: chargePoint.protocol,
      message: isValid 
        ? 'เวอร์ชัน OCPP ตรงกัน สามารถเชื่อมต่อได้'
        : `เวอร์ชัน OCPP ไม่ตรงกัน คาดหวัง ${chargePoint.protocol} แต่ได้รับ ${requestedVersion}`
    };
  }

  /**
   * อัปเดต Pricing Schedule สำหรับเครื่องชาร์จ
   */
  async updatePricingSchedule(chargePointId: string, pricingData: {
    baseRate?: number;
    peakRate?: number;
    offPeakRate?: number;
    peakStartTime?: string;
    peakEndTime?: string;
    offPeakStartTime?: string;
    offPeakEndTime?: string;
  }) {
    // ค้นหา PricingTier ที่เชื่อมโยงกับ ChargePoint
    const chargePoint = await prisma.chargePoint.findUnique({
      where: { id: chargePointId },
      include: {
        pricingTiers: {
          include: {
            schedules: true
          }
        }
      }
    });

    if (!chargePoint || !chargePoint.pricingTiers || chargePoint.pricingTiers.length === 0) {
      throw new Error('ไม่พบเครื่องชาร์จหรือ Pricing Tier');
    }

    // ใช้ PricingTier แรก (หรือ default)
    const pricingTier = chargePoint.pricingTiers[0];
    const pricingTierId = pricingTier.id;

    // อัปเดต PricingTier หากมีการเปลี่ยนแปลงราคา
    if (pricingData.baseRate !== undefined || pricingData.peakRate !== undefined || pricingData.offPeakRate !== undefined) {
      await prisma.pricingTier.update({
        where: { id: pricingTierId },
        data: {
          ...(pricingData.baseRate !== undefined && { baseRate: pricingData.baseRate }),
          ...(pricingData.peakRate !== undefined && { peakRate: pricingData.peakRate }),
          ...(pricingData.offPeakRate !== undefined && { offPeakRate: pricingData.offPeakRate }),
          updatedAt: new Date()
        }
      });
    }

    // อัปเดต PricingSchedule หากมีการเปลี่ยนแปลงเวลา
    if (pricingData.peakStartTime !== undefined || pricingData.peakEndTime !== undefined) {
      // หา Peak schedule
      const peakSchedule = pricingTier.schedules.find((s: any) => s.periodType === PricingPeriod.PEAK);
      if (peakSchedule) {
        await prisma.pricingSchedule.update({
          where: { id: peakSchedule.id },
          data: {
            ...(pricingData.peakStartTime !== undefined && { startTime: pricingData.peakStartTime }),
            ...(pricingData.peakEndTime !== undefined && { endTime: pricingData.peakEndTime }),
            updatedAt: new Date()
          }
        });
      }
    }

    if (pricingData.offPeakStartTime !== undefined || pricingData.offPeakEndTime !== undefined) {
      // หา Off-Peak schedule
      const offPeakSchedule = pricingTier.schedules.find((s: any) => s.periodType === PricingPeriod.OFF_PEAK);
      if (offPeakSchedule) {
        await prisma.pricingSchedule.update({
          where: { id: offPeakSchedule.id },
          data: {
            ...(pricingData.offPeakStartTime !== undefined && { startTime: pricingData.offPeakStartTime }),
            ...(pricingData.offPeakEndTime !== undefined && { endTime: pricingData.offPeakEndTime }),
            updatedAt: new Date()
          }
        });
      }
    }

    // ดึงข้อมูลที่อัปเดตแล้ว
    return await prisma.chargePoint.findUnique({
      where: { id: chargePointId },
      include: {
        pricingTiers: {
          include: {
            schedules: true
          }
        }
      }
    });
  }

  /**
   * อัปเดตสถานะการเชื่อมต่อ
   */
  async updateConnectionStatus(chargePointId: string, isConnected: boolean) {
    const status = isConnected ? ChargePointStatus.AVAILABLE : ChargePointStatus.UNAVAILABLE;
    
    return await prisma.chargePoint.update({
      where: { id: chargePointId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * ค้นหาเครื่องชาร์จใกล้เคียง
   */
  async findNearbyChargePoints(latitude: number, longitude: number, radiusKm: number = 10) {
    // ใช้ Haversine formula สำหรับคำนวณระยะทาง
    const chargePoints = await prisma.$queryRaw`
      SELECT *, 
        (6371 * acos(cos(radians(${latitude})) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(${longitude})) + 
        sin(radians(${latitude})) * sin(radians(latitude)))) AS distance
      FROM charge_points 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND status = 'AVAILABLE'
        AND is_public = true
      HAVING distance < ${radiusKm}
      ORDER BY distance
      LIMIT 20
    `;

    return chargePoints;
  }
}