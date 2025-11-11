// Environment configuration for the backend
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  PORT: process.env.PORT || '8080',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  LOG_CONSOLE: process.env.LOG_CONSOLE === 'true',
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || '',
  WS_GATEWAY_API_KEY: process.env.WS_GATEWAY_API_KEY || '',
  DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true',
  BASE_URL: process.env.BASE_URL || 'http://localhost:8080',
  OMISE_PUBLIC_KEY: process.env.OMISE_PUBLIC_KEY || '',
  OMISE_SECRET_KEY: process.env.OMISE_SECRET_KEY || '',
  OMISE_WEBHOOK_SECRET: process.env.OMISE_WEBHOOK_SECRET || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8081'
} as const;