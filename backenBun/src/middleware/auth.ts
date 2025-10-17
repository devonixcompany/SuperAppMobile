import { Elysia } from 'elysia';
import { JWTService } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export const authMiddleware = (jwtService: JWTService) =>
  new Elysia({ name: 'auth' })
    .derive(async ({ request, set }) => {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          user: null,
          error: 'Missing or invalid authorization header'
        };
      }

      const token = authHeader.substring(7);
      const payload = await jwtService.verifyToken(token);

      if (!payload) {
        set.status = 401;
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
        set.status = 401;
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