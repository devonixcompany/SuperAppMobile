import { JWTService } from "../../lib/jwt";
import { logAuthEvent, logger } from "../../lib/logger";
import { hashPassword, verifyPassword } from "../../lib/password";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

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
      logger.debug("Admin password hashed successfully", { email: data.email });

      // Create new admin
      logger.info("Creating new admin in database", { email: data.email, role: data.role });
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
      logAuthEvent('Admin Registration Failed', data.email, false, undefined, undefined,
        error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  }

  async login(data: AdminLoginData) {
    logAuthEvent('Admin Login Attempt', data.email, true, undefined, undefined);

    try {
      const { email, password } = data;

      // Find admin by email
      logger.debug("Looking up admin by email", { email: data.email });
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        logAuthEvent('Admin Login Failed - Not Found', email, false, undefined, undefined, "Admin not found");
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }

      logger.debug("Admin found for login", {
        adminId: admin.id,
        email: admin.email,
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
      logAuthEvent('Admin Login Failed', data.email, false, undefined, undefined,
        error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    console.log("🔄 [ADMIN] Token refresh attempt");
    console.log("🔍 [ADMIN] Refresh token provided:", refreshToken ? "Yes" : "No");

    try {
      if (!refreshToken) {
        logger.warn("Admin refresh token missing");
        throw new Error("Refresh token is required");
      }

      // Verify refresh token and get admin ID
      console.log("🔐 [ADMIN] Verifying refresh token...");
      const payload = await this.jwtService.verifyAdminRefreshToken(refreshToken);
      console.log("✅ [ADMIN] Token verification result:", payload ? "Success" : "Failed");
      
      if (!payload) {
        logger.warn("Invalid admin refresh token");
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

  // Charge Point Management Methods
  async createChargePoint(data: any) {
    try {
      const {
        station: stationPayload,
        stationId: stationIdRaw,
        stationName,
        stationname: stationNameLower,
        connectors,
        ...restBody
      } = data;

      const chargePointData = this.pickChargePointData(restBody) as Prisma.ChargePointUncheckedCreateInput;
      const connectorPayload = this.buildConnectorPayload(connectors);
      
      if (connectorPayload.length > 0 && chargePointData.connectorCount === undefined) {
        chargePointData.connectorCount = connectorPayload.length;
      }

      let resolvedStationId: string | undefined =
        typeof stationIdRaw === "string" && stationIdRaw.trim()
          ? stationIdRaw.trim()
          : undefined;

      if (resolvedStationId) {
        const stationExists = await prisma.station.findUnique({
          where: { id: resolvedStationId },
          select: { id: true },
        });
        if (!stationExists) {
          resolvedStationId = undefined;
        }
      }

      const stationNameCandidates = new Set<string>();

      if (typeof stationPayload === "object" && stationPayload !== null) {
        const stationObj = stationPayload as Record<string, unknown>;
        const idCandidate = stationObj.id;
        if (
          !resolvedStationId &&
          typeof idCandidate === "string" &&
          idCandidate.trim()
        ) {
          const existingById = await prisma.station.findUnique({
            where: { id: idCandidate.trim() },
            select: { id: true },
          });
          if (existingById) {
            resolvedStationId = existingById.id;
          }
        }

        const rawNameCandidates = [
          stationObj["name"],
          stationObj["stationName"],
          stationObj["stationname"],
          stationObj["title"],
        ];
        for (const rawName of rawNameCandidates) {
          if (typeof rawName === "string" && rawName.trim()) {
            stationNameCandidates.add(rawName.trim());
          }
        }
      }

      if (typeof stationName === "string" && stationName.trim()) {
        stationNameCandidates.add(stationName.trim());
      }

      if (typeof stationNameLower === "string" && stationNameLower.trim()) {
        stationNameCandidates.add(stationNameLower.trim());
      }

      if (!resolvedStationId) {
        let stationRecord: { id: string } | null = null;

        for (const candidate of stationNameCandidates) {
          stationRecord = await prisma.station.findUnique({
            where: { stationname: candidate },
            select: { id: true },
          });
          if (stationRecord) break;
        }

        if (!stationRecord) {
          const [firstCandidate] = Array.from(stationNameCandidates);
          const nameForCreation =
            firstCandidate ??
            (typeof chargePointData.chargepointname === "string" &&
            chargePointData.chargepointname.trim()
              ? `${(chargePointData.chargepointname as string).trim()} Station`
              : `Station-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

          stationRecord = await prisma.station.create({
            data: { stationname: nameForCreation },
            select: { id: true },
          });
        }

        resolvedStationId = stationRecord.id;
      }

      const chargePoint = await prisma.chargePoint.create({
        data: {
          ...chargePointData,
          ...(resolvedStationId ? { stationId: resolvedStationId } : {}),
          connectors: connectorPayload.length
            ? {
                create: connectorPayload,
              }
            : undefined,
        },
        include: {
          station: {
            select: {
              id: true,
              stationname: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          connectors: {
            orderBy: { connectorId: "asc" },
          },
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

      return this.normalizeChargePoint(chargePoint);
    } catch (error: any) {
      console.error("Error creating chargepoint:", error);
      throw error;
    }
  }

  async updateChargePoint(id: string, data: any) {
    try {
      const chargePointData = this.pickChargePointData(data) as Prisma.ChargePointUncheckedUpdateInput;

      if (Object.keys(chargePointData).length === 0) {
        throw new Error("No updatable fields provided");
      }

      const chargePoint = await prisma.chargePoint.update({
        where: { id },
        data: chargePointData,
        include: {
          station: {
            select: {
              id: true,
              stationname: true,
            },
          },
          connectors: {
            select: {
              id: true,
              connectorId: true,
              type: true,
              status: true,
              maxPower: true,
              maxCurrent: true,
            },
            orderBy: { connectorId: "asc" },
          },
        },
      });

      return this.normalizeChargePoint(chargePoint);
    } catch (error: any) {
      console.error("Error updating chargepoint:", error);
      throw error;
    }
  }

  async deleteChargePoint(id: string) {
    try {
      await prisma.chargePoint.delete({ where: { id } });
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting chargepoint:", error);
      throw error;
    }
  }

  // Utility methods
  private toNullableNumber = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);

  private normalizeChargePoint = <
    T extends { latitude?: unknown; longitude?: unknown; connectors?: any[] },
  >(
    chargePoint: T,
  ) => {
    const normalized: any = {
      ...chargePoint,
      latitude: this.toNullableNumber(chargePoint.latitude),
      longitude: this.toNullableNumber(chargePoint.longitude),
    };

    if (Array.isArray(chargePoint.connectors)) {
      normalized.connectors = chargePoint.connectors.map((connector: any) => ({
        ...connector,
        maxPower: this.toNullableNumber(connector.maxPower),
        maxCurrent: this.toNullableNumber(connector.maxCurrent),
      }));
    }

    return normalized;
  };

  private ALLOWED_CHARGE_POINT_FIELDS = [
    "chargepointname",
    "location",
    "latitude",
    "longitude",
    "openingHours",
    "is24Hours",
    "brand",
    "serialNumber",
    "powerRating",
    "powerSystem",
    "connectorCount",
    "protocol",
    "csmsUrl",
    "chargePointIdentity",
    "chargepointstatus",
    "maxPower",
    "lastSeen",
    "heartbeatIntervalSec",
    "vendor",
    "model",
    "firmwareVersion",
    "ocppProtocolRaw",
    "ocppSessionId",
    "isWhitelisted",
    "ownerId",
    "ownershipType",
    "isPublic",
    "onPeakRate",
    "onPeakStartTime",
    "onPeakEndTime",
    "offPeakRate",
    "offPeakStartTime",
    "offPeakEndTime",
    "urlwebSocket",
    "stationId",
    "powerSystem",
  ] as const satisfies readonly (keyof Prisma.ChargePointUncheckedCreateInput)[];

  private NUMERIC_FIELDS = [
    "latitude",
    "longitude",
    "powerRating",
    "powerSystem",
    "connectorCount",
    "maxPower",
    "onPeakRate",
    "offPeakRate",
    "heartbeatIntervalSec",
  ] as const;

  private numericFieldSet = new Set(this.NUMERIC_FIELDS);

  private transformValue = <K extends keyof Prisma.ChargePointUncheckedCreateInput>(
    field: K,
    value: unknown,
  ): Prisma.ChargePointUncheckedCreateInput[K] => {
    if (this.numericFieldSet.has(field as any)) {
      return (
        value === null || value === undefined ? null : Number(value)
      ) as Prisma.ChargePointUncheckedCreateInput[K];
    }
    return value as Prisma.ChargePointUncheckedCreateInput[K];
  };

  private pickChargePointData = (source: Record<string, unknown>) => {
    const data: Partial<Record<keyof Prisma.ChargePointUncheckedCreateInput, any>> = {};
    for (const field of this.ALLOWED_CHARGE_POINT_FIELDS) {
      const value = source[field as string];
      if (value !== undefined) {
        data[field] = this.transformValue(field, value);
      }
    }
    return data as Partial<Prisma.ChargePointUncheckedCreateInput>;
  };

  private buildConnectorPayload = (
    connectors: unknown,
  ): Array<Prisma.ConnectorCreateWithoutChargePointInput> => {
    if (!Array.isArray(connectors)) return [];

    const payload: Array<Prisma.ConnectorCreateWithoutChargePointInput> = [];

    for (const entry of connectors) {
      if (!entry || typeof entry !== "object") continue;
      const connector = entry as Record<string, unknown>;

      if (connector.connectorId === undefined) {
        continue;
      }

      const record: Prisma.ConnectorCreateWithoutChargePointInput = {
        connectorId: Number(connector.connectorId),
      };

      if (connector.type !== undefined) {
        record.type =
          connector.type as Prisma.ConnectorCreateWithoutChargePointInput["type"];
      }
      if (connector.status !== undefined) {
        record.status =
          connector.status as Prisma.ConnectorCreateWithoutChargePointInput["status"];
      }
      if (connector.maxPower !== undefined) {
        record.maxPower =
          connector.maxPower === null ? null : Number(connector.maxPower);
      }
      if (connector.maxCurrent !== undefined) {
        record.maxCurrent =
          connector.maxCurrent === null ? null : Number(connector.maxCurrent);
      }
      if (connector.typeDescription !== undefined) {
        record.typeDescription = connector.typeDescription as
          | string
          | null
          | undefined;
      }

      payload.push(record);
    }

    return payload;
  };
}