import { Elysia } from 'elysia';
import type { ApiResponse } from '../types/index.js';

export const errorHandler = (error: Error) => {
  console.error('Error occurred:', error);

  return {
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date()
  } as ApiResponse;
};

export const setupErrorHandler = (app: Elysia) => {
  return app
    .onError(({ error, code }) => {
      console.error(`Error (${code}):`, error);

      switch (code) {
        case 'VALIDATION':
          return {
            success: false,
            error: 'Validation failed',
            details: error.message,
            timestamp: new Date()
          } as ApiResponse;

        case 'NOT_FOUND':
          return {
            success: false,
            error: 'Resource not found',
            timestamp: new Date()
          } as ApiResponse;

        case 'INTERNAL_SERVER_ERROR':
          return {
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
          } as ApiResponse;

        default:
          return errorHandler(error);
      }
    });
};