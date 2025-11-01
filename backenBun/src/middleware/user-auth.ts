import { Elysia } from 'elysia';
import { JWTService } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { devAuthMiddleware } from './dev-auth';

export const userAuthMiddleware = (jwtService: JWTService) => {
  const bypassAuth =
    (process.env.DEV_BYPASS_AUTH ?? '').toLowerCase() === 'true';
  
  if (bypassAuth) {
    console.log('🔓 Using development user auth middleware (bypassing user authentication)');
    return devAuthMiddleware();
  }

  console.log('🔒 Using production user auth middleware');
  return new Elysia({ name: 'user-auth' })
    .derive(async ({ request, set }) => {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          user: null,
          error: 'Missing or invalid authorization header'
        };
      }

      const token = authHeader.substring(7);
      const payload = await jwtService.verifyToken(token);

      if (!payload) {
        return {
          user: null,
          error: 'Invalid or expired token'
        };
      }

      // Fetch user from database to ensure they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          phoneNumber: true,
          status: true,
          typeUser: true,
          createdAt: true
        }
      });

      if (!user || user.status !== 'ACTIVE') {
        return {
          user: null,
          error: 'User not found or inactive'
        };
      }

      return {
        user,
        error: null
      };
    })
    .onBeforeHandle(({ user, error, set }) => {
      if (!user || error) {
        set.status = 401;
        return {
          success: false,
          message: error || 'Unauthorized'
        };
      }
    });
};