import { Elysia, t } from 'elysia';
import { TransactionService } from './transaction.service';

export const transactionController = (transactionService: TransactionService) =>
  new Elysia({ prefix: '/api/transactions' })
    .post(
      '/',
      async ({ body, set, user }: any) => {
        try {
          if (!user?.id) {
            set.status = 401;
            return {
              success: false,
              message: 'Unauthorized',
            };
          }

          const payload = body as {
            userId?: string;
            chargePointIdentity: string;
            connectorId: number;
            vehicleId?: string;
            requestedAt?: string;
            startMeterValue?: number;
          };

          if (payload.userId && payload.userId !== user.id) {
            set.status = 403;
            return {
              success: false,
              message: 'User mismatch between token and payload',
            };
          }

          const transaction = await transactionService.createTransaction({
            userId: payload.userId ?? user.id,
            chargePointIdentity: payload.chargePointIdentity,
            connectorId: payload.connectorId,
            vehicleId: payload.vehicleId,
            requestedAt: payload.requestedAt,
            startMeterValue: payload.startMeterValue,
          });

          set.status = 201;
          return {
            success: true,
            data: {
              id: transaction.id,
              transactionId: transaction.transactionId,
              idTag: transaction.transactionId,
              chargePointId: transaction.chargePointId,
              connectorId: transaction.connectorId,
              status: transaction.status,
            },
          };
        } catch (error: any) {
          console.error('Create transaction error:', error);
          set.status = 400;
          return {
            success: false,
            message: error?.message || 'Failed to create transaction',
          };
        }
      },
      {
        detail: {
          tags: ['Transactions'],
          summary: 'Create new charging transaction',
          description:
            'Initialize a transaction record before issuing RemoteStartTransaction. Returns transaction id to use as idTag.',
          security: [{ bearerAuth: [] }],
        },
        body: t.Object({
          userId: t.Optional(t.String()),
          chargePointIdentity: t.String(),
          connectorId: t.Number(),
          vehicleId: t.Optional(t.String()),
          requestedAt: t.Optional(t.String()),
          startMeterValue: t.Optional(t.Number()),
        }),
      }
    )
    .post(
      '/authorize',
      async ({ body, set }: any) => {
        try {
          const { idTag } = body as { idTag: string };

          const result = await transactionService.authorizeTransaction(idTag);

          const baseResponse: any = {
            success: true,
            data: {
              status: result.authorized ? 'Accepted' : 'Rejected',
            },
          };

          if (!result.authorized) {
            baseResponse.data.reason = result.reason;
          } else {
            baseResponse.data.transaction = {
              id: result.transaction.id,
              transactionId: result.transaction.transactionId,
              chargePointId: result.transaction.chargePointId,
              connectorId: result.transaction.connectorId,
            };
          }

          return baseResponse;
        } catch (error: any) {
          console.error('Authorize transaction error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'Failed to authorize transaction',
          };
        }
      },
      {
        detail: {
          tags: ['Transactions'],
          summary: 'Authorize transaction idTag (gateway)',
          description:
            'Validates that an idTag belongs to an active transaction. Designed for ws-gateway usage.',
        },
        body: t.Object({
          idTag: t.String(),
        }),
      }
    )
    .get(
      '/:transactionId/summary',
      async ({ params, user, set }: any) => {
        if (!user?.id) {
          set.status = 401;
          return {
            success: false,
            message: 'Unauthorized',
          };
        }

        try {
          const { transactionId } = params as { transactionId: string };
          const summary = await transactionService.getTransactionSummary(transactionId, user.id);

          if (!summary) {
            set.status = 404;
            return {
              success: false,
              message: 'Transaction not found',
            };
          }

          return {
            success: true,
            data: {
              transactionId: summary.transactionId,
              chargePointIdentity: summary.chargePointIdentity ?? null,
              connectorNumber: summary.connectorNumber ?? null,
              startTime: summary.startTime.toISOString(),
              endTime: summary.endTime ? summary.endTime.toISOString() : null,
              durationSeconds: summary.durationSeconds,
              totalEnergy: summary.totalEnergy,
              meterStart: summary.meterStart,
              meterStop: summary.meterStop,
              totalCost: summary.totalCost,
              appliedRate: summary.appliedRate,
              stopReason: summary.stopReason ?? null,
            },
          };
        } catch (error: any) {
          console.error('Get transaction summary error:', error);
          set.status = 500;
          return {
            success: false,
            message: error?.message || 'Failed to retrieve transaction summary',
          };
        }
      },
      {
        detail: {
          tags: ['Transactions'],
          summary: 'Get transaction summary',
          description: 'Retrieve energy consumption and cost information for a completed transaction.',
          security: [{ bearerAuth: [] }],
        },
        params: t.Object({
          transactionId: t.String(),
        }),
      }
    )
    .post(
      '/:transactionId/start',
      async ({ params, body, set }: any) => {
        try {
          const { transactionId } = params as { transactionId: string };
          const payload = body as {
            ocppTransactionId: number;
            meterStart?: number;
            timestamp?: string;
          };

          const updated = await transactionService.recordStartTransaction({
            transactionId,
            ocppTransactionId: payload.ocppTransactionId,
            meterStart: payload.meterStart,
            timestamp: payload.timestamp,
          });

          return {
            success: true,
            data: {
              transactionId: updated.transactionId,
              ocppTransactionId: updated.ocppTransactionId,
              status: updated.status,
            },
          };
        } catch (error: any) {
          console.error('Record start transaction error:', error);
          set.status = 404;
          return {
            success: false,
            message: error?.message || 'Transaction not found',
          };
        }
      },
      {
        params: t.Object({
          transactionId: t.String(),
        }),
        body: t.Object({
          ocppTransactionId: t.Number(),
          meterStart: t.Optional(t.Number()),
          timestamp: t.Optional(t.String()),
        }),
      }
    )
    .post(
      '/ocpp/:ocppTransactionId/stop',
      async ({ params, body, set }: any) => {
        try {
          const { ocppTransactionId } = params as { ocppTransactionId: string };
          const payload = body as {
            meterStop: number;
            timestamp: string;
            idTag?: string;
            reason?: string;
            transactionData?: any[];
          };

          const updated = await transactionService.recordStopTransaction({
            ocppTransactionId,
            meterStop: payload.meterStop,
            timestamp: payload.timestamp,
            idTag: payload.idTag,
            reason: payload.reason,
            transactionData: payload.transactionData,
          });

          return {
            success: true,
            data: {
              transactionId: updated.transactionId,
              status: updated.status,
              completedAt: updated.endTime,
            },
          };
        } catch (error: any) {
          console.error('Record stop transaction error:', error);
          set.status = 404;
          return {
            success: false,
            message: error?.message || 'Transaction not found',
          };
        }
      },
      {
        params: t.Object({
          ocppTransactionId: t.String(),
        }),
        body: t.Object({
          meterStop: t.Number(),
          timestamp: t.String(),
          idTag: t.Optional(t.String()),
          reason: t.Optional(t.String()),
          transactionData: t.Optional(t.Array(t.Any())),
        }),
      }
    );
