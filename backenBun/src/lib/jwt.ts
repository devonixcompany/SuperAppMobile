import { User } from '@prisma/client';
import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  typeUser: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export interface AdminJWTPayload {
  adminId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export class JWTService {
  private secret: Uint8Array;

  constructor(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  async generateToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      typeUser: user.typeUser || 'NORMAL',
    };

    // Access Token หมดอายุใน 1 นาที (สำหรับทดสอบ)
    // สามารถเปลี่ยนเป็น: '30s', '1m', '5m', '15m', '30m', '1h' ตามต้องการ
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(this.secret);
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as JWTPayload;
    } catch (error) {
      // แสดง error แบบละเอียดเมื่อ token หมดอายุ
      if (error instanceof Error) {
        if (error.message.includes('exp')) {
          console.log('⏰ [JWT] Token expired:', error.message);
        } else if (error.message.includes('invalid')) {
          console.log('❌ [JWT] Invalid token:', error.message);
        } else {
          console.error('❌ [JWT] Verification error:', error.message);
        }
      } else {
        console.error('❌ [JWT] Unknown verification error:', error);
      }
      return null;
    }
  }

  async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    // Refresh Token หมดอายุใน 30 วัน
    // สามารถเปลี่ยนเป็น: '1d', '7d', '30d', '90d' ตามต้องการ
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(this.secret);
  }

  // ใช้ตรวจสอบความถูกต้องของ refresh token และดึงข้อมูล user ที่เข้ารหัสไว้
  async verifyRefreshToken(token: string): Promise<{ userId: string; type: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as unknown as { userId: string; type: string };
    } catch (error) {
      console.error('Refresh token verification error:', error);
      return null;
    }
  }

  // Admin token methods
  async generateAdminToken(admin: any): Promise<string> {
    const payload: AdminJWTPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(this.secret);
  }

  async verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as unknown as AdminJWTPayload;
    } catch (error) {
      console.error('Admin JWT verification error:', error);
      return null;
    }
  }

  async generateAdminRefreshToken(admin: any): Promise<string> {
    const payload = {
      adminId: admin.id,
      type: 'admin-refresh',
    };

    // For refresh tokens, we use a longer expiration
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
  }

  async verifyAdminRefreshToken(token: string): Promise<{ adminId: string; type: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as unknown as { adminId: string; type: string };
    } catch (error) {
      console.error('Admin refresh token verification error:', error);
      return null;
    }
  }

  /**
   * ตรวจสอบว่า token หมดอายุหรือยัง (ไม่ต้อง verify กับ server)
   * @param token JWT token ที่ต้องการตรวจสอบ
   * @returns true ถ้าหมดอายุแล้ว, false ถ้ายังไม่หมดอายุ
   */
  static isTokenExpired(token: string): boolean {
    try {
      // แยกส่วน payload จาก JWT token (ส่วนที่ 2 หลังจาก split ด้วย '.')
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000); // เวลาปัจจุบันเป็น seconds

      // ตรวจสอบว่า token มี exp (expiration time) และเปรียบเทียบกับเวลาปัจจุบัน
      return payload.exp && payload.exp < currentTime;
    } catch (error) {
      // ถ้า decode ไม่ได้ ถือว่า token ไม่ถูกต้องหรือหมดอายุ
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * ดึงเวลาหมดอายุของ token
   * @param token JWT token
   * @returns Date object ของเวลาหมดอายุ หรือ null ถ้า decode ไม่ได้
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? new Date(payload.exp * 1000) : null;
    } catch (error) {
      console.error('Error getting token expiration:', error);
      return null;
    }
  }

  /**
   * ดึงข้อมูล payload จาก token โดยไม่ต้อง verify (ใช้สำหรับ client-side)
   * @param token JWT token
   * @returns payload object หรือ null ถ้า decode ไม่ได้
   */
  static decodeTokenPayload(token: string): any | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
      console.error('Error decoding token payload:', error);
      return null;
    }
  }
}
