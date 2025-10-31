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

const LOG_CONSOLE_ENABLED = process.env.LOG_CONSOLE !== 'false';

if (LOG_CONSOLE_ENABLED) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf((info) => {
        const {
          timestamp,
          level,
          message,
          ...rest
        } = info as winston.Logform.TransformableInfo & Record<string, unknown>;

        const service = rest.service as string | undefined;
        const method = rest.method as string | undefined;
        const url = rest.url as string | undefined;
        const ip = rest.ip as string | undefined;
        const userAgent = rest.userAgent as string | undefined;
        const statusCode = rest.statusCode as number | undefined;
        const responseTime = rest.responseTime as number | undefined;

        const meta = { ...rest };

        let logMessage = `${timestamp} [${level}]`;

        if (service) logMessage += ` ${service}`;
        if (method && url) logMessage += ` ${method} ${url}`;
        if (ip) logMessage += ` - ${ip}`;
        if (userAgent) logMessage += ` - ${userAgent}`;
        if (statusCode) logMessage += ` - ${statusCode}`;
        if (responseTime) logMessage += ` - ${responseTime}ms`;

        logMessage += `: ${message}`;

        if (Object.keys(meta).length > 0) {
          logMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }

        return logMessage;
      })
    )
  }));
}

type LogMethod = (message: any, ...meta: any[]) => winston.Logger;

const consoleLevelIcons: Record<string, string> = {
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🐞'
};

const formatConsolePayload = (
  level: string,
  message: unknown,
  meta: Record<string, unknown>
) => {
  const icon = consoleLevelIcons[level] ?? '🔎';
  const timestamp = new Date().toLocaleTimeString();
  const metaCopy = { ...meta };
  delete metaCopy.service;

  let output = `${icon} [${timestamp}] ${String(message)}`;

  if (Object.keys(metaCopy).length > 0) {
    output += ` ${JSON.stringify(metaCopy)}`;
  }

  return output;
};

const wrapWithConsole = (level: 'error' | 'warn' | 'info' | 'debug') => {
  const original = logger[level].bind(logger) as LogMethod;

  return ((message: unknown, ...meta: unknown[]) => {
    if (LOG_CONSOLE_ENABLED) {
      const metaObject =
        meta.length === 0
          ? {}
          : meta.length === 1 && typeof meta[0] === 'object' && meta[0] !== null
            ? (meta[0] as Record<string, unknown>)
            : meta.reduce<Record<string, unknown>>((acc, current, index) => {
                acc[`meta${index}`] = current;
                return acc;
              }, {});

      const payload = formatConsolePayload(level, message, metaObject);

      switch (level) {
        case 'error':
          console.error(payload);
          break;
        case 'warn':
          console.warn(payload);
          break;
        default:
          console.log(payload);
      }
    }

    return original(message, ...meta);
  }) as LogMethod;
};

logger.error = wrapWithConsole('error') as typeof logger.error;
logger.warn = wrapWithConsole('warn') as typeof logger.warn;
logger.info = wrapWithConsole('info') as typeof logger.info;
logger.debug = wrapWithConsole('debug') as typeof logger.debug;

// Store start times in a Map to track request duration
const requestStartTimes = new Map<string, number>();

// Create a request logger plugin for Elysia
export const requestLogger = new Elysia({ name: 'request-logger' })
  .derive(({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const method = request.method;
    const ip = request.headers.get('x-forwarded-for') ||
              request.headers.get('x-real-ip') ||
              'unknown';
    
    // Log to console immediately for debugging
    console.log(`🔥 [${new Date().toLocaleTimeString()}] ${method} ${url.pathname + url.search} - ${ip}`);
    
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Incoming request', {
      requestId,
      method,
      url: url.pathname + url.search,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
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

    // Log to console immediately for debugging
    console.log(`✅ [${new Date().toLocaleTimeString()}] ${method} ${url.pathname + url.search} - ${statusCode} (${responseTime}ms)`);
    
    const logPayload = {
      requestId,
      method,
      url: url.pathname + url.search,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString()
    };

    logger.info('Request completed', logPayload);

    if (process.env.LOG_CONSOLE !== 'false') {
      console.log(
        `✅ [${new Date().toLocaleTimeString()}] ${method} ${url.pathname + url.search} - ${statusCode} (${responseTime}ms)`
      );
    }
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

    const logPayload = {
      requestId,
      method,
      url: url.pathname + url.search,
      statusCode,
      responseTime,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    logger.error('Request failed', logPayload);

    if (process.env.LOG_CONSOLE !== 'false') {
      console.error(
        `❌ [${new Date().toLocaleTimeString()}] ${method} ${url.pathname + url.search} - ${statusCode} (${responseTime}ms): ${error.message}`
      );
    }
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
