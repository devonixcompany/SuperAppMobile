import { PrismaClient, Prisma } from "@prisma/client";
import cors from "cors";
import express from "express";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

const toNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

const normalizeChargePoint = <
  T extends { latitude?: unknown; longitude?: unknown; connectors?: any[] },
>(
  chargePoint: T,
) => {
  const normalized: any = {
    ...chargePoint,
    latitude: toNullableNumber(chargePoint.latitude),
    longitude: toNullableNumber(chargePoint.longitude),
  };

  if (Array.isArray(chargePoint.connectors)) {
    normalized.connectors = chargePoint.connectors.map((connector: any) => ({
      ...connector,
      maxPower: toNullableNumber(connector.maxPower),
      maxCurrent: toNullableNumber(connector.maxCurrent),
    }));
  }

  return normalized;
};

const ALLOWED_CHARGE_POINT_FIELDS = [
  "chargepointname",
  "location",
  "latitude",
  "longitude",
  "openingHours",
  "is24Hours",
  "brand",
  "serialNumber",
  "powerRating",
  "powerSystem",
  "connectorCount",
  "protocol",
  "csmsUrl",
  "chargePointIdentity",
  "chargepointstatus",
  "maxPower",
  "lastSeen",
  "heartbeatIntervalSec",
  "vendor",
  "model",
  "firmwareVersion",
  "ocppProtocolRaw",
  "ocppSessionId",
  "isWhitelisted",
  "ownerId",
  "ownershipType",
  "isPublic",
  "onPeakRate",
  "onPeakStartTime",
  "onPeakEndTime",
  "offPeakRate",
  "offPeakStartTime",
  "offPeakEndTime",
  "urlwebSocket",
  "stationId",
  "powerSystem",
] as const satisfies readonly (keyof Prisma.ChargePointUncheckedCreateInput)[];

type ChargePointField = (typeof ALLOWED_CHARGE_POINT_FIELDS)[number];

const NUMERIC_FIELDS = [
  "latitude",
  "longitude",
  "powerRating",
  "powerSystem",
  "connectorCount",
  "maxPower",
  "onPeakRate",
  "offPeakRate",
  "heartbeatIntervalSec",
] as const satisfies readonly ChargePointField[];

const numericFieldSet = new Set<ChargePointField>(NUMERIC_FIELDS);

const transformValue = <K extends ChargePointField>(
  field: K,
  value: unknown,
): Prisma.ChargePointUncheckedCreateInput[K] => {
  if (numericFieldSet.has(field)) {
    return (
      value === null || value === undefined ? null : Number(value)
    ) as Prisma.ChargePointUncheckedCreateInput[K];
  }
  return value as Prisma.ChargePointUncheckedCreateInput[K];
};

const pickChargePointData = (source: Record<string, unknown>) => {
  const data: Partial<
    Record<
      ChargePointField,
      Prisma.ChargePointUncheckedCreateInput[ChargePointField]
    >
  > = {};
  for (const field of ALLOWED_CHARGE_POINT_FIELDS) {
    const value = source[field as string];
    if (value !== undefined) {
      data[field] = transformValue(field, value);
    }
  }
  return data as Partial<Prisma.ChargePointUncheckedCreateInput>;
};

const buildConnectorPayload = (
  connectors: unknown,
): Array<Prisma.ConnectorCreateWithoutChargePointInput> => {
  if (!Array.isArray(connectors)) return [];

  const payload: Array<Prisma.ConnectorCreateWithoutChargePointInput> = [];

  for (const entry of connectors) {
    if (!entry || typeof entry !== "object") continue;
    const connector = entry as Record<string, unknown>;

    if (connector.connectorId === undefined) {
      continue;
    }

    const record: Prisma.ConnectorCreateWithoutChargePointInput = {
      connectorId: Number(connector.connectorId),
    };

    if (connector.type !== undefined) {
      record.type =
        connector.type as Prisma.ConnectorCreateWithoutChargePointInput["type"];
    }
    if (connector.status !== undefined) {
      record.status =
        connector.status as Prisma.ConnectorCreateWithoutChargePointInput["status"];
    }
    if (connector.maxPower !== undefined) {
      record.maxPower =
        connector.maxPower === null ? null : Number(connector.maxPower);
    }
    if (connector.maxCurrent !== undefined) {
      record.maxCurrent =
        connector.maxCurrent === null ? null : Number(connector.maxCurrent);
    }
    if (connector.typeDescription !== undefined) {
      record.typeDescription = connector.typeDescription as
        | string
        | null
        | undefined;
    }

    payload.push(record);
  }

  return payload;
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/chargepoints", async (_req, res) => {
  try {
    const chargePoints = await prisma.chargePoint.findMany({
      select: {
        id: true,
        chargepointname: true,
        stationId: true,
        location: true,
        latitude: true,
        longitude: true,
        openingHours: true,
        brand: true,
        powerRating: true,
        connectorCount: true,
        chargepointstatus: true,
        maxPower: true,
        onPeakRate: true,
        onPeakStartTime: true,
        onPeakEndTime: true,
        offPeakRate: true,
        offPeakStartTime: true,
        offPeakEndTime: true,
        station: {
          select: {
            id: true,
            stationname: true,
          },
        },
        connectors: {
          select: {
            id: true,
            chargePointId: true,
            connectorId: true,
            type: true,
            connectorstatus: true,
            maxPower: true,
            maxCurrent: true,
          },
          orderBy: { connectorId: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(chargePoints);
  } catch (error) {
    console.error("Error fetching chargepoints:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/chargepoints/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const chargePoint = await prisma.chargePoint.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            stationname: true,
          },
        },
        connectors: {
          select: {
            id: true,
            connectorId: true,
            type: true,
            status: true,
            maxPower: true,
            maxCurrent: true,
          },
          orderBy: { connectorId: "asc" },
        },
      },
    });

    if (!chargePoint) {
      return res.status(404).json({ error: "ChargePoint not found" });
    }

    res.json(normalizeChargePoint(chargePoint));
  } catch (error) {
    console.error("Error fetching chargepoint detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/chargepoints", async (req, res) => {
  try {
    const requiredFields = [
      "chargepointname",
      "location",
      "brand",
      "serialNumber",
      "powerRating",
      "protocol",
      "chargePointIdentity",
    ];
    for (const field of requiredFields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
      ) {
        return res
          .status(400)
          .json({ error: `Missing required field: ${field}` });
      }
    }

    const {
      station: stationPayload,
      stationId: stationIdRaw,
      stationName,
      stationname: stationNameLower,
      connectors,
      ...restBody
    } = req.body as Record<string, unknown>;

    const data = pickChargePointData(
      restBody,
    ) as Prisma.ChargePointUncheckedCreateInput;

    const connectorPayload = buildConnectorPayload(connectors);
    if (connectorPayload.length > 0 && data.connectorCount === undefined) {
      data.connectorCount = connectorPayload.length;
    }

    let resolvedStationId: string | undefined =
      typeof stationIdRaw === "string" && stationIdRaw.trim()
        ? stationIdRaw.trim()
        : undefined;

    if (resolvedStationId) {
      const stationExists = await prisma.station.findUnique({
        where: { id: resolvedStationId },
        select: { id: true },
      });
      if (!stationExists) {
        resolvedStationId = undefined;
      }
    }

    const stationNameCandidates = new Set<string>();

    if (typeof stationPayload === "object" && stationPayload !== null) {
      const stationObj = stationPayload as Record<string, unknown>;
      const idCandidate = stationObj.id;
      if (
        !resolvedStationId &&
        typeof idCandidate === "string" &&
        idCandidate.trim()
      ) {
        const existingById = await prisma.station.findUnique({
          where: { id: idCandidate.trim() },
          select: { id: true },
        });
        if (existingById) {
          resolvedStationId = existingById.id;
        }
      }

      const rawNameCandidates = [
        stationObj["name"],
        stationObj["stationName"],
        stationObj["stationname"],
        stationObj["title"],
      ];
      for (const rawName of rawNameCandidates) {
        if (typeof rawName === "string" && rawName.trim()) {
          stationNameCandidates.add(rawName.trim());
        }
      }
    }

    if (typeof stationName === "string" && stationName.trim()) {
      stationNameCandidates.add(stationName.trim());
    }

    if (typeof stationNameLower === "string" && stationNameLower.trim()) {
      stationNameCandidates.add(stationNameLower.trim());
    }

    if (!resolvedStationId) {
      let stationRecord: { id: string } | null = null;

      for (const candidate of stationNameCandidates) {
        stationRecord = await prisma.station.findUnique({
          where: { stationname: candidate },
          select: { id: true },
        });
        if (stationRecord) break;
      }

      if (!stationRecord) {
        const [firstCandidate] = Array.from(stationNameCandidates);
        const nameForCreation =
          firstCandidate ??
          (typeof data.chargepointname === "string" &&
          data.chargepointname.trim()
            ? `${(data.chargepointname as string).trim()} Station`
            : `Station-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

        stationRecord = await prisma.station.create({
          data: { stationname: nameForCreation },
          select: { id: true },
        });
      }

      resolvedStationId = stationRecord.id;
    }

    const chargePoint = await prisma.chargePoint.create({
      data: {
        ...data,
        ...(resolvedStationId ? { stationId: resolvedStationId } : {}),
        connectors: connectorPayload.length
          ? {
              create: connectorPayload,
            }
          : undefined,
      },
      include: {
        station: {
          select: {
            id: true,
            stationname: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        connectors: {
          orderBy: { connectorId: "asc" },
        },
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json(normalizeChargePoint(chargePoint));
  } catch (error: any) {
    console.error("Error creating chargepoint:", error);
    if (error?.code === "P2002") {
      return res
        .status(409)
        .json({ error: "ChargePoint already exists", details: error?.meta });
    }
    res
      .status(500)
      .json({
        error: "Internal server error",
        details: error?.message ?? String(error),
      });
  }
});

app.put("/chargepoints/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = pickChargePointData(
      req.body,
    ) as Prisma.ChargePointUncheckedUpdateInput;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    const chargePoint = await prisma.chargePoint.update({
      where: { id },
      data,
      include: {
        station: {
          select: {
            id: true,
            name: true,
          },
        },
        connectors: {
          select: {
            id: true,
            connectorId: true,
            type: true,
            status: true,
            maxPower: true,
            maxCurrent: true,
          },
          orderBy: { connectorId: "asc" },
        },
      },
    });

    res.json(normalizeChargePoint(chargePoint));
  } catch (error: any) {
    console.error("Error updating chargepoint:", error);
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "ChargePoint not found" });
    }
    res
      .status(500)
      .json({
        error: "Internal server error",
        details: error?.message ?? String(error),
      });
  }
});

app.delete("/chargepoints/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.chargePoint.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting chargepoint:", error);
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "ChargePoint not found" });
    }
    res
      .status(500)
      .json({
        error: "Internal server error",
        details: error?.message ?? String(error),
      });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
