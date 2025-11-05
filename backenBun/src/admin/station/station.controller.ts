  import { ConnectorStatus, ConnectorType, OCPPVersion } from '@prisma/client';
  import { Elysia, t } from 'elysia';
  import { JWTService } from '../../lib/jwt';
  import { requireAdminAuth } from '../../middleware/admin-auth';
  import {
    AdminStationService,
    CreateStationData,
  } from './station.service';

  export const adminStationController = (jwtService: JWTService) => {
    const stationService = new AdminStationService();

    return new Elysia({ prefix: '/api/admin/stations' })
      .use(requireAdminAuth(jwtService))
      .decorate('adminStationService', stationService)
      .post(
        '/',
        async ({ body, set, adminStationService }) => {
          try {
            const payload = body as CreateStationData;
            const station = await adminStationService.createStation(payload);

            set.status = 201;
            return {
              success: true,
              message: 'Station created successfully',
              data: station,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error?.message ?? 'Failed to create station',
            };
          }
        },
        {
          detail: {
            tags: ['Admin Station'],
            summary: 'Create charging station',
            description:
              'Creates a new charging station record for administrative management with optional charge point and connector provisioning.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AdminStationCreateRequest',
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Station created successfully',
              },
              400: {
                description: 'Validation error',
              },
              401: {
                description: 'Admin authentication required',
              },
            },
          },
          body: t.Object({
            id: t.Optional(
              t.String({
                description:
                  'Optional station ID (UUID). Leave empty to auto-generate.',
                example: '8f7c1d69-5efa-4e78-8f08-9a7780f538ad',
              }),
            ),
            stationname: t.String({
              minLength: 1,
              description: 'Unique station name.',
              example: 'Central Plaza EV Station',
            }),
            imageUrl: t.Optional(
              t.Union(
                [
                  t.String({
                    description: 'Public URL of the station cover image.',
                    example:
                      'https://cdn.example.com/stations/central-plaza-standard.jpg',
                  }),
                  t.Null(),
                ],
                { default: null },
              ),
            ),
            location: t.String({
              minLength: 1,
              description: 'Physical location or address of the station.',
              example: '999/9 Rama I Rd, Pathum Wan, Bangkok 10330',
            }),
            latitude: t.Optional(
              t.Union(
                [
                  t.Number({
                    description: 'Decimal latitude coordinate.',
                    example: 13.745998,
                  }),
                  t.String({
                    description: 'Decimal latitude coordinate (string).',
                    example: '13.745998',
                  }),
                  t.Null(),
                ],
                { default: null },
              ),
            ),
            longitude: t.Optional(
              t.Union(
                [
                  t.Number({
                    description: 'Decimal longitude coordinate.',
                    example: 100.538283,
                  }),
                  t.String({
                    description: 'Decimal longitude coordinate (string).',
                    example: '100.538283',
                  }),
                  t.Null(),
                ],
                { default: null },
              ),
            ),
            openclosedays: t.Optional(
              t.Union(
                [
                  t.String({
                    description: 'Open/close day details, e.g., MON-FRI 06:00-22:00',
                    example: 'Daily 06:00-22:00',
                  }),
                  t.Null(),
                ],
                { default: null },
              ),
            ),
            onPeakRate: t.Optional(
              t.Number({
                description: 'Rate charged during peak hours (currency per kWh).',
                example: 10.5,
              }),
            ),
            onPeakStartTime: t.Optional(
              t.String({
                description: 'Start time for peak rate period (HH:mm).',
                example: '10:00',
              }),
            ),
            onPeakEndTime: t.Optional(
              t.String({
                description: 'End time for peak rate period (HH:mm).',
                example: '12:00',
              }),
            ),
            onPeakbaseRate: t.Optional(
              t.Number({
                description: 'Base rate during peak hours.',
                example: 25.0,
              }),
            ),
            offPeakRate: t.Optional(
              t.Number({
                description:
                  'Rate charged during off-peak hours (currency per kWh).',
                example: 7.5,
              }),
            ),
            offPeakStartTime: t.Optional(
              t.String({
                description: 'Start time for off-peak rate period (HH:mm).',
                example: '16:00',
              }),
            ),
            offPeakEndTime: t.Optional(
              t.String({
                description: 'End time for off-peak rate period (HH:mm).',
                example: '22:00',
              }),
            ),
          offPeakbaseRate: t.Optional(
            t.Number({
              description: 'Base rate during off-peak hours.',
              example: 18.0,
            }),
          ),
          chargePoints: t.Optional(
            t.Array(
              t.Object({
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
                stationId: t.Optional(
                  t.String({
                    description:
                      'Station ID override. Defaults to the newly created station.',
                  }),
                ),
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
                      'Total connector sockets on this charge point. Defaults to connectors length or 1.',
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
                        'Optional list of connector definitions to create with this charge point.',
                    },
                  ),
                ),
              }),
              {
                description:
                  'Optional list of charge points to provision alongside the station. Connector definitions may be supplied inline.',
              },
            ),
          ),
          }),
        },
      );
  };
