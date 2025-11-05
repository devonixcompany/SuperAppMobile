// Legacy exports (to be deprecated)
export { AdminService, type AdminLoginData, type AdminRegistrationData } from './service/admin.service';

// New microservice exports
export { adminAuthController } from './auth/auth.controller';
export { AdminAuthService } from './auth/auth.service';
export { adminChargePointsController } from './chargepoints/chargepoints.controller';
export { AdminChargePointsService } from './chargepoints/chargepoints.service';
export { adminConnectorsController } from './connectors/connectors.controller';
export { AdminConnectorsService } from './connectors/connectors.service';
export { adminStationController } from './station/station.controller';
export { AdminStationService } from './station/station.service';

// Import services and controllers
import { JWTService } from '../lib/jwt';
import { adminAuthController } from './auth/auth.controller';
import { AdminAuthService } from './auth/auth.service';
import { adminChargePointsController } from './chargepoints/chargepoints.controller';
import { AdminChargePointsService } from './chargepoints/chargepoints.service';
import { adminConnectorsController } from './connectors/connectors.controller';
import { AdminConnectorsService } from './connectors/connectors.service';
import { adminStationController } from './station/station.controller';
import { AdminStationService } from './station/station.service';

// Service container for admin microservices
export class AdminServiceContainer {
  private static instance: AdminServiceContainer;
  public readonly adminAuthService: AdminAuthService;
  public readonly adminStationService: AdminStationService;
  public readonly adminChargePointsService: AdminChargePointsService;
  public readonly adminConnectorsService: AdminConnectorsService;
 
  
  public readonly jwtService: JWTService;

  private constructor() {
    this.jwtService = new JWTService(process.env.JWT_SECRET || 'default-secret');
    this.adminAuthService = new AdminAuthService(this.jwtService);
    this.adminStationService = new AdminStationService();
    this.adminChargePointsService = new AdminChargePointsService();
    this.adminConnectorsService = new AdminConnectorsService();
    
    
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


  public getChargePointsCrudController() {
    return adminChargePointsController(this.jwtService);
  }

  public getStationController() {
    return adminStationController(this.jwtService);
  }

  public getConnectorsController() {
    return adminConnectorsController(this.jwtService);
  }

  public getChargePointConnectorController() {
    return this.getConnectorsController();
  }

 

}

// Export singleton instance
export const adminServiceContainer = AdminServiceContainer.getInstance();
