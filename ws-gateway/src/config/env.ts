import 'dotenv/config';

export const BACKEND_URL =
  process.env.BACKEND_URL || process.env.BACKEND_BASE_URL || 'http://localhost:8080';

export const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL || BACKEND_URL;

export const WS_GATEWAY_API_KEY =
  process.env.WS_GATEWAY_API_KEY || 'adsadadw12';
