import { ConnectorStatus, ConnectorType } from '@prisma/client';
import { Elysia, t } from 'elysia';
import { JWTService } from '../../lib/jwt';
import { requireAdminAuth } from '../../middleware/admin-auth';
import {
  AdminConnectorsService,
  CreateConnectorData,
} from './connectors.service';

const connectorRequestBody = t.Object({
  id: t.Optional(
    t.String({
      description:
        'Optional connector ID (UUID). Leave empty to auto-generate.',
    }),
  ),
  chargePointId: t.String({
    minLength: 1,
    description:
      'Charge point ID this connector belongs to. Must exist in charge_points table.',
    example: '287d0f4f-6d4d-4db1-9e79-221a67c104a1',
  }),
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
});

const connectorRequestBodyWithoutChargePoint = t.Object({
  id: connectorRequestBody.properties.id,
  connectorId: connectorRequestBody.properties.connectorId,
  type: connectorRequestBody.properties.type,
  connectorstatus: connectorRequestBody.properties.connectorstatus,
  maxPower: connectorRequestBody.properties.maxPower,
  maxCurrent: connectorRequestBody.properties.maxCurrent,
  typeDescription: connectorRequestBody.properties.typeDescription,
});

export const adminConnectorsController = (jwtService: JWTService) => {
  const service = new AdminConnectorsService();

  return new Elysia({ prefix: '/api/admin' })
    .use(requireAdminAuth(jwtService))
    .decorate('adminConnectorsService', service)
    .group('/connectors', (app) =>
      app.post(
        '/',
        async ({ body, set, adminConnectorsService }) => {
          try {
            const payload = body as CreateConnectorData;
            const connector =
              await adminConnectorsService.createConnector(payload);

            set.status = 201;
            return {
              success: true,
              message: 'Connector created successfully',
              data: connector,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error?.message ?? 'Failed to create connector',
            };
          }
        },
        {
          detail: {
            tags: ['Admin Connectors'],
            summary: 'Create connector',
            description:
              'Registers a connector under a charge point for administrative management.',
          },
          body: connectorRequestBody,
        },
      ),
    )
    .group('/chargepoints', (app) =>
      app.post(
        '/:chargePointId/connectors',
        async ({ body, params, set, adminConnectorsService }) => {
          try {
            const payload = {
              ...(body as Omit<CreateConnectorData, 'chargePointId'>),
              chargePointId: params.chargePointId,
            };
            const connector =
              await adminConnectorsService.createConnector(payload);

            set.status = 201;
            return {
              success: true,
              message: 'Connector created successfully',
              data: connector,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error?.message ?? 'Failed to create connector',
            };
          }
        },
        {
          detail: {
            tags: ['Admin Connectors'],
            summary: 'Create connector under charge point',
            description:
              'Registers a connector for the specified charge point without requiring the ID in the body payload.',
            parameters: [
              {
                name: 'chargePointId',
                in: 'path',
                required: true,
                description: 'Charge point ID the connector belongs to.',
                schema: { type: 'string', format: 'uuid' },
              },
            ],
          },
          body: connectorRequestBodyWithoutChargePoint,
        },
      ),
    );
};
