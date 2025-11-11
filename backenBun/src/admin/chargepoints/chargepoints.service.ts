import {
  ConnectorStatus,
  ConnectorType,
  OCPPVersion
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { logger } from "../../shared/logger";
import {
  AdminConnectorsService,
  CreateConnectorData,
} from "../connectors/connectors.service";

export type CreateChargePointConnectorData = Omit<
  CreateConnectorData,
  "chargePointId"
>;

export interface CreateChargePointData {
  id?: string;
  chargepointname: string;
  stationId?: string;
  brand: string;
  serialNumber: string;
  powerRating: number;
  powerSystem?: number;
  connectorCount?: number;
  protocol: OCPPVersion;
  csmsUrl?: string | null;
  chargePointIdentity: string;
  maxPower?: number;
  heartbeatIntervalSec?: number;
  vendor?: string;
  model?: string;
  firmwareVersion?: string;
  ocppProtocolRaw?: string;
  ocppSessionId?: string;
  isWhitelisted?: boolean;
  ownerId?: string;
  ownershipType?: 'PUBLIC' | 'PRIVATE' | 'SHARED';
  isPublic?: boolean;
  urlwebSocket?: string;
  openingHours?: string;
  is24Hours?: boolean;
  connectors?: CreateChargePointConnectorData[];
}

export class AdminChargePointsService {
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
      "Charge point name"
    );
    const brand = this.trimRequired(data.brand, "Brand");
    const serialNumber = this.trimRequired(data.serialNumber, "Serial number");
    const chargePointIdentity = this.trimRequired(
      data.chargePointIdentity,
      "Charge point identity"
    );

    let stationId = data.stationId;
    if (stationId) {
      stationId = this.trimRequired(data.stationId, "Station ID");
      const stationExists = await prisma.station.findUnique({
        where: { id: stationId },
        select: { id: true },
      });
      if (!stationExists) {
        throw new Error("Referenced station not found");
      }
    }

    const existingSerial = await prisma.charge_points.findUnique({
      where: { serialNumber },
    });
    if (existingSerial) {
      throw new Error("Serial number already exists");
    }

    const existingIdentity = await prisma.charge_points.findUnique({
      where: { chargePointIdentity },
    });
    if (existingIdentity) {
      throw new Error("Charge point identity already exists");
    }

    const connectorsPayload = Array.isArray(data.connectors)
      ? data.connectors
          .filter(
            (connector): connector is CreateChargePointConnectorData =>
              connector !== null && connector !== undefined
          )
          .map((connector) => {
            if (
              !Number.isInteger(connector.connectorId) ||
              connector.connectorId < 1
            ) {
              throw new Error("Connector ID must be a positive integer");
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
          `Duplicate connectorId detected: ${connector.connectorId}`
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
      throw new Error("Connector count must be at least 1");
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
        protocol: data.protocol,
        csmsUrl: this.normalizeId(data.csmsUrl ?? null),
        chargePointIdentity,
        maxPower: data.maxPower,
        heartbeatIntervalSec: data.heartbeatIntervalSec,
        vendor: data.vendor,
        model: data.model,
        firmwareVersion: data.firmwareVersion,
        ocppProtocolRaw: data.ocppProtocolRaw,
        ocppSessionId: data.ocppSessionId,
        isWhitelisted: data.isWhitelisted ?? true,
        ownerId: data.ownerId,
        ownershipType: data.ownershipType || 'PUBLIC',
        isPublic: data.isPublic ?? true,
        urlwebSocket: data.urlwebSocket,
        openingHours: data.openingHours,
        is24Hours: data.is24Hours || false,
      },
    });

    type CreatedConnector = Awaited<
      ReturnType<AdminConnectorsService["createConnector"]>
    >;
    let createdConnectors: CreatedConnector[] = [];
    if (connectorsPayload.length) {
      const connectorService = new AdminConnectorsService();
      createdConnectors = await Promise.all(
        connectorsPayload.map((connector) =>
          connectorService.createConnector({
            ...connector,
            chargePointId: chargePoint.id,
          })
        )
      );
    }

    logger.info({
      chargePointId: chargePoint.id,
    }, "Admin created charge point");

    if (createdConnectors.length) {
      return {
        ...chargePoint,
        connectorCount: createdConnectors.length,
        connectors: createdConnectors,
      };
    }

    return chargePoint;
  }
}
