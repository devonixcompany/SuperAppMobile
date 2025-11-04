import type { PrismaClient } from '@prisma/client';
import { TransactionStatus } from '@prisma/client';
import { randomInt } from 'crypto';
import { prisma } from '../../lib/prisma';
import { PaymentService } from '../payment/payment.service';

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

    const chargePoint = await this.prisma.charge_points.findUnique({
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

    const scale = this.inferScaleFromRawValue(meterStart);
    const normalizedStart = this.normalizeMeterReading(
      meterStart ?? transaction.startMeterValue ?? null,
      scale
    );

    return await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ocppTransactionId: String(ocppTransactionId),
        startTime,
        startMeterValue: normalizedStart ?? transaction.startMeterValue ?? 0,
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

    const transactionInclude = {
      chargePoint: {
        select: {
          chargePointIdentity: true,
          Station: {
            select: {
              onPeakRate: true,
              offPeakRate: true,
              onPeakStartTime: true,
              onPeakEndTime: true,
              offPeakStartTime: true,
              offPeakEndTime: true,
            },
          },
        },
      },
    } as const;

    let transaction = await this.prisma.transaction.findFirst({
      where: { ocppTransactionId: ocppId },
      include: transactionInclude,
    });

    if (!transaction && idTag) {
      transaction = await this.prisma.transaction.findUnique({
        where: { transactionId: idTag },
        include: transactionInclude,
      });
    }

    if (!transaction) {
      throw new Error(
        `Transaction with OCPP ID ${ocppId} ${idTag ? `or idTag ${idTag}` : ''} not found`
      );
    }

    const stopTime = new Date(timestamp);

    const energyExtremes = this.extractEnergyExtremes(transactionData);

    const scaleFromStop = this.determineScale(meterStop, energyExtremes.end);
    const scaleFromStart = this.determineScale(transaction.startMeterValue, energyExtremes.start);
    const scale =
      scaleFromStop ??
      scaleFromStart ??
      this.inferScaleFromRawValue(meterStop) ??
      this.inferScaleFromRawValue(transaction.startMeterValue);

    const normalizedStart = energyExtremes.start ?? this.normalizeMeterReading(transaction.startMeterValue, scale);
    const normalizedEnd = energyExtremes.end ?? this.normalizeMeterReading(meterStop, scale);

    let totalEnergy: number | null = null;
    if (normalizedStart != null && normalizedEnd != null) {
      totalEnergy = Math.max(normalizedEnd - normalizedStart, 0);
    } else if (
      typeof meterStop === 'number' &&
      typeof transaction.startMeterValue === 'number'
    ) {
      const rawDelta = meterStop - transaction.startMeterValue;
      const normalizedDelta = this.normalizeMeterReading(rawDelta, scale);
      if (normalizedDelta != null) {
        totalEnergy = Math.max(normalizedDelta, 0);
      }
    }

    const resolvedEnergy = totalEnergy ?? transaction.totalEnergy ?? null;
    const rateFromSchedule =
      this.resolveRateForTimestamp(stopTime, transaction.chargePoint?.Station) ?? null;
    const appliedRate = rateFromSchedule ?? transaction.appliedRate ?? null;
    const computedCost =
      resolvedEnergy !== null && appliedRate !== null
        ? this.computeCost(resolvedEnergy, appliedRate)
        : null;
    const totalCost = computedCost ?? transaction.totalCost ?? null;

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        endTime: stopTime,
        startMeterValue: normalizedStart ?? transaction.startMeterValue,
        endMeterValue: normalizedEnd ?? meterStop,
        totalEnergy: totalEnergy ?? transaction.totalEnergy,
        totalCost,
        appliedRate,
        stopReason: reason ?? transaction.stopReason,
        status: TransactionStatus.COMPLETED,
      },
    });

    // Process payment automatically if transaction has a cost
    if (totalCost && totalCost > 0) {
      try {
        await PaymentService.processPayment(updatedTransaction.id);
        console.log(`Payment processing initiated for transaction ${updatedTransaction.transactionId}`);
      } catch (paymentError) {
        console.error(`Payment processing failed for transaction ${updatedTransaction.transactionId}:`, paymentError);
        // Don't throw error here - transaction is still completed, payment can be retried
      }
    }

    return updatedTransaction;
  }

  /**
   * Process payment for a completed transaction
   */
  async processTransactionPayment(transactionId: string, cardId?: string) {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { 
          user: {
            include: { paymentCards: true }
          }
        }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new Error('Transaction must be completed before processing payment');
      }

      if (!transaction.totalCost || transaction.totalCost <= 0) {
        throw new Error('Transaction has no cost to charge');
      }

      // Check if payment already exists
      const existingPayment = await this.prisma.payment.findFirst({
        where: { 
          transactionId: transaction.id,
          status: { in: ['SUCCESS', 'PENDING'] }
        }
      });

      if (existingPayment) {
        throw new Error('Payment already exists for this transaction');
      }

      return await PaymentService.processPayment(transactionId, cardId);
    } catch (error) {
      console.error('Error processing transaction payment:', error);
      throw error;
    }
  }

  private extractEnergyExtremes(transactionData?: any[]): { start: number | null; end: number | null } {
    if (!Array.isArray(transactionData) || transactionData.length === 0) {
      return { start: null, end: null };
    }

    let startValue: number | null = null;
    let endValue: number | null = null;
    const encounteredValues: number[] = [];

    for (const entry of transactionData) {
      if (!entry || !Array.isArray(entry.sampledValue)) {
        continue;
      }

      const entryContext = typeof entry.context === 'string' ? entry.context.toLowerCase() : '';

      for (const sample of entry.sampledValue) {
        if (!sample) {
          continue;
        }

        const measurand = typeof sample.measurand === 'string' ? sample.measurand.toLowerCase() : '';
        if (!measurand.includes('energy.active.import')) {
          continue;
        }

        const numericValue = Number(sample.value);
        if (!Number.isFinite(numericValue)) {
          continue;
        }

        const sampleContext = typeof sample.context === 'string' ? sample.context.toLowerCase() : entryContext;

        if (sampleContext === 'transaction.begin') {
          startValue = numericValue;
        }

        if (sampleContext === 'transaction.end') {
          endValue = numericValue;
        }

        encounteredValues.push(numericValue);
      }
    }

    if (startValue == null && encounteredValues.length > 0) {
      startValue = encounteredValues[0];
    }

    if (endValue == null && encounteredValues.length > 0) {
      endValue = encounteredValues[encounteredValues.length - 1];
    }

    return { start: startValue, end: endValue };
  }

  private determineScale(rawValue?: number | null, derivedValue?: number | null): number | null {
    if (
      rawValue === undefined ||
      rawValue === null ||
      derivedValue === undefined ||
      derivedValue === null
    ) {
      return null;
    }

    if (!Number.isFinite(rawValue) || !Number.isFinite(derivedValue) || derivedValue === 0) {
      return null;
    }

    const ratio = rawValue / derivedValue;
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return null;
    }

    const candidates: Array<{ value: number; tolerance: number }> = [
      { value: 1, tolerance: 0.01 },
      { value: 10, tolerance: 0.02 },
      { value: 100, tolerance: 0.05 },
      { value: 1000, tolerance: 0.1 },
      { value: 10000, tolerance: 0.15 },
      { value: 100000, tolerance: 0.2 }
    ];

    for (const candidate of candidates) {
      const diffRatio = Math.abs(ratio - candidate.value) / candidate.value;
      if (diffRatio <= candidate.tolerance) {
        return candidate.value;
      }
    }

    const fallback = this.inferScaleFromRawValue(rawValue);
    return fallback;
  }

  private normalizeMeterReading(value?: number | null, scale?: number | null): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (!Number.isFinite(value)) {
      return null;
    }

    if (scale && scale > 0 && scale !== 1) {
      const absValue = Math.abs(value);
      if (absValue < 100 && scale >= 100) {
        return value;
      }
      return value / scale;
    }

    return value;
  }

  private inferScaleFromRawValue(raw?: number | null): number | null {
    if (raw === undefined || raw === null || !Number.isFinite(raw)) {
      return null;
    }

    const absRaw = Math.abs(raw);
    if (absRaw < 50) {
      return null;
    }

    const digits = Math.floor(Math.log10(absRaw)) + 1;

    if (digits >= 6) {
      return 1000;
    }

    if (digits === 5) {
      return 1000;
    }

    if (digits === 4) {
      return 100;
    }

    if (digits === 3) {
      return 100;
    }

    return null;
  }

  private resolveRateForTimestamp(
    timestamp: Date,
    pricing?: {
      onPeakRate?: number | null;
      offPeakRate?: number | null;
      onPeakStartTime?: string | null;
      onPeakEndTime?: string | null;
      offPeakStartTime?: string | null;
      offPeakEndTime?: string | null;
    }
  ): number | null {
    if (!pricing || !Number.isFinite(timestamp.getTime())) {
      return null;
    }

    const minutes = timestamp.getHours() * 60 + timestamp.getMinutes();

    const onPeakStart = this.timeStringToMinutes(pricing.onPeakStartTime);
    const onPeakEnd = this.timeStringToMinutes(pricing.onPeakEndTime);
    const offPeakStart = this.timeStringToMinutes(pricing.offPeakStartTime);
    const offPeakEnd = this.timeStringToMinutes(pricing.offPeakEndTime);

    const hasOnPeakRate =
      typeof pricing.onPeakRate === 'number' && Number.isFinite(pricing.onPeakRate);
    const hasOffPeakRate =
      typeof pricing.offPeakRate === 'number' && Number.isFinite(pricing.offPeakRate);

    if (hasOnPeakRate && this.isWithinPeriod(minutes, onPeakStart, onPeakEnd)) {
      return pricing.onPeakRate as number;
    }

    if (hasOffPeakRate && this.isWithinPeriod(minutes, offPeakStart, offPeakEnd)) {
      return pricing.offPeakRate as number;
    }

    if (hasOffPeakRate) {
      return pricing.offPeakRate as number;
    }

    if (hasOnPeakRate) {
      return pricing.onPeakRate as number;
    }

    return null;
  }

  private timeStringToMinutes(value?: string | null): number | null {
    if (!value) {
      return null;
    }

    const [hoursStr, minutesStr] = value.split(':');
    if (hoursStr === undefined || minutesStr === undefined) {
      return null;
    }

    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private isWithinPeriod(minutes: number, start: number | null, end: number | null): boolean {
    if (start === null || end === null) {
      return false;
    }

    if (start === end) {
      return true;
    }

    if (start < end) {
      return minutes >= start && minutes < end;
    }

    return minutes >= start || minutes < end;
  }

  private computeCost(energy: number, rate: number): number | null {
    if (!Number.isFinite(energy) || !Number.isFinite(rate)) {
      return null;
    }

    const sanitizedEnergy = Math.max(energy, 0);
    const sanitizedRate = Math.max(rate, 0);
    const product = sanitizedEnergy * sanitizedRate;

    if (!Number.isFinite(product)) {
      return null;
    }

    return Math.round(product * 100) / 100;
  }

  /**
   * Get all transactions for a specific user with charge point information
   */
  async getTransactionsByUserId(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { 
        userId,
        status: TransactionStatus.ACTIVE 
      },
      include: {
        chargePoint: {
          select: {
            id: true,
            chargepointname: true,
            brand: true,
            serialNumber: true,
            powerRating: true,
            chargePointIdentity: true,
            chargepointstatus: true,
            maxPower: true,
            openingHours: true,
            is24Hours: true,
            isPublic: true,
            ownershipType: true,
            Station: {
              select: {
                stationname: true,
                location: true,
                latitude: true,
                longitude: true,
                onPeakRate: true,
                offPeakRate: true,
                onPeakStartTime: true,
                onPeakEndTime: true,
                offPeakStartTime: true,
                offPeakEndTime: true
              }
            }
          }
        },
        connector: {
          select: {
            id: true,
            connectorId: true,
            type: true,
            typeDescription: true,
            connectorstatus: true,
            maxPower: true,
            maxCurrent: true
          }
        },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            type: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    return transactions.map((transaction: any) => {
      if (transaction.chargePoint?.Station) {
        const { Station, ...restChargePoint } = transaction.chargePoint;
        const latitude =
          Station.latitude !== null && Station.latitude !== undefined
            ? Number(Station.latitude)
            : null;
        const longitude =
          Station.longitude !== null && Station.longitude !== undefined
            ? Number(Station.longitude)
            : null;

        return {
          ...transaction,
          chargePoint: {
            ...restChargePoint,
            stationName: Station.stationname,
            location: Station.location,
            latitude,
            longitude,
            onPeakRate: Station.onPeakRate,
            offPeakRate: Station.offPeakRate,
            onPeakStartTime: Station.onPeakStartTime,
            onPeakEndTime: Station.onPeakEndTime,
            offPeakStartTime: Station.offPeakStartTime,
            offPeakEndTime: Station.offPeakEndTime
          }
        };
      }

      return transaction;
    });
  }

  async getTransactionSummary(
    transactionId: string,
    userId?: string | null
  ): Promise<TransactionSummary | null> {
    const normalizedId = transactionId.trim();
    const isNumericId = /^\d+$/.test(normalizedId);

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        AND: [
          ...(userId ? [{ userId }] : []),
          {
            OR: [
              { transactionId: normalizedId },
              ...(isNumericId ? [{ ocppTransactionId: normalizedId }] : [])
            ]
          }
        ]
      },
      include: {
        chargePoint: {
          select: {
            chargePointIdentity: true,
            Station: {
              select: {
                onPeakRate: true
              }
            }
          }
        },
        connector: {
          select: {
            connectorId: true
          }
        }
      }
    });

    if (!transaction) {
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
      transaction.chargePoint?.Station?.onPeakRate ??
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
