import { logger } from '../shared/logger';

// Helper function to log API calls with more details
export const logApiCall = (
  method: string,
  endpoint: string,
  data: any = null,
  userId?: string,
  adminId?: string
) => {
  logger.info({
    method,
    endpoint,
    data: data ? JSON.stringify(data) : null,
    userId,
    adminId,
    timestamp: new Date().toISOString()
  }, 'API Call');
};

// Helper function to log authentication events
export const logAuthEvent = (
  event: string,
  email: string,
  success: boolean,
  userId?: string,
  adminId?: string,
  error?: string
) => {
  const logData = {
    event,
    email,
    success,
    userId,
    adminId,
    error,
    timestamp: new Date().toISOString()
  };

  if (success) {
    logger.info(logData, 'Authentication Event');
  } else {
    logger.warn(logData, 'Authentication Event');
  }
};

// Helper function to log database operations
export const logDbOperation = (
  operation: string,
  table: string,
  data: any = null,
  error?: string
) => {
  const logData = {
    operation,
    table,
    data: data ? JSON.stringify(data) : null,
    error,
    timestamp: new Date().toISOString()
  };

  if (error) {
    logger.error(logData, 'Database Operation');
  } else {
    logger.info(logData, 'Database Operation');
  }
};

// Export the main logger
export { logger };
