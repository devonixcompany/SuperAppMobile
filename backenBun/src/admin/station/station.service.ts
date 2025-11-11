import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../shared/logger';
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
  flatRate?: number;
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

export type UpdateStationData = Partial<Omit<CreateStationData, 'id' | 'chargePoints'>> & {
  chargePoints?: CreateStationChargePointData[];
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
    flatRate: number;
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
      logger.warn({ value, error }, 'Invalid decimal value for station coordinate');
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
        flatRate: data.flatRate ?? undefined,
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

    logger.info({ stationId: station.id }, 'Admin created station');

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
          flatRate: true,
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

    // Get station details
    const station = await prisma.station.findUnique({
      where: { id: normalizedId },
      select: {
        id: true,
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
        location: true,
        latitude: true,
        longitude: true,
        flatRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!station) {
      throw new Error('Station not found');
    }

    // Get associated charge points for this station
    const chargePoints = await prisma.charge_points.findMany({
      where: {
        stationId: station.id
      },
      select: {
        id: true,
        chargepointname: true,
        serialNumber: true,
        brand: true,
        createdAt: true,
        connectors: {
          select: {
            connector_id: true,
            connector_type: true,
            max_power: true,
            status: true,
          },
          orderBy: { connector_id: 'asc' },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    // Transform the data to match expected structure
    const stationWithChargePoints = {
      ...station,
      charge_points: chargePoints.map(cp => ({
        ...cp,
        connectorId: cp.id, // Map id to connectorId for compatibility
        connectorstatus: cp.connectors[0]?.status || 'Available',
        maxPower: cp.connectors[0]?.max_power,
        type: cp.connectors[0]?.connector_type,
      }))
    };

    const chargePointsWithRevenue = await Promise.all(
      chargePoints.map(async (cp) => {
        // Get revenue for this charge point
        const revenueResult = await prisma.transactions.aggregate({
          where: {
            charge_point_id: cp.id,
          },
          _sum: {
            cost: true,
          },
        });

        return {
          chargepointname: cp.chargepointname || 'Unknown',
          serialNumber: cp.serialNumber || 'Unknown',
          brand: cp.brand || 'Unknown',
          totalTransactions: cp._count.transactions,
          totalRevenue: revenueResult._sum.cost ?? 0,
          connectors: cp.connectors.map((connector) => ({
            connectorId: connector.connector_id,
            type: connector.connector_type || 'Unknown',
            maxPower: connector.max_power,
            connectorstatus: connector.status || 'Available',
            startTime: cp.createdAt?.toISOString() ?? null,
            phoneNumber: null, // No User relation in this schema
          })),
        };
      }),
    );

    return {
      station: {
        stationname: station.stationname,
        imageUrl: station.imageUrl,
        openclosedays: station.openclosedays,
        flatRate: station.flatRate,
        onPeakRate: station.onPeakRate,
        onPeakStartTime: station.onPeakStartTime,
        onPeakEndTime: station.onPeakEndTime,
        onPeakbaseRate: station.onPeakbaseRate,
        offPeakRate: station.offPeakRate,
        offPeakStartTime: station.offPeakStartTime,
        offPeakEndTime: station.offPeakEndTime,
        offPeakbaseRate: station.offPeakbaseRate,
        chargePoint: chargePointsWithRevenue,
      },
    };
  }

  async updateStation(id: string, data: UpdateStationData) {
    const station = await prisma.station.findUnique({ where: { id } });
    if (!station) {
      throw new Error('Station not found');
    }

    const updateData: Prisma.StationUpdateInput = {};

    if (data.stationname !== undefined) {
      const trimmed = data.stationname.trim();
      if (!trimmed) {
        throw new Error('Station name cannot be empty');
      }
      const duplicate = await prisma.station.findFirst({
        where: { stationname: trimmed, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error('Station name already exists');
      }
      updateData.stationname = trimmed;
    }

    if (data.location !== undefined) {
      const trimmed = data.location.trim();
      if (!trimmed) {
        throw new Error('Location cannot be empty');
      }
      updateData.location = trimmed;
    }

    if (data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl;
    }

    if (data.openclosedays !== undefined) {
      updateData.openclosedays = data.openclosedays ?? null;
    }

    if (data.flatRate !== undefined) {
      updateData.flatRate = data.flatRate;
    }

    if (data.onPeakRate !== undefined) updateData.onPeakRate = data.onPeakRate;
    if (data.onPeakStartTime !== undefined) updateData.onPeakStartTime = data.onPeakStartTime;
    if (data.onPeakEndTime !== undefined) updateData.onPeakEndTime = data.onPeakEndTime;
    if (data.onPeakbaseRate !== undefined) updateData.onPeakbaseRate = data.onPeakbaseRate;
    if (data.offPeakRate !== undefined) updateData.offPeakRate = data.offPeakRate;
    if (data.offPeakStartTime !== undefined) updateData.offPeakStartTime = data.offPeakStartTime;
    if (data.offPeakEndTime !== undefined) updateData.offPeakEndTime = data.offPeakEndTime;
    if (data.offPeakbaseRate !== undefined) updateData.offPeakbaseRate = data.offPeakbaseRate;

    if (data.latitude !== undefined) {
      updateData.latitude = this.toDecimal(data.latitude);
    }
    if (data.longitude !== undefined) {
      updateData.longitude = this.toDecimal(data.longitude);
    }

    updateData.updatedAt = new Date();

    const updatedStation = await prisma.station.update({
      where: { id },
      data: updateData,
    });

    return updatedStation;
  }

  async upsertStation(data: CreateStationData & { id?: string }) {
    if (!data.stationname?.trim()) {
      throw new Error('Station name is required');
    }

    if (!data.location?.trim()) {
      throw new Error('Location is required');
    }

    const latitude = this.toDecimal(data.latitude);
    const longitude = this.toDecimal(data.longitude);

    const existingStation = await prisma.station.findUnique({
      where: { stationname: data.stationname.trim() },
    });

    let station;
    const createdChargePoints = [];

    if (existingStation) {
      station = await prisma.station.update({
        where: { id: existingStation.id },
        data: {
          location: data.location.trim(),
          imageUrl: data.imageUrl ?? null,
          latitude,
          longitude,
          openclosedays: data.openclosedays ?? null,
          flatRate: data.flatRate ?? undefined,
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
    } else {
      station = await prisma.station.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          stationname: data.stationname.trim(),
          location: data.location.trim(),
          imageUrl: data.imageUrl ?? null,
          latitude,
          longitude,
          openclosedays: data.openclosedays ?? null,
          flatRate: data.flatRate ?? undefined,
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
    }

    const chargePointInputs = Array.isArray(data.chargePoints)
      ? data.chargePoints.filter(
          (payload): payload is CreateStationChargePointData =>
            payload !== null && payload !== undefined,
        )
      : [];

    if (chargePointInputs.length) {
      const chargePointService = new AdminChargePointsService();

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

    logger.info({ stationId: station.id, isNew: !existingStation }, 'Admin upserted station');

    if (createdChargePoints.length) {
      return {
        ...station,
        chargePoints: createdChargePoints,
      };
    }

    return station;
  }

  async deleteStation(id: string) {
    const station = await prisma.station.findUnique({ where: { id } });
    if (!station) {
      throw new Error('Station not found');
    }

    await prisma.charge_points.updateMany({
      where: { stationId: id },
      data: { stationId: null },
    });

    await prisma.station.delete({ where: { id } });

    return { success: true };
  }
}
