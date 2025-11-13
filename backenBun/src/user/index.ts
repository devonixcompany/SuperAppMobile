import { AdminService } from "../admin/service/admin.service";
import { JWTService } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { authController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { chargePointController } from "./chargepoint/chargepoint.controller";
import { ChargePointService } from "./chargepoint/chargepoint.service";
import { paymentController } from "./payment/payment.controller";
import { PaymentService } from "./payment/payment.service";
import { webhookController } from "./payment/webhook.controller";
import { ssTaxInvoiceProfileController } from "./sstaxinvoiceprofile/sstaxinvoiceprofile.controller";
import { SsTaxInvoiceProfileService } from "./sstaxinvoiceprofile/sstaxinvoiceprofile.service";
import { stationController } from "./station/station.controller";
import { StationService } from "./station/station.service";
import { transactionController } from "./transaction/transaction.controller";
import { TransactionService } from "./transaction/transaction.service";
import { userController } from "./user/user.controller";
import { UserService } from "./user/user.service";
import { ValidationService } from "./validation/validation.service";

// Service instances
export class ServiceContainer {
  private static instance: ServiceContainer;

  public readonly jwtService: JWTService;
  public readonly userService: UserService;
  public readonly validationService: ValidationService;
  public readonly authService: AuthService;
  public readonly chargePointService: ChargePointService;
  public readonly ssTaxInvoiceProfileService: SsTaxInvoiceProfileService;
  public readonly stationService: StationService;
  public readonly adminService: AdminService;
  public readonly transactionService: TransactionService;
  public readonly paymentService: PaymentService;

  private constructor() {
    // Initialize services in dependency order
    const jwtSecret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production";
    this.jwtService = new JWTService(jwtSecret);
    this.userService = new UserService();
    this.validationService = new ValidationService();
    this.chargePointService = new ChargePointService();
    this.ssTaxInvoiceProfileService = new SsTaxInvoiceProfileService();
    this.stationService = new StationService();
    this.adminService = new AdminService(this.jwtService);
    this.transactionService = new TransactionService(prisma);
    this.paymentService = new PaymentService();
    this.authService = new AuthService(
      this.jwtService,
      this.userService,
      this.validationService,
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
    return chargePointController(
      this.chargePointService,
      this.validationService,
    );
  }

  public getSsTaxInvoiceProfileController() {
    return ssTaxInvoiceProfileController(this.ssTaxInvoiceProfileService);
  }

  public getTransactionController() {
    return transactionController(this.transactionService);
  }

  public getPaymentController() {
    return paymentController(this.paymentService);
  }

  public getWebhookController() {
    return webhookController();
  }

  public getStationController() {
    return stationController(this.stationService);
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
  ssTaxInvoiceProfileService,
  stationService,
  adminService,
  transactionService,
  paymentService,
} = serviceContainer;
