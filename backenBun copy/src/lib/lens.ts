import express from 'express';
import { lens } from '@lensjs/express';
import { createPrismaHandler } from '@lensjs/watchers';
import { prisma } from './prisma';

// Create Express app for LensJS
const lensApp = express();

// Initialize LensJS with Prisma handler
export const initializeLens = async () => {
  try {
    await lens({
      app: lensApp,
      queryWatcher: {
        enabled: true,
        handler: createPrismaHandler({
          prisma,
          provider: 'postgresql', // Using PostgreSQL as per schema
        }),
      },
    });

    console.log('🔍 LensJS initialized successfully');
    return lensApp;
  } catch (error) {
    console.error('❌ Failed to initialize LensJS:', error);
    throw error;
  }
};

// Start LensJS server on a separate port
export const startLensServer = async (port: number = 3001) => {
  try {
    const app = await initializeLens();
    
    app.listen(port, () => {
      console.log(`🔍 LensJS Dashboard running on http://localhost:${port}/lens`);
    });
    
    return app;
  } catch (error) {
    console.error('❌ Failed to start LensJS server:', error);
    throw error;
  }
};

export { lensApp };