import {
  ChargePointStatus,
  ConnectorStatus,
  ConnectorType,
  OCPPVersion,
  Prisma,
} from '@prisma/client';
import * as XLSX from 'xlsx';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  AdminConnectorsService,
  CreateConnectorData,
} from '../connectors/connectors.service';

export class ChargePointNotFoundError extends Error {
  constructor() {
    super('Charge point not found');
    this.name = 'ChargePointNotFoundError';
  }
}

export class ChargePointHasTransactionsError extends Error {
  constructor() {
    super('Cannot delete charge point while transactions exist');
    this.name = 'ChargePointHasTransactionsError';
  }
}

export type CreateChargePointConnectorData = Omit<
  CreateConnectorData,
  'chargePointId'
>;

export interface CreateChargePointData {
  id?: string;
  chargepointname: string;
  stationId: string;
  brand: string;
  serialNumber: string;
  powerRating: number;
  powerSystem?: number;
  connectorCount?: number;
  csmsUrl?: string | null;
  chargePointIdentity: string;
  protocol: OCPPVersion;
  connectors?: CreateChargePointConnectorData[];
}

export interface UpdateChargePointData {
  chargepointname?: string;
  serialNumber?: string;
  brand?: string;
  powerRating?: number;
  powerSystem?: number;
  protocol?: OCPPVersion;
  csmsUrl?: string | null;
  chargePointIdentity?: string;
  chargepointstatus?: ChargePointStatus;
}

export interface ChargeSessionHistoryFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ChargeSessionHistoryResult {
  summary: {
    totalSessions: number;
    totalRevenue: number;
    totalEnergy: number;
  };
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  sessions: Array<{
    id: string;
    sessionId: string;
    ocppTransactionId: string | null;
    startTime: Date;
    endTime: Date | null;
    durationMinutes: number | null;
    energyKWh: number | null;
    pricePerKWh: number | null;
    totalCost: number | null;
    chargePoint: {
      id: string;
      name: string | null;
      stationId: string | null;
      stationName: string | null;
    };
    connectorId: number | null;
    user: {
      id: string;
      name: string | null;
      phoneNumber: string | null;
    };
    paymentMethod: string | null;
    paymentStatus: string | null;
    status: string;
  }>;
}

export interface ChargeSessionHistoryExportResult {
  filename: string;
  buffer: Buffer;
}

export class AdminChargePointsService {
  private parseDate(value: string, label: string, boundary: 'start' | 'end') {
    const trimmed = value.trim();
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid ${label}`);
    }

    const hasTimeComponent = /[T\s]/.test(trimmed);
    if (boundary === 'end' && !hasTimeComponent) {
      date.setHours(23, 59, 59, 999);
    }

    return date;
  }

  private normalizeId(value?: string | null) {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private trimRequired(value: string | undefined, field: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new Error(`${field} is required`);
    }
    return trimmed;
  }

  async createChargePoint(data: CreateChargePointData) {
    const chargepointname = this.trimRequired(
      data.chargepointname,
      'Charge point name',
    );
    const brand = this.trimRequired(data.brand, 'Brand');
    const serialNumber = this.trimRequired(
      data.serialNumber,
      'Serial number',
    );
    const chargePointIdentity = this.trimRequired(
      data.chargePointIdentity,
      'Charge point identity',
    );

    const stationId = this.trimRequired(data.stationId, 'Station ID');
    const stationExists = await prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true },
    });
    if (!stationExists) {
      throw new Error('Referenced station not found');
    }

    const existingSerial = await prisma.charge_points.findUnique({
      where: { serialNumber },
    });
    if (existingSerial) {
      throw new Error('Serial number already exists');
    }

    const existingIdentity = await prisma.charge_points.findUnique({
      where: { chargePointIdentity },
    });
    if (existingIdentity) {
      throw new Error('Charge point identity already exists');
    }

    const connectorsPayload = Array.isArray(data.connectors)
      ? data.connectors
          .filter(
            (connector): connector is CreateChargePointConnectorData =>
              connector !== null && connector !== undefined,
          )
          .map((connector) => {
            if (!Number.isInteger(connector.connectorId) || connector.connectorId < 1) {
              throw new Error('Connector ID must be a positive integer');
            }

            return {
              ...connector,
              type: connector.type ?? ConnectorType.TYPE_2,
              connectorstatus:
                connector.connectorstatus ?? ConnectorStatus.AVAILABLE,
            };
          })
      : [];

    const connectorIds = new Set<number>();
    for (const connector of connectorsPayload) {
      if (connectorIds.has(connector.connectorId)) {
        throw new Error(
          `Duplicate connectorId detected: ${connector.connectorId}`,
        );
      }
      connectorIds.add(connector.connectorId);
    }

    const resolvedConnectorCount =
      connectorsPayload.length > 0
        ? connectorsPayload.length
        : data.connectorCount !== undefined
          ? data.connectorCount
          : 1;

    if (resolvedConnectorCount < 1) {
      throw new Error('Connector count must be at least 1');
    }

    const chargePoint = await prisma.charge_points.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        chargepointname,
        stationId,
        brand,
        serialNumber,
        powerRating: Number(data.powerRating),
        powerSystem: data.powerSystem ?? 1,
        connectorCount: resolvedConnectorCount,
        csmsUrl: this.normalizeId(data.csmsUrl ?? null),
        chargePointIdentity,
        protocol: data.protocol,
        updatedAt: new Date(),
      },
    });

    type CreatedConnector = Awaited<
      ReturnType<AdminConnectorsService['createConnector']>
    >;
    let createdConnectors: CreatedConnector[] = [];
    if (connectorsPayload.length) {
      const connectorService = new AdminConnectorsService();
      createdConnectors = await Promise.all(
        connectorsPayload.map((connector) =>
          connectorService.createConnector({
            ...connector,
            chargePointId: chargePoint.id,
          }),
        ),
      );
    }

    logger.info('Admin created charge point', { chargePointId: chargePoint.id });

    if (createdConnectors.length) {
      return {
        ...chargePoint,
        connectorCount: createdConnectors.length,
        connectors: createdConnectors,
      };
    }

    return chargePoint;
  }

  async updateChargePoint(id: string, data: UpdateChargePointData) {
    const normalizedId = id?.trim();
    if (!normalizedId) {
      throw new Error('Charge point ID is required');
    }

    if (
      data.chargepointname === undefined &&
      data.serialNumber === undefined &&
      data.brand === undefined &&
      data.powerRating === undefined &&
      data.powerSystem === undefined &&
      data.protocol === undefined &&
      data.csmsUrl === undefined &&
      data.chargePointIdentity === undefined &&
      data.chargepointstatus === undefined
    ) {
      throw new Error('At least one field must be provided');
    }

    const existing = await prisma.charge_points.findUnique({
      where: { id: normalizedId },
    });

    if (!existing) {
      throw new ChargePointNotFoundError();
    }

    const updateData: Prisma.charge_pointsUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.chargepointname !== undefined) {
      const name = this.trimRequired(data.chargepointname, 'Charge point name');
      updateData.chargepointname = name;
    }

    if (data.brand !== undefined) {
      const brand = this.trimRequired(data.brand, 'Brand');
      updateData.brand = brand;
    }

    if (data.serialNumber !== undefined) {
      const serial = this.trimRequired(data.serialNumber, 'Serial number');

      if (serial !== existing.serialNumber) {
        const dup = await prisma.charge_points.findUnique({
          where: { serialNumber: serial },
        });

        if (dup && dup.id !== normalizedId) {
          throw new Error('Serial number already exists');
        }
      }

      updateData.serialNumber = serial;
    }

    if (data.powerRating !== undefined) {
      const rating = Number(data.powerRating);
      if (!Number.isFinite(rating) || rating < 0) {
        throw new Error('Power rating must be a non-negative number');
      }
      updateData.powerRating = rating;
    }

    if (data.powerSystem !== undefined) {
      const system = Number(data.powerSystem);
      if (!Number.isFinite(system) || system < 1) {
        throw new Error('Power system must be greater than or equal to 1');
      }
      updateData.powerSystem = system;
    }

    if (data.protocol !== undefined) {
      if (!Object.values(OCPPVersion).includes(data.protocol)) {
        throw new Error('Invalid OCPP protocol value');
      }
      updateData.protocol = data.protocol;
    }

    if (data.csmsUrl !== undefined) {
      updateData.csmsUrl = this.normalizeId(data.csmsUrl ?? null);
    }

    if (data.chargePointIdentity !== undefined) {
      const identity = this.trimRequired(
        data.chargePointIdentity,
        'Charge point identity',
      );

      if (identity !== existing.chargePointIdentity) {
        const dup = await prisma.charge_points.findUnique({
          where: { chargePointIdentity: identity },
        });

        if (dup && dup.id !== normalizedId) {
          throw new Error('Charge point identity already exists');
        }
      }

      updateData.chargePointIdentity = identity;
    }

    if (data.chargepointstatus !== undefined) {
      if (!Object.values(ChargePointStatus).includes(data.chargepointstatus)) {
        throw new Error('Invalid charge point status value');
      }
      updateData.chargepointstatus = data.chargepointstatus;
    }

    const updated = await prisma.charge_points.update({
      where: { id: normalizedId },
      data: updateData,
    });

    logger.info('Admin updated charge point', {
      chargePointId: normalizedId,
      fields: Object.keys(updateData).filter((key) => key !== 'updatedAt'),
    });

    return updated;
  }

  async deleteChargePoint(id: string) {
    const normalizedId = id?.trim();
    if (!normalizedId) {
      throw new Error('Charge point ID is required');
    }

    const deleteResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.charge_points.findUnique({
        where: { id: normalizedId },
        select: { id: true },
      });

      if (!existing) {
        throw new ChargePointNotFoundError();
      }

      const transactionCount = await tx.transactions.count({
        where: { chargePointId: normalizedId },
      });

      if (transactionCount > 0) {
        throw new ChargePointHasTransactionsError();
      }

      const removedConnectors = await tx.connectors.deleteMany({
        where: { chargePointId: normalizedId },
      });

      await tx.charge_points.delete({ where: { id: normalizedId } });

      return {
        removedConnectors: removedConnectors.count,
      };
    });

    logger.info('Admin deleted charge point', {
      chargePointId: normalizedId,
      removedConnectors: deleteResult.removedConnectors,
    });

    return {
      success: true,
      removedConnectors: deleteResult.removedConnectors,
    };
  }

  async getChargeSessionHistory(
    filters: ChargeSessionHistoryFilters,
  ): Promise<ChargeSessionHistoryResult> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.transactionsWhereInput = {};

    if (filters.search?.trim()) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { transactionId: { contains: searchTerm, mode: 'insensitive' } },
        {
          ocppTransactionId: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          charge_points: {
            chargepointname: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          User: {
            fullName: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          User: {
            phoneNumber: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      ];
    }

    if (filters.startDate) {
      const start = this.parseDate(filters.startDate, 'startDate', 'start');
      const existing = (where.startTime ?? {}) as Prisma.DateTimeFilter;
      where.startTime = {
        ...existing,
        gte: start,
      };
    }

    if (filters.endDate) {
      const end = this.parseDate(filters.endDate, 'endDate', 'end');
      const existing = (where.startTime ?? {}) as Prisma.DateTimeFilter;
      where.startTime = {
        ...existing,
        lte: end,
      };
    }

    const [totalItems, aggregates, rows] = await Promise.all([
      prisma.transactions.count({ where }),
      prisma.transactions.aggregate({
        where,
        _sum: {
          totalCost: true,
          totalEnergy: true,
        },
      }),
      prisma.transactions.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
        include: {
          User: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
          charge_points: {
            select: {
              id: true,
              chargepointname: true,
              stationId: true,
              Station: {
                select: {
                  id: true,
                  stationname: true,
                },
              },
            },
          },
          connectors: {
            select: {
              connectorId: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              provider: true,
              status: true,
              paidAt: true,
            },
          },
        },
      }),
    ]);

    const totalRevenue = aggregates._sum.totalCost ?? 0;
    const totalEnergy = aggregates._sum.totalEnergy ?? 0;

    const sessions = rows.map((tx) => {
      const payment = tx.payments[0];
      const durationMs =
        tx.endTime && tx.startTime
          ? tx.endTime.getTime() - tx.startTime.getTime()
          : null;
      const durationMinutes =
        durationMs !== null ? Math.max(0, Math.round(durationMs / 60000)) : null;

      return {
        id: tx.id,
        sessionId: tx.transactionId,
        ocppTransactionId: tx.ocppTransactionId ?? null,
        startTime: tx.startTime,
        endTime: tx.endTime ?? null,
        durationMinutes,
        energyKWh: tx.totalEnergy ?? null,
        pricePerKWh: tx.appliedRate ?? null,
        totalCost: tx.totalCost ?? null,
        chargePoint: {
          id: tx.chargePointId,
          name: tx.charge_points?.chargepointname ?? null,
          stationId: tx.charge_points?.stationId ?? null,
          stationName: tx.charge_points?.Station?.stationname ?? null,
        },
        connectorId: tx.connectors?.connectorId ?? null,
        user: {
          id: tx.userId,
          name: tx.User?.fullName ?? null,
          phoneNumber: tx.User?.phoneNumber ?? null,
        },
        paymentMethod: payment?.provider ?? null,
        paymentStatus: payment?.status ?? null,
        status: tx.status,
      };
    });

    const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1);

    return {
      summary: {
        totalSessions: totalItems,
        totalRevenue,
        totalEnergy,
      },
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
      sessions,
    };
  }

  private buildHistoryWorksheetRows(sessions: ChargeSessionHistoryResult['sessions']) {
    const header = [
      'Session ID',
      'User Name',
      'User Phone',
      'Charge Point',
      'Station',
      'Connector',
      'Start Time',
      'End Time',
      'Duration (min)',
      'Energy (kWh)',
      'Price / kWh',
      'Total Cost',
      'Payment Method',
      'Payment Status',
      'Status',
    ];

    const rows = sessions.map((session) => [
      session.sessionId,
      session.user.name ?? '-',
      session.user.phoneNumber ?? '-',
      session.chargePoint.name ?? '-',
      session.chargePoint.stationName ?? '-',
      session.connectorId ?? '-',
      session.startTime ? new Date(session.startTime).toISOString() : '-',
      session.endTime ? new Date(session.endTime).toISOString() : '-',
      session.durationMinutes ?? '-',
      session.energyKWh ?? '-',
      session.pricePerKWh ?? '-',
      session.totalCost ?? '-',
      session.paymentMethod ?? '-',
      session.paymentStatus ?? '-',
      session.status,
    ]);

    return [header, ...rows];
  }

  async exportChargeSessionHistory(
    filters: ChargeSessionHistoryFilters,
  ): Promise<ChargeSessionHistoryExportResult> {
    const result = await this.getChargeSessionHistory(filters);

    const worksheetData = this.buildHistoryWorksheetRows(result.sessions);
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const filename = `chargepoint-history-${Date.now()}.xlsx`;

    return {
      filename,
      buffer,
    };
  }
}
