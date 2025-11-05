import { Elysia } from 'elysia';
import { JWTService } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AdminAuthContext extends Record<string, unknown> {
  admin: {
    id: string;
    email: string;
    role: string;
  } | null;
}

export const adminAuth = (jwtService: JWTService) =>
  new Elysia({ name: 'admin-auth' })
    .derive(async ({ cookie, request }): Promise<AdminAuthContext> => {
      console.log('🔍 AdminAuth derive called for:', request.url);
      try {
        console.log('🔍 Admin auth middleware called for:', request.url);
        
        // Try to get access token from cookie first
        let accessToken: string | undefined = cookie.accessToken?.value as string | undefined;
        console.log('🍪 Token from cookie:', accessToken ? 'Found' : 'Not found');
        
        // If no token in cookie, try Authorization header
        if (!accessToken) {
          const authHeader = request.headers.get('authorization');
          console.log('🔑 Authorization header:', authHeader ? 'Found' : 'Not found');
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7);
            console.log('🎯 Token extracted from header:', accessToken ? 'Success' : 'Failed');
          }
        }

        if (accessToken && typeof accessToken === 'string') {
          console.log('🔐 Verifying admin token...');
          const payload = await jwtService.verifyAdminToken(accessToken);
          console.log('✅ Token verified, payload:', payload);
          
          if (payload && payload.adminId) {
            const admin = await prisma.admin.findUnique({
              where: { id: payload.adminId }
            });
            console.log('👤 Admin found:', admin ? admin.email : 'Not found');
            
            if (admin && admin.isActive) {
              return {
                admin: {
                  id: admin.id,
                  email: admin.email,
                  role: admin.role
                }
              };
            }
          }
        }
        
        console.log('❌ No valid admin authentication');
        // If no valid access token, return null admin
        return { admin: null };
      } catch (error) {
        console.error('❌ Admin auth middleware error:', error);
        return { admin: null };
      }
    });

export const requireAdminAuth = (jwtService: JWTService) => {
  console.log('🔐 Admin authentication middleware - ALWAYS enforced (no DEV_BYPASS_AUTH)');
  return new Elysia({ name: 'require-admin-auth' })
    .use(adminAuth(jwtService))
    .onBeforeHandle(({ admin, set }: any) => {
      console.log('🔍 Admin middleware onBeforeHandle called, admin:', admin);
      if (!admin) {
        console.log('❌ Admin authentication failed - no valid admin token');
        set.status = 401;
        return {
          success: false,
          message: 'Admin authentication required'
        };
      }
      console.log('✅ Admin authentication successful:', admin.email);
    });
};

export const requireAdminRole = (roles: string[]) => (jwtService: JWTService) =>
  new Elysia({ name: 'require-admin-role' })
    .use(requireAdminAuth(jwtService))
    .onBeforeHandle(({ admin, set }: any) => {
      if (!admin || !roles.includes(admin.role)) {
        set.status = 403;
        return {
          success: false,
          message: 'Insufficient permissions'
        };
      }
    });
