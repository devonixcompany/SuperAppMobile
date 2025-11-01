// Legacy exports (to be deprecated)
export { AdminService, type AdminLoginData, type AdminRegistrationData } from './service/admin.service';

// New microservice exports
export { adminAuthController } from './auth/auth.controller';
export { AdminAuthService } from './auth/auth.service';
export { adminChargePointController } from './chargepoint/chargepoint.controller';
export { AdminChargePointService } from './chargepoint/chargepoint.service';

// Import services and controllers
import { JWTService } from '../lib/jwt';
import { adminAuthController } from './auth/auth.controller';
import { AdminAuthService } from './auth/auth.service';
import { adminChargePointController } from './chargepoint/chargepoint.controller';
import { AdminChargePointService } from './chargepoint/chargepoint.service';

// Service container for admin microservices
export class AdminServiceContainer {
  private static instance: AdminServiceContainer;
  
  public readonly adminAuthService: AdminAuthService;
  public readonly adminChargePointService: AdminChargePointService;
  
  public readonly jwtService: JWTService;

  private constructor() {
    this.jwtService = new JWTService(process.env.JWT_SECRET || 'default-secret');
    this.adminAuthService = new AdminAuthService(this.jwtService);
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
    return adminChargePointController(this.jwtService);
  }
}

// Export singleton instance
export const adminServiceContainer = AdminServiceContainer.getInstance();
