import { PrismaClient } from '@prisma/client';
import { Logger } from '../../../../shared/utils/logger.js';
import { HttpClient } from '../../../../shared/utils/http-client.js';
import type { User, AuthToken, LoginRequest, RegisterRequest } from '../../../../shared/types/index.js';

const logger = new Logger('AuthService');

export class AuthService {
  private prisma: PrismaClient;
  private userService: HttpClient;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.userService = new HttpClient(process.env.USER_SERVICE_URL || 'http://user-service:3005');
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  async register(userData: RegisterRequest): Promise<{ user: User; tokens: AuthToken }> {
    try {
      // Create user via user service
      const userResponse = await this.userService.post<User>('/users', userData);

      if (!userResponse.success || !userResponse.data) {
        throw new Error(userResponse.error || 'Failed to create user');
      }

      const user = userResponse.data;

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info(`User registered: ${user.id}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Failed to register user:', error);
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<{ user: User; tokens: AuthToken }> {
    try {
      // Get user from user service
      const userResponse = await this.userService.get<User>(`/users/email/${credentials.email}`);

      if (!userResponse.success || !userResponse.data) {
        throw new Error('Invalid credentials');
      }

      const user = userResponse.data;

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info(`User logged in: ${user.id}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Failed to login user:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthToken> {
    try {
      // Check if refresh token exists and is valid
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token');
      }

      // Decode the refresh token to get user info
      const payload = await this.decodeToken(refreshToken);
      if (!payload || !payload.userId) {
        throw new Error('Invalid refresh token');
      }

      // Get user from user service
      const userResponse = await this.userService.get<User>(`/users/${payload.userId}`);

      if (!userResponse.success || !userResponse.data) {
        throw new Error('User not found');
      }

      const user = userResponse.data;

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id }
      });

      logger.info(`Token refreshed for user: ${user.id}`);

      return tokens;
    } catch (error) {
      logger.error('Failed to refresh token:', error);
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // Delete refresh token
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });

      // Add token to blacklist
      await this.blacklistToken(refreshToken);

      logger.info('User logged out');
    } catch (error) {
      logger.error('Failed to logout user:', error);
      throw error;
    }
  }

  async logoutAll(userId: string): Promise<void> {
    try {
      // Delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId }
      });

      logger.info(`User logged out from all devices: ${userId}`);
    } catch (error) {
      logger.error('Failed to logout user from all devices:', error);
      throw error;
    }
  }

  async generateTokens(user: User): Promise<AuthToken> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = this.parseExpiresIn(this.jwtExpiresIn);

      // Generate access token (short-lived)
      const accessTokenPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        iat: now,
        exp: now + 3600 // 1 hour
      };

      const accessToken = await this.signToken(accessTokenPayload);

      // Generate refresh token (long-lived)
      const refreshTokenPayload = {
        sub: user.id,
        type: 'refresh',
        iat: now,
        exp: now + expiresIn
      };

      const refreshToken = await this.signToken(refreshTokenPayload);

      // Store refresh token in database
      const expiresAt = new Date(now * 1000 + expiresIn * 1000);
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt
        }
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Failed to generate tokens:', error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      // Verify token
      const payload = await this.decodeToken(token);
      if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (error) {
      logger.error('Failed to verify token:', error);
      throw error;
    }
  }

  private async signToken(payload: any): Promise<string> {
    // This is a simplified JWT implementation
    // In production, use a proper JWT library
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadStr = btoa(JSON.stringify(payload));
    const signature = await this.sign(`${header}.${payloadStr}`);

    return `${header}.${payloadStr}.${signature}`;
  }

  private async decodeToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      throw new Error('Failed to decode token');
    }
  }

  private async sign(data: string): Promise<string> {
    // This is a simplified signature implementation
    // In production, use proper HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([hdwmy])/);
    if (!match) return 604800; // Default to 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      h: 3600,      // hours
      d: 86400,     // days
      w: 604800,    // weeks
      m: 2592000,   // months (30 days)
      y: 31536000   // years (365 days)
    };

    return value * multipliers[unit];
  }

  private async blacklistToken(token: string): Promise<void> {
    try {
      const payload = await this.decodeToken(token);
      const expiresAt = new Date(payload.exp * 1000);

      await this.prisma.blacklistedToken.create({
        data: {
          token,
          expiresAt
        }
      });
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
    }
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await this.prisma.blacklistedToken.findUnique({
        where: { token }
      });

      if (!blacklistedToken) return false;

      // Clean up expired tokens
      if (blacklistedToken.expiresAt < new Date()) {
        await this.prisma.blacklistedToken.delete({
          where: { id: blacklistedToken.id }
        });
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}