import {
  ChargePointStatus,
  ConnectorStatus,
  ConnectorType,
  OCPPVersion,
} from '@prisma/client';
import { Elysia, t } from 'elysia';
import { JWTService } from '../../lib/jwt';
import { requireAdminAuth } from '../../middleware/admin-auth';
import {
  AdminChargePointsService,
  ChargePointHasTransactionsError,
  ChargePointNotFoundError,
  ChargeSessionHistoryFilters,
  CreateChargePointData,
  UpdateChargePointData,
} from './chargepoints.service';

const chargePointUpdateSchema = t.Object({
  chargepointname: t.Optional(
    t.String({
      minLength: 1,
      description: 'Updated charge point display name.',
      example: 'Central Plaza AC #1',
    }),
  ),
  serialNumber: t.Optional(
    t.String({
      minLength: 1,
      description: 'Unique hardware serial number.',
      example: 'ABB-AC-2025-0001',
    }),
  ),
  brand: t.Optional(
    t.String({
      minLength: 1,
      description: 'Updated hardware brand.',
      example: 'ABB',
    }),
  ),
  powerRating: t.Optional(
    t.Number({
      description: 'Maximum power rating (kW).',
      minimum: 0,
      example: 22,
    }),
  ),
  powerSystem: t.Optional(
    t.Number({
      description: 'Power system configuration (1 = single phase, 3 = three phase).',
      minimum: 1,
      example: 3,
    }),
  ),
  protocol: t.Optional(
    t.Enum(OCPPVersion, {
      description: 'Supported OCPP protocol level.',
      default: 'OCPP16',
    }),
  ),
  csmsUrl: t.Optional(
    t.Union(
      [
        t.String({
          description: 'CSMS endpoint URL.',
          example: 'wss://csms.example.com/ocpp',
        }),
        t.Null(),
      ],
      { default: null },
    ),
  ),
  chargePointIdentity: t.Optional(
    t.String({
      minLength: 1,
      description: 'Unique OCPP identity used by the charge point.',
      example: 'CP-CENTRAL-PLAZA-001',
    }),
  ),
  chargepointstatus: t.Optional(
    t.Enum(ChargePointStatus, {
      description: 'Operational status of the charge point.',
    }),
  ),
});

const sessionHistoryQuerySchema = t.Object({
  search: t.Optional(
    t.String({
      description:
        'Search keyword. Matches session ID, user name/phone, or charge point name.',
    }),
  ),
  startDate: t.Optional(
    t.String({
      description: 'Filter sessions starting on/after this ISO date (e.g., 2025-01-01).',
    }),
  ),
  endDate: t.Optional(
    t.String({
      description: 'Filter sessions starting on/before this ISO date.',
    }),
  ),
  page: t.Optional(
    t.Number({
      description: 'Page number (>= 1).',
      minimum: 1,
      default: 1,
    }),
  ),
  limit: t.Optional(
    t.Number({
      description: 'Items per page (1-100).',
      minimum: 1,
      maximum: 100,
      default: 10,
    }),
  ),
});

const sessionHistoryItemSchema = t.Object({
  id: t.String({ description: 'Internal transaction UUID.' }),
  sessionId: t.String({ description: 'Human-facing session code.' }),
  ocppTransactionId: t.Optional(
    t.String({ description: 'OCPP transaction identifier (if provided).' }),
  ),
  startTime: t.String({ description: 'Session start time (ISO).', format: 'date-time' }),
  endTime: t.Optional(
    t.String({ description: 'Session end time (ISO).', format: 'date-time' }),
  ),
  durationMinutes: t.Optional(
    t.Number({ description: 'Session duration in minutes.' }),
  ),
  energyKWh: t.Optional(
    t.Number({ description: 'Energy consumed during the session (kWh).' }),
  ),
  pricePerKWh: t.Optional(
    t.Number({ description: 'Applied rate per kWh for this session.' }),
  ),
  totalCost: t.Optional(
    t.Number({ description: 'Total charged amount for the session.' }),
  ),
  chargePoint: t.Object({
    id: t.String({ description: 'Charge point UUID.' }),
    name: t.Optional(t.String({ description: 'Charge point name.' })),
    stationId: t.Optional(t.String({ description: 'Station UUID.' })),
    stationName: t.Optional(t.String({ description: 'Station display name.' })),
  }),
  connectorId: t.Optional(
    t.Number({ description: 'Connector sequence number within the charge point.' }),
  ),
  user: t.Object({
    id: t.String({ description: 'User UUID.' }),
    name: t.Optional(t.String({ description: 'User full name.' })),
    phoneNumber: t.Optional(t.String({ description: 'User phone number.' })),
  }),
  paymentMethod: t.Optional(
    t.String({ description: 'Recorded payment method (PromptPay, QR Code, etc.).' }),
  ),
  paymentStatus: t.Optional(
    t.String({ description: 'Payment status recorded in the payment table.' }),
  ),
  status: t.String({ description: 'Transaction status (ACTIVE, COMPLETED, etc.).' }),
});

