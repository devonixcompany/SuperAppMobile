import { Elysia, t } from 'elysia';
import { AuthService } from '../services/auth-service.js';
import { setupErrorHandler } from '../../../../shared/middleware/error-handler.js';
import { Logger } from '../../../../shared/utils/logger.js';
import type { ApiResponse, LoginRequest, RegisterRequest } from '../../../../shared/types/index.js';

const logger = new Logger('AuthRoutes');
const authService = new AuthService();

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(setupErrorHandler)
  .post('/register', async ({ body }) => {
    try {
      const result = await authService.register(body);

      logger.info(`User registered successfully: ${result.user.id}`);

      return {
        success: true,
        data: result,
        message: 'User registered successfully',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to register user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register user',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      username: t.String({ minLength: 3, maxLength: 50 }),
      firstName: t.String({ minLength: 1, maxLength: 50 }),
      lastName: t.String({ minLength: 1, maxLength: 50 })
    })
  })
  .post('/login', async ({ body }) => {
    try {
      const result = await authService.login(body);

      logger.info(`User logged in successfully: ${result.user.id}`);

      return {
        success: true,
        data: result,
        message: 'Login successful',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to login user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid credentials',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    })
  })
  .post('/refresh', async ({ body }) => {
    try {
      const tokens = await authService.refreshToken(body.refreshToken);

      logger.info('Token refreshed successfully');

      return {
        success: true,
        data: tokens,
        message: 'Token refreshed successfully',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to refresh token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh token',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    body: t.Object({
      refreshToken: t.String()
    })
  })
  .post('/logout', async ({ body }) => {
    try {
      await authService.logout(body.refreshToken);

      logger.info('User logged out successfully');

      return {
        success: true,
        message: 'Logout successful',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to logout user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to logout',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    body: t.Object({
      refreshToken: t.String()
    })
  })
  .post('/logout-all', async ({ body, headers }) => {
    try {
      // Extract token from Authorization header
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: 'No token provided',
          timestamp: new Date()
        } as ApiResponse;
      }

      const token = authHeader.substring(7);
      const payload = await authService.verifyToken(token);

      await authService.logoutAll(payload.sub);

      logger.info(`User logged out from all devices: ${payload.sub}`);

      return {
        success: true,
        message: 'Logged out from all devices successfully',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to logout from all devices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to logout from all devices',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    body: t.Object({}), // Empty body
    headers: t.Object({
      authorization: t.String()
    })
  })
  .get('/verify', async ({ headers }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: 'No token provided',
          timestamp: new Date()
        } as ApiResponse;
      }

      const token = authHeader.substring(7);
      const payload = await authService.verifyToken(token);

      return {
        success: true,
        data: payload,
        message: 'Token is valid',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to verify token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid token',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    headers: t.Object({
      authorization: t.String()
    })
  });