import { Elysia, t } from 'elysia';
import { UserService } from '../services/user-service.js';
import { setupErrorHandler } from '../../../../shared/middleware/error-handler.js';
import { Logger } from '../../../../shared/utils/logger.js';
import type { ApiResponse } from '../../../../shared/types/index.js';

const logger = new Logger('UserRoutes');
const userService = new UserService();

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(setupErrorHandler)
  .get('/', async ({ query }) => {
    try {
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 10;
      const search = query.search as string;

      let result;
      if (search) {
        result = await userService.searchUsers(search, page, limit);
      } else {
        result = await userService.getAllUsers(page, limit);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to get users:', error);
      return {
        success: false,
        error: 'Failed to fetch users',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String())
    })
  })
  .get('/:id', async ({ params }) => {
    try {
      const user = await userService.getUserById(params.id);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date()
        } as ApiResponse;
      }

      return {
        success: true,
        data: user,
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error(`Failed to get user ${params.id}:`, error);
      return {
        success: false,
        error: 'Failed to fetch user',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .post('/', async ({ body }) => {
    try {
      const existingUser = await userService.getUserByEmail(body.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
          timestamp: new Date()
        } as ApiResponse;
      }

      const existingUsername = await userService.getUserByUsername(body.username);
      if (existingUsername) {
        return {
          success: false,
          error: 'Username already taken',
          timestamp: new Date()
        } as ApiResponse;
      }

      const user = await userService.createUser(body);

      logger.info(`User created successfully: ${user.id}`);

      return {
        success: true,
        data: user,
        message: 'User created successfully',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error('Failed to create user:', error);
      return {
        success: false,
        error: 'Failed to create user',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      username: t.String({ minLength: 3, maxLength: 50 }),
      firstName: t.String({ minLength: 1, maxLength: 50 }),
      lastName: t.String({ minLength: 1, maxLength: 50 }),
      password: t.String({ minLength: 6 }),
      role: t.Optional(t.Union([t.Literal('USER'), t.Literal('ADMIN'), t.Literal('MODERATOR')]))
    })
  })
  .put('/:id', async ({ params, body }) => {
    try {
      const user = await userService.updateUser(params.id, body);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date()
        } as ApiResponse;
      }

      logger.info(`User updated successfully: ${user.id}`);

      return {
        success: true,
        data: user,
        message: 'User updated successfully',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error(`Failed to update user ${params.id}:`, error);
      return {
        success: false,
        error: 'Failed to update user',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      firstName: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
      lastName: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
      avatar: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      role: t.Optional(t.Union([t.Literal('USER'), t.Literal('ADMIN'), t.Literal('MODERATOR')])),
      status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('SUSPENDED')]))
    })
  })
  .delete('/:id', async ({ params }) => {
    try {
      const success = await userService.deleteUser(params.id);

      if (!success) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date()
        } as ApiResponse;
      }

      logger.info(`User deleted successfully: ${params.id}`);

      return {
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error(`Failed to delete user ${params.id}:`, error);
      return {
        success: false,
        error: 'Failed to delete user',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .get('/email/:email', async ({ params }) => {
    try {
      const user = await userService.getUserByEmail(params.email);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date()
        } as ApiResponse;
      }

      return {
        success: true,
        data: user,
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error(`Failed to get user by email ${params.email}:`, error);
      return {
        success: false,
        error: 'Failed to fetch user',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    params: t.Object({
      email: t.String({ format: 'email' })
    })
  })
  .get('/username/:username', async ({ params }) => {
    try {
      const user = await userService.getUserByUsername(params.username);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date()
        } as ApiResponse;
      }

      return {
        success: true,
        data: user,
        timestamp: new Date()
      } as ApiResponse;
    } catch (error) {
      logger.error(`Failed to get user by username ${params.username}:`, error);
      return {
        success: false,
        error: 'Failed to fetch user',
        timestamp: new Date()
      } as ApiResponse;
    }
  }, {
    params: t.Object({
      username: t.String({ minLength: 3, maxLength: 50 })
    })
  });