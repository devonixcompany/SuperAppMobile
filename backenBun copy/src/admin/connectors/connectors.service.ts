import { ConnectorStatus, ConnectorType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export interface CreateConnectorData {
  id?: string;
  chargePointId: string;
  connectorId: number;
  type?: ConnectorType;
  connectorstatus?: ConnectorStatus;
  maxPower?: number | string | null;
  maxCurrent?: number | string | null;
  typeDescription?: string | null;
}

export class AdminConnectorsService {
  private trimRequired(value: string | undefined, field: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new Error(`${field} is required`);
    }
    return trimmed;
  }

  private ensurePositiveInteger(value: number | string, field: string) {
    const parsed =
      typeof value === 'string' ? Number.parseInt(value, 10) : value;
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`${field} must be a positive integer`);
    }
    return parsed;
  }

  private normalizeFloat(
    value: number | string | null | undefined,
    field: string,
  ) {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const numeric =
      typeof value === 'string' ? Number.parseFloat(value) : value;
    if (Number.isNaN(numeric) || numeric < 0) {
      throw new Error(`${field} must be a non-negative number`);
    }

    return numeric;
  }

  async createConnector(data: CreateConnectorData) {
    const chargePointId = this.trimRequired(
      data.chargePointId,
      'Charge point ID',
    );
    const connectorId = this.ensurePositiveInteger(
      data.connectorId,
      'Connector ID',
    );
    const type = data.type ?? ConnectorType.TYPE_2;
    const connectorstatus = data.connectorstatus ?? ConnectorStatus.AVAILABLE;

    const chargePoint = await prisma.charge_points.findUnique({
      where: { id: chargePointId },
      select: { id: true },
    });

    if (!chargePoint) {
      throw new Error('Referenced charge point not found');
    }

    const existingConnector = await prisma.connectors.findUnique({
      where: {
        chargePointId_connectorId: {
          chargePointId,
          connectorId,
        },
      },
    });

    if (existingConnector) {
      throw new Error(
        'Connector ID already exists for the specified charge point',
      );
    }

    const connector = await prisma.$transaction(async (tx) => {
      const createdConnector = await tx.connectors.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          chargePointId,
          connectorId,
          type,
          connectorstatus,
          typeDescription: data.typeDescription?.trim() ?? null,
          maxPower: this.normalizeFloat(
            data.maxPower,
            'Max power',
          ),
          maxCurrent: this.normalizeFloat(
            data.maxCurrent,
            'Max current',
          ),
        },
      });

      const totalConnectors = await tx.connectors.count({
        where: { chargePointId },
      });

      await tx.charge_points.update({
        where: { id: chargePointId },
        data: {
          connectorCount: totalConnectors,
          updatedAt: new Date(),
        },
      });

      return createdConnector;
    });

    logger.info('Admin created connector', {
      connectorId: connector.id,
      chargePointId: connector.chargePointId,
    });

    return connector;
  }
}
