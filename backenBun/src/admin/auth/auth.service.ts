import { JWTService } from "../../lib/jwt";
import { logAuthEvent, logger } from "../../lib/logger";
import { hashPassword, verifyPassword } from "../../lib/password";
import { prisma } from "../../lib/prisma";

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface AdminRegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  role: "SUPERADMIN" | "STAFF";
}

export interface AdminLoginData {
  email: string;
  password: string;
}

export class AdminAuthService {
  constructor(private jwtService: JWTService) {}

  async register(data: AdminRegistrationData) {
    logAuthEvent('Admin Registration Attempt', data.email, true, undefined, undefined);

    try {
      const { email, password, confirmPassword, firstName, lastName, role } = data;

      // Validate input data
      if (password !== confirmPassword) {
        throw new Error("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      }

      if (password.length < 8) {
        throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
      }

      // Check if admin already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { email }
      });

      if (existingAdmin) {
        throw new Error("มีผู้ดูแลระบบที่ใช้อีเมลนี้แล้ว");
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role
        }
      });

      // Generate tokens
      const accessToken = await this.jwtService.generateAdminToken(admin);
      const refreshToken = await this.jwtService.generateAdminRefreshToken(admin);

      // Store refresh token
      await this.storeRefreshToken(admin.id, refreshToken);

      logAuthEvent('Admin Registration Success', email, true, admin.id, undefined);

      return {
        success: true,
        message: "ลงทะเบียนสำเร็จ",
        data: {
          admin: {
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role
          },
          accessToken,
          refreshToken
        }
      };
    } catch (error: any) {
      logAuthEvent('Admin Registration Failed', data.email, false, undefined, error.message);
      logger.error('Admin registration error:', error);
      throw error;
    }
  }

  async login(data: AdminLoginData) {
    logAuthEvent('Admin Login Attempt', data.email, true, undefined, undefined);

    try {
      const { email, password } = data;

      // Find admin by email
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, admin.password);
      if (!isValidPassword) {
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }

      // Check if admin is active
      if (!admin.isActive) {
        throw new Error("บัญชีผู้ดูแลระบบถูกปิดใช้งาน");
      }

      // Generate tokens
      const accessToken = await this.jwtService.generateAdminToken(admin);
      const refreshToken = await this.jwtService.generateAdminRefreshToken(admin);

      // Store refresh token
      await this.storeRefreshToken(admin.id, refreshToken);

      logAuthEvent('Admin Login Success', email, true, admin.id, undefined);

      return {
        success: true,
        message: "เข้าสู่ระบบแอดมินสำเร็จ",
        data: {
          admin: {
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            isActive: admin.isActive,
            createdAt: admin.createdAt
          },
          accessToken,
          refreshToken
        }
      };
    } catch (error: any) {
      logAuthEvent('Admin Login Failed', data.email, false, undefined, error.message);
      logger.error('Admin login error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAdminRefreshToken(refreshToken);
      if (!payload) {
        throw new Error('Invalid refresh token');
      }

      // Find stored refresh token
      const storedToken = await prisma.admin_refresh_tokens.findUnique({
        where: { token: refreshToken },
        include: { Admin: true }
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new tokens
      const newAccessToken = await this.jwtService.generateAdminToken(storedToken.Admin);
      const newRefreshToken = await this.jwtService.generateAdminRefreshToken(storedToken.Admin);

      // Revoke old refresh token
      await prisma.admin_refresh_tokens.update({
        where: { id: storedToken.id },
        data: { isRevoked: true, revokedAt: new Date() }
      });

      // Store new refresh token
      await this.storeRefreshToken(storedToken.Admin.id, newRefreshToken);

      return {
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      return {
        success: false,
        message: error.message || "Token refresh failed"
      };
    }
  }

  private async storeRefreshToken(adminId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.admin_refresh_tokens.create({
      data: {
        token: refreshToken,
        adminId,
        expiresAt
      }
    });
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await prisma.admin_refresh_tokens.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true, revokedAt: new Date() }
    });
  }

  async revokeAllAdminRefreshTokens(adminId: string): Promise<void> {
    await prisma.admin_refresh_tokens.updateMany({
      where: { adminId },
      data: { isRevoked: true, revokedAt: new Date() }
    });
  }

  async cleanupExpiredRefreshTokens(): Promise<void> {
    await prisma.admin_refresh_tokens.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true }
        ]
      }
    });
  }
}