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
      console.error('JWT verification error:', error);
      return null;
    }
  }

  async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    // For refresh tokens, we use a longer expiration
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
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
}