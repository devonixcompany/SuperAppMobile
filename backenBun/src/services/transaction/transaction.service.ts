import type { Prisma, PrismaClient } from '@prisma/client';
import { TransactionStatus } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';

export interface CreateTransactionParams {
  userId: string;
  chargePointIdentity: string;
  connectorId: number;
  vehicleId?: string;
  requestedAt?: string | Date;
  startMeterValue?: number;
}

export interface StartTransactionParams {
  transactionId: string;
  ocppTransactionId: number;
  meterStart?: number;
  timestamp?: string;
}

export interface StopTransactionParams {
  ocppTransactionId: number | string;
  meterStop: number;
  timestamp: string;
  idTag?: string;
  reason?: string;
  transactionData?: any[];
}

export interface TransactionSummary {
  transactionId: string;
  chargePointIdentity?: string | null;
  connectorNumber?: number | null;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  totalEnergy: number | null;
  meterStart: number | null;
  meterStop: number | null;
  totalCost: number | null;
  appliedRate: number | null;
  stopReason?: string | null;
}

export class TransactionService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  /**
   * Generate a 6-digit transaction id suitable for idTag usage.
   * Retries a few times to avoid collisions, falls back to UUID fragment.
   */
  private async generateTransactionId(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomInt(100000, 999999).toString();
      const existing = await this.prisma.transaction.findUnique({
        where: { transactionId: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }

    const largeCandidate = `${randomInt(100000, 999999)}${randomInt(100, 999)}`;
    const existing = await this.prisma.transaction.findUnique({
      where: { transactionId: largeCandidate },
      select: { id: true },
    });

    if (!existing) {
      return largeCandidate;
    }

    // As an absolute fallback, append timestamp fragment to guarantee uniqueness
    return `${Date.now()}${randomInt(100, 999)}`;
  }

  /**
   * Create a new transaction record before issuing RemoteStartTransaction.
   * Ensures charge point and connector records exist.
   */
  async createTransaction(params: CreateTransactionParams) {
    const {
      userId,
      chargePointIdentity,
      connectorId,
      vehicleId,
      requestedAt,
      startMeterValue,
    } = params;

    const chargePoint = await this.prisma.chargePoint.findUnique({
      where: { chargePointIdentity },
    });

    if (!chargePoint) {
      throw new Error(`Charge point ${chargePointIdentity} not found`);
    }

    const connector = await this.prisma.connector.upsert({
      where: {
        chargePointId_connectorId: {
          chargePointId: chargePoint.id,
          connectorId,
        },
      },
      update: {},
      create: {
        chargePointId: chargePoint.id,
        connectorId,
      },
    });

    const transactionId = await this.generateTransactionId();
    const startTime = requestedAt ? new Date(requestedAt) : new Date();

    const transaction = await this.prisma.transaction.create({
      data: {
        transactionId,
        userId,
        vehicleId,
        chargePointId: chargePoint.id,
        connectorId: connector.id,
        startTime,
        startMeterValue: startMeterValue ?? 0,
        status: TransactionStatus.ACTIVE,
      },
    });

    return transaction;
  }

  /**
   * Verify an idTag (transactionId) originated from our system and is still active.
   */
  async authorizeTransaction(idTag: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId: idTag },
      include: {
        user: { select: { id: true, status: true } },
        chargePoint: { select: { id: true, chargePointIdentity: true } },
      },
    });

    if (!transaction) {
      return {
        authorized: false,
        reason: 'TRANSACTION_NOT_FOUND',
      } as const;
    }

    if (transaction.status !== TransactionStatus.ACTIVE) {
      return {
        authorized: false,
        reason: 'TRANSACTION_NOT_ACTIVE',
      } as const;
    }

    if (!transaction.user || transaction.user.status !== 'ACTIVE') {
      return {
        authorized: false,
        reason: 'USER_NOT_ACTIVE',
      } as const;
    }

    return {
      authorized: true,
      transaction,
    } as const;
  }

  /**
   * Record StartTransaction details, linking the OCPP transaction id.
   */
  async recordStartTransaction(params: StartTransactionParams) {
    const { transactionId, ocppTransactionId, meterStart, timestamp } = params;

    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found for StartTransaction`);
    }

    const startTime = timestamp ? new Date(timestamp) : new Date();

    return await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ocppTransactionId: String(ocppTransactionId),
        startTime,
        startMeterValue: meterStart ?? transaction.startMeterValue ?? 0,
        status: TransactionStatus.ACTIVE,
      },
    });
  }

  /**
   * Record StopTransaction data and close the transaction.
   */
  async recordStopTransaction(params: StopTransactionParams) {
    const { ocppTransactionId, meterStop, timestamp, idTag, reason, transactionData } =
      params;

    const ocppId = String(ocppTransactionId);

    let transaction = await this.prisma.transaction.findFirst({
      where: { ocppTransactionId: ocppId },
    });

    if (!transaction && idTag) {
      transaction = await this.prisma.transaction.findUnique({
        where: { transactionId: idTag },
      });
    }

    if (!transaction) {
      throw new Error(
        `Transaction with OCPP ID ${ocppId} ${idTag ? `or idTag ${idTag}` : ''} not found`
      );
    }

    const stopTime = new Date(timestamp);

    const totalEnergy =
      typeof meterStop === 'number' && Number.isFinite(meterStop)
        ? this.calculateEnergyDelta(transaction.startMeterValue ?? 0, meterStop)
        : undefined;

    const meterValueRecords = this.extractMeterValueRecords(
      transaction.id,
      transactionData
    );

    const updatedTransaction = await this.prisma.$transaction(async (tx) => {
      if (meterValueRecords.length > 0) {
        await tx.meter_values.deleteMany({
          where: { transactionId: transaction!.id },
        });

        await tx.meter_values.createMany({
          data: meterValueRecords,
        });
      }

      return await tx.transaction.update({
        where: { id: transaction!.id },
        data: {
          endTime: stopTime,
          endMeterValue: meterStop,
          totalEnergy: totalEnergy ?? transaction.totalEnergy,
          stopReason: reason ?? transaction.stopReason,
          status: TransactionStatus.COMPLETED,
        },
      });
    });

    return updatedTransaction;
  }

  private calculateEnergyDelta(startMeter: number, endMeter: number): number | undefined {
    if (!Number.isFinite(startMeter) || !Number.isFinite(endMeter)) {
      return undefined;
    }

    const delta = endMeter - startMeter;
    return delta >= 0 ? delta : undefined;
  }

  private extractMeterValueRecords(
    transactionId: string,
    transactionData?: any[]
  ): Prisma.meter_valuesCreateManyInput[] {
    if (!Array.isArray(transactionData)) {
      return [];
    }

    const records: Prisma.meter_valuesCreateManyInput[] = [];

    for (const entry of transactionData) {
      if (!entry || !Array.isArray(entry.sampledValue)) {
        continue;
      }

      let energyValue: number | null = null;
      let power: number | undefined;
      let current: number | undefined;
      let voltage: number | undefined;

      for (const sample of entry.sampledValue) {
        if (!sample || sample.value === undefined || sample.value === null) {
          continue;
        }

        const numericValue = Number(sample.value);
        if (!Number.isFinite(numericValue)) {
          continue;
        }

        const measurand = (sample.measurand || '').toLowerCase();

        if (measurand.includes('energy.active.import')) {
          energyValue = numericValue;
        } else if (measurand.includes('power') && power === undefined) {
          power = numericValue;
        } else if (measurand.includes('current') && current === undefined) {
          current = numericValue;
        } else if (measurand.includes('voltage') && voltage === undefined) {
          voltage = numericValue;
        }
      }

      if (energyValue === null) {
        const fallback = entry.sampledValue
          .map((sample: any) => Number(sample?.value))
          .find((value: number) => Number.isFinite(value));

        if (fallback === undefined) {
          continue;
        }

        energyValue = fallback;
      }

      const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
      if (Number.isNaN(timestamp.getTime())) {
        continue;
      }

      records.push({
        id: randomUUID(),
        transactionId,
        timestamp,
        value: energyValue,
        power,
        current,
        voltage,
      });
    }

    return records;
  }

  async getTransactionSummary(transactionId: string, userId: string): Promise<TransactionSummary | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
      include: {
        chargePoint: {
          select: {
            chargePointIdentity: true,
            onPeakRate: true
          }
        },
        connector: {
          select: {
            connectorId: true
          }
        }
      }
    });

    if (!transaction || transaction.userId !== userId) {
      return null;
    }

    const startTime = transaction.startTime;
    const endTime = transaction.endTime ?? null;
    let durationSeconds: number | null = null;

    if (startTime && endTime) {
      const diffMs = endTime.getTime() - startTime.getTime();
      if (Number.isFinite(diffMs) && diffMs >= 0) {
        durationSeconds = Math.floor(diffMs / 1000);
      }
    }

    const meterStart = transaction.startMeterValue ?? null;
    const meterStop = transaction.endMeterValue ?? null;

    let totalEnergy = transaction.totalEnergy ?? null;
    if (
      (totalEnergy === null || totalEnergy === undefined) &&
      meterStart !== null &&
      meterStop !== null
    ) {
      const delta = meterStop - meterStart;
      totalEnergy = Number.isFinite(delta) ? Math.max(delta, 0) : null;
    }

    const appliedRate =
      transaction.appliedRate ??
      transaction.chargePoint?.onPeakRate ??
      null;

    let totalCost = transaction.totalCost ?? null;
    if (
      totalCost === null &&
      totalEnergy !== null &&
      appliedRate !== null
    ) {
      const computedCost = totalEnergy * appliedRate;
      totalCost = Number.isFinite(computedCost) ? computedCost : null;
    }

    return {
      transactionId: transaction.transactionId,
      chargePointIdentity: transaction.chargePoint?.chargePointIdentity ?? null,
      connectorNumber: transaction.connector?.connectorId ?? null,
      startTime,
      endTime,
      durationSeconds,
      totalEnergy,
      meterStart,
      meterStop,
      totalCost,
      appliedRate,
      stopReason: transaction.stopReason ?? null
    };
  }
}
