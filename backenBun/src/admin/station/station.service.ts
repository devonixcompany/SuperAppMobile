import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import {
  deleteStationImageFile,
  getStationImageFilenameFromUrl,
  saveStationImage,
  stationImageExists,
} from '../../lib/station-images';
import { logger } from '../../lib/logger';
import {
  AdminChargePointsService,
  CreateChargePointData,
} from '../chargepoints/chargepoints.service';

export class StationNotFoundError extends Error {
  constructor() {
    super('Station not found');
    this.name = 'StationNotFoundError';
  }
}

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

    let station: any;

    try {
      return new Prisma.Decimal(value);
    } catch (error) {
      logger.warn('Invalid decimal value for station coordinate', { value, error });
      throw new Error('Latitude/Longitude must be numeric values');
    }
  }

  async createStation(data: CreateStationData, imageFile?: File) {
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

    const stationId = data.id?.trim() && data.id.trim().length ? data.id.trim() : randomUUID();

    const latitude = this.toDecimal(data.latitude);
    const longitude = this.toDecimal(data.longitude);

    const pendingImage = imageFile
      ? await saveStationImage(stationId, imageFile)
      : null;

    try {
      station = await prisma.station.create({
        data: {
          id: stationId,
          stationname: data.stationname.trim(),
          location: data.location.trim(),
          imageUrl: pendingImage?.url ?? data.imageUrl ?? null,
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
    } catch (error) {
      if (pendingImage) {
        await deleteStationImageFile(pendingImage.filename).catch(() => {});
      }
      throw error;
    }

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
      station = {
        ...station,
        chargePoints: createdChargePoints,
      } as any;
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
        flatRate: station.flatRate,
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

  async deleteStation(id: string) {
    if (!id?.trim()) {
      throw new Error('Station ID is required');
    }

    const result = await prisma.$transaction(async (tx) => {
      const station = await tx.station.findUnique({
        where: { id },
        select: { id: true, imageUrl: true },
      });

      if (!station) {
        throw new StationNotFoundError();
      }

      const detachedChargePoints = await tx.charge_points.updateMany({
        where: { stationId: id },
        data: { stationId: null },
      });

      if (station.imageUrl) {
        const filename = getStationImageFilenameFromUrl(station.imageUrl);
        if (filename) {
          await deleteStationImageFile(filename);
        }
      }

      await tx.station.delete({ where: { id } });

      return {
        detachedChargePoints: detachedChargePoints.count,
      };
    });

    logger.info('Station deleted', {
      stationId: id,
      detachedChargePoints: result.detachedChargePoints,
    });

    return {
      success: true,
      detachedChargePoints: result.detachedChargePoints,
    };
  }

  async uploadStationImage(stationId: string, file: File) {
    const normalizedId = stationId.trim();
    if (!normalizedId) {
      throw new Error('Station ID is required');
    }

    const station = await prisma.station.findUnique({
      where: { id: normalizedId },
      select: { id: true, imageUrl: true },
    });

    if (!station) {
      throw new StationNotFoundError();
    }

    if (station.imageUrl) {
      const previousFilename = getStationImageFilenameFromUrl(station.imageUrl);
      if (previousFilename) {
        await deleteStationImageFile(previousFilename);
      }
    }

    const stored = await saveStationImage(normalizedId, file);

    await prisma.station.update({
      where: { id: normalizedId },
      data: {
        imageUrl: stored.url,
        updatedAt: new Date(),
      },
    });

    return {
      imageUrl: stored.url,
    };
  }

  async deleteStationImage(stationId: string) {
    const normalizedId = stationId.trim();
    if (!normalizedId) {
      throw new Error('Station ID is required');
    }

    const station = await prisma.station.findUnique({
      where: { id: normalizedId },
      select: { imageUrl: true },
    });

    if (!station) {
      throw new StationNotFoundError();
    }

    const filename = getStationImageFilenameFromUrl(station.imageUrl);
    if (filename) {
      await deleteStationImageFile(filename);
    }

    await prisma.station.update({
      where: { id: normalizedId },
      data: {
        imageUrl: null,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

  async getStationImage(stationId: string) {
    const normalizedId = stationId.trim();
    if (!normalizedId) {
      throw new Error('Station ID is required');
    }

    const station = await prisma.station.findUnique({
      where: { id: normalizedId },
      select: { imageUrl: true },
    });

    if (!station) {
      throw new StationNotFoundError();
    }

    const filename = getStationImageFilenameFromUrl(station.imageUrl);
    const exists = filename ? await stationImageExists(filename) : false;

    return {
      imageUrl: station.imageUrl,
      filename,
      exists,
    };
  }
}
