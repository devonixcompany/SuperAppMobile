import { Elysia } from 'elysia';
import { JWTService } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export const simpleAuthMiddleware = (jwtService: JWTService) => {
  return new Elysia({ name: 'simple-auth' })
    .derive(async ({ request }) => {
      console.log('🔍 [SIMPLE-AUTH] Processing request:', request.url);
      
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('❌ [SIMPLE-AUTH] No valid auth header');
        return { user: null };
      }

      const token = authHeader.substring(7);
      console.log('🎫 [SIMPLE-AUTH] Token found, length:', token.length);

      try {
        // Verify JWT token
        const payload = await jwtService.verifyToken(token);
        if (!payload) {
          console.log('❌ [SIMPLE-AUTH] Token verification failed');
          return { user: null };
        }

        console.log('✅ [SIMPLE-AUTH] Token verified for user:', payload.userId);

        // Get user from database
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
          console.log('❌ [SIMPLE-AUTH] User not found or inactive');
          return { user: null };
        }

        console.log('✅ [SIMPLE-AUTH] User authenticated:', user.id);
        return { user };

      } catch (error) {
        console.error('❌ [SIMPLE-AUTH] Error:', error);
        return { user: null };
      }
    });
};