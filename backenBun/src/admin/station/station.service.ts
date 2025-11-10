import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  AdminChargePointsService,
  CreateChargePointData,
} from '../chargepoints/chargepoints.service';

export interface CreateStationData {
  id?: string;
  stationname: string;
  imageUrl?: string | null;
  location: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  openclosedays?: string | null;
  onPeakRate?: number;
  onPeakStartTime?: string;
  onPeakEndTime?: string;
  onPeakbaseRate?: number;
  offPeakRate?: number;
  offPeakStartTime?: string;
  offPeakEndTime?: string;
  offPeakbaseRate?: number;
  chargePoints?: CreateStationChargePointData[];
}

export type CreateStationChargePointData = Omit<
  CreateChargePointData,
  'stationId'
> & {
  stationId?: string;
};

export interface StationListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface StationListResult {
  data: Array<{
    id: string;
    stationname: string;
    imageUrl: string | null;
    openclosedays: string | null;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AdminStationService {
  private toDecimal(value?: number | string | null) {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    try {
      return new Prisma.Decimal(value);
    } catch (error) {
      logger.warn('Invalid decimal value for station coordinate', { value, error });
      throw new Error('Latitude/Longitude must be numeric values');
    }
  }

  async createStation(data: CreateStationData) {
    if (!data.stationname?.trim()) {
      throw new Error('Station name is required');
    }

    if (!data.location?.trim()) {
      throw new Error('Location is required');
    }

    const existingStation = await prisma.station.findUnique({
      where: { stationname: data.stationname.trim() },
    });

    if (existingStation) {
      throw new Error('Station name already exists');
    }

    const latitude = this.toDecimal(data.latitude);
    const longitude = this.toDecimal(data.longitude);

    const station = await prisma.station.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        stationname: data.stationname.trim(),
        location: data.location.trim(),
        imageUrl: data.imageUrl ?? null,
        latitude,
        longitude,
        openclosedays: data.openclosedays ?? null,
        onPeakRate: data.onPeakRate ?? undefined,
        onPeakStartTime: data.onPeakStartTime ?? undefined,
        onPeakEndTime: data.onPeakEndTime ?? undefined,
        onPeakbaseRate: data.onPeakbaseRate ?? undefined,
        offPeakRate: data.offPeakRate ?? undefined,
        offPeakStartTime: data.offPeakStartTime ?? undefined,
        offPeakEndTime: data.offPeakEndTime ?? undefined,
        offPeakbaseRate: data.offPeakbaseRate ?? undefined,
        updatedAt: new Date(),
      },
    });

    let createdChargePoints = [];
    const chargePointInputs = Array.isArray(data.chargePoints)
      ? data.chargePoints.filter(
          (payload): payload is CreateStationChargePointData =>
            payload !== null && payload !== undefined,
        )
      : [];

    if (chargePointInputs.length) {
      const chargePointService = new AdminChargePointsService();
      createdChargePoints = [];
      for (const chargePointInput of chargePointInputs) {
        const { stationId: _ignoredStationId, ...rest } = chargePointInput;
        const payload: CreateChargePointData = {
          ...rest,
          stationId: station.id,
        };
        const chargePoint =
          await chargePointService.createChargePoint(payload);
        createdChargePoints.push(chargePoint);
      }
    }

    logger.info('Admin created station', { stationId: station.id });

    if (createdChargePoints.length) {
      return {
        ...station,
        chargePoints: createdChargePoints,
      };
    }

    return station;
  }

  async listStations(params: StationListParams): Promise<StationListResult> {
    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
    const limit =
      params.limit && params.limit > 0 && params.limit <= 100
        ? Math.floor(params.limit)
        : 10;
    const skip = (page - 1) * limit;

    const where =
      params.search && params.search.trim().length
        ? {
            stationname: {
              contains: params.search.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {};

    const [total, stations] = await Promise.all([
      prisma.station.count({ where }),
      prisma.station.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          stationname: true,
          imageUrl: true,
          openclosedays: true,
        },
      }),
    ]);

    return {
      data: stations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getStationDetailsById(stationId: string) {
    const normalizedId = stationId.trim();
    if (!normalizedId) {
      throw new Error('Station ID is required');
    }

    const station = await prisma.station.findUnique({
      where: { id: normalizedId },
      select: {
        stationname: true,
        imageUrl: true,
        openclosedays: true,
        onPeakRate: true,
        onPeakStartTime: true,
        onPeakEndTime: true,
        onPeakbaseRate: true,
        offPeakRate: true,
        offPeakStartTime: true,
        offPeakEndTime: true,
        offPeakbaseRate: true,
        charge_points: {
          select: {
            id: true,
            chargepointname: true,
            serialNumber: true,
            brand: true,
            createdAt: true,
            User: {
              select: {
                phoneNumber: true,
              },
            },
            connectors: {
              select: {
                connectorId: true,
                type: true,
                maxPower: true,
                connectorstatus: true,
              },
              orderBy: { connectorId: 'asc' },
            },
            _count: {
              select: {
                transactions: true,
              },
            },
          },
        },
      },
    });

    if (!station) {
      throw new Error('Station not found');
    }

    const chargePoints = await Promise.all(
      station.charge_points.map(async (cp) => {
        const revenueResult = await prisma.transactions.aggregate({
          where: {
            chargePointId: cp.id,
            status: 'COMPLETED',
          },
          _sum: {
            totalCost: true,
          },
        });

        return {
          chargepointname: cp.chargepointname,
          serialNumber: cp.serialNumber,
          brand: cp.brand,
          totalTransactions: cp._count.transactions,
          totalRevenue: revenueResult._sum.totalCost ?? 0,
          connectors: cp.connectors.map((connector) => ({
            connectorId: connector.connectorId,
            type: connector.type,
            maxPower: connector.maxPower,
            connectorstatus: connector.connectorstatus,
            startTime: cp.createdAt?.toISOString() ?? null,
            phoneNumber: cp.User?.phoneNumber ?? null,
          })),
        };
      }),
    );

    return {
      station: {
        stationname: station.stationname,
        imageUrl: station.imageUrl,
        openclosedays: station.openclosedays,
        onPeakRate: station.onPeakRate,
        onPeakStartTime: station.onPeakStartTime,
        onPeakEndTime: station.onPeakEndTime,
        onPeakbaseRate: station.onPeakbaseRate,
        offPeakRate: station.offPeakRate,
        offPeakStartTime: station.offPeakStartTime,
        offPeakEndTime: station.offPeakEndTime,
        offPeakbaseRate: station.offPeakbaseRate,
        chargePoint: chargePoints,
      },
    };
  }
}
