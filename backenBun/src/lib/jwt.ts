import { User } from '@prisma/client';
import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  typeUser: string;
  iat?: number;
  exp?: number;
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
}