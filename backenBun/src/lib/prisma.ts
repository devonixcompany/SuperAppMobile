import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const defaultLogLevels: Prisma.LogLevel[] = ['warn', 'error'];

// Allow opt-in for more verbose Prisma logging via environment flags
if (process.env.PRISMA_LOG_QUERIES === 'true') {
  defaultLogLevels.push('query');
}

if (process.env.PRISMA_LOG_INFO === 'true') {
  defaultLogLevels.push('info');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: defaultLogLevels,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;