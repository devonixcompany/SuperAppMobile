import { Elysia } from "elysia";

const isDevBypassEnabled = () =>
  (process.env.DEV_BYPASS_AUTH ?? "").toLowerCase() === "true";

export const registerRoutes = (app: Elysia) => {
  return app
    // Profile route (protected)
    .guard(
      {
        beforeHandle: ({ user }: any) => {
          // Allow access in development mode even without user
          if (isDevBypassEnabled()) {
            return true;
          }
          if (!user) {
            return new Response(
              JSON.stringify({ error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }
        },
      },
      (app: any) =>
        app.get(
          "/api/profile",
          ({ user }: any) => {
            // In development mode, provide mock user if no user is available
            const profileUser =
              user ||
              (isDevBypassEnabled()
                ? {
                    id: "dev-user-123",
                    phoneNumber: "+66999999999",
                    status: "ACTIVE",
                    typeUser: "USER",
                    createdAt: new Date().toISOString(),
                  }
                : null);

            return {
              success: true,
              data: {
                user: profileUser,
              },
            };
          },
          {
            detail: {
              tags: ["User Management"],
              summary: "Retrieve authenticated user profile",
              description:
                "Returns the profile information for the user associated with the provided bearer token.",
              security: [
                {
                  bearerAuth: [],
                },
              ],
              responses: {
                200: {
                  description: "Profile information successfully retrieved",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/AuthenticatedProfileResponse",
                      },
                    },
                  },
                },
                401: {
                  description: "Missing or invalid bearer token",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                  },
                },
              },
            },
          }
        )
    )
    // Health check route (public)
    .get(
      "/health",
      () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      }),
      {
        detail: {
          tags: ["Health"],
          summary: "🏥 Health Check",
          description:
            "Returns the current status and health information of the API server",
          responses: {
            200: {
              description: "Server is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      timestamp: { type: "string", format: "date-time" },
                      uptime: {
                        type: "number",
                        description: "Server uptime in seconds",
                      },
                      version: { type: "string", example: "1.0.0" },
                      environment: { type: "string", example: "development" },
                    },
                  },
                },
              },
            },
          },
        },
      }
    );
};