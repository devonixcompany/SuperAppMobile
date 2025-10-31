// Legacy exports (to be deprecated)
export { adminController } from './controller/admin.controller';
export { adminRoutes } from './routes/admin.routes';
export { AdminService, type AdminLoginData, type AdminRegistrationData } from './service/admin.service';

// New microservice exports
export { adminAuthController } from './auth/auth.controller';
export { AdminAuthService } from './auth/auth.service';
export { adminChargePointController } from './chargepoint/chargepoint.controller';
export { AdminChargePointService } from './chargepoint/chargepoint.service';

// Import services for the container
import { AdminAuthService } from './auth/auth.service';
import { AdminChargePointService } from './chargepoint/chargepoint.service';
import { adminAuthController } from './auth/auth.controller';
import { adminChargePointController } from './chargepoint/chargepoint.controller';

// Service container for admin microservices
export class AdminServiceContainer {
  private static instance: AdminServiceContainer;
  
  public readonly adminAuthService: AdminAuthService;
  public readonly adminChargePointService: AdminChargePointService;

  private constructor() {
    this.adminAuthService = new AdminAuthService();
    this.adminChargePointService = new AdminChargePointService();
  }

  public static getInstance(): AdminServiceContainer {
    if (!AdminServiceContainer.instance) {
      AdminServiceContainer.instance = new AdminServiceContainer();
    }
    return AdminServiceContainer.instance;
  }

  // Controller factory methods
  public getAuthController() {
    return adminAuthController(this.adminAuthService);
  }

  public getChargePointController() {
    return adminChargePointController;
  }
}

// Export singleton instance
export const adminServiceContainer = AdminServiceContainer.getInstance();