const sessionHistoryResponseSchema = t.Object({
  success: t.Boolean(),
  summary: t.Object({
    totalSessions: t.Number(),
    totalRevenue: t.Number(),
    totalEnergy: t.Number(),
  }),
  meta: t.Object({
    page: t.Number(),
    limit: t.Number(),
    totalItems: t.Number(),
    totalPages: t.Number(),
  }),
  data: t.Array(sessionHistoryItemSchema),
});

export const adminChargePointsController = (jwtService: JWTService) => {
  const service = new AdminChargePointsService();

  return new Elysia({ prefix: '/api/admin/chargepoints' })
    .use(requireAdminAuth(jwtService))
    .decorate('adminChargePointsService', service)
    .get(
      '/history',
      async ({ query, set, adminChargePointsService }) => {
        try {
          const params = query as ChargeSessionHistoryFilters;
          const result = await adminChargePointsService.getChargeSessionHistory(
            params,
          );

          return {
            success: true,
            summary: result.summary,
            meta: result.meta,
            data: result.sessions,
          };
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            message: error?.message ?? 'Failed to fetch session history',
          };
        }
      },
      {
        detail: {
          tags: ['Admin Connectors'],
          summary: 'List charging session history',
          description:
            'Returns paginated charging-session records with optional search and date filters.',
          responses: {
            200: {
              description: 'Session history retrieved',
              content: {
                'application/json': {
                  schema: sessionHistoryResponseSchema as any,
                },
              },
            },
            400: { description: 'Invalid filter parameters' },
          },
        },
        query: sessionHistoryQuerySchema,
      },
    )
    .get(
      '/history/export',
      async ({ query, set, adminChargePointsService }) => {
        try {
          const params = query as ChargeSessionHistoryFilters;
          const exportResult =
            await adminChargePointsService.exportChargeSessionHistory(params);

          return new Response(exportResult.buffer, {
            headers: {
              'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
            },
          });
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            message: error?.message ?? 'Failed to export session history',
          };
        }
      },
      {
        detail: {
          tags: ['Admin Connectors'],
          summary: 'Export charging session history (Excel)',
          description:
            'Exports the current filter result set into an .xlsx file (same parameters as /history).',
          responses: {
            200: {
              description: 'Excel file generated',
              content: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                  schema: t.String({ format: 'binary' }) as any,
                },
              },
            },
            400: { description: 'Invalid filter parameters' },
          },
        },
        query: sessionHistoryQuerySchema,
      },
    )
    .post(
      '/',
      async ({ body, set, adminChargePointsService }) => {
        try {
          const payload = body as CreateChargePointData;
          const chargePoint =
            await adminChargePointsService.createChargePoint(payload);

          set.status = 201;
          return {
            success: true,
            message: 'Charge point created successfully',
            data: chargePoint,
          };
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            message: error?.message ?? 'Failed to create charge point',
          };
        }
      },
      {
        detail: {
          tags: ['Admin Charge Points'],
          summary: 'Create charge point',
          description:
            'Creates a new charge point record and optionally registers connectors in a single request.',
        },
        body: t.Object({
          id: t.Optional(
            t.String({
              description:
                'Optional charge point ID (UUID). Leave empty to auto-generate.',
            }),
          ),
          chargepointname: t.String({
            minLength: 1,
            description: 'Display name for the charge point.',
            example: 'Central Plaza AC #1',
          }),
          stationId: t.String({
            minLength: 1,
            description:
              'Station ID this charge point belongs to. Must exist in Station table.',
            example: 'f7fbd7c6-1d37-4dd7-b1e4-d15d05a6221f',
          }),
          brand: t.String({
            minLength: 1,
            description: 'Hardware brand of the charger.',
            example: 'ABB',
          }),
          serialNumber: t.String({
            minLength: 1,
            description: 'Unique hardware serial number.',
            example: 'ABB-AC-2025-0001',
          }),
          powerRating: t.Number({
            description: 'Maximum power rating (kW).',
            example: 22,
            minimum: 0,
          }),
          powerSystem: t.Optional(
            t.Number({
              description:
                'Power system configuration (1 = single phase, 3 = three phase).',
              example: 3,
              default: 1,
            }),
          ),
          connectorCount: t.Optional(
            t.Number({
              description:
                'Total connector sockets on this charge point. Defaults to the provided connectors length or 1.',
              example: 2,
              minimum: 1,
            }),
          ),
          csmsUrl: t.Optional(
            t.Union(
              [
                t.String({
                  description: 'CSMS endpoint URL (optional).',
                  example: 'wss://csms.example.com/ocpp',
                }),
                t.Null(),
              ],
              { default: null },
            ),
          ),
          chargePointIdentity: t.String({
            minLength: 1,
            description:
              'Unique OCPP identity used by the charge point to authenticate.',
            example: 'CP-CENTRAL-PLAZA-001',
          }),
          protocol: t.Enum(OCPPVersion, {
            description: 'Supported OCPP protocol level.',
            default: 'OCPP16',
          }),
          connectors: t.Optional(
            t.Array(
              t.Object({
                id: t.Optional(
                  t.String({
                    description:
                      'Optional connector ID (UUID). Leave empty to auto-generate.',
                  }),
                ),
                connectorId: t.Number({
                  description:
                    'Connector sequence number inside the charge point (positive integer).',
                  example: 1,
                  minimum: 1,
                }),
                type: t.Optional(
                  t.Enum(ConnectorType, {
                    description: 'Connector type classification.',
                    default: 'TYPE_2',
                  }),
                ),
                connectorstatus: t.Optional(
                  t.Enum(ConnectorStatus, {
                    description: 'Operational status of the connector.',
                    default: 'AVAILABLE',
                  }),
                ),
                maxPower: t.Optional(
                  t.Number({
                    description: 'Maximum power capability in kW.',
                    example: 22,
                    minimum: 0,
                  }),
                ),
                maxCurrent: t.Optional(
                  t.Number({
                    description: 'Maximum current capability in amperes.',
                    example: 32,
                    minimum: 0,
                  }),
                ),
                typeDescription: t.Optional(
                  t.String({
                    description:
                      'Additional connector details (i.e., cable length, plug variant).',
                    maxLength: 255,
                  }),
                ),
              }),
              {
                description:
                  'Optional list of connector definitions to create along with this charge point.',
              },
            ),
          ),
        }),
      },
    )
    .put(
      '/:chargePointId',
      async ({ params, set, body, adminChargePointsService }) => {
        try {
          const { chargePointId } = params as { chargePointId?: string };
          if (!chargePointId) {
            set.status = 400;
            return {
              success: false,
              message: 'chargePointId is required',
            };
          }

          const payload = body as UpdateChargePointData;

          const hasPayloadField = [
            payload.chargepointname,
            payload.serialNumber,
            payload.brand,
            payload.powerRating,
            payload.powerSystem,
            payload.protocol,
            payload.csmsUrl,
            payload.chargePointIdentity,
            payload.chargepointstatus,
          ].some((value) => value !== undefined);

          if (!hasPayloadField) {
            set.status = 400;
            return {
              success: false,
              message: 'Provide at least one field to update',
            };
          }

          const updated = await adminChargePointsService.updateChargePoint(
            chargePointId,
            payload,
          );

          return {
            success: true,
            message: 'Charge point updated successfully',
            data: updated,
          };
        } catch (error: any) {
          if (error instanceof ChargePointNotFoundError) {
            set.status = 404;
          } else {
            set.status = 400;
          }

          return {
            success: false,
            message:
              error?.message ?? 'Failed to update charge point',
          };
        }
      },
      {
        detail: {
          tags: ['Admin Charge Points'],
          summary: 'Update basic charge point info',
          description:
            'Allows admins to update chargepointname, serialNumber, or brand for an existing charge point.',
          parameters: [
            {
              name: 'chargePointId',
              in: 'path',
              required: true,
              description: 'Charge point ID to update.',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: chargePointUpdateSchema as any,
                examples: {
                  rename: {
                    summary: 'Update charge point name',
                    value: {
                      chargepointname: 'Central Plaza AC #2',
                    },
                  },
                  updateSerial: {
                    summary: 'Update serial and brand',
                    value: {
                      serialNumber: 'ABB-AC-2025-0099',
                      brand: 'Siemens',
                    },
                  },
                  fullUpdate: {
                    summary: 'Update protocol and status information',
                    value: {
                      powerRating: 50,
                      powerSystem: 3,
                      protocol: 'OCPP16',
                      csmsUrl: 'wss://csms.superapp.dev/ocpp',
                      chargePointIdentity: 'CP-CENTRAL-PLAZA-010',
                      chargepointstatus: 'MAINTENANCE',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Charge point updated successfully' },
            400: { description: 'Validation error' },
            404: { description: 'Charge point not found' },
          },
        },
        body: chargePointUpdateSchema,
      },
    )
    .delete(
      '/:chargePointId',
      async ({ params, set, adminChargePointsService }) => {
        try {
          const { chargePointId } = params as { chargePointId?: string };
          if (!chargePointId) {
            set.status = 400;
            return {
              success: false,
              message: 'chargePointId is required',
            };
          }

          const result = await adminChargePointsService.deleteChargePoint(
            chargePointId,
          );

          return {
            success: true,
            message: 'Charge point deleted successfully',
            data: result,
          };
        } catch (error: any) {
          if (error instanceof ChargePointNotFoundError) {
            set.status = 404;
          } else if (error instanceof ChargePointHasTransactionsError) {
            set.status = 409;
          } else {
            set.status = 400;
          }

          return {
            success: false,
            message:
              error?.message ?? 'Failed to delete charge point',
          };
        }
      },
      {
        detail: {
          tags: ['Admin Charge Points'],
          summary: 'Delete charge point',
          description:
            'Deletes a charge point and its connectors. Deletion is blocked if transactions exist for the charge point.',
          parameters: [
            {
              name: 'chargePointId',
              in: 'path',
              required: true,
              description: 'Charge point ID to delete.',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: { description: 'Charge point deleted successfully' },
            400: { description: 'Invalid charge point ID' },
            404: { description: 'Charge point not found' },
            409: {
              description:
                'Charge point has transactions and cannot be deleted',
            },
          },
        },
      },
    );
};
