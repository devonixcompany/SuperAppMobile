import { Elysia, t } from 'elysia';
import { TransactionService } from './transaction.service';

const isDevBypassEnabled = () =>
  (process.env.DEV_BYPASS_AUTH ?? '').toLowerCase() === 'true';

export const transactionController = (transactionService: TransactionService) =>
  new Elysia({ prefix: '/api/transactions' })
    .post(
      '/',
      async ({ body, set, user }: any) => {
        try {
          const bypassEnabled = isDevBypassEnabled();
          console.log("post transaction",user)
          if (!user?.id && !bypassEnabled) {
            set.status = 401;
            return {
              success: false,
              message: 'Unauthorized eiei',
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

          if (payload.userId && user?.id && payload.userId !== user.id) {
            set.status = 403;
            return {
              success: false,
              message: 'User mismatch between token and payload',
            };
          }

          const transaction = await transactionService.createTransaction({
            userId: payload.userId ?? user?.id ?? 'dev-user',
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
      '/user/:userId',
      async ({ params, user, set }: any) => {
        try {
          const bypassEnabled = isDevBypassEnabled();

          if (!user?.id && !bypassEnabled) {
            set.status = 401;
            return {
              success: false,
              message: 'Unauthorized eiei',
            };
          }

          const { userId } = params;

          // Users can only access their own transactions unless they have admin privileges
          if (!bypassEnabled && userId !== user.id) {
            set.status = 403;
            return {
              success: false,
              message: 'Access denied. You can only view your own transactions.',
            };
          }
          console.log("Fetching transactions for user:", userId)
          const transactions = await transactionService.getTransactionsByUserId(userId);

          return {
            success: true,
            data: transactions,
          };
        } catch (error) {
          console.error('Error fetching user transactions:', error);
          set.status = 500;
          return {
            success: false,
            message: 'Internal server error',
          };
        }
      },
      {
        detail: {
          tags: ['Transactions'],
          summary: 'Get user transactions with charge point data',
          description: 'Retrieve all transactions for a specific user including related charge point and connector information.',
          security: [{ bearerAuth: [] }],
        },
        params: t.Object({
          userId: t.String(),
        }),
      }
    )

    .get(
      '/:transactionId/summary',
      async ({ params, user, set }: any) => {
        try {
          const bypassEnabled = isDevBypassEnabled();

          if (!user?.id && !bypassEnabled) {
            set.status = 401;
            return {
              success: false,
              message: 'Unauthorized eiei',
            };
          }

          const { transactionId } = params as { transactionId: string };

          const summary = await transactionService.getTransactionSummary(
            transactionId,
            bypassEnabled ? null : user?.id
          );

          if (!summary) {
            set.status = 404;
            return {
              success: false,
              message: 'Resource not found',
            };
          }

          return {
            success: true,
            data: summary,
          };
        } catch (error) {
          console.error('Error fetching transaction summary:', error);
          set.status = 500;
          return {
            success: false,
            message: 'Failed to fetch transaction summary',
          };
        }
      },
      {
        detail: {
          tags: ['Transactions'],
          summary: 'Get transaction summary',
          description:
            'Retrieve a summary of a single transaction including energy and cost details.',
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
    )
    .post(
      '/:transactionId/payment',
      async ({ params, body, user, set }: any) => {
        try {
          const bypassEnabled = isDevBypassEnabled();
          
          if (!user?.id && !bypassEnabled) {
            set.status = 401;
            return {
              success: false,
              message: 'Unauthorized',
            };
          }

          const { transactionId } = params as { transactionId: string };
          const { cardId } = body as { cardId?: string };

          // Verify user owns the transaction (unless bypass enabled)
          if (!bypassEnabled) {
            const transaction = await transactionService.getTransactionSummary(transactionId, user.id);
            if (!transaction) {
              set.status = 404;
              return {
                success: false,
                message: 'Transaction not found or access denied',
              };
            }
          }

          const paymentResult = await transactionService.processTransactionPayment(transactionId, cardId);

          return {
            success: true,
            data: paymentResult,
          };
        } catch (error: any) {
          console.error('Process transaction payment error:', error);
          set.status = 400;
          return {
            success: false,
            message: error?.message || 'Failed to process payment',
          };
        }
      },
      {
        detail: {
          tags: ['Transactions'],
          summary: 'Process payment for transaction',
          description: 'Process payment for a completed transaction using user\'s payment card.',
          security: [{ bearerAuth: [] }],
        },
        params: t.Object({
          transactionId: t.String(),
        }),
        body: t.Object({
          cardId: t.Optional(t.String()),
        }),
      }
    );
