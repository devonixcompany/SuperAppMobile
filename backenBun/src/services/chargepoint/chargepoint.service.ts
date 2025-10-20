import type { PrismaClient } from '@prisma/client';
import { ChargePointStatus, OCPPVersion, OwnershipType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';

export class ChargePointService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  /**
   * Update charge point connection status
   */
  async updateConnectionStatus(chargePointIdentity: string, isConnected: boolean) {
    try {
      const updatedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: {
          lastSeen: new Date(),
          // อัปเดต status ตาม connection status
          status: isConnected ? 'AVAILABLE' : 'UNAVAILABLE'
        },
        include: {
          connectors: true,
          owner: true
        }
      });

      return updatedChargePoint;
    } catch (error: any) {
      console.error('Error updating connection status:', error);
      throw new Error(`Failed to update connection status: ${error.message}`);
    }
  }

  /**
   * ดึงข้อมูลเครื่องชาร์จทั้งหมดสำหรับ ws-gateway
   */
  async getAllChargePointsForWSGateway() {
    return await this.prisma.chargePoint.findMany({
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
    return `${wsGatewayUrl}/ocpp/${chargePointId}`;
  }

  /**
   * แปลง protocol string เป็น OCPPVersion enum
   */
  private convertProtocolToEnum(protocol: string): OCPPVersion {
    const protocolMap: { [key: string]: OCPPVersion } = {
      'ocpp1.6': 'OCPP16',
      'ocpp2.0': 'OCPP20',
      'ocpp2.0.1': 'OCPP21'
    };
    return protocolMap[protocol.toLowerCase()] || 'OCPP16';
  }

  /**
   * สร้างเครื่องชาร์จใหม่สำหรับ whitelist
   */
  async createChargePointForWhitelist(data: {
    id?: string;
    name: string;
    stationName: string;
    location: string;
    serialNumber: string;
    chargePointIdentity: string;
    protocol: string;
    brand: string;
    powerRating: number;
    latitude?: number;
    longitude?: number;
    description?: string;
  }) {
    const protocol = this.convertProtocolToEnum(data.protocol);
    const chargePointId = data.id || randomUUID();
    const urlwebSocket = this.generateWebSocketUrl(data.chargePointIdentity, protocol);

    return await this.prisma.chargePoint.create({
      data: {
        id: chargePointId,
        name: data.name,
        stationName: data.stationName,
        location: data.location,
        serialNumber: data.serialNumber,
        protocol,
        chargePointIdentity: data.chargePointIdentity,
        urlwebSocket,
        brand: data.brand,
        powerRating: data.powerRating,
        ownershipType: OwnershipType.PRIVATE,
        isWhitelisted: true
      }
    });
  }

  /**
   * ค้นหาเครื่องชาร์จด้วย Serial Number และ Charge Point Identity
   */
  async findBySerialAndIdentity(serialNumber: string, chargePointIdentity: string) {
    return await this.prisma.chargePoint.findFirst({
      where: {
        AND: [
          { serialNumber },
          { chargePointIdentity }
        ]
      }
    });
  }

  /**
   * ค้นหาเครื่องชาร์จด้วย Serial Number
   */
  async findBySerialNumber(serialNumber: string) {
    return await this.prisma.chargePoint.findFirst({
      where: {
        serialNumber
      }
    });
  }

  /**
   * ค้นหาเครื่องชาร์จด้วย Charge Point Identity
   */
  async findByChargePointIdentity(chargePointIdentity: string) {
    return await this.prisma.chargePoint.findFirst({
      where: {
        chargePointIdentity
      }
    });
  }

  /**
   * อัปเดตข้อมูลเครื่องชาร์จจาก BootNotification
   */
  async updateFromBootNotification(chargePointIdentity: string, updateData: {
    vendor?: string;
    model?: string;
    firmwareVersion?: string;
    serialNumber?: string;
    lastSeen?: string;
    heartbeatIntervalSec?: number;
    ocppProtocolRaw?: string;
  }) {
    try {
      // ตรวจสอบว่า ChargePoint มีอยู่จริงหรือไม่
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        throw new Error(`ChargePoint with identity '${chargePointIdentity}' not found in database. Please add this charge point to the system first.`);
      }

      const data: any = {
        lastSeen: new Date()
      };
      
      if (updateData.vendor) data.vendor = updateData.vendor;
      if (updateData.model) data.model = updateData.model;
      if (updateData.firmwareVersion) data.firmwareVersion = updateData.firmwareVersion;
      if (updateData.serialNumber) data.serialNumber = updateData.serialNumber;
      if (updateData.lastSeen) data.lastSeen = new Date(updateData.lastSeen);
      if (updateData.heartbeatIntervalSec) data.heartbeatIntervalSec = updateData.heartbeatIntervalSec;
      if (updateData.ocppProtocolRaw) data.ocppProtocolRaw = updateData.ocppProtocolRaw;

      return await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data,
        include: {
          connectors: true,
          pricingTiers: true,
          owner: true
        }
      });
    } catch (error: any) {
      console.error('Error updating from boot notification:', error);
      if (error.code === 'P2025') {
        throw new Error(`ChargePoint with identity '${chargePointIdentity}' not found in database. Please add this charge point to the system first.`);
      }
      throw error;
    }
  }

  /**
   * Update charge point heartbeat (lastSeen timestamp)
   */
  async updateHeartbeat(chargePointIdentity: string, lastSeen: string) {
    try {
      // ตรวจสอบว่า ChargePoint มีอยู่จริงหรือไม่
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        throw new Error(`ChargePoint with identity '${chargePointIdentity}' not found in database. Please add this charge point to the system first.`);
      }

      const updatedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: {
          lastSeen: new Date(lastSeen)
        },
        include: {
          connectors: true,
          owner: true
        }
      });

      return updatedChargePoint;
    } catch (error: any) {
      console.error('Error updating heartbeat:', error);
      if (error.code === 'P2025') {
        throw new Error(`ChargePoint with identity '${chargePointIdentity}' not found in database. Please add this charge point to the system first.`);
      }
      throw new Error(`Failed to update heartbeat: ${error.message}`);
    }
  }

  /**
   * Update connector status from StatusNotification
   */
  async updateConnectorStatus(chargePointIdentity: string, statusData: {
    connectorId: number;
    status: string;
    errorCode: string;
    timestamp?: string;
    info?: string;
    vendorId?: string;
    vendorErrorCode?: string;
  }) {
    try {
      // First, find the charge point by chargePointIdentity to get its id
      const chargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!chargePoint) {
        throw new Error(`Charge point with identity ${chargePointIdentity} not found`);
      }

      // Update the charge point's lastSeen
      await this.prisma.chargePoint.update({
        where: { id: chargePoint.id },
        data: {
          lastSeen: new Date()
        }
      });

      // Find or create the connector
      const connector = await this.prisma.connector.upsert({
        where: {
          chargePointId_connectorId: {
            chargePointId: chargePoint.id,
            connectorId: statusData.connectorId
          }
        },
        update: {
          // Map OCPP status to our enum
          status: this.mapOcppStatusToConnectorStatus(statusData.status)
        },
        create: {
          chargePointId: chargePoint.id,
          connectorId: statusData.connectorId,
          status: this.mapOcppStatusToConnectorStatus(statusData.status),
          type: 'TYPE_2' // Default connector type
        }
      });

      // Log the status update for debugging
      console.log(`Updated connector ${statusData.connectorId} for charge point ${chargePointIdentity}:`, {
        status: statusData.status,
        errorCode: statusData.errorCode,
        timestamp: statusData.timestamp
      });

      return {
        connector,
        statusUpdate: {
          connectorId: statusData.connectorId,
          status: statusData.status,
          errorCode: statusData.errorCode,
          timestamp: statusData.timestamp || new Date().toISOString(),
          info: statusData.info,
          vendorId: statusData.vendorId,
          vendorErrorCode: statusData.vendorErrorCode
        }
      };
    } catch (error: any) {
      console.error('Error updating connector status:', error);
      throw new Error(`Failed to update connector status: ${error.message}`);
    }
  }

  /**
   * Map OCPP status to our ConnectorStatus enum
   */
  private mapOcppStatusToConnectorStatus(ocppStatus: string): any {
    const statusMap: { [key: string]: string } = {
      'Available': 'AVAILABLE',
      'Occupied': 'OCCUPIED',
      'Reserved': 'RESERVED',
      'Unavailable': 'UNAVAILABLE',
      'Faulted': 'FAULTED'
    };

    return statusMap[ocppStatus] || 'UNAVAILABLE';
  }

  /**
   * ดึงข้อมูลเครื่องชาร์จทั้งหมดพร้อม pagination และ filtering
   */
  async findAllChargePoints(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: ChargePointStatus;
    protocol?: OCPPVersion;
    ownerId?: string;
    isPublic?: boolean;
  } = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      protocol,
      ownerId,
      isPublic
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (protocol) {
      where.protocol = protocol;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    // Get charge points with pagination
    const [chargePoints, total] = await Promise.all([
      this.prisma.chargePoint.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true
            }
          },
          connectors: true,
          _count: {
            select: {
              transactions: true,
              sessions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.chargePoint.count({ where })
    ]);

    return {
      data: chargePoints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Validate OCPP connection for a charge point
   */
  async validateOCPPConnection(chargePointId: string, ocppVersion: string): Promise<{ isValid: boolean; message?: string }> {
    try {
      // Find the charge point by chargePointIdentity (not by id)
      const chargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity: chargePointId }
      });

      if (!chargePoint) {
        return {
          isValid: false,
          message: 'Charge point not found'
        };
      }

      // Check if the charge point is whitelisted
      if (!chargePoint.isWhitelisted) {
        return {
          isValid: false,
          message: 'Charge point not whitelisted'
        };
      }

      // Validate OCPP version compatibility
      const supportedVersions = ['ocpp1.6', 'ocpp2.0', 'ocpp2.0.1'];
      const normalizedVersion = ocppVersion.toLowerCase();
      
      if (!supportedVersions.includes(normalizedVersion)) {
        return {
          isValid: false,
          message: `Unsupported OCPP version: ${ocppVersion}`
        };
      }

      // Check if the charge point's protocol matches the requested version
      const protocolMap: { [key: string]: string } = {
        'OCPP16': 'ocpp1.6',
        'OCPP20': 'ocpp2.0',
        'OCPP21': 'ocpp2.0.1'
      };

      const expectedVersion = protocolMap[chargePoint.protocol];
      if (expectedVersion && expectedVersion !== normalizedVersion) {
        return {
          isValid: false,
          message: `Protocol mismatch. Expected: ${expectedVersion}, Received: ${normalizedVersion}`
        };
      }

      return {
        isValid: true,
        message: 'OCPP connection validated successfully'
      };
    } catch (error: any) {
      console.error('Error validating OCPP connection:', error);
      return {
        isValid: false,
        message: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Update charge point data
   */
  async updateChargePoint(chargePointIdentity: string, updateData: any) {
    try {
      const updatedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: updateData,
        include: {
          owner: true,
          connectors: true,
          _count: {
            select: {
              transactions: true,
              sessions: true
            }
          }
        }
      });

      return updatedChargePoint;
    } catch (error: any) {
      console.error('Error updating charge point:', error);
      throw new Error(`Failed to update charge point: ${error.message}`);
    }
  }

  /**
   * Delete (disable) charge point
   */
  async deleteChargePoint(chargePointIdentity: string) {
    try {
      const deletedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: {
          status: 'UNAVAILABLE'
        }
      });

      return deletedChargePoint;
    } catch (error: any) {
      console.error('Error deleting charge point:', error);
      throw new Error(`Failed to delete charge point: ${error.message}`);
    }
  }

  /**
   * Update pricing schedule for charge point
   */
  async updatePricingSchedule(chargePointIdentity: string, pricingData: any) {
    try {
      const updatedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: pricingData,
        include: {
          owner: true,
          connectors: true
        }
      });

      return updatedChargePoint;
    } catch (error: any) {
      console.error('Error updating pricing schedule:', error);
      throw new Error(`Failed to update pricing schedule: ${error.message}`);
    }
  }

  /**
   * Create new charge point
   */
  async createChargePoint(data: any) {
    try {
      const newChargePoint = await this.prisma.chargePoint.create({
        data,
        include: {
          owner: true,
          connectors: true,
          _count: {
            select: {
              transactions: true,
              sessions: true
            }
          }
        }
      });

      return newChargePoint;
    } catch (error: any) {
      console.error('Error creating charge point:', error);
      throw new Error(`Failed to create charge point: ${error.message}`);
    }
  }
}