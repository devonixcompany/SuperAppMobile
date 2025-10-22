import { adminController } from '../admin/controller/admin.controller';
import { AdminService } from '../admin/service/admin.service';
import { JWTService } from '../lib/jwt';
import { authController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { chargePointController } from './chargepoint/chargepoint.controller';
import { ChargePointService } from './chargepoint/chargepoint.service';
import { userController } from './user/user.controller';
import { UserService } from './user/user.service';
import { ValidationService } from './validation/validation.service';

// Service instances
export class ServiceContainer {
  private static instance: ServiceContainer;
  
  public readonly jwtService: JWTService;
  public readonly userService: UserService;
  public readonly validationService: ValidationService;
  public readonly authService: AuthService;
  public readonly chargePointService: ChargePointService;
  public readonly adminService: AdminService;

  private constructor() {
    // Initialize services in dependency order
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtService = new JWTService(jwtSecret);
    this.userService = new UserService();
    this.validationService = new ValidationService();
    this.chargePointService = new ChargePointService();
    this.adminService = new AdminService(this.jwtService);
    this.authService = new AuthService(
      this.jwtService,
      this.userService,
      this.validationService
    );
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  // Controller factory methods
  public getAuthController() {
    return authController(this.authService);
  }

  public getUserController() {
    return userController(this.userService, this.validationService);
  }

  public getChargePointController() {
    return chargePointController(this.chargePointService, this.validationService);
  }

  public getAdminController() {
    return adminController(this.adminService);
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();

// Export individual services for direct access if needed
export const {
  jwtService,
  userService,
  validationService,
  authService,
  chargePointService,
  adminService
} = serviceContainer;