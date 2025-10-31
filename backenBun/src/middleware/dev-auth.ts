import { Elysia } from 'elysia';

export const devAuthMiddleware = () =>
  new Elysia({ name: 'dev-auth' })
    .derive(async ({ request, set }) => {
      // สร้าง mock user สำหรับการทดสอบ
      const mockUser = {
        id: 'dev-user-123',
        phoneNumber: '+66999999999',
        status: 'ACTIVE' as const,
        typeUser: 'USER' as const,
        createdAt: new Date()
      };

      console.log('🔓 Development mode: Bypassing authentication');
      
      return {
        user: mockUser,
        error: null
      };
    })
    .onBeforeHandle(({ user, error, set }) => {
      // ใน development mode จะไม่มีการ block request
      if (!user || error) {
        console.log('⚠️ Development mode: Would normally block this request');
      }
    });