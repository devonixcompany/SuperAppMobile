import { Elysia } from "elysia";
import { adminServiceContainer } from "./admin";
import { logger, requestLogger } from "./lib/logger";
import { serviceContainer } from "./user";
import { corsConfig } from "./config/cors";
import { jwtConfig } from "./config/jwt";
import { openapiConfig, models } from "./config/openapi";
import { createAuthMiddleware } from "./middleware/auth";
import { registerRoutes } from "./routes";

// Get services from container
const { jwtService } = serviceContainer;

const port = Number(process.env.PORT ?? 8080);
const serverUrl = process.env.BASE_URL ?? `localhost:${port}`;

export const app = new Elysia()
  .use(requestLogger)
  .use(corsConfig)
  .model(models)
  .use(openapiConfig)
  .use(jwtConfig)
  // ✅ CRITICAL: Authentication middleware that runs BEFORE derive middleware
  .use((app: any) => {
    const authMiddleware = createAuthMiddleware(jwtService);

    return app
      .onBeforeHandle(authMiddleware.onBeforeHandle)
      .derive(authMiddleware.derive);
  })
  // Register controllers
  .use(serviceContainer.getAuthController())
  .use(serviceContainer.getUserController())
  .use(serviceContainer.getChargePointController())
  .use(
    (() => {
      console.log("🔧 Registering admin auth controller");
      const adminAuthCtrl = adminServiceContainer.getAuthController();
      console.log("✅ Admin auth controller registered");
      return adminAuthCtrl;
    })()
  )
  .use(
    (() => {
      console.log("🔧 Registering admin chargepoint controller");
      const adminChargePointCtrl =
        adminServiceContainer.getChargePointsCrudController();
      console.log("✅ Admin chargepoint controller registered");
      return adminChargePointCtrl;
    })()
  )
  .use(
    (() => {
      console.log("Registering admin station controller");
      const adminStationCtrl = adminServiceContainer.getStationController();
      console.log("Admin station controller registered");
      return adminStationCtrl;
    })()
  )
  .use(
    (() => {
      console.log("Registering admin connector controller");
      const adminConnectorCtrl =
        adminServiceContainer.getChargePointConnectorController();
      console.log("Admin connector controller registered");
      return adminConnectorCtrl;
    })()
  )
  .derive(({ request }: any) => {
    // Extract user from request and make it available in context
    const user = (request as any).user;
    console.log("🔧 [DERIVE] Extracting user from request:", {
      hasUser: !!user,
      userId: user?.id,
      path: request.url,
    });
    return {
      user: user,
    };
  })
  .use(serviceContainer.getTransactionController())
  // Payment controller also needs user context, no need for wrapper since derive middleware is now available
  .use(serviceContainer.getPaymentController())
  .use(serviceContainer.getSsTaxInvoiceProfileController())
  .use(serviceContainer.getWebhookController())
  // Register routes
  .use(registerRoutes)
  // Error handling
  .onError((error: any) => {
    const { code, set } = error;

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
