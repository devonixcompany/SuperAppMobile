import { Elysia } from 'elysia';
import { JWTService } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AdminAuthContext {
  admin: {
    id: string;
    email: string;
    role: string;
  };
}

export const adminAuth = (jwtService: JWTService) =>
  new Elysia({ name: 'admin-auth' })
    .derive(async ({ cookie, set }): Promise<AdminAuthContext | { admin: null }> => {
      try {
        // Try to get access token from cookie first
        let accessToken = cookie.accessToken?.value;
        
        if (accessToken) {
          // Verify access token
          const payload = await jwtService.verifyAdminToken(accessToken);
          
          if (payload) {
            // Check if admin is still active
            const admin = await prisma.admin.findUnique({
              where: { id: payload.adminId }
            });
            
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
        
        // If no valid access token, return null admin
        return { admin: null };
      } catch (error) {
        console.error('Admin auth middleware error:', error);
        return { admin: null };
      }
    });

export const requireAdminAuth = (jwtService: JWTService) =>
  new Elysia({ name: 'require-admin-auth' })
    .use(adminAuth(jwtService))
    .onBeforeHandle(({ admin, set }: any) => {
      if (!admin) {
        set.status = 401;
        return {
          success: false,
          message: 'Authentication required'
        };
      }
    });

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