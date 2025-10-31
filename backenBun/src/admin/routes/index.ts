import { Elysia } from 'elysia';
import { adminServiceContainer } from '../index';

export const adminMicroserviceRoutes = new Elysia({ prefix: '/api' })
  .use(adminServiceContainer.getAuthController())
  .use(adminServiceContainer.getChargePointController());

// Export individual controllers for flexibility
export { adminAuthController } from '../auth/auth.controller';
export { adminChargePointController } from '../chargepoint/chargepoint.controller';