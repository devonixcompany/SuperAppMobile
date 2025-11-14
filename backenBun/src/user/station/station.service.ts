import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class StationService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  /**
   * ดึงข้อมูลสถานีทั้งหมด พร้อม pagination
   */
  async getAllStations(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const {
      page = 1,
      limit = 10,
      search
    } = options;

    const skip = (page - 1) * limit;

    // สร้างเงื่อนไขสำหรับค้นหาข้อมูล
    const where: any = {};

    if (search) {
      where.OR = [
        { stationname: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    // ดึงข้อมูลสถานีพร้อมจัดหน้าแบ่งชุดข้อมูล
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        skip,
        take: limit,
        include: {
          charge_points: {
            select: {
              id: true,
              chargepointname: true,
              chargePointIdentity: true,
              chargepointstatus: true,
              connectorCount: true,
              powerRating: true,
              connectors: {
                select: {
                  connectorId: true,
                  connectorstatus: true,
                  type: true,
                  maxPower: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.station.count({ where })
    ]);

    return {
      data: stations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * ดึงข้อมูลสถานีตาม ID
   */
  async getStationById(id: string) {
    try {
      const station = await this.prisma.station.findUnique({
        where: { id },
        include: {
          charge_points: {
            include: {
              connectors: true,
              _count: {
                select: {
                  transactions: true
                }
              }
            }
          }
        }
      });

      return station;
    } catch (error: any) {
      console.error('Error getting station by ID:', error);
      throw new Error(`Failed to get station: ${error.message}`);
    }
  }

  /**
   * ค้นหาสถานีใกล้เคียงตามพิกัด GPS
   */
  async getStationsNearby(latitude: number, longitude: number, radiusKm: number = 10) {
    try {
      // ดึงสถานีทั้งหมดที่มีพิกัด
      const stations = await this.prisma.station.findMany({
        where: {
          AND: [
            { latitude: { not: null } },
            { longitude: { not: null } }
          ]
        },
        include: {
          charge_points: {
            select: {
              id: true,
              chargepointname: true,
              chargePointIdentity: true,
              chargepointstatus: true,
              connectorCount: true,
              powerRating: true,
              connectors: {
                select: {
                  connectorId: true,
                  connectorstatus: true,
                  type: true,
                  maxPower: true,
                }
              }
            }
          }
        }
      });

      // คำนวณระยะทางและกรองเฉพาะสถานีที่อยู่ในรัศมีที่กำหนด
      const nearbyStations = stations
        .map(station => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            Number(station.latitude),
            Number(station.longitude)
          );

          return {
            ...station,
            distance: Math.round(distance * 100) / 100 // ปัดเศษทศนิยม 2 ตำแหน่ง
          };
        })
        .filter(station => station.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

      return nearbyStations;
    } catch (error: any) {
      console.error('Error finding nearby stations:', error);
      throw new Error(`Failed to find nearby stations: ${error.message}`);
    }
  }

  /**
   * ดึงจุดชาร์จของสถานีเฉพาะ
   */
  async getStationChargePoints(stationId: string) {
    try {
      const station = await this.prisma.station.findUnique({
        where: { id: stationId },
        include: {
          charge_points: {
            include: {
              connectors: true,
              User: {
                select: {
                  id: true,
                  email: true,
                  fullName: true
                }
              },
              _count: {
                select: {
                  transactions: true
                }
              }
            }
          }
        }
      });

      if (!station) {
        throw new Error('Station not found');
      }

      return {
        stationId: station.id,
        stationName: station.stationname,
        location: station.location,
        chargePoints: station.charge_points
      };
    } catch (error: any) {
      console.error('Error getting station charge points:', error);
      throw new Error(`Failed to get station charge points: ${error.message}`);
    }
  }

  /**
   * คำนวณระยะทางระหว่างสองจุดพิกัด (Haversine formula)
   * คืนค่าเป็นกิโลเมตร
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // รัศมีของโลกเป็นกิโลเมตร
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * แปลงองศาเป็น radian
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
