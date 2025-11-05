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
    .onRequest(({ request }) => {
      console.log('🔄 [MIDDLEWARE] Request received:', {
        url: request.url,
        method: request.method,
        hasAuth: !!request.headers.get('authorization')
      });
    })
    .onBeforeHandle(async ({ request, store }) => {
      console.log('🔧 [MIDDLEWARE] onBeforeHandle called for:', request.url);
      const authHeader = request.headers.get('authorization');
      const path = new URL(request.url).pathname;

      console.log('🔍 [MIDDLEWARE] Processing request:', {
        path,
        hasAuthHeader: !!authHeader,
        authHeaderType: authHeader ? authHeader.split(' ')[0] : 'none'
      });

      let user = null;
      let error = null;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ [MIDDLEWARE] Missing or invalid authorization header');
        error = 'Missing or invalid authorization header';
      } else {
        const token = authHeader.substring(7);
        console.log('🎫 [MIDDLEWARE] Token extracted:', {
          tokenLength: token.length,
          tokenPreview: `${token.substring(0, 20)}...${token.substring(token.length - 20)}`
        });

        const payload = await jwtService.verifyToken(token);

        if (!payload) {
          console.log('❌ [MIDDLEWARE] Token verification failed');
          error = 'Invalid or expired token';
        } else {
          console.log('✅ [MIDDLEWARE] Token verified successfully:', {
            userId: payload.userId,
            phoneNumber: payload.phoneNumber,
            typeUser: payload.typeUser
          });

          // Fetch user from database to ensure they still exist and are active
          const dbUser = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
              id: true,
              phoneNumber: true,
              status: true,
              typeUser: true,
              createdAt: true
            }
          });

          if (!dbUser || dbUser.status !== 'ACTIVE') {
            console.log('❌ [MIDDLEWARE] User not found or inactive:', {
              userFound: !!dbUser,
              userStatus: dbUser?.status
            });
            error = 'User not found or inactive';
          } else {
            console.log('✅ [MIDDLEWARE] User authenticated successfully:', {
              userId: dbUser.id,
              phoneNumber: dbUser.phoneNumber,
              status: dbUser.status
            });
            user = dbUser;
          }
        }
      }

      // Store user and error in context for main app to use
      (store as any).user = user;
      (store as any).authError = error;

      console.log('📦 [MIDDLEWARE] Stored in context:', { hasUser: !!user, error });
    });
  // ไม่ใช้ onBeforeHandle ที่นี่ เพราะจะ block request
  // ให้ main app ตัดสินใจเอง
};