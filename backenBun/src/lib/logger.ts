import { Elysia } from 'elysia';
import winston from 'winston';

// Create a Winston logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'superapp-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, service, method, url, ip, userAgent, statusCode, responseTime, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;
        
        if (service) logMessage += ` ${service}`;
        if (method && url) logMessage += ` ${method} ${url}`;
        if (ip) logMessage += ` - ${ip}`;
        if (userAgent) logMessage += ` - ${userAgent}`;
        if (statusCode) logMessage += ` - ${statusCode}`;
        if (responseTime) logMessage += ` - ${responseTime}ms`;
        
        logMessage += `: ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          logMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return logMessage;
      })
    )
  }));
}

// Store start times in a Map to track request duration
const requestStartTimes = new Map<string, number>();

// Create a request logger plugin for Elysia
export const requestLogger = new Elysia({ name: 'request-logger' })
  .derive(({ request, set }: { request: Request; set: any }) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const ip = request.headers.get('x-forwarded-for') ||
              request.headers.get('x-real-ip') ||
              'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Store start time for response time calculation
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    requestStartTimes.set(requestId, startTime);

    logger.info('Incoming request', {
      requestId,
      method,
      url: url.pathname + url.search,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });

    return {
      requestId,
      startTime
    };
  })
  .onAfterHandle(({ request, set, requestId, startTime }: any) => {
    const endTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const statusCode = set.status || 200;
    
    let responseTime = 0;
    if (startTime) {
      responseTime = endTime - startTime;
      requestStartTimes.delete(requestId);
    }

    logger.info('Request completed', {
      requestId,
      method,
      url: url.pathname + url.search,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString()
    });
  })
  .onError(({ request, set, error, requestId, startTime }: any) => {
    const endTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const statusCode = set.status || 500;
    
    let responseTime = 0;
    if (startTime) {
      responseTime = endTime - startTime;
      requestStartTimes.delete(requestId);
    }

    logger.error('Request failed', {
      requestId,
      method,
      url: url.pathname + url.search,
      statusCode,
      responseTime,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

// Helper function to log API calls with more details
export const logApiCall = (
  method: string,
  endpoint: string,
  data: any = null,
  userId?: string,
  adminId?: string
) => {
  logger.info('API Call', {
    method,
    endpoint,
    data: data ? JSON.stringify(data) : null,
    userId,
    adminId,
    timestamp: new Date().toISOString()
  });
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
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication Event', {
    event,
    email,
    success,
    userId,
    adminId,
    error,
    timestamp: new Date().toISOString()
  });
};

// Helper function to log database operations
export const logDbOperation = (
  operation: string,
  table: string,
  data: any = null,
  error?: string
) => {
  const level = error ? 'error' : 'info';
  logger[level]('Database Operation', {
    operation,
    table,
    data: data ? JSON.stringify(data) : null,
    error,
    timestamp: new Date().toISOString()
  });
};

export default logger;