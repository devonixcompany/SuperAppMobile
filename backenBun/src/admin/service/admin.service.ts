import { JWTService } from "../../lib/jwt";
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

export class AdminService {
  constructor(private jwtService: JWTService) {}

  async register(data: AdminRegistrationData) {
    console.log("📝 [ADMIN] Registration attempt:", {
      email: data.email,
      role: data.role,
      timestamp: new Date().toISOString(),
    });

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

      // Check if admin already exists by email
      const existingAdmin = await prisma.admin.findUnique({
        where: { email }
      });

      if (existingAdmin) {
        console.log("⚠️ [ADMIN] Admin already exists with email:", email);
        throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
      }

      // Hash password
      const hashedPassword = await hashPassword(password);
      console.log("🔒 [ADMIN] Password hashed successfully");

      // Create new admin
      console.log("💾 [ADMIN] Creating new admin in database...");
      const newAdmin = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          role,
          firstName,
          lastName,
          isActive: true,
        },
      });

      console.log("✅ [ADMIN] Admin created successfully:", {
        adminId: newAdmin.id,
        role: newAdmin.role,
      });

      // Generate tokens
      const token = await this.jwtService.generateAdminToken(newAdmin);
      const refreshToken = await this.jwtService.generateAdminRefreshToken(newAdmin);
      
      // Store refresh token in database
      await this.storeRefreshToken(newAdmin.id, refreshToken);
      console.log("💾 [ADMIN] Refresh token stored in database");
      console.log("🎫 [ADMIN] Tokens generated successfully");

      console.log("🎉 [ADMIN] Registration completed successfully for:", email);
      return {
        success: true,
        message: "ลงทะเบียนแอดมินสำเร็จ",
        data: {
          admin: {
            id: newAdmin.id,
            email: newAdmin.email,
            role: newAdmin.role,
            firstName: newAdmin.firstName,
            lastName: newAdmin.lastName,
            isActive: newAdmin.isActive,
            createdAt: newAdmin.createdAt,
          },
          token,
          refreshToken,
        },
      };
    } catch (error) {
      console.error("❌ [ADMIN] Registration failed:", {
        email: data.email,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async login(data: AdminLoginData) {
    console.log("🔐 [ADMIN] Login attempt:", {
      email: data.email,
      timestamp: new Date().toISOString(),
    });

    try {
      const { email, password } = data;

      // Find admin by email
      console.log("🔍 [ADMIN] Looking up admin by email...");
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        console.log("⚠️ [ADMIN] Admin not found:", email);
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }

      console.log("✅ [ADMIN] Admin found:", {
        adminId: admin.id,
        role: admin.role,
        isActive: admin.isActive,
      });

      // Check if admin is active
      if (!admin.isActive) {
        console.log("⚠️ [ADMIN] Admin account is inactive:", admin.id);
        throw new Error("บัญชีแอดมินถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
      }

      // Verify password
      console.log("🔑 [ADMIN] Verifying password...");
      const isPasswordValid = await verifyPassword(password, admin.password);

      if (!isPasswordValid) {
        console.log("⚠️ [ADMIN] Invalid password for admin:", email);
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }

      console.log("✅ [ADMIN] Password verified successfully");

      // Generate tokens
      const token = await this.jwtService.generateAdminToken(admin);
      const refreshToken = await this.jwtService.generateAdminRefreshToken(admin);
      
      // Store refresh token in database
      await this.storeRefreshToken(admin.id, refreshToken);
      console.log("💾 [ADMIN] Refresh token stored in database");
      console.log("🎫 [ADMIN] Tokens generated successfully");

      console.log("🎉 [ADMIN] Login completed successfully for:", email);
      return {
        success: true,
        message: "เข้าสู่ระบบแอดมินสำเร็จ",
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            firstName: admin.firstName,
            lastName: admin.lastName,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
          },
          accessToken: token,
          refreshToken,
        },
      };
    } catch (error) {
      console.error("❌ [ADMIN] Login failed:", {
        email: data.email,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    console.log("🔄 [ADMIN] Token refresh attempt");
    console.log("🔍 [ADMIN] Refresh token provided:", refreshToken ? "Yes" : "No");

    try {
      if (!refreshToken) {
        console.log("⚠️ [ADMIN] Refresh token missing");
        throw new Error("Refresh token is required");
      }

      // Verify refresh token and get admin ID
      console.log("🔐 [ADMIN] Verifying refresh token...");
      const payload = await this.jwtService.verifyAdminRefreshToken(refreshToken);
      console.log("✅ [ADMIN] Token verification result:", payload ? "Success" : "Failed");
      
      if (!payload) {
        console.log("⚠️ [ADMIN] Invalid refresh token");
        throw new Error("Invalid refresh token");
      }

      console.log("📋 [ADMIN] Token payload:", { adminId: payload.adminId, type: payload.type });

      // Check if refresh token exists in database and is not revoked
      console.log("💾 [ADMIN] Checking database for refresh token...");
      const storedToken = await prisma.adminRefreshToken.findFirst({
        where: {
          token: refreshToken,
          isRevoked: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      console.log("🔍 [ADMIN] Database token check result:", storedToken ? "Found" : "Not found");
      
      if (!storedToken) {
        console.log("⚠️ [ADMIN] Refresh token not found or expired in database");
        throw new Error("Invalid or expired refresh token");
      }

      console.log("📋 [ADMIN] Stored token info:", {
        id: storedToken.id,
        adminId: storedToken.adminId,
        expiresAt: storedToken.expiresAt,
        isRevoked: storedToken.isRevoked
      });

      // Find admin by ID
      console.log("👤 [ADMIN] Finding admin by ID:", payload.adminId);
      const admin = await prisma.admin.findUnique({
        where: { id: payload.adminId }
      });

      if (!admin) {
        console.log("⚠️ [ADMIN] Admin not found for token refresh");
        throw new Error("Admin not found");
      }

      console.log("✅ [ADMIN] Admin found for token refresh:", admin.id);

      // Check if admin is active
      if (!admin.isActive) {
        console.log("⚠️ [ADMIN] Inactive admin attempted token refresh:", admin.id);
        throw new Error("Admin account is inactive");
      }

      console.log("🔄 [ADMIN] Revoking old refresh token...");
      // Revoke the old refresh token
      await this.revokeRefreshToken(refreshToken);

      console.log("🎫 [ADMIN] Generating new tokens...");
      // Generate new tokens
      const newToken = await this.jwtService.generateAdminToken(admin);
      const newRefreshToken = await this.jwtService.generateAdminRefreshToken(admin);
      
      console.log("💾 [ADMIN] Storing new refresh token...");
      // Store new refresh token in database
      await this.storeRefreshToken(admin.id, newRefreshToken);
      console.log("🎫 [ADMIN] New tokens generated and stored");

      console.log("🎉 [ADMIN] Token refresh completed successfully");
      return {
        success: true,
        message: "Admin token refreshed successfully",
        data: {
          accessToken: newToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (error) {
      console.error("❌ [ADMIN] Token refresh failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private async storeRefreshToken(adminId: string, refreshToken: string): Promise<void> {
    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.adminRefreshToken.create({
      data: {
        token: refreshToken,
        adminId,
        expiresAt,
      },
    });
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await prisma.adminRefreshToken.updateMany({
      where: {
        token: refreshToken,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllAdminRefreshTokens(adminId: string): Promise<void> {
    await prisma.adminRefreshToken.updateMany({
      where: {
        adminId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async cleanupExpiredRefreshTokens(): Promise<void> {
    const deletedTokens = await prisma.adminRefreshToken.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isRevoked: true,
            revokedAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          },
        ],
      },
    });

    if (deletedTokens.count > 0) {
      console.log(`🧹 [ADMIN] Cleaned up ${deletedTokens.count} expired/revoked refresh tokens`);
    }
  }
}