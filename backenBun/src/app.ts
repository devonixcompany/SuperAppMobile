import { Elysia } from "elysia";
import { adminServiceContainer } from "./admin";
import { pinoRequestLogger } from "./lib/pino-request-logger";
import { createAuthMiddleware } from "./middleware/auth";
import { registerRoutes } from "./routes";
import { corsConfig } from "./shared/config/cors";
import { jwtConfig } from "./shared/config/jwt";
import { models, openapiConfig } from "./shared/config/openapi";
import { logger } from "./shared/logger";
import { serviceContainer } from "./user";

// Get services from container
const { jwtService } = serviceContainer;

const port = Number(process.env.PORT ?? 8080);
const serverUrl = process.env.BASE_URL ?? `localhost:${port}`;

export const app = new Elysia()
  .use(pinoRequestLogger)
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
      logger.info("🔧 Registering admin auth controller");
      const adminAuthCtrl = adminServiceContainer.getAuthController();
      logger.info("✅ Admin auth controller registered");
      return adminAuthCtrl;
    })()
  )
  .use(
    (() => {
      logger.info("🔧 Registering admin chargepoint controller");
      const adminChargePointCtrl =
        adminServiceContainer.getChargePointsCrudController();
      logger.info("✅ Admin chargepoint controller registered");
      return adminChargePointCtrl;
    })()
  )
  .use(
    (() => {
      logger.info("Registering admin station controller");
      const adminStationCtrl = adminServiceContainer.getStationController();
      logger.info("Admin station controller registered");
      return adminStationCtrl;
    })()
  )
  .use(
    (() => {
      logger.info("Registering admin connector controller");
      const adminConnectorCtrl =
        adminServiceContainer.getChargePointConnectorController();
      logger.info("Admin connector controller registered");
      return adminConnectorCtrl;
    })()
  )
  .derive(({ request }: any) => {
    // Extract user from request and make it available in context
    const user = (request as any).user;
    logger.debug({
      hasUser: !!user,
      userId: user?.id,
      path: request.url,
    }, "🔧 [DERIVE] Extracting user from request");
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
  logger.info(`🦊 Server is running on port ${port}`);
  logger.info(`📚 OpenAPI Documentation: ${serverUrl}/openapi`);
  logger.info(`📄 OpenAPI Schema: ${serverUrl}/openapi/json`);
  logger.info(`📝 API Endpoints:`);
  logger.info(`   POST /api/auth/register - User registration`);
  logger.info(`   POST /api/auth/login - User login`);
  logger.info(`   POST /api/auth/refresh - Refresh token`);
  logger.info(`   GET /api/profile - Get user profile (protected)`);
  logger.info(`   GET /health - Health check`);
});
