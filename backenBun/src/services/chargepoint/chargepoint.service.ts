import type { PrismaClient } from '@prisma/client';
import { ChargePointStatus, ConnectorType, OCPPVersion, OwnershipType } from '@prisma/client';
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
    return await this.prisma.chargePoint.findMany(
      {
      select: {
        //ดึงทั้งหมดฃ
      
        id: true,
        name: true,
        stationName: true,
        location: true,
        latitude: true,
        longitude: true,
        openingHours: true,
        is24Hours: true,
        brand: true,
        serialNumber: true,
        powerRating: true,
        protocol: true,
        chargePointIdentity: true,
        status: true,
        connectorCount: true,
        lastSeen: true,
        heartbeatIntervalSec: true,
        vendor: true,
        model: true,
        firmwareVersion: true,
        ocppProtocolRaw: true,
        isWhitelisted: true,
        ownerId: true,
        ownershipType: true,
        isPublic: true,
        defaultPricingTierId: true,
        urlwebSocket: true
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
   * แปลงชนิดหัวชาร์จจากข้อความ OCPP ให้เป็น ConnectorType enum
   */
  private normalizeConnectorType(type?: string): ConnectorType {
    if (!type) {
      return 'TYPE_2';
    }

    const normalized = type.trim().toLowerCase();

    if (/(type\s*[1i]|j1772|sae\s*combo?\s*1)/.test(normalized)) {
      return 'TYPE_1';
    }

    if (/(type\s*2|mennekes|socket|iec\s*62196\s*t2|type-2)/.test(normalized)) {
      return 'TYPE_2';
    }

    if (/(type\s*c|typec)/.test(normalized)) {
      return 'GB_T';
    }

    if (/(ccs\s*combo?\s*1|combo\s*1|ccs1)/.test(normalized)) {
      return 'CCS_COMBO_1';
    }

    if (/(ccs\s*combo?\s*2|combo\s*2|ccs2|ccs\s*type\s*2)/.test(normalized)) {
      return 'CCS_COMBO_2';
    }

    if (/(gb\/?t|gb_t|guobiao)/.test(normalized)) {
      return 'GB_T';
    }

    if (/chade?mo/.test(normalized)) {
      return 'CHADEMO';
    }

    if (/tesla|type\s*e/.test(normalized)) {
      return 'TESLA';
    }

    return 'TYPE_2';
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

      if (!existingChargePoint) {
        // Create a new charge point if it doesn't exist
        console.log(`Creating new charge point with identity '${chargePointIdentity}' from BootNotification`);
        
        // Set default values for required fields
        const newChargePointData = {
          ...data,
          chargePointIdentity,
          name: `Auto-created: ${chargePointIdentity}`,
          status: 'Available',
          isPublic: true,
          isWhitelisted: true,
          connectorCount: 2, // Default connector count
          powerRating: 22, // Default power rating in kW
          ocppProtocol: updateData.ocppProtocolRaw || 'OCPP16',
          ocppVersion: updateData.ocppProtocolRaw || 'OCPP16'
        };
        
        return await this.createChargePoint(newChargePointData);
      }

      // Update existing charge point
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
        // Create a new charge point if it doesn't exist
        console.log(`Creating new charge point with identity '${chargePointIdentity}' from heartbeat`);
        
        const newChargePointData = {
          chargePointIdentity,
          name: `Auto-created: ${chargePointIdentity}`,
          status: 'Available',
          isPublic: true,
          isWhitelisted: true,
          connectorCount: 2, // Default connector count
          powerRating: 22, // Default power rating in kW
          ocppProtocol: 'OCPP16',
          ocppVersion: 'OCPP16',
          lastSeen: new Date(lastSeen)
        };
        
        return await this.createChargePoint(newChargePointData);
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
      // First check if the charge point exists
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        // Create a new charge point if it doesn't exist
        return await this.createChargePoint({
          id: randomUUID(),
          name: updateData.name || `Charge Point ${chargePointIdentity}`,
          stationName: updateData.stationName || `Station ${chargePointIdentity}`,
          location: updateData.location || 'Unknown Location',
          serialNumber: updateData.serialNumber || `SN-${chargePointIdentity}`,
          chargePointIdentity,
          protocol: updateData.protocol || 'OCPP16',
          brand: updateData.brand || 'Unknown',
          powerRating: updateData.powerRating || 22,
          latitude: updateData.latitude,
          longitude: updateData.longitude,
          description: updateData.description
        });
      }

      // If it exists, update it
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
      // First check if the charge point exists
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        return {
          success: false,
          message: `Charge point with identity '${chargePointIdentity}' not found. No action taken.`
        };
      }

      // If it exists, update its status to UNAVAILABLE
      const deletedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: {
          status: 'UNAVAILABLE'
        }
      });

      return {
        success: true,
        message: `Charge point '${chargePointIdentity}' has been disabled.`,
        data: deletedChargePoint
      };
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
      // First check if the charge point exists
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        return {
          success: false,
          message: `Charge point with identity '${chargePointIdentity}' not found. Cannot update pricing schedule.`
        };
      }

      // If it exists, update its pricing schedule
      const updatedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: pricingData,
        include: {
          owner: true,
          connectors: true
        }
      });

      return {
        success: true,
        message: `Pricing schedule updated for charge point '${chargePointIdentity}'.`,
        data: updatedChargePoint
      };
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

  /**
   * ตรวจสอบว่าเครื่องชาร์จมีข้อมูล connectors ในฐานข้อมูลหรือไม่
   */
  async hasConnectorData(chargePointIdentity: string): Promise<{ hasConnectors: boolean; connectorCount: number; connectors?: any[] }> {
    try {
      const chargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity },
        include: {
          connectors: true
        }
      });

      if (!chargePoint) {
        // Return a consistent response for non-existent charge points
        console.log(`Charge point with identity ${chargePointIdentity} not found, returning no connectors`);
        return {
          hasConnectors: false,
          connectorCount: 0
        };
      }

      const hasConnectors = chargePoint.connectors.length > 0;
      const connectorCount = chargePoint.connectors.length;

      return {
        hasConnectors,
        connectorCount,
        connectors: hasConnectors ? chargePoint.connectors : undefined
      };
    } catch (error: any) {
      console.error('Error checking connector data:', error);
      throw new Error(`Failed to check connector data: ${error.message}`);
    }
  }

  /**
   * สร้าง connectors สำหรับเครื่องชาร์จตามจำนวนที่ระบุ
   */
  async createConnectorsForChargePoint(
    chargePointIdentity: string,
    numberOfConnectors: number,
    connectorDetails: Array<{ connectorId: number; type?: string; maxCurrent?: number }> = []
  ): Promise<any[]> {
    try {
      let chargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!chargePoint) {
        // Create a new charge point if it doesn't exist
        console.log(`Charge point with identity ${chargePointIdentity} not found, creating a new one`);
        chargePoint = await this.createChargePoint({
          id: randomUUID(),
          name: `Charge Point ${chargePointIdentity}`,
          stationName: `Station ${chargePointIdentity}`,
          location: 'Unknown Location',
          serialNumber: `SN-${chargePointIdentity}`,
          chargePointIdentity,
          protocol: 'OCPP16',
          brand: 'Unknown',
          powerRating: 22
        });
      }

      const normalizedDetails = (connectorDetails || [])
        .filter(detail => Number.isInteger(detail.connectorId) && detail.connectorId > 0)
        .map(detail => ({
          connectorId: detail.connectorId,
          type: detail.type,
          maxCurrent: typeof detail.maxCurrent === 'number' ? detail.maxCurrent : undefined
        }));

      const detailMap = new Map<number, { type?: string; maxCurrent?: number }>();
      normalizedDetails.forEach(detail => {
        detailMap.set(detail.connectorId, detail);
      });

      const maxDetailConnectorId = normalizedDetails.reduce(
        (max, detail) => Math.max(max, detail.connectorId),
        0
      );
      const totalConnectors = Math.max(numberOfConnectors, maxDetailConnectorId);

      if (totalConnectors === 0) {
        console.log(`No connectors specified for charge point ${chargePointIdentity}, skipping connector creation`);
        return [];
      }

      const connectors = [];
      
      // สร้าง connectors ตามจำนวนที่ระบุ (เริ่มจาก connectorId = 1)
      for (let i = 1; i <= totalConnectors; i++) {
        const detail = detailMap.get(i);

        const createData: any = {
          chargePointId: chargePoint.id,
          connectorId: i,
          type: this.normalizeConnectorType(detail?.type),
          status: 'AVAILABLE'
        };

        if (typeof detail?.maxCurrent === 'number') {
          createData.maxCurrent = detail.maxCurrent;
        }

        const updateData: any = {
          status: 'AVAILABLE'
        };

        if (detail?.type) {
          updateData.type = this.normalizeConnectorType(detail.type);
        }

        if (typeof detail?.maxCurrent === 'number') {
          updateData.maxCurrent = detail.maxCurrent;
        }

        const connector = await this.prisma.connector.upsert({
          where: {
            chargePointId_connectorId: {
              chargePointId: chargePoint.id,
              connectorId: i
            }
          },
          update: updateData,
          create: createData
        });
        
        connectors.push(connector);
      }

      if (chargePoint.connectorCount !== totalConnectors) {
        await this.prisma.chargePoint.update({
          where: { id: chargePoint.id },
          data: { connectorCount: totalConnectors }
        });
      }

      console.log(`Created/updated ${totalConnectors} connectors for charge point ${chargePointIdentity}`);
      return connectors;
    } catch (error: any) {
      console.error('Error creating connectors:', error);
      throw new Error(`Failed to create connectors: ${error.message}`);
     }
   }
}
