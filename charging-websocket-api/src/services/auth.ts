import jwt from 'jsonwebtoken';
import { WebSocketConfig } from '@/types';
import { config } from './config';

export interface AuthPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  userId?: string;
  sessionId?: string;
  error?: string;
}

export class AuthService {
  private static instance: AuthService;
  private jwtSecret: string;
  private sessionTimeout: number;

  private constructor() {
    const cfg = config.getConfig();
    this.jwtSecret = cfg.jwtSecret;
    this.sessionTimeout = cfg.sessionTimeout;
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Verify JWT token from frontend
   */
  public verifyToken(token: string): AuthResult {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as AuthPayload;

      return {
        success: true,
        userId: decoded.userId,
        sessionId: decoded.sessionId
      };
    } catch (error) {
      let errorMessage = 'Token verification failed';

      if (error instanceof jwt.TokenExpiredError) {
        errorMessage = 'Token expired';
      } else if (error instanceof jwt.JsonWebTokenError) {
        errorMessage = 'Invalid token';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Generate session token for WebSocket connection
   */
  public generateSessionToken(userId: string): { token: string; sessionId: string; expiresAt: string } {
    const sessionId = this.generateSessionId();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.floor(this.sessionTimeout / 1000);

    const payload: AuthPayload = {
      userId,
      sessionId,
      iat: now,
      exp
    };

    const token = jwt.sign(payload, this.jwtSecret);
    const expiresAt = new Date(exp * 1000).toISOString();

    return {
      token,
      sessionId,
      expiresAt
    };
  }

  /**
   * Validate session token (used for WebSocket messages)
   */
  public validateSessionToken(token: string): AuthResult {
    return this.verifyToken(token);
  }

  /**
   * Extract user ID from token without full verification (for performance)
   */
  public extractUserId(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  public isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch {
      return true;
    }
  }

  /**
   * Refresh session token
   */
  public refreshToken(oldToken: string): { token: string; sessionId: string; expiresAt: string } | null {
    const result = this.verifyToken(oldToken);

    if (!result.success || !result.userId) {
      return null;
    }

    return this.generateSessionToken(result.userId);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get token expiration time
   */
  public getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Validate token format (basic checks before JWT verification)
   */
  public isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    return parts.length === 3;
  }
}

export const authService = AuthService.getInstance();
