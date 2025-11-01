import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const defaultLogLevels: Prisma.LogLevel[] = ["warn", "error"];

// Allow opt-in for more verbose Prisma logging via environment flags
if (process.env.PRISMA_LOG_QUERIES === "true") {
  defaultLogLevels.push("query");
}

if (process.env.PRISMA_LOG_INFO === "true") {
  defaultLogLevels.push("info");
}

// Check if we should use mock database
const USE_MOCK_DB =
  process.env.USE_MOCK_DB === "true" || process.env.NODE_ENV === "test";

let prismaInstance: PrismaClient | null = null;

if (!USE_MOCK_DB) {
  try {
    prismaInstance = new PrismaClient({
      log: defaultLogLevels,
    });

    // Test database connection
    prismaInstance
      .$connect()
      .then(() => {
        console.log("✅ Database connected successfully");
      })
      .catch((error) => {
        console.error("❌ Database connection failed:", error.message);
        console.warn(
          "⚠️ Falling back to mock mode. To use mock mode explicitly, set USE_MOCK_DB=true",
        );
        prismaInstance = null;
      });
  } catch (error) {
    console.error("❌ Failed to initialize Prisma client:", error.message);
    console.warn(
      "⚠️ Falling back to mock mode. To use mock mode explicitly, set USE_MOCK_DB=true",
    );
  }
}

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Helper to check if database is available
export const isDatabaseAvailable = () => prisma !== null;
