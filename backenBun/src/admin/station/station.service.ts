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
}
