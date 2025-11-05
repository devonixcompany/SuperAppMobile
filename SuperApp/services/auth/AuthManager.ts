/**
 * Enhanced Authentication Manager
 * จัดการ authentication, token refresh, และ keychain storage
 * รองรับ token expiration checking และ automatic refresh
 */

import API_CONFIG from '@/config/api.config';
import { clearTokens, getTokens, storeTokens } from '@/utils/keychain';
import { http } from '../api/client';

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    phoneNumber: string;
    fullName?: string;
    typeUser: string;
    status: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthManager {
  private static instance: AuthManager;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  private constructor() {
    // โหลด tokens จาก secure storage เมื่อสร้าง instance
    this.loadTokensFromStorage();
  }

  /**
   * Singleton pattern - ใช้ instance เดียวทั้งแอป
   */
  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * โหลด tokens จาก secure storage
   */
  private async loadTokensFromStorage(): Promise<void> {
    try {
      const tokens = await getTokens();
      if (tokens) {
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        console.log('🔐 Tokens loaded from secure storage');
      }
    } catch (error) {
      console.error('❌ Error loading tokens from storage:', error);
    }
  }

  /**
   * เก็บ tokens ใน secure storage และ memory
   */
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      await storeTokens({ accessToken, refreshToken });
      console.log('✅ Tokens saved to secure storage');
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
      throw error;
    }
  }

  /**
   * ลบ tokens จาก storage และ memory
   */
  private async clearAllTokens(): Promise<void> {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      await clearTokens();
      console.log('🗑️ All tokens cleared');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  /**
   * ตรวจสอบว่า access token หมดอายุหรือยัง
   * @param bufferMinutes จำนวนนาทีที่จะถือว่าหมดอายุก่อนเวลาจริง (default: 0.5 นาที สำหรับทดสอบ)
   */
  public isAccessTokenExpired(bufferMinutes: number = 0.5): boolean {
    if (!this.accessToken) {
      console.log('❌ [AUTH] No access token');
      return true;
    }

    try {
      // แยกส่วน payload จาก JWT token
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const bufferTime = bufferMinutes * 60;

      if (!payload.exp) {
        console.log('❌ [AUTH] Token has no expiration');
        return true;
      }

      const expTime = payload.exp;
      const timeLeft = expTime - currentTime;
      const isExpired = (expTime - bufferTime) < currentTime;

      console.log('⏰ [AUTH] Token expiration check:', {
        currentTime: new Date(currentTime * 1000).toLocaleTimeString(),
        expTime: new Date(expTime * 1000).toLocaleTimeString(),
        timeLeft: timeLeft > 0 ? `${timeLeft} seconds` : 'EXPIRED',
        bufferTime: `${bufferTime} seconds`,
        isExpired: isExpired
      });

      if (isExpired) {
        console.log('⚠️ [AUTH] Token expired or will expire soon');
      } else {
        console.log('✅ [AUTH] Token is still valid');
      }

      return isExpired;
    } catch (error) {
      console.error('❌ [AUTH] Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * ดึงเวลาหมดอายุของ access token
   */
  public getAccessTokenExpiration(): Date | null {
    if (!this.accessToken) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      return payload.exp ? new Date(payload.exp * 1000) : null;
    } catch (error) {
      console.error('❌ Error getting token expiration:', error);
      return null;
    }
  }

  /**
   * ดึงข้อมูล user จาก access token
   */
  public getUserFromToken(): any | null {
    if (!this.accessToken) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      return {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber,
        typeUser: payload.typeUser,
        exp: payload.exp,
        iat: payload.iat
      };
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      return null;
    }
  }

  /**
   * ตรวจสอบว่าผู้ใช้เข้าสู่ระบบอยู่หรือไม่
   */
  public isLoggedIn(): boolean {
    return !!this.accessToken && !!this.refreshToken;
  }

  /**
   * ตรวจสอบว่าผู้ใช้เข้าสู่ระบบและ token ยังไม่หมดอายุ
   */
  public isAuthenticated(): boolean {
    return this.isLoggedIn() && !this.isAccessTokenExpired();
  }

  /**
   * เข้าสู่ระบบ
   */
  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔐 Attempting login...');

      const response = await http.post<LoginResponse>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials,
        { skipAuth: true, retryOnAuthError: false }
      );

      if (response.success && response.data) {
        await this.saveTokens(response.data.accessToken, response.data.refreshToken);

        const expiration = this.getAccessTokenExpiration();
        console.log('✅ Login successful');
        console.log('🕐 Token expires at:', expiration);

        return response.data;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw new Error(error.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  }

  /**
   * รีเฟรช access token
   */
  public async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      console.log('❌ No refresh token available');
      return null;
    }

    // ถ้ากำลัง refresh อยู่ ให้รอ promise เดิม
    if (this.isRefreshing && this.refreshPromise) {
      console.log('⏳ Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * ทำการ refresh token จริง
   */
  private async _performRefresh(): Promise<string | null> {
    try {
      console.log('🔄 Refreshing access token...');

      const response = await http.post<RefreshTokenResponse>(
        API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
        { refreshToken: this.refreshToken },
        { skipAuth: true, retryOnAuthError: false }
      );

      if (response.success && response.data) {
        await this.saveTokens(response.data.accessToken, response.data.refreshToken);

        const expiration = this.getAccessTokenExpiration();
        console.log('✅ Token refreshed successfully');
        console.log('🕐 New token expires at:', expiration);

        return response.data.accessToken;
      } else {
        throw new Error(response.message || 'Token refresh failed');
      }
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      await this.clearAllTokens();
      return null;
    }
  }

  /**
   * ดึง access token ปัจจุบัน (จะ refresh อัตโนมัติถ้าหมดอายุ)
   */
  public async getValidAccessToken(): Promise<string | null> {
    console.log('🔍 [AUTH] Checking for valid access token...');

    // ถ้าไม่มี token เลย
    if (!this.accessToken) {
      console.log('❌ [AUTH] No access token available');
      return null;
    }

    // ตรวจสอบว่า token หมดอายุหรือยัง
    const isExpired = this.isAccessTokenExpired();

    // ถ้า token ยังไม่หมดอายุ
    if (!isExpired) {
      console.log('✅ [AUTH] Using existing valid token');
      return this.accessToken;
    }

    // ถ้า token หมดอายุ ให้ refresh
    console.log('🔄 [AUTH] Token expired, attempting refresh...');
    const newToken = await this.refreshAccessToken();

    if (newToken) {
      console.log('✅ [AUTH] Successfully refreshed token');
    } else {
      console.log('❌ [AUTH] Failed to refresh token');
    }

    return newToken;
  }

  /**
   * ออกจากระบบ
   */
  public async logout(): Promise<void> {
    try {
      console.log('👋 Logging out...');

      // เรียก logout API (ถ้ามี)
      try {
        await http.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
      } catch (error) {
        // ไม่ต้อง throw error ถ้า logout API ล้มเหลว
        console.warn('⚠️ Logout API failed, but continuing with local logout');
      }

      // ลบ tokens ทั้งหมด
      await this.clearAllTokens();

      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // ลบ tokens ท้องถิ่นแม้ API ล้มเหลว
      await this.clearAllTokens();
    }
  }

  /**
   * ทำ API call พร้อม automatic token refresh
   */
  public async apiCall<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const { method = 'GET', data, headers = {} } = options;

    console.log(`📡 [AUTH] API Call: ${method} ${endpoint}`);

    try {
      // ดึง valid access token (จะ refresh อัตโนมัติถ้าหมดอายุ)
      const token = await this.getValidAccessToken();

      if (!token) {
        console.log('❌ [AUTH] No valid token for API call');
        throw new Error('No valid access token available');
      }

      console.log('🎫 [AUTH] Using token for API call:', {
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`
      });

      // เตรียม config สำหรับ API call
      const config: any = {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      };

      // เรียก API ตาม method
      let response;
      switch (method) {
        case 'GET':
          response = await http.get<T>(endpoint, config);
          break;
        case 'POST':
          response = await http.post<T>(endpoint, data, config);
          break;
        case 'PUT':
          response = await http.put<T>(endpoint, data, config);
          break;
        case 'PATCH':
          response = await http.patch<T>(endpoint, data, config);
          break;
        case 'DELETE':
          response = await http.delete<T>(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      if (response.success) {
        console.log(`✅ [AUTH] API call successful: ${method} ${endpoint}`);
        return response.data as T;
      } else {
        console.log(`❌ [AUTH] API call failed: ${method} ${endpoint}`, response.message);
        throw new Error(response.message || 'API call failed');
      }
    } catch (error: any) {
      console.error(`❌ [AUTH] API call error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูล tokens ปัจจุบัน (สำหรับ debug)
   */
  public getTokenInfo(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    isExpired: boolean;
    expiration: Date | null;
    userInfo: any | null;
  } {
    return {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      isExpired: this.isAccessTokenExpired(),
      expiration: this.getAccessTokenExpiration(),
      userInfo: this.getUserFromToken(),
    };
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();