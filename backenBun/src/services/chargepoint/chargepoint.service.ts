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
   * อัปเดตสถานะการเชื่อมต่อของเครื่องชาร์จ
   */
  async updateConnectionStatus(chargePointIdentity: string, isConnected: boolean) {
    try {
      const updatedChargePoint = await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data: {
          lastSeen: new Date(),
          // อัปเดตสถานะตามผลการเชื่อมต่อ
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

    if (/(type\s*2|mennekes|socket|iec\s*62196\s*t2|type-2|type\s*c|typec)/.test(normalized)) {
      return 'TYPE_2';
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
    connectorCount?: number;
  }) {
    const protocol = this.convertProtocolToEnum(data.protocol);
    const chargePointId = data.id || randomUUID();
    const urlwebSocket = this.generateWebSocketUrl(data.chargePointIdentity, protocol);
    const connectorCount = data.connectorCount || 2; // Default to 2 connectors for whitelist

    const newChargePoint = await this.prisma.chargePoint.create({
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
        connectorCount,
        ownershipType: OwnershipType.PRIVATE,
        isWhitelisted: true
      }
    });

    // Create connectors for the charge point
    await this.createConnectorsForChargePoint(
      data.chargePointIdentity,
      connectorCount
    );

    // Fetch the charge point with connectors
    return await this.prisma.chargePoint.findUnique({
      where: { id: chargePointId },
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
      // ตรวจสอบว่าในฐานข้อมูลมี ChargePoint นี้อยู่แล้วหรือไม่
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
        // สร้างเครื่องชาร์จใหม่หากยังไม่มีข้อมูล
        console.log(`Creating new charge point with identity '${chargePointIdentity}' from BootNotification`);
        
        // ตั้งค่าพื้นฐานสำหรับฟิลด์ที่จำเป็น
        const newChargePointData = {
          ...data,
          chargePointIdentity,
          name: `Auto-created: ${chargePointIdentity}`,
          status: 'AVAILABLE',
          isPublic: true,
          isWhitelisted: true,
          connectorCount: 2, // จำนวนหัวชาร์จเริ่มต้น
          powerRating: 22, // กำลังไฟเริ่มต้น (กิโลวัตต์)
          ocppProtocol: updateData.ocppProtocolRaw || 'OCPP16',
          ocppVersion: updateData.ocppProtocolRaw || 'OCPP16'
        };
        
        return await this.createChargePoint(newChargePointData);
      }

      // อัปเดตข้อมูลเครื่องชาร์จที่มีอยู่แล้ว
      return await this.prisma.chargePoint.update({
        where: { chargePointIdentity },
        data,
        include: {
          connectors: true,
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
   * อัปเดตค่า heartbeat (lastSeen) ของเครื่องชาร์จ
   */
  async updateHeartbeat(chargePointIdentity: string, lastSeen: string) {
    try {
      // ตรวจสอบว่ามีข้อมูล ChargePoint นี้ในระบบหรือไม่
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        // สร้างเครื่องชาร์จใหม่หากยังไม่เคยบันทึก
        console.log(`Creating new charge point with identity '${chargePointIdentity}' from heartbeat`);
        
        const newChargePointData = {
          chargePointIdentity,
          name: `Auto-created: ${chargePointIdentity}`,
          status: 'AVAILABLE',
          isPublic: true,
          isWhitelisted: true,
          connectorCount: 2, // จำนวนหัวชาร์จเริ่มต้น
          powerRating: 22, // กำลังไฟเริ่มต้น (กิโลวัตต์)
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
   * อัปเดตสถานะหัวชาร์จจาก StatusNotification
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
      // ขั้นแรกค้นหา ChargePoint ด้วย chargePointIdentity เพื่อดึงไอดี
      const chargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!chargePoint) {
        throw new Error(`Charge point with identity ${chargePointIdentity} not found`);
      }

      // ปรับปรุงเวลาที่เห็นล่าสุดของ ChargePoint
      await this.prisma.chargePoint.update({
        where: { id: chargePoint.id },
        data: {
          lastSeen: new Date()
        }
      });

      // ค้นหาหรือสร้างหัวชาร์จตามหมายเลขที่ได้รับ
      const connector = await this.prisma.connector.upsert({
        where: {
          chargePointId_connectorId: {
            chargePointId: chargePoint.id,
            connectorId: statusData.connectorId
          }
        },
        update: {
          // แปลงสถานะจาก OCPP ให้ตรงกับ enum ภายในระบบ
          status: this.mapOcppStatusToConnectorStatus(statusData.status)
        },
        create: {
          chargePointId: chargePoint.id,
          connectorId: statusData.connectorId,
          status: this.mapOcppStatusToConnectorStatus(statusData.status),
          type: 'TYPE_2' // กำหนดชนิดหัวชาร์จเริ่มต้น
      }
      });

      // บันทึกสถานะที่อัปเดตไว้สำหรับการตรวจสอบ
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
   * แปลงสถานะ OCPP ให้ตรงกับ ConnectorStatus ของระบบ
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

    // สร้างเงื่อนไขสำหรับค้นหาข้อมูล
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

    // ดึงข้อมูลเครื่องชาร์จพร้อมจัดหน้าแบ่งชุดข้อมูล
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
   * ตรวจสอบความถูกต้องการเชื่อมต่อ OCPP ของเครื่องชาร์จ
   */
  async validateOCPPConnection(chargePointId: string, ocppVersion: string): Promise<{ isValid: boolean; message?: string }> {
    try {
      // ค้นหาเครื่องชาร์จด้วย chargePointIdentity (ไม่ใช้ id)
      const chargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity: chargePointId }
      });

      if (!chargePoint) {
        return {
          isValid: false,
          message: 'Charge point not found'
        };
      }

      // ตรวจสอบว่าเครื่องชาร์จได้รับอนุญาตเชื่อมต่อหรือไม่
      if (!chargePoint.isWhitelisted) {
        return {
          isValid: false,
          message: 'Charge point not whitelisted'
        };
      }

      // ตรวจสอบว่าเวอร์ชัน OCPP รองรบบหรือไม่
      const supportedVersions = ['ocpp1.6', 'ocpp2.0', 'ocpp2.0.1'];
      const normalizedVersion = ocppVersion.toLowerCase();
      
      if (!supportedVersions.includes(normalizedVersion)) {
        return {
          isValid: false,
          message: `Unsupported OCPP version: ${ocppVersion}`
        };
      }

      // ตรวจสอบว่าโปรโตคอลของเครื่องชาร์จตรงกับเวอร์ชันที่ร้องขอหรือไม่
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
   * อัปเดตข้อมูลเครื่องชาร์จ
   */
  async updateChargePoint(chargePointIdentity: string, updateData: any) {
    try {
      // ตรวจสอบก่อนว่าเครื่องชาร์จนี้มีอยู่หรือไม่
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        // สร้างเครื่องชาร์จใหม่หากยังไม่มีข้อมูล
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

      // หากมีอยู่แล้วให้อัปเดตข้อมูล
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
   * ปิดการใช้งานเครื่องชาร์จ (ลบเชิงตรรกะ)
   */
  async deleteChargePoint(chargePointIdentity: string) {
    try {
      // ตรวจสอบก่อนว่ามีเครื่องชาร์จนี้หรือไม่
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        return {
          success: false,
          message: `Charge point with identity '${chargePointIdentity}' not found. No action taken.`
        };
      }

      // หากพบให้เปลี่ยนสถานะเป็น UNAVAILABLE
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
   * ปรับตารางราคาของเครื่องชาร์จ
   */
  async updatePricingSchedule(chargePointIdentity: string, pricingData: any) {
    try {
      // ตรวจสอบก่อนว่าเครื่องชาร์จนี้มีอยู่หรือไม่
      const existingChargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        return {
          success: false,
          message: `Charge point with identity '${chargePointIdentity}' not found. Cannot update pricing schedule.`
        };
      }

      // หากมีอยู่แล้วให้อัปเดตราคาตามข้อมูลใหม่
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
   * สร้างเครื่องชาร์จใหม่
   */
  async createChargePoint(data: any) {
    try {
      // Work on a shallow copy so we can safely normalize incoming values
      const sanitizedData: any = { ...data };

      if (sanitizedData.ownerId !== undefined) {
        const normalizedOwnerId =
          typeof sanitizedData.ownerId === 'string'
            ? sanitizedData.ownerId.trim()
            : sanitizedData.ownerId;

        if (!normalizedOwnerId) {
          sanitizedData.ownerId = null;
        } else {
          const existingOwner = await this.prisma.user.findUnique({
            where: { id: normalizedOwnerId }
          });

          if (!existingOwner) {
            throw new Error(`Owner with id '${normalizedOwnerId}' was not found`);
          }

          sanitizedData.ownerId = normalizedOwnerId;
        }
      }

      // Extract connectorCount from data if provided, default to 1
      const connectorCount = sanitizedData.connectorCount || 1;

      // Create the charge point first
      const newChargePoint = await this.prisma.chargePoint.create({
        data: sanitizedData,
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

      // Create connectors for the charge point
      if (connectorCount > 0) {
        await this.createConnectorsForChargePoint(
          newChargePoint.chargePointIdentity,
          connectorCount
        );
      }

      // Fetch the charge point again with connectors included
      const chargePointWithConnectors = await this.prisma.chargePoint.findUnique({
        where: { id: newChargePoint.id },
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

      return chargePointWithConnectors;
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
        // สร้างผลลัพธ์มาตรฐานเมื่อไม่พบข้อมูลเครื่องชาร์จ
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
        // สร้างข้อมูลเครื่องชาร์จใหม่หากยังไม่มี
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

      // Ensure chargePoint is not null at this point
      if (!chargePoint) {
        throw new Error(`Failed to create or find charge point with identity ${chargePointIdentity}`);
      }

      const detailMap = new Map<number, { type?: string; maxCurrent?: number }>();

      for (const detail of connectorDetails || []) {
        const parsedId = Number.parseInt(String(detail.connectorId ?? ''), 10);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          continue;
        }

        const rawType = (detail as any).type;
        const sanitizedType =
          typeof rawType === 'string' && rawType.trim()
            ? rawType.trim()
            : undefined;

        const rawMaxCurrent = (detail as any).maxCurrent;
        let sanitizedMaxCurrent: number | undefined;
        if (typeof rawMaxCurrent === 'number' && Number.isFinite(rawMaxCurrent)) {
          sanitizedMaxCurrent = rawMaxCurrent;
        } else if (typeof rawMaxCurrent === 'string' && rawMaxCurrent.trim() !== '') {
          const parsedCurrent = Number.parseFloat(rawMaxCurrent);
          sanitizedMaxCurrent = Number.isFinite(parsedCurrent) ? parsedCurrent : undefined;
        }

        detailMap.set(parsedId, {
          type: sanitizedType,
          maxCurrent: sanitizedMaxCurrent
        });
      }

      const maxDetailConnectorId = Array.from(detailMap.keys()).reduce(
        (max, connectorId) => Math.max(max, connectorId),
        0
      );

      const parsedConnectorCount = Number.isFinite(numberOfConnectors)
        ? numberOfConnectors
        : Number.parseInt(String(numberOfConnectors ?? ''), 10);
      const safeConnectorCount = Number.isFinite(parsedConnectorCount)
        ? Math.max(0, Math.trunc(parsedConnectorCount))
        : 0;
      const totalConnectors = Math.max(safeConnectorCount, maxDetailConnectorId);

      if (!Number.isFinite(totalConnectors) || totalConnectors <= 0) {
        console.log(`No connectors specified for charge point ${chargePointIdentity}, skipping connector creation`);
        return [];
      }

      const totalConnectorSlots = Math.trunc(totalConnectors);
      const connectors = [];
      
      // สร้างหัวชาร์จตามจำนวนที่ต้องการ (เริ่มจาก connectorId = 1)
      for (let i = 1; i <= totalConnectorSlots; i++) {
        const detail = detailMap.get(i);
        const rawType = typeof detail?.type === 'string' && detail.type.trim()
          ? detail.type.trim()
          : undefined;
        const createData: any = {
          chargePointId: chargePoint!.id,
          connectorId: i,
          type: this.normalizeConnectorType(rawType),
          typeDescription: rawType,
          status: 'AVAILABLE'
        };

        if (typeof detail?.maxCurrent === 'number') {
          createData.maxCurrent = detail.maxCurrent;
        }

        const updateData: any = {
          status: 'AVAILABLE'
        };

        if (rawType) {
          updateData.type = this.normalizeConnectorType(rawType);
          updateData.typeDescription = rawType;
        }

        if (typeof detail?.maxCurrent === 'number') {
          updateData.maxCurrent = detail.maxCurrent;
        }

        const connector = await this.prisma.connector.upsert({
          where: {
            chargePointId_connectorId: {
              chargePointId: chargePoint!.id,
              connectorId: i
            }
          },
          update: updateData,
          create: createData
        });
        
        connectors.push(connector);
      }

      if (chargePoint!.connectorCount !== totalConnectorSlots) {
        await this.prisma.chargePoint.update({
          where: { id: chargePoint!.id },
          data: { connectorCount: totalConnectorSlots }
        });
      }

      console.log(`Created/updated ${totalConnectorSlots} connectors for charge point ${chargePointIdentity}`);
      return connectors;
    } catch (error: any) {
      console.error('Error creating connectors:', error);
      throw new Error(`Failed to create connectors: ${error.message}`);
     }
   }

  /**
   * ค้นหา ChargePoint และ Connector จากฐานข้อมูล และสร้าง WebSocket URL
   */
  async getWebSocketUrl(chargePointIdentity: string, connectorId: number) {
    try {
      // ค้นหา ChargePoint จาก chargePointIdentity
      const chargePoint = await this.prisma.chargePoint.findUnique({
        where: { chargePointIdentity },
        include: {
          connectors: {
            where: { connectorId }
          }
        }
      });

      if (!chargePoint) {
        throw new Error(`ChargePoint with identity '${chargePointIdentity}' not found`);
      }

      // ตรวจสอบว่ามี connector ที่ระบุหรือไม่
      const connector = chargePoint.connectors.find(c => c.connectorId === connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found for ChargePoint '${chargePointIdentity}'`);
      }

      // Note: pricingTier functionality removed as it doesn't exist in schema

      // สร้าง WebSocket URL ตามรูปแบบที่กำหนด
      const websocketUrl = `ws://localhost:3000/user-cp/${chargePointIdentity}/${connectorId}`;
      console.log("respone websocketUrl", websocketUrl)
      return {
        chargePoint: {
          id: chargePoint.id,
          chargePointIdentity: chargePoint.chargePointIdentity,
          name: chargePoint.name,
          stationName: chargePoint.stationName,
          location: chargePoint.location,
          openingHours: chargePoint.openingHours,
          is24Hours: chargePoint.is24Hours,
          protocol: chargePoint.protocol,
          powerRating: chargePoint.powerRating,
          brand: chargePoint.brand,
          status: chargePoint.status
        },
        connector: {
          id: connector.id,
          connectorId: connector.connectorId,
          type: connector.type,
          status: connector.status,
          maxCurrent: connector.maxCurrent,
          maxPower: connector.maxPower
        },
        websocketUrl
      };
    } catch (error: any) {
      console.error('Error getting WebSocket URL:', error);
      throw new Error(`Failed to get WebSocket URL: ${error.message}`);
    }
  }
}
