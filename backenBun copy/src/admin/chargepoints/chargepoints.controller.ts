import { ConnectorStatus, ConnectorType, OCPPVersion } from '@prisma/client';
import { Elysia, t } from 'elysia';
import { JWTService } from '../../lib/jwt';
import { requireAdminAuth } from '../../middleware/admin-auth';
import {
  AdminChargePointsService,
  CreateChargePointData,
} from './chargepoints.service';

export const adminChargePointsController = (jwtService: JWTService) => {
  const service = new AdminChargePointsService();

  return new Elysia({ prefix: '/api/admin/chargepoints' })
    .use(requireAdminAuth(jwtService))
    .decorate('adminChargePointsService', service)
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
    );
};
