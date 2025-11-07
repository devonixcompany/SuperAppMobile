import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { fromTypes, openapi } from '@elysiajs/openapi';
import { Elysia, t } from 'elysia';
import { adminServiceContainer } from './admin';
import { logger, requestLogger } from './lib/logger';
import { serviceContainer } from './user';

// Get services from container
const { jwtService } = serviceContainer;

const port = Number(process.env.PORT ?? 8080);
const serverUrl = process.env.BASE_URL ?? `localhost:${port}`;

const userModel = t.Object(
  {
    id: t.String(),
    firebaseUid: t.String(),
    phoneNumber: t.Optional(t.String()),
    email: t.Optional(t.String()),
    fullName: t.Optional(t.String()),
    typeUser: t.Optional(t.String()),
    status: t.Optional(t.String()),
    createdAt: t.String({ format: "date-time" }),
    updatedAt: t.Optional(t.String({ format: "date-time" })),
  },
  { description: "User information payload returned from SuperApp services" },
);

const errorResponseModel = t.Object(
  {
    success: t.Boolean(),
    message: t.String(),
    errors: t.Optional(t.Array(t.Unknown())),
  },
  { description: "Standard error response envelope used across SuperApp APIs" },
);

const authenticatedProfileResponseModel = t.Object(
  {
    success: t.Boolean(),
    data: t.Object({
      user: userModel,
    }),
  },
  { description: "Authenticated user profile response payload" },
);

const PUBLIC_ROUTES = [
  "/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/payment/omise/webhook", // Omise webhook - verified by signature
];

const GATEWAY_API_KEY = process.env.WS_GATEWAY_API_KEY || "your-api-key";

const isDevBypassEnabled = () =>
  (process.env.DEV_BYPASS_AUTH ?? '').toLowerCase() === 'true';

const extractGatewayKey = (request: Request) => {
  const headerValue =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization") ||
    "";

  if (!headerValue) {
    return null;
  }

  return headerValue.startsWith("Bearer ")
    ? headerValue.substring(7).trim()
    : headerValue.trim();
};

type GatewayRouteRule = {
  methods: string[];
  pattern: RegExp;
};

const GATEWAY_ROUTE_RULES: GatewayRouteRule[] = [
  {
    methods: ["GET"],
    pattern: /^\/api\/chargepoints\/ws-gateway\/chargepoints$/,
  },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/validate-whitelist$/ },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/[^/]+\/validate-ocpp$/ },
  {
    methods: ["PUT"],
    pattern: /^\/api\/chargepoints\/[^/]+\/connection-status$/,
  },
  { methods: ["GET"], pattern: /^\/api\/chargepoints\/[^/]+$/ },
  { methods: ["POST"], pattern: /^\/api\/chargepoints$/ },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/[^/]+\/status$/ },
  {
    methods: ["POST"],
    pattern: /^\/api\/chargepoints\/[^/]+\/update-from-boot$/,
  },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/[^/]+\/heartbeat$/ },
  {
    methods: ["GET"],
    pattern: /^\/api\/chargepoints\/check-connectors\/[^/]+$/,
  },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/create-connectors$/ },
  { methods: ["POST"], pattern: /^\/api\/transactions\/authorize$/ },
  { methods: ["POST"], pattern: /^\/api\/transactions\/[^/]+\/start$/ },
  { methods: ["POST"], pattern: /^\/api\/transactions\/ocpp\/[^/]+\/stop$/ },
];

const isGatewayRoute = (method: string, path: string) =>
  GATEWAY_ROUTE_RULES.some(
    (rule) =>
      rule.methods.includes(method.toUpperCase()) && rule.pattern.test(path),
  );

const isPublicRoute = (path: string) => {
  if (path.startsWith("/openapi")) {
    return true;
  }

  return PUBLIC_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
};

export const app = new Elysia()
  .use(requestLogger)
  .use(cors())
  .model({
    User: userModel,
    ErrorResponse: errorResponseModel,
    AuthenticatedProfileResponse: authenticatedProfileResponseModel,
  })
  .use(
    openapi({
      documentation: {
        info: {
          title: "SuperApp API",
          description: "API documentation for SuperApp backend services",
          version: "1.0.0",
        },
        servers: [
          {
            url: serverUrl,
            description: "Local development server",
          },
        ],
        tags: [
          {
            name: "Authentication",
            description: "Authentication and authorization endpoints",
          },
          {
            name: "User Management",
            description: "User profile and administration operations",
          },
          {
            name: "Charge Point",
            description: "Charging station provisioning and commands",
          },
          {
            name: "Tax Invoice Profile",
            description: "Tax invoice profile management for users",
          },
          {
            name: "Health",
            description: "Service readiness and monitoring probes",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description:
                "Include JWT access token generated by /api/auth/login in the Authorization header",
            },
          },
        },
      },
      references: fromTypes('src/app.ts')
    })
  )
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  // ✅ CRITICAL: Authentication middleware that runs BEFORE derive middleware
  .use((app: any) => {
    let currentUser = null; // Store user at wrapper level
    
    return app.onBeforeHandle(async ({ request, set, cookie }: any) => {
    if (request.method === "OPTIONS") {
                                                                                                                                                                                                                                                    return;
    }

    const path = new URL(request.url).pathname;
    const method = request.method.toUpperCase();

    // Authenticate user directly in main app
    const authHeader = request.headers.get('authorization');
    let user = null;

    console.log('🔍 [AUTH DEBUG] Request details:', {
      path,
      method,
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader 
    });

    // Try to authenticate if auth header exists
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🎫 [AUTH] Extracting token, length:', token.length);

      try {
        const payload = await jwtService.verifyToken(token);
        if (payload) {
          console.log('✅ [AUTH] Token verified for user:', payload.userId);
          
          // แสดงเวลาหมดอายุของ token
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const now = new Date();
            const timeLeft = Math.floor((expDate.getTime() - now.getTime()) / 1000);
            console.log('⏰ [AUTH] Token expires at:', expDate.toLocaleString());
            console.log('⏱️ [AUTH] Time left:', timeLeft > 0 ? `${timeLeft} seconds` : 'EXPIRED');
          }

          // Get user from database
          const { prisma } = await import('./lib/prisma');
          const dbUser = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
              id: true,
              phoneNumber: true,
              status: true,
              typeUser: true,
              createdAt: true
            }
          });

          if (dbUser && dbUser.status === 'ACTIVE') {
            user = dbUser;
            currentUser = dbUser; // Store for derive middleware
            console.log('✅ [AUTH] User authenticated:', user.id);
          } else {
            console.log('❌ [AUTH] User not found or inactive');
          }
        } else {
          console.log('❌ [AUTH] Token verification failed');
        }
      } catch (error) {
        console.error('❌ [AUTH] Authentication error:', error);
      }
    }

    if (isPublicRoute(path)) {
      console.log('🌐 [AUTH] Public route, allowing access:', path);
      return;
    }

    // Skip global guard for admin routes - they have their own strict authentication
    if (path.startsWith('/admin/') || path.startsWith('/api/admin/')) {
      console.log('🔐 Admin route detected, skipping global guard (admin middleware will handle auth):', path);
      return;
    }

    if (isGatewayRoute(method, path)) {
      const gatewayKey = extractGatewayKey(request);
      console.log('🚪 [AUTH] Gateway route detected:', { path, hasKey: !!gatewayKey });
      if (gatewayKey && gatewayKey === GATEWAY_API_KEY) {
        console.log('✅ [AUTH] Gateway key valid, allowing access');
        return;
      }

      console.log('❌ [AUTH] Invalid gateway key');
      logger.warn("Unauthorized gateway access attempt", {
        path,
        method,
        status: 401,
      });
      set.status = 401;
      return {
        success: false,
        message: "Unauthorized: invalid gateway key",
      };
    }

    // For user routes, check user authentication
    if (!user) {
      console.log('❌ [AUTH] User authentication failed:', {
        path,
        method,
        hasAuthHeader: !!authHeader,
        reason: 'Authentication failed or no valid token'
      });

      logger.warn('Unauthorized user API access blocked', {
        path,
        method,
        status: 401,
      });
      set.status = 401;
      return {
        success: false,
        message: 'Unauthorized: missing or invalid user token'
      };
    }

    console.log('✅ [AUTH] User authenticated successfully:', {
      path,
      userId: user.id,
      phoneNumber: user.phoneNumber
    });

    // Add user to context for controllers to use
    (request as any).user = user;
    
    // Store user in closure variable for derive middleware
    currentUser = user;
      })
      // ✅ Derive middleware inside same wrapper to access currentUser
      .derive(({ request }: any) => {
        const user = currentUser || (request as any).user;
        console.log('🔧 [DERIVE] Extracting user from context:', {
          hasCurrentUser: !!currentUser,
          hasRequestUser: !!(request as any).user,
          userId: user?.id,
          path: request.url
        });
        return {
          user: user
        };
      });
  })
  .use(serviceContainer.getAuthController())
  .use(serviceContainer.getUserController())
  .use(serviceContainer.getChargePointController())
  .use((() => {
    console.log('🔧 Registering admin auth controller');
    const adminAuthCtrl = adminServiceContainer.getAuthController();
    console.log('✅ Admin auth controller registered');
    return adminAuthCtrl;
  })())
  .use((() => {
    console.log('🔧 Registering admin chargepoint controller');
    const adminChargePointCtrl = adminServiceContainer.getChargePointsCrudController();
    console.log('✅ Admin chargepoint controller registered');
    return adminChargePointCtrl;
  })())
  .use(serviceContainer.getTransactionController())
  // Payment controller also needs user context, no need for wrapper since derive middleware is now available
  .use(serviceContainer.getPaymentController())
  .use(serviceContainer.getSsTaxInvoiceProfileController())
  .use(serviceContainer.getWebhookController())
  .guard(
    ({ user }: any) => {
      // Allow access in development mode even without user
      if (isDevBypassEnabled()) {
        return true;
      }
      return !!user;
    },
    (app: any) =>
      app.get('/api/profile', ({ user }: any) => {
        // In development mode, provide mock user if no user is available
        const profileUser = user || (isDevBypassEnabled() ? {
          id: 'dev-user-123',
          phoneNumber: '+66999999999',
          status: 'ACTIVE',
          typeUser: 'USER',
          createdAt: new Date().toISOString()
        } : null);

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
        },
      ),
  )
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
    },
  )
  .onError(({ code, error, set }: { code: any; error: any; set: any }) => {
    switch (code) {
      case "VALIDATION":
        set.status = 400;
        return {
          success: false,
          message: "Invalid input data",
          errors: error.all,
        };
      case "NOT_FOUND":
        set.status = 404;
        return {
          success: false,
          message: "Resource not found",
        };
      case "INTERNAL_SERVER_ERROR":
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
        };
      default:
        set.status = 500;
        return {
          success: false,
          message: "An unexpected error occurred",
        };
    }
  });

app.listen(port, () => {
  console.log(`🦊 Server is running on port ${port}`);
  console.log(`📚 OpenAPI Documentation: ${serverUrl}/openapi`);
  console.log(`📄 OpenAPI Schema: ${serverUrl}/openapi/json`);
  console.log(`📝 API Endpoints:`);
  console.log(`   POST /api/auth/register - User registration`);
  console.log(`   POST /api/auth/login - User login`);
  console.log(`   POST /api/auth/refresh - Refresh token`);
  console.log(`   GET /api/profile - Get user profile (protected)`);
  console.log(`   GET /health - Health check`);
});
