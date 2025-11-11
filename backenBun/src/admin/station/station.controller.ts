import { ConnectorStatus, OCPPVersion } from "@prisma/client";
import { Elysia, t } from "elysia";
import { JWTService } from "../../lib/jwt";
import { requireAdminAuth } from "../../middleware/admin-auth";
import {
  AdminStationService,
  CreateStationData,
  UpdateStationData,
} from "./station.service";

export const adminStationController = (jwtService: JWTService) => {
  const stationService = new AdminStationService();

  const connectorSchema = t.Object({
    id: t.Optional(
      t.String({
        description:
          "Optional connector ID (UUID). Leave empty to auto-generate.",
      })
    ),
    connectorId: t.Number({
      description:
        "Connector sequence number inside the charge point (positive integer).",
      example: 1,
      minimum: 1,
    }),
    type: t.Optional(
      t.String({
        description:
          "Connector type classification (uses ConnectorType enum internally; omit or leave blank to use TYPE_2).",
        example: "CCS_COMBO_2",
      })
    ),
    connectorstatus: t.Optional(
      t.Enum(ConnectorStatus, {
        description: "Operational status of the connector.",
        default: "AVAILABLE",
      })
    ),
    maxPower: t.Optional(
      t.Number({
        description: "Maximum power capability in kW.",
        example: 22,
        minimum: 0,
      })
    ),
    maxCurrent: t.Optional(
      t.Number({
        description: "Maximum current capability in amperes.",
        example: 32,
        minimum: 0,
      })
    ),
    typeDescription: t.Optional(
      t.String({
        description:
          "Additional connector details (i.e., cable length, plug variant).",
        maxLength: 255,
      })
    ),
  });

  const chargePointSchema = t.Object({
    id: t.Optional(
      t.String({
        description: "Optional charge point ID (UUID).",
      })
    ),
    chargepointname: t.String({
      minLength: 1,
      description: "Display name for the charge point.",
      example: "Central Plaza AC #1",
    }),
    stationId: t.Optional(
      t.String({
        description:
          "Station ID override. Defaults to newly created station.",
      })
    ),
    brand: t.String({
      minLength: 1,
      description: "Hardware brand of the charger.",
      example: "ABB",
    }),
    serialNumber: t.String({
      minLength: 1,
      description: "Unique hardware serial number.",
      example: "ABB-AC-2025-0001",
    }),
    powerRating: t.Number({
      description: "Maximum power rating (kW).",
      example: 22,
      minimum: 0,
    }),
    powerSystem: t.Optional(
      t.Number({
        description:
          "Power system configuration (1 = single phase, 3 = three phase).",
        example: 3,
        default: 1,
      })
    ),
    connectorCount: t.Optional(
      t.Number({
        description:
          "Total connector sockets on this charge point. Defaults to connectors length or 1.",
        example: 2,
        minimum: 1,
      })
    ),
    csmsUrl: t.Optional(
      t.Union(
        [
          t.String({
            description: "CSMS endpoint URL (optional).",
            example: "wss://csms.example.com/ocpp",
          }),
          t.Null(),
        ],
        { default: null }
      )
    ),
    chargePointIdentity: t.String({
      minLength: 1,
      description:
        "Unique OCPP identity used by the charge point to authenticate.",
      example: "CP-CENTRAL-PLAZA-001",
    }),
    protocol: t.Enum(OCPPVersion, {
      description: "Supported OCPP protocol level.",
      default: "OCPP16",
    }),
    connectors: t.Optional(
      t.Array(connectorSchema, {
        description:
          "Optional list of connector definitions to create with this charge point.",
      })
    ),
  });

  const stationUpdateSchema = t.Object({
    stationname: t.Optional(
      t.String({
        minLength: 1,
        description: "Unique station name.",
        example: "Central Plaza EV Station",
      })
    ),
    imageUrl: t.Optional(
      t.Union(
        [
          t.String({
            description: "Public URL of station cover image.",
            example:
              "https://cdn.example.com/stations/central-plaza-standard.jpg",
          }),
          t.Null(),
        ],
        { default: null }
      )
    ),
    location: t.Optional(
      t.String({
        minLength: 1,
        description: "Physical location or address of station.",
        example: "999/9 Rama I Rd, Pathum Wan, Bangkok 10330",
      })
    ),
    latitude: t.Optional(
      t.Union(
        [
          t.Number({
            description: "Decimal latitude coordinate.",
            example: 13.745998,
          }),
          t.String({
            description: "Decimal latitude coordinate (string).",
            example: "13.745998",
          }),
          t.Null(),
        ],
        { default: null }
      )
    ),
    longitude: t.Optional(
      t.Union(
        [
          t.Number({
            description: "Decimal longitude coordinate.",
            example: 100.538283,
          }),
          t.String({
            description: "Decimal longitude coordinate (string).",
            example: "100.538283",
          }),
          t.Null(),
        ],
        { default: null }
      )
    ),
    openclosedays: t.Optional(
      t.Union(
        [
          t.String({
            description: "Open/close day details, e.g., MON-FRI 06:00-22:00",
            example: "Daily 06:00-22:00",
          }),
          t.Null(),
        ],
        { default: null }
      )
    ),
    flatRate: t.Optional(
      t.Number({
        description: "Flat charging rate (currency per kWh).",
        example: 10,
      })
    ),
    onPeakRate: t.Optional(
      t.Number({
        description: "Rate charged during peak hours (currency per kWh).",
        example: 10.5,
      })
    ),
    onPeakStartTime: t.Optional(
      t.String({
        description: "Start time for peak rate period (HH:mm).",
        example: "10:00",
      })
    ),
    onPeakEndTime: t.Optional(
      t.String({
        description: "End time for peak rate period (HH:mm).",
        example: "12:00",
      })
    ),
    onPeakbaseRate: t.Optional(
      t.Number({
        description: "Base rate during peak hours.",
        example: 25.0,
      })
    ),
    offPeakRate: t.Optional(
      t.Number({
        description: "Rate charged during off-peak hours (currency per kWh).",
        example: 7.5,
      })
    ),
    offPeakStartTime: t.Optional(
      t.String({
        description: "Start time for off-peak rate period (HH:mm).",
        example: "16:00",
      })
    ),
    offPeakEndTime: t.Optional(
      t.String({
        description: "End time for off-peak rate period (HH:mm).",
        example: "22:00",
      })
    ),
    offPeakbaseRate: t.Optional(
      t.Number({
        description: "Base rate during off-peak hours.",
        example: 18.0,
      })
    ),
    chargePoints: t.Optional(
      t.Array(chargePointSchema, {
        description:
          "Optional list of charge points to provision alongside station. Connector definitions may be supplied inline.",
      })
    ),
  });

  const stationListItemSchema = t.Object({
    id: t.String({
      description: "Station ID.",
      example: "8c56eeaa-562d-4235-b0a5-cd7cea5a202d",
    }),
    stationname: t.String({
      description: "Station display name.",
      example: "Central Plaza EV Station",
    }),
    imageUrl: t.Union(
      [
        t.String({
          description: "Cover image URL.",
          example: "https://cdn.example.com/stations/central-plaza.jpg",
        }),
        t.Null(),
      ],
      { default: null }
    ),
    openclosedays: t.Union(
      [
        t.String({
          description: "Open/close description.",
          example: "Daily 06:00-22:00",
        }),
        t.Null(),
      ],
      { default: null }
    ),
    flatRate: t.Number({
      description: "Default flat charging rate (currency per kWh).",
      example: 10,
    }),
  });

  const stationListResponseSchema = t.Object({
    success: t.Boolean(),
    data: t.Array(stationListItemSchema),
    meta: t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
    }),
  });

  return new Elysia({ prefix: "/api/admin/stations" })
    .use(requireAdminAuth(jwtService))
    .decorate("adminStationService", stationService)
    .get(
      "/:stationId/details",
      async ({ params, set, adminStationService }) => {
        try {
          const { stationId } = params as { stationId?: string };
          if (!stationId) {
            set.status = 400;
            return {
              success: false,
              message: "stationId is required",
            };
          }

          const data = await adminStationService.getStationDetailsById(
            stationId
          );

          return {
            success: true,
            data,
          };
        } catch (error) {
          set.status = 500;
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to fetch station details";
          return {
            success: false,
            message: errorMessage,
          };
        }
      },
      {
        detail: {
          tags: ["Admin Station"],
          summary: "Get station details by ID",
          description:
            "Returns detailed information for a station including charge points and connectors",
        },
        params: t.Object({
          stationId: t.String({
            description: "Station ID to retrieve details for.",
            minLength: 1,
            example: "8c56eeaa-562d-4235-b0a5-cd7cea5a202d",
          }),
        }),
      }
    )
    .get(
      "/",
      async ({ query, set, adminStationService }) => {
        try {
          const { page, limit, search } = query as {
            page?: number;
            limit?: number;
            search?: string;
          };
          const result = await adminStationService.listStations({
            page,
            limit,
            search,
          });

          return {
            success: true,
            data: result.data,
            meta: result.meta,
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to fetch stations",
            data: [],
            meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
          };
        }
      },
      {
        detail: {
          tags: ["Admin Station"],
          summary: "List charging stations",
          description: "Returns paginated stations with optional name search.",
        },
        query: t.Object({
          page: t.Optional(
            t.Number({
              description: "Page number (starting at 1).",
              minimum: 1,
              default: 1,
            })
          ),
          limit: t.Optional(
            t.Number({
              description: "Items per page (max 100).",
              minimum: 1,
              maximum: 100,
              default: 10,
            })
          ),
          search: t.Optional(
            t.String({
              description: "Filter stations by name (case-insensitive).",
              minLength: 1,
            })
          ),
        }),
        response: {
          200: stationListResponseSchema,
        },
      }
    )
    .post(
      "/",
      async ({ body, set, adminStationService }) => {
        try {
          const payload = body as CreateStationData;
          const station = await adminStationService.createStation(payload);

          set.status = 201;
          return {
            success: true,
            message: "Station created successfully",
            data: station,
          };
        } catch (error) {
          set.status = 400;
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to create station",
          };
        }
      },
      {
        detail: {
          tags: ["Admin Station"],
          summary: "Create charging station",
          description:
            "Creates a new charging station record for administrative management with optional charge point and connector provisioning.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AdminStationCreateRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Station created successfully",
            },
            400: {
              description: "Validation error",
            },
            401: {
              description: "Admin authentication required",
            },
          },
        },
        body: t.Object({
          id: t.Optional(
            t.String({
              description:
                "Optional station ID (UUID). Leave empty to auto-generate.",
              example: "8f7c1d69-5efa-4e78-8f08-9a7780f538ad",
            })
          ),
          stationname: t.String({
            minLength: 1,
            description: "Unique station name.",
            example: "Central Plaza EV Station",
          }),
          imageUrl: t.Optional(
            t.Union(
              [
                t.String({
                  description: "Public URL of station cover image.",
                  example:
                    "https://cdn.example.com/stations/central-plaza-standard.jpg",
                }),
                t.Null(),
              ],
              { default: null }
            )
          ),
          location: t.String({
            minLength: 1,
            description: "Physical location or address of station.",
            example: "999/9 Rama I Rd, Pathum Wan, Bangkok 10330",
          }),
          latitude: t.Optional(
            t.Union(
              [
                t.Number({
                  description: "Decimal latitude coordinate.",
                  example: 13.745998,
                }),
                t.String({
                  description: "Decimal latitude coordinate (string).",
                  example: "13.745998",
                }),
                t.Null(),
              ],
              { default: null }
            )
          ),
          longitude: t.Optional(
            t.Union(
              [
                t.Number({
                  description: "Decimal longitude coordinate.",
                  example: 100.538283,
                }),
                t.String({
                  description: "Decimal longitude coordinate (string).",
                  example: "100.538283",
                }),
                t.Null(),
              ],
              { default: null }
            )
          ),
          openclosedays: t.Optional(
            t.Union(
              [
                t.String({
                  description:
                    "Open/close day details, e.g., MON-FRI 06:00-22:00",
                  example: "Daily 06:00-22:00",
                }),
                t.Null(),
              ],
              { default: null }
            )
          ),
          onPeakRate: t.Optional(
            t.Number({
              description: "Rate charged during peak hours (currency per kWh).",
              example: 10.5,
            })
          ),
          flatRate: t.Optional(
            t.Number({
              description:
                "Flat charging rate when no time-of-use pricing applies.",
              example: 10.0,
            })
          ),
          onPeakStartTime: t.Optional(
            t.String({
              description: "Start time for peak rate period (HH:mm).",
              example: "10:00",
            })
          ),
          onPeakEndTime: t.Optional(
            t.String({
              description: "End time for peak rate period (HH:mm).",
              example: "12:00",
            })
          ),
          onPeakbaseRate: t.Optional(
            t.Number({
              description: "Base rate during peak hours.",
              example: 25.0,
            })
          ),
          offPeakRate: t.Optional(
            t.Number({
              description:
                "Rate charged during off-peak hours (currency per kWh).",
              example: 7.5,
            })
          ),
          offPeakStartTime: t.Optional(
            t.String({
              description: "Start time for off-peak rate period (HH:mm).",
              example: "16:00",
            })
          ),
          offPeakEndTime: t.Optional(
            t.String({
              description: "End time for off-peak rate period (HH:mm).",
              example: "22:00",
            })
          ),
          offPeakbaseRate: t.Optional(
            t.Number({
              description: "Base rate during off-peak hours.",
              example: 18.0,
            })
          ),
          chargePoints: t.Optional(
            t.Array(
              t.Object({
                id: t.Optional(
                  t.String({
                    description:
                      "Optional charge point ID (UUID). Leave empty to auto-generate.",
                  })
                ),
                chargepointname: t.String({
                  minLength: 1,
                  description: "Display name for the charge point.",
                  example: "Central Plaza AC #1",
                }),
                stationId: t.Optional(
                  t.String({
                    description:
                      "Station ID override. Defaults to newly created station.",
                  })
                ),
                brand: t.String({
                  minLength: 1,
                  description: "Hardware brand of the charger.",
                  example: "ABB",
                }),
                serialNumber: t.String({
                  minLength: 1,
                  description: "Unique hardware serial number.",
                  example: "ABB-AC-2025-0001",
                }),
                powerRating: t.Number({
                  description: "Maximum power rating (kW).",
                  example: 22,
                  minimum: 0,
                }),
                powerSystem: t.Optional(
                  t.Number({
                    description:
                      "Power system configuration (1 = single phase, 3 = three phase).",
                    example: 3,
                    default: 1,
                  })
                ),
                connectorCount: t.Optional(
                  t.Number({
                    description:
                      "Total connector sockets on this charge point. Defaults to connectors length or 1.",
                    example: 2,
                    minimum: 1,
                  })
                ),
                csmsUrl: t.Optional(
                  t.Union(
                    [
                      t.String({
                        description: "CSMS endpoint URL (optional).",
                        example: "wss://csms.example.com/ocpp",
                      }),
                      t.Null(),
                    ],
                    { default: null }
                  )
                ),
                chargePointIdentity: t.String({
                  minLength: 1,
                  description:
                    "Unique OCPP identity used by the charge point to authenticate.",
                  example: "CP-CENTRAL-PLAZA-001",
                }),
                protocol: t.Enum(OCPPVersion, {
                  description: "Supported OCPP protocol level.",
                  default: "OCPP16",
                }),
                connectors: t.Optional(
                  t.Array(
                    t.Object({
                      id: t.Optional(
                        t.String({
                          description:
                            "Optional connector ID (UUID). Leave empty to auto-generate.",
                        })
                      ),
                      connectorId: t.Number({
                        description:
                          "Connector sequence number inside the charge point (positive integer).",
                        example: 1,
                        minimum: 1,
                      }),
                      type: t.Optional(
                        t.String({
                          description:
                            "Connector type classification (uses ConnectorType enum internally; omit or leave blank to use TYPE_2).",
                          example: "CCS_COMBO_2",
                        })
                      ),
                      connectorstatus: t.Optional(
                        t.Enum(ConnectorStatus, {
                          description: "Operational status of the connector.",
                          default: "AVAILABLE",
                        })
                      ),
                      maxPower: t.Optional(
                        t.Number({
                          description: "Maximum power capability in kW.",
                          example: 22,
                          minimum: 0,
                        })
                      ),
                      maxCurrent: t.Optional(
                        t.Number({
                          description: "Maximum current capability in amperes.",
                          example: 32,
                          minimum: 0,
                        })
                      ),
                      typeDescription: t.Optional(
                        t.String({
                          description:
                            "Additional connector details (i.e., cable length, plug variant).",
                          maxLength: 255,
                        })
                      ),
                    }),
                    {
                      description:
                        "Optional list of connector definitions to create with this charge point.",
                    }
                  )
                ),
              }),
              {
                description:
                  "Optional list of charge points to provision alongside station. Connector definitions may be supplied inline.",
              }
            )
          ),
        }),
      }
    )
    .put(
      "/:stationId",
      async ({ params, body, set, adminStationService }) => {
        try {
          const { stationId } = params as { stationId?: string };
          if (!stationId) {
            set.status = 400;
            return {
              success: false,
              message: "stationId is required",
            };
          }

          const payload = body as UpdateStationData;
          const station = await adminStationService.updateStation(
            stationId,
            payload
          );

          return {
            success: true,
            message: "Station updated successfully",
            data: station,
          };
        } catch (error) {
          set.status = 400;
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to update station",
          };
        }
      },
      {
        detail: {
          tags: ["Admin Station"],
          summary: "Update station",
          description:
            "Updates an existing charging station record. Send only the fields that need to change.",
          parameters: [
            {
              name: "stationId",
              in: "path",
              required: true,
              description: "Station ID to update.",
              schema: { type: "string", format: "uuid" },
            },
          ],
        },
        body: stationUpdateSchema,
      }
    )
    .delete(
      "/:stationId",
      async ({ params, set, adminStationService }) => {
        try {
          const { stationId } = params as { stationId?: string };
          if (!stationId) {
            set.status = 400;
            return {
              success: false,
              message: "stationId is required",
            };
          }

          await adminStationService.deleteStation(stationId);
          return {
            success: true,
            message: "Station deleted successfully",
          };
        } catch (error) {
          set.status = 400;
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete station",
          };
        }
      },
      {
        detail: {
          tags: ["Admin Station"],
          summary: "Delete station",
          description:
            "Deletes the specified station. Existing charge points will be detached from this station.",
          parameters: [
            {
              name: "stationId",
              in: "path",
              required: true,
              description: "Station ID to delete.",
              schema: { type: "string", format: "uuid" },
            },
          ],
        },
      }
    );
};
