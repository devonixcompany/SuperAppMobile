import { JWTService } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import { LoginData, RegistrationData } from "../../lib/validation";
import { UserService } from "../user/user.service";
import { ValidationService } from "../validation/validation.service";

export class AuthService {
  constructor(
    private jwtService: JWTService,
    private userService: UserService,
    private validationService: ValidationService,
  ) {}

  async register(data: RegistrationData) {
    console.log("dataregis",data)
    console.log("📝 [AUTH] Registration attempt:", {
      email: data.email,
      userType: data.userType,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate input data
      this.validationService.validateRegistrationData(data);
      console.log("✅ [AUTH] Validation passed");

      const { firebaseUid, phoneNumber, userType, fullName, email, password } =
        data;

      // Check if user already exists by phone number
      const existingUserByPhone =
        await this.userService.findUserByPhoneNumber(phoneNumber);

      if (existingUserByPhone) {
        console.log("⚠️ [AUTH] User already exists with phone:", phoneNumber);
        throw new Error("หมายเลขโทรศัพท์นี้ถูกใช้งานแล้ว");
      }

      // Check if email already exists
      const existingUserByEmail = await this.userService.findUserByEmail(email);

      if (existingUserByEmail) {
        console.log("⚠️ [AUTH] User already exists with email:", email);
        throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
      }

      // Hash password
      const hashedPassword = await hashPassword(password);
      console.log("🔒 [AUTH] Password hashed successfully");

      // Map userType to database enum
      const typeUser = userType === "corporate" ? "BUSINESS" : "NORMAL";

      // Create new user
      console.log("💾 [AUTH] Creating new user in database...");
      const newUser = await this.userService.createUser({
        firebaseUid: firebaseUid,
        phoneNumber: phoneNumber,
        email: email,
        password: hashedPassword,
        typeUser: typeUser,
        status: "ACTIVE",
      });

      console.log("✅ [AUTH] User created successfully:", {
        userId: newUser.id,
      });

      // Generate tokens
      const token = await this.jwtService.generateToken(newUser);
      const refreshToken = await this.jwtService.generateRefreshToken(newUser);
      console.log("🎫 [AUTH] Tokens generated successfully");

      // Update user with refresh token
      await this.userService.updateRefreshToken(newUser.id, refreshToken);

      console.log("🎉 [AUTH] Registration completed successfully for:", email);
      return {
        success: true,
        message: "ลงทะเบียนสำเร็จ",
        data: {
          user: {
            id: newUser.id,
            firebaseUid: newUser.firebaseUid,
            phoneNumber: newUser.phoneNumber,
            typeUser: newUser.typeUser,
            status: newUser.status,
            createdAt: newUser.createdAt,
          },
          token,
          refreshToken,
        },
      };
    } catch (error) {
      console.error("❌ [AUTH] Registration failed:", {
        email: data.email,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async login(data: LoginData) {
    console.log("🔐 [AUTH] Login attempt:", {
      phoneNumber: data.phoneNumber,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate input data
      this.validationService.validateLoginData(data);
      console.log("✅ [AUTH] Login validation passed");

      const { phoneNumber, password } = data;

      // Find user by phone number
      console.log("🔍 [AUTH] Looking up user by phone number...");

      //ตัด 0 ออก
      const user = await this.userService.findUserByPhoneNumber(
        "+66" + phoneNumber.replace(/^0+/, ""),
      );

      if (!user) {
        console.log("⚠️ [AUTH] User not found:", phoneNumber);
        throw new Error("เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง");
      }

      console.log("✅ [AUTH] User found:", {
        userId: user.id,
        status: user.status,
      });

      // Check if user is active
      if (user.status !== "ACTIVE") {
        console.log("⚠️ [AUTH] User account is inactive:", user.id);
        throw new Error("บัญชีผู้ใช้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
      }

      // Verify password
      console.log("🔑 [AUTH] Verifying password...");
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        console.log("⚠️ [AUTH] Invalid password for user:", phoneNumber);
        throw new Error("เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง");
      }

      console.log("✅ [AUTH] Password verified successfully");

      // Generate tokens
      const token = await this.jwtService.generateToken(user);
      const refreshToken = await this.jwtService.generateRefreshToken(user);
      console.log("🎫 [AUTH] Tokens generated successfully");

      // Update user with refresh token
      await this.userService.updateRefreshToken(user.id, refreshToken);

      console.log("🎉 [AUTH] Login completed successfully for:", phoneNumber);
      return {
        success: true,
        message: "เข้าสู่ระบบสำเร็จ",
        data: {
          user: {
            id: user.id,
            firebaseUid: user.firebaseUid,
            phoneNumber: user.phoneNumber,
            typeUser: user.typeUser,
            status: user.status,
            createdAt: user.createdAt,
          },
          accessToken: token,
          refreshToken,
        },
      };
    } catch (error) {
      console.error("❌ [AUTH] Login failed:", {
        phoneNumber: data.phoneNumber,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    console.log("🔄 [AUTH] Token refresh attempt");

    try {
      if (!refreshToken) {
        console.log("⚠️ [AUTH] Refresh token missing");
        throw new Error("Refresh token is required");
      }

      // Find user by refresh token
      const user = await this.userService.findUserByRefreshToken(refreshToken);

      if (!user) {
        console.log("⚠️ [AUTH] Invalid refresh token");
        throw new Error("Invalid refresh token");
      }

      console.log("✅ [AUTH] User found for token refresh:", user.id);

      // Check if user is active
      if (user.status !== "ACTIVE") {
        console.log(
          "⚠️ [AUTH] Inactive user attempted token refresh:",
          user.id,
        );
        throw new Error("User account is inactive");
      }

      // Generate new tokens
      const newToken = await this.jwtService.generateToken(user);
      const newRefreshToken = await this.jwtService.generateRefreshToken(user);
      console.log("🎫 [AUTH] New tokens generated");

      // Update user with new refresh token
      await this.userService.updateRefreshToken(user.id, newRefreshToken);

      console.log("🎉 [AUTH] Token refresh completed successfully");
      return {
        success: true,
        message: "Token refreshed successfully",
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (error) {
      console.error("❌ [AUTH] Token refresh failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
