import type { PrismaClient } from '@prisma/client';
import { ChargePointStatus, ConnectorStatus, ConnectorType, OCPPVersion, OwnershipType } from '@prisma/client';
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
      const updatedChargePoint = await this.prisma.charge_points.update({
        where: { chargePointIdentity },
        data: {
          lastSeen: new Date(),
          // อัปเดตสถานะตามผลการเชื่อมต่อ
          chargepointstatus: isConnected ? ChargePointStatus.AVAILABLE : ChargePointStatus.UNAVAILABLE
        },
        include: {
          connectors: true,
          User: true
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
    const chargePoints = await this.prisma.charge_points.findMany({
      include: {
        Station: true
      }
    });

    return chargePoints.map((cp: any) => ({
      id: cp.id,
      name: cp.chargepointname,
      stationName: cp.Station?.stationname ?? null,
      location: cp.Station?.location ?? null,
      latitude: cp.Station?.latitude
        ? Number(cp.Station.latitude)
        : null,
      longitude: cp.Station?.longitude
        ? Number(cp.Station.longitude)
        : null,
      openingHours: cp.openingHours,
      is24Hours: cp.is24Hours,
      brand: cp.brand,
      serialNumber: cp.serialNumber,
      powerRating: cp.powerRating,
      powerSystem: cp.powerSystem,
      protocol: cp.protocol,
      chargePointIdentity: cp.chargePointIdentity,
      status: cp.chargepointstatus,
      connectorCount: cp.connectorCount,
      lastSeen: cp.lastSeen,
      heartbeatIntervalSec: cp.heartbeatIntervalSec,
      vendor: cp.vendor,
      model: cp.model,
      firmwareVersion: cp.firmwareVersion,
      ocppProtocolRaw: cp.ocppProtocolRaw,
      onPeakRate: cp.Station?.onPeakRate ?? null,
      onPeakStartTime: cp.Station?.onPeakStartTime ?? null,
      onPeakEndTime: cp.Station?.onPeakEndTime ?? null,
      offPeakRate: cp.Station?.offPeakRate ?? null,
      offPeakStartTime: cp.Station?.offPeakStartTime ?? null,
      offPeakEndTime: cp.Station?.offPeakEndTime ?? null,
      isWhitelisted: cp.isWhitelisted,
      ownerId: cp.ownerId,
      ownershipType: cp.ownershipType,
      isPublic: cp.isPublic,
      urlwebSocket: cp.urlwebSocket
    }));
  }

  /**
   * สร้าง WebSocket URL สำหรับเครื่องชาร์จ
   */
  private generateWebSocketUrl(chargePointId: string, protocol: OCPPVersion): string {
    const wsGatewayUrl = process.env.WEBSOCKET_URL || 'ws://localhost:3000';
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

  private buildStationPayload(source: any) {
    const payload: Record<string, any> = {};

    if (typeof source?.stationName === 'string' && source.stationName.trim()) {
      payload.stationname = source.stationName.trim();
    }
    if (typeof source?.stationname === 'string' && source.stationname.trim()) {
      payload.stationname = source.stationname.trim();
    }
    if (source?.location !== undefined) {
      payload.location =
        typeof source.location === 'string' && source.location.trim()
          ? source.location.trim()
          : source.location ?? 'Unknown Location';
    }
    if (source?.latitude !== undefined) {
      payload.latitude = source.latitude;
    }
    if (source?.longitude !== undefined) {
      payload.longitude = source.longitude;
    }
    if (source?.onPeakRate !== undefined) {
      payload.onPeakRate = source.onPeakRate;
    }
    if (source?.onPeakStartTime !== undefined) {
      payload.onPeakStartTime = source.onPeakStartTime;
    }
    if (source?.onPeakEndTime !== undefined) {
      payload.onPeakEndTime = source.onPeakEndTime;
    }
    if (source?.offPeakRate !== undefined) {
      payload.offPeakRate = source.offPeakRate;
    }
    if (source?.offPeakStartTime !== undefined) {
      payload.offPeakStartTime = source.offPeakStartTime;
    }
    if (source?.offPeakEndTime !== undefined) {
      payload.offPeakEndTime = source.offPeakEndTime;
    }

    return payload;
  }

  private ensureStationDefaults(
    payload: Record<string, any>,
    fallbackLocation: string
  ) {
    const defaults = {
      location:
        typeof payload.location === 'string' && payload.location.trim()
          ? payload.location
          : fallbackLocation,
      onPeakRate:
        typeof payload.onPeakRate === 'number' ? payload.onPeakRate : 10,
      onPeakStartTime:
        typeof payload.onPeakStartTime === 'string'
          ? payload.onPeakStartTime
          : '10:00',
      onPeakEndTime:
        typeof payload.onPeakEndTime === 'string'
          ? payload.onPeakEndTime
          : '12:00',
      offPeakRate:
        typeof payload.offPeakRate === 'number' ? payload.offPeakRate : 20,
      offPeakStartTime:
        typeof payload.offPeakStartTime === 'string'
          ? payload.offPeakStartTime
          : '16:00',
      offPeakEndTime:
        typeof payload.offPeakEndTime === 'string'
          ? payload.offPeakEndTime
          : '22:00'
    };

    return { ...defaults, ...payload };
  }

  private hasStationUpdates(payload: Record<string, any>) {
    return Object.keys(payload).length > 0;
  }

  private omitUndefined<T extends Record<string, any>>(source: T) {
    return Object.fromEntries(
      Object.entries(source).filter(([, value]) => value !== undefined)
    ) as Partial<T>;
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
    isWhitelisted?: boolean;
    isPublic?: boolean;
  }) {
    const protocol = this.convertProtocolToEnum(data.protocol);
    const chargePointId = data.id || randomUUID();
    const urlwebSocket = this.generateWebSocketUrl(data.chargePointIdentity, protocol);
    const connectorCount = data.connectorCount || 2; // Default to 2 connectors for whitelist

    let stationId: string | undefined;
    const stationPayload = this.buildStationPayload(data);
    const { stationname: requestedStationName, ...stationFields } = stationPayload;
    const normalizedStationName =
      typeof requestedStationName === 'string' && requestedStationName.trim()
        ? requestedStationName.trim()
        : typeof data.stationName === 'string' && data.stationName.trim()
          ? data.stationName.trim()
          : undefined;
    const fallbackLocation =
      typeof stationFields.location === 'string' && stationFields.location.trim()
        ? stationFields.location
        : typeof data.location === 'string' && data.location.trim()
          ? data.location.trim()
          : 'Unknown Location';

    if (normalizedStationName) {
      const existingStation = await this.prisma.station.findUnique({
        where: { stationname: normalizedStationName }
      });

      if (existingStation) {
        const updateData = this.omitUndefined({
          ...stationFields,
          ...(requestedStationName &&
          requestedStationName !== existingStation.stationname
            ? { stationname: requestedStationName }
            : {})
        });

        if (this.hasStationUpdates(updateData)) {
          updateData.updatedAt = new Date();
          await this.prisma.station.update({
            where: { id: existingStation.id },
            data: updateData
          });
        }

        stationId = existingStation.id;
      } else {
        const baseData = this.ensureStationDefaults(
          stationFields,
          fallbackLocation
        );

        const station = await this.prisma.station.create({
          data: this.omitUndefined({
            id: randomUUID(),
            stationname: normalizedStationName,
            ...baseData,
            updatedAt: new Date()
          })
        });

        stationId = station.id;
      }
    } else {
      const generatedName = `Station-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const baseData = this.ensureStationDefaults(stationFields, fallbackLocation);

      const station = await this.prisma.station.create({
        data: this.omitUndefined({
          id: randomUUID(),
          stationname: requestedStationName ?? generatedName,
          ...baseData,
          updatedAt: new Date()
        })
      });

      stationId = station.id;
    }

    const newChargePoint = await this.prisma.charge_points.create({
      data: {
        id: chargePointId,
        chargepointname: data.name,
        stationId,
        serialNumber: data.serialNumber,
        protocol,
        chargePointIdentity: data.chargePointIdentity,
        urlwebSocket,
        brand: data.brand,
        powerRating: data.powerRating,
        connectorCount,
        ownershipType: OwnershipType.PRIVATE,
        isWhitelisted: data.isWhitelisted ?? true,
        isPublic: data.isPublic ?? true,
        chargepointstatus: ChargePointStatus.AVAILABLE,
        updatedAt: new Date()
      }
    });

    // Create connectors for the charge point
    await this.createConnectorsForChargePoint(
      data.chargePointIdentity,
      connectorCount
    );

    // Fetch the charge point with connectors
    return await this.prisma.charge_points.findUnique({
      where: { id: chargePointId },
      include: {
        User: true,
        connectors: true,
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });
  }

  /**
   * ค้นหาเครื่องชาร์จด้วย Serial Number และ Charge Point Identity
   */
  async findBySerialAndIdentity(serialNumber: string, chargePointIdentity: string) {
    return await this.prisma.charge_points.findFirst({
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
    return await this.prisma.charge_points.findFirst({
      where: {
        serialNumber
      }
    });
  }

  /**
   * ค้นหาเครื่องชาร์จด้วย Charge Point Identity
   */
  async findByChargePointIdentity(chargePointIdentity: string) {
    return await this.prisma.charge_points.findFirst({
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
      const existingChargePoint = await this.prisma.charge_points.findUnique({
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
          chargepointname: `Auto-created: ${chargePointIdentity}`,
          chargepointstatus: 'AVAILABLE',
          isPublic: true,
          isWhitelisted: true,
          connectorCount: 2, // จำนวนหัวชาร์จเริ่มต้น
          powerRating: 22, // กำลังไฟเริ่มต้น (กิโลวัตต์)
          protocol: updateData.ocppProtocolRaw || 'OCPP16',
          ocppProtocolRaw: updateData.ocppProtocolRaw || 'OCPP16'
        };
        
        return await this.prisma.charge_points.create({
          data: newChargePointData
        });
      }

      // อัปเดตข้อมูลเครื่องชาร์จที่มีอยู่แล้ว
      return await this.prisma.charge_points.update({
        where: { chargePointIdentity },
        data
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
      const existingChargePoint = await this.prisma.charge_points.findUnique({
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

      const updatedChargePoint = await this.prisma.charge_points.update({
        where: { chargePointIdentity },
        data: {
          lastSeen: new Date(lastSeen)
        },
        include: {
          connectors: true,
          User: true,
          Station: true,
          transactions: true
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
      const chargePoint = await this.prisma.charge_points.findUnique({
        where: { chargePointIdentity: chargePointIdentity }
      });

      if (!chargePoint) {
        throw new Error(`Charge point with identity ${chargePointIdentity} not found`);
      }

      // ปรับปรุงเวลาที่เห็นล่าสุดของ ChargePoint
      await this.prisma.charge_points.update({
        where: { id: chargePoint.id },
        data: {
          lastSeen: new Date()
        }
      });

      // ค้นหาหรือสร้างหัวชาร์จตามหมายเลขที่ได้รับ
      const connector = await this.prisma.connectorss.upsert({
        where: {
          chargePointId_connectorId: {
            chargePointId: chargePoint.id,
            connectorId: statusData.connectorId
          }
        },
        update: {
          // แปลงสถานะจาก OCPP ให้ตรงกับ enum ภายในระบบ
          connectorstatus: this.mapOcppStatusToConnectorStatus(statusData.status)
        },
        create: {
          id: randomUUID(),
          chargePointId: chargePoint.id,
          connectorId: statusData.connectorId,
          connectorstatus: this.mapOcppStatusToConnectorStatus(statusData.status),
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
  private mapOcppStatusToConnectorStatus(ocppStatus: string): ConnectorStatus {
    const statusMap: { [key: string]: ConnectorStatus } = {
      'Available': 'AVAILABLE',
      'Preparing': 'PREPARING',
      'Charging': 'CHARGING',
      'Occupied': 'CHARGING',  // OCPP 'Occupied' maps to 'CHARGING'
      'SuspendedEV': 'SUSPENDED_EV',
      'SuspendedEVSE': 'SUSPENDED_EVSE',
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
    latitude?: number;
    longitude?: number;
    radius?: number;
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
        { chargepointname: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.chargepointstatus = status;
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
      this.prisma.charge_points.findMany({
        where,
        skip,
        take: limit,
        include: {
          User: {
            select: {
              id: true,
              email: true,
              fullName: true
            }
          },
          connectors: true,
          _count: {
            select: {
              transactions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.charge_points.count({ where })
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
      const chargePoint = await this.prisma.charge_points.findUnique({
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
      const existingChargePoint = await this.prisma.charge_points.findUnique({
        where: { chargePointIdentity },
        include: {
          Station: true
        }
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

      const stationFieldKeys = new Set([
        'stationName',
        'stationname',
        'location',
        'latitude',
        'longitude',
        'onPeakRate',
        'onPeakStartTime',
        'onPeakEndTime',
        'offPeakRate',
        'offPeakStartTime',
        'offPeakEndTime'
      ]);

      const chargePointFieldSet = new Set([
        'chargepointname',
        'openingHours',
        'is24Hours',
        'brand',
        'serialNumber',
        'powerRating',
        'powerSystem',
        'connectorCount',
        'protocol',
        'csmsUrl',
        'chargePointIdentity',
        'chargepointstatus',
        'maxPower',
        'lastSeen',
        'heartbeatIntervalSec',
        'vendor',
        'model',
        'firmwareVersion',
        'ocppProtocolRaw',
        'ocppSessionId',
        'isWhitelisted',
        'ownerId',
        'ownershipType',
        'isPublic',
        'urlwebSocket',
        'stationId'
      ]);

      const fieldMappings: Record<string, string> = {
        name: 'chargepointname',
        status: 'chargepointstatus',
        ocppProtocol: 'ocppProtocolRaw'
      };

      const stationPayload = this.buildStationPayload(updateData);
      const { stationname: requestedStationName, ...stationFields } =
        stationPayload;
      const fallbackLocation =
        typeof stationFields.location === 'string' &&
        stationFields.location.trim()
          ? stationFields.location
          : typeof updateData.location === 'string' && updateData.location.trim()
            ? updateData.location.trim()
            : existingChargePoint.Station?.location ?? 'Unknown Location';

      let targetStationId =
        typeof updateData.stationId === 'string' && updateData.stationId.trim()
          ? updateData.stationId.trim()
          : existingChargePoint.stationId ?? undefined;

      const normalizedStationName =
        typeof requestedStationName === 'string' && requestedStationName.trim()
          ? requestedStationName.trim()
          : typeof updateData.stationName === 'string' && updateData.stationName.trim()
            ? updateData.stationName.trim()
            : existingChargePoint.Station?.stationname;

      const processStationUpdate = async (stationId: string | undefined) => {
        if (!stationId) {
          return undefined;
        }

        const station = await this.prisma.station.findUnique({
          where: { id: stationId }
        });

        if (!station) {
          return undefined;
        }

        const updatePayload = this.omitUndefined({
          ...stationFields,
          ...(requestedStationName &&
          requestedStationName !== station.stationname
            ? { stationname: requestedStationName }
            : {})
        });

        if (this.hasStationUpdates(updatePayload)) {
          updatePayload.updatedAt = new Date();
          await this.prisma.station.update({
            where: { id: station.id },
            data: updatePayload
          });
        }

        return station.id;
      };

      let resolvedStationId = await processStationUpdate(targetStationId);

      if (!resolvedStationId && normalizedStationName) {
        const stationByName = await this.prisma.station.findUnique({
          where: { stationname: normalizedStationName }
        });

        if (stationByName) {
          const updatePayload = this.omitUndefined({
            ...stationFields,
            ...(requestedStationName &&
            requestedStationName !== stationByName.stationname
              ? { stationname: requestedStationName }
              : {})
          });

          if (this.hasStationUpdates(updatePayload)) {
            updatePayload.updatedAt = new Date();
            await this.prisma.station.update({
              where: { id: stationByName.id },
              data: updatePayload
            });
          }

          resolvedStationId = stationByName.id;
        }
      }

      if (!resolvedStationId && this.hasStationUpdates(stationFields)) {
        const baseData = this.ensureStationDefaults(
          stationFields,
          fallbackLocation
        );

        const newStation = await this.prisma.station.create({
          data: this.omitUndefined({
            id: randomUUID(),
            stationname:
              normalizedStationName ??
              `Station-${Date.now().toString(36)}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
            ...baseData,
            updatedAt: new Date()
          })
        });

        resolvedStationId = newStation.id;
      }

      const chargePointUpdate: Record<string, any> = {};

      for (const [key, value] of Object.entries(updateData)) {
        if (value === undefined || stationFieldKeys.has(key) || key === 'stationId') {
          continue;
        }

        const mappedKey = fieldMappings[key] ?? key;
        if (chargePointFieldSet.has(mappedKey)) {
          chargePointUpdate[mappedKey] = value;
        }
      }

      if (updateData.ownerId !== undefined) {
        chargePointUpdate.ownerId = updateData.ownerId;
      }

      if (resolvedStationId) {
        chargePointUpdate.stationId = resolvedStationId;
      }

      chargePointUpdate.updatedAt = new Date();

      const updatedChargePoint = Object.keys(chargePointUpdate).length
        ? await this.prisma.charge_points.update({
            where: { chargePointIdentity },
            data: chargePointUpdate,
            include: {
              User: true,
              Station: true,
              connectors: true,
              _count: {
                select: {
                  transactions: true
                }
              }
            }
          })
        : await this.prisma.charge_points.findUnique({
            where: { chargePointIdentity },
            include: {
              User: true,
              Station: true,
              connectors: true,
              _count: {
                select: {
                  transactions: true
                }
              }
            }
          });

      // หากมีอยู่แล้วให้อัปเดตข้อมูล
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
      const existingChargePoint = await this.prisma.charge_points.findUnique({
        where: { chargePointIdentity }
      });

      if (!existingChargePoint) {
        return {
          success: false,
          message: `Charge point with identity '${chargePointIdentity}' not found. No action taken.`
        };
      }

      // หากพบให้เปลี่ยนสถานะเป็น UNAVAILABLE
      const deletedChargePoint = await this.prisma.charge_points.update({
        where: { chargePointIdentity },
        data: {
          chargepointstatus: ChargePointStatus.UNAVAILABLE
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
      const existingChargePoint = await this.prisma.charge_points.findUnique({
        where: { chargePointIdentity },
        include: {
          Station: true
        }
      });

      if (!existingChargePoint) {
        return {
          success: false,
          message: `Charge point with identity '${chargePointIdentity}' not found. Cannot update pricing schedule.`
        };
      }

      const stationPricingPayload = this.buildStationPayload(pricingData);
      const { stationname: requestedStationName, ...stationFields } =
        stationPricingPayload;

      let stationId = existingChargePoint.stationId ?? undefined;

      if (stationId) {
        const updatePayload = this.omitUndefined({
          ...stationFields,
          ...(requestedStationName ? { stationname: requestedStationName } : {})
        });

        if (this.hasStationUpdates(updatePayload)) {
          updatePayload.updatedAt = new Date();
          await this.prisma.station.update({
            where: { id: stationId },
            data: updatePayload
          });
        }
      } else if (this.hasStationUpdates(stationFields)) {
        const baseData = this.ensureStationDefaults(
          stationFields,
          existingChargePoint.Station?.location ?? 'Unknown Location'
        );

        const newStation = await this.prisma.station.create({
          data: this.omitUndefined({
            id: randomUUID(),
            stationname:
              requestedStationName ??
              existingChargePoint.Station?.stationname ??
              `Station-${Date.now().toString(36)}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
            ...baseData,
            updatedAt: new Date()
          })
        });

        stationId = newStation.id;

        await this.prisma.charge_points.update({
          where: { id: existingChargePoint.id },
          data: {
            stationId: newStation.id,
            updatedAt: new Date()
          }
        });
      }

      const updatedChargePoint = await this.prisma.charge_points.findUnique({
        where: { chargePointIdentity },
        include: {
          Station: true,
          User: true,
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
      const connectorCount =
        typeof data.connectorCount === 'number'
          ? data.connectorCount
          : Number.isFinite(Number(data.connectorCount))
            ? Number(data.connectorCount)
            : 0;

      const protocol =
        typeof data.protocol === 'string'
          ? this.convertProtocolToEnum(data.protocol)
          : data.protocol ?? OCPPVersion.OCPP16;

      const stationPayload = this.buildStationPayload(data);
      const { stationname: requestedStationName, ...stationFields } =
        stationPayload;
      const fallbackLocation =
        typeof stationFields.location === 'string' &&
        stationFields.location.trim()
          ? stationFields.location
          : typeof data.location === 'string' && data.location.trim()
            ? data.location.trim()
            : 'Unknown Location';
      const fallbackStationName =
        typeof data.stationName === 'string' && data.stationName.trim()
          ? data.stationName.trim()
          : undefined;
      const stationIdCandidate =
        typeof data.stationId === 'string' && data.stationId.trim()
          ? data.stationId.trim()
          : undefined;

      let stationId: string | undefined;

      if (stationIdCandidate) {
        const stationById = await this.prisma.station.findUnique({
          where: { id: stationIdCandidate }
        });

        if (stationById) {
          const updateData = this.omitUndefined({
            ...stationFields,
            ...(requestedStationName &&
            requestedStationName !== stationById.stationname
              ? { stationname: requestedStationName }
              : {})
          });

          if (this.hasStationUpdates(updateData)) {
            updateData.updatedAt = new Date();
            await this.prisma.station.update({
              where: { id: stationById.id },
              data: updateData
            });
          }

          stationId = stationById.id;
        }
      }

      const normalizedStationName =
        typeof requestedStationName === 'string' && requestedStationName.trim()
          ? requestedStationName.trim()
          : fallbackStationName;

      if (!stationId && normalizedStationName) {
        const existingStation = await this.prisma.station.findUnique({
          where: { stationname: normalizedStationName }
        });

        if (existingStation) {
          const updateData = this.omitUndefined({
            ...stationFields,
            ...(requestedStationName &&
            requestedStationName !== existingStation.stationname
              ? { stationname: requestedStationName }
              : {})
          });

          if (this.hasStationUpdates(updateData)) {
            updateData.updatedAt = new Date();
            await this.prisma.station.update({
              where: { id: existingStation.id },
              data: updateData
            });
          }

          stationId = existingStation.id;
        }
      }

      if (!stationId) {
        const generatedName = `Station-${Date.now()
          .toString(36)
          .slice(2)}-${Math.random().toString(36).slice(2, 6)}`;
        const baseData = this.ensureStationDefaults(
          stationFields,
          fallbackLocation
        );

        const station = await this.prisma.station.create({
          data: this.omitUndefined({
            id: randomUUID(),
            stationname: normalizedStationName ?? generatedName,
            ...baseData,
            updatedAt: new Date()
          })
        });

        stationId = station.id;
      }

      const chargePointData: any = {
        chargepointname:
          data.name ||
          `Auto-created: ${data.chargePointIdentity || 'Unknown'}`,
        stationId,
        brand: data.brand || 'Unknown Brand',
        serialNumber: data.serialNumber || `SN-${Date.now()}`,
        powerRating: data.powerRating ?? 22,
        protocol,
        chargePointIdentity: data.chargePointIdentity,
        connectorCount,
        chargepointstatus:
          (data.status as ChargePointStatus) ?? ChargePointStatus.AVAILABLE,
        ownershipType: data.ownershipType ?? OwnershipType.PUBLIC,
        isWhitelisted: data.isWhitelisted ?? true,
        isPublic: data.isPublic ?? true,
        updatedAt: new Date()
      };

      if (data.openingHours !== undefined) {
        chargePointData.openingHours = data.openingHours;
      }
      if (data.is24Hours !== undefined) {
        chargePointData.is24Hours = data.is24Hours;
      }
      if (data.powerSystem !== undefined) {
        chargePointData.powerSystem = data.powerSystem;
      }
      if (data.csmsUrl !== undefined) {
        chargePointData.csmsUrl = data.csmsUrl;
      }
      if (data.maxPower !== undefined) {
        chargePointData.maxPower = data.maxPower;
      }
      if (data.lastSeen !== undefined) {
        chargePointData.lastSeen = data.lastSeen;
      }
      if (data.heartbeatIntervalSec !== undefined) {
        chargePointData.heartbeatIntervalSec = data.heartbeatIntervalSec;
      }
      if (data.vendor !== undefined) {
        chargePointData.vendor = data.vendor;
      }
      if (data.model !== undefined) {
        chargePointData.model = data.model;
      }
      if (data.firmwareVersion !== undefined) {
        chargePointData.firmwareVersion = data.firmwareVersion;
      }
      if (data.ocppProtocol !== undefined) {
        chargePointData.ocppProtocolRaw = data.ocppProtocol;
      }
      if (data.ocppProtocolRaw !== undefined) {
          chargePointData.ocppProtocolRaw = data.ocppProtocolRaw;
        }
      if (data.urlwebSocket !== undefined) {
        chargePointData.urlwebSocket = data.urlwebSocket;
      }
      if (data.ownerId !== undefined) {
        chargePointData.ownerId = data.ownerId;
      }

      const newChargePoint = await this.prisma.charge_points.create({
        data: chargePointData,
        include: {
          User: true,
          connectors: true,
          _count: {
            select: {
              transactions: true
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
      const chargePointWithConnectors = await this.prisma.charge_points.findUnique({
        where: { id: newChargePoint.id },
        include: {
          User: true,
          connectors: true,
          _count: {
            select: {
              transactions: true
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
      const chargePoint = await this.prisma.charge_points.findUnique({
        where: { chargePointIdentity: chargePointIdentity },
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
      let chargePoint = await this.prisma.charge_points.findUnique({
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
          connectorstatus: ConnectorStatus.AVAILABLE
        };

        // Prisma schema requires a string ID for each connector; generate one for new records
        createData.id = randomUUID();

        if (typeof detail?.maxCurrent === 'number') {
          createData.maxCurrent = detail.maxCurrent;
        }

        const updateData: any = {
          connectorstatus: ConnectorStatus.AVAILABLE
        };

        if (rawType) {
          updateData.type = this.normalizeConnectorType(rawType);
          updateData.typeDescription = rawType;
        }

        if (typeof detail?.maxCurrent === 'number') {
          updateData.maxCurrent = detail.maxCurrent;
        }

        const connector = await this.prisma.connectors.upsert({
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
        await this.prisma.charge_points.update({
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
  async getWebSocketUrl(chargePointIdentity: string, connectorId: number, userId?: string) {
    try {
               const User = await this.prisma.user.findUnique({
        where: { id: userId },
              });
      if (!User) {
        throw new Error(`User with ID '${userId}' not found`);
      }
      // ค้นหา ChargePoint จาก chargePointIdentity
      const chargePoint = await this.prisma.charge_points.findUnique({
        where: { chargePointIdentity },
        include: {
          connectors: {
            where: { connectorId }
          },
          Station: true
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

      // สร้าง WebSocket URL ตามรูปแบบที่กำหนด พร้อมต่อ userId ถ้ามี
      const baseWebSocketUrl = process.env.WEBSOCKET_URL || 'ws://localhost:3000';
      let websocketUrl = `${baseWebSocketUrl}/user-cp/${chargePointIdentity}/${connectorId}`;
      
      // ต่อ userId เข้ากับ URL ถ้ามีการส่งมา
      if (userId) {
        websocketUrl += `/${userId}`;
      }
      
      console.log("respone websocketUrl", websocketUrl)
      return {
        chargePoint: {
          id: chargePoint.id,
          chargePointIdentity: chargePoint.chargePointIdentity,
          name: chargePoint.chargepointname,
          stationName: chargePoint.Station?.stationname,
          location: chargePoint.Station?.location,
          openingHours: chargePoint.openingHours,
          is24Hours: chargePoint.is24Hours,
          protocol: chargePoint.protocol,
          powerRating: chargePoint.powerRating,
          brand: chargePoint.brand,
          status: chargePoint.chargepointstatus,
          onPeakRate: chargePoint.Station?.onPeakRate,
          onPeakStartTime: chargePoint.Station?.onPeakStartTime,
          onPeakEndTime: chargePoint.Station?.onPeakEndTime,
          offPeakRate: chargePoint.Station?.offPeakRate,
          offPeakStartTime: chargePoint.Station?.offPeakStartTime,
          offPeakEndTime: chargePoint.Station?.offPeakEndTime
        },
        connector: {
          id: connector.id,
          connectorId: connector.connectorId,
          type: connector.type,
          status: connector.connectorstatus,
          maxCurrent: connector.maxCurrent,
          maxPower: connector.maxPower
        },
        pricingTier: null, // Pricing tier functionality not implemented yet
        websocketUrl
      };
    } catch (error: any) {
      console.error('Error getting WebSocket URL:', error);
      throw new Error(`Failed to get WebSocket URL: ${error.message}`);
    }
  }
}
