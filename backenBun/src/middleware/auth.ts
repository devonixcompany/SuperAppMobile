import { RequestUser } from "../types/request";
import { isGatewayRoute, extractGatewayKey, GATEWAY_API_KEY } from "./gateway";
import { logger } from "../shared/logger";

const PUBLIC_ROUTES = [
  "/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/payment/omise/webhook", // Omise webhook - verified by signature
];

const isDevBypassEnabled = () =>
  (process.env.DEV_BYPASS_AUTH ?? "").toLowerCase() === "true";

const isPublicRoute = (path: string) => {
  if (path.startsWith("/openapi")) {
    return true;
  }

  return PUBLIC_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
};

export const createAuthMiddleware = (jwtService: any) => {
  let currentUser: RequestUser | null = null;

  return {
    onBeforeHandle: async ({ request, set, cookie }: any) => {
      if (request.method === "OPTIONS") {
        return;
      }

      const path = new URL(request.url).pathname;
      const method = request.method.toUpperCase();

      // Authenticate user directly in main app
      const authHeader = request.headers.get("authorization");
      let user = null;

      console.log("🔍 [AUTH DEBUG] Request details:", {
        path,
        method,
        hasAuthHeader: !!authHeader,
        authHeaderPreview: authHeader,
      });

      // Try to authenticate if auth header exists
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        console.log("🎫 [AUTH] Extracting token, length:", token.length);

        try {
          const payload = await jwtService.verifyToken(token);
          if (payload) {
            console.log(
              "✅ [AUTH] Token verified for user:",
              payload.userId || payload.adminId
            );

            // แสดงเวลาหมดอายุของ token
            if (payload.exp) {
              const expDate = new Date(payload.exp * 1000);
              const now = new Date();
              const timeLeft = Math.floor(
                (expDate.getTime() - now.getTime()) / 1000
              );
              console.log(
                "⏰ [AUTH] Token expires at:",
                expDate.toLocaleString()
              );
              console.log(
                "⏱️ [AUTH] Time left:",
                timeLeft > 0 ? `${timeLeft} seconds` : "EXPIRED"
              );
            }

            // Get user from database - handle both admin and user tokens
            const { prisma } = await import("../lib/prisma");
            const userId = payload.userId || payload.adminId;

            if (payload.adminId) {
              // Admin token - check Admin table
              const dbAdmin = await prisma.admin.findUnique({
                where: { id: userId },
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  isActive: true,
                  createdAt: true,
                },
              });

              if (dbAdmin && dbAdmin.isActive) {
                user = {
                  ...dbAdmin,
                  userType: "admin" as const,
                  status: dbAdmin.isActive ? "ACTIVE" : "INACTIVE",
                };
                currentUser = user; // Store for derive middleware
                console.log("✅ [AUTH] Admin authenticated:", user.id);
              } else {
                console.log("❌ [AUTH] Admin not found or inactive");
              }
            } else if (payload.userId) {
              // User token - check User table
              const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  id: true,
                  phoneNumber: true,
                  status: true,
                  typeUser: true,
                  createdAt: true,
                },
              });

              if (dbUser && dbUser.status === "ACTIVE") {
                user = {
                  ...dbUser,
                  userType: "user" as const,
                };
                currentUser = user; // Store for derive middleware
                console.log("✅ [AUTH] User authenticated:", user.id);
              } else {
                console.log("❌ [AUTH] User not found or inactive");
              }
            } else {
              console.log(
                "❌ [AUTH] Neither userId nor adminId found in token"
              );
            }
          } else {
            console.log("❌ [AUTH] Token verification failed");
          }
        } catch (error) {
          console.error("❌ [AUTH] Authentication error:", error);
        }
      }

      if (isPublicRoute(path)) {
        console.log("🌐 [AUTH] Public route, allowing access:", path);
        return;
      }

      // Skip global guard for admin routes - they have their own strict authentication
      if (path.startsWith("/admin/") || path.startsWith("/api/admin/")) {
        console.log(
          "🔐 Admin route detected, skipping global guard (admin middleware will handle auth):",
          path
        );
        return;
      }

      if (isGatewayRoute(method, path)) {
        const gatewayKey = extractGatewayKey(request);
        console.log("🚪 [AUTH] Gateway route detected:", {
          path,
          hasKey: !!gatewayKey,
        });
        if (gatewayKey && gatewayKey === GATEWAY_API_KEY) {
          console.log("✅ [AUTH] Gateway key valid, allowing access");
          return;
        }

        console.log("❌ [AUTH] Invalid gateway key");
        logger.warn({
          msg: "Unauthorized gateway access attempt",
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
        console.log("❌ [AUTH] User authentication failed:", {
          path,
          method,
          hasAuthHeader: !!authHeader,
          reason: "Authentication failed or no valid token",
        });

        logger.warn({
          msg: "Unauthorized user API access blocked",
          path,
          method,
          status: 401,
        });
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized: missing or invalid user token",
        };
      }

      console.log("✅ [AUTH] User authenticated successfully:", {
        path,
        userId: user.id,
        phoneNumber: user.userType === "user" ? user.phoneNumber : user.email,
        userType: user.userType,
      });

      // Add user to context for controllers to use
      (request as any).user = user;

      // Store user in closure variable for derive middleware
      currentUser = user;
    },
    derive: ({ request }: any) => {
      const user = currentUser || (request as any).user;
      console.log("🔧 [DERIVE] Extracting user from context:", {
        hasCurrentUser: !!currentUser,
        hasRequestUser: !!(request as any).user,
        userId: user?.id,
        path: request.url,
      });
      return {
        user: user,
      };
    },
  };
};
