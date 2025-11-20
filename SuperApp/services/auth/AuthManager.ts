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
  private refreshTimer: NodeJS.Timeout | null = null;

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
        
        // เริ่ม auto-refresh scheduler
        this.scheduleAutoRefresh();
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
      console.log('💾 [SAVE] Saving tokens to memory and storage...');
      console.log('💾 [SAVE] Access token length:', accessToken.length);
      console.log('💾 [SAVE] Refresh token length:', refreshToken.length);
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      console.log('💾 [SAVE] Tokens set in memory successfully');
      console.log('💾 [SAVE] Memory state - has accessToken:', !!this.accessToken);
      console.log('💾 [SAVE] Memory state - has refreshToken:', !!this.refreshToken);

      await storeTokens({ accessToken, refreshToken });
      console.log('💾 Tokens stored securely');
      
      // เริ่ม auto-refresh scheduler
      console.log('🔄 [SAVE] Starting auto-refresh scheduler...');
      this.scheduleAutoRefresh();
      console.log('🔄 [SAVE] Auto-refresh scheduler started');
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
      
      // หยุด auto-refresh timer
      this.stopAutoRefresh();
      
      await clearTokens();
      console.log('🗑️ All tokens cleared');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  /**
   * จัดตารางการ refresh token อัตโนมัติ
   */
  private scheduleAutoRefresh(): void {
    // หยุด timer เก่า
    this.stopAutoRefresh();
    
    if (!this.accessToken) {
      console.log('⚠️ [AUTO-REFRESH] No access token available');
      return;
    }

    try {
      console.log('🔍 [AUTO-REFRESH] Checking token expiration...');
      const expiration = this.getAccessTokenExpiration();
      
      if (!expiration) {
        console.log('⚠️ [AUTO-REFRESH] Cannot schedule: no expiration found');
        return;
      }

      // คำนวณเวลาที่จะ refresh (5 นาทีก่อนหมดอายุ)
      const now = new Date().getTime();
      const expTime = expiration.getTime();
      const refreshTime = expTime - (5 * 60 * 1000); // 5 minutes before expiry
      const timeUntilRefresh = refreshTime - now;

      console.log('⏰ [AUTO-REFRESH] Timing calculation:', {
        now: new Date(now).toISOString(),
        expiration: expiration.toISOString(), 
        refreshTime: new Date(refreshTime).toISOString(),
        timeUntilRefreshMinutes: Math.round(timeUntilRefresh / 1000 / 60)
      });

      if (timeUntilRefresh <= 0) {
        // ถ้าเหลือเวลาน้อยกว่า 5 นาที ให้ refresh ทันที
        console.log('🔄 [AUTO-REFRESH] Token expires soon, refreshing immediately...');
        this.refreshAccessToken().then(newToken => {
          if (newToken) {
            console.log('✅ [AUTO-REFRESH] Immediate refresh successful');
          } else {
            console.log('❌ [AUTO-REFRESH] Immediate refresh failed');
          }
        });
        return;
      }

      console.log(`⏰ [AUTO-REFRESH] Scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
      
      this.refreshTimer = setTimeout(() => {
        console.log('⏰ [AUTO-REFRESH] Timer triggered - refreshing token...');
        this.refreshAccessToken().then(newToken => {
          if (newToken) {
            console.log('✅ [AUTO-REFRESH] Scheduled refresh successful');
          } else {
            console.log('❌ [AUTO-REFRESH] Scheduled refresh failed');
          }
        });
      }, timeUntilRefresh);
      
    } catch (error) {
      console.error('❌ [AUTO-REFRESH] Error scheduling:', error);
    }
  }

  /**
   * หยุด auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
      console.log('⏹️ Auto-refresh timer stopped');
    }
  }

  /**
   * ตรวจสอบสถานะของ auto-refresh
   */
  public getAutoRefreshStatus(): { 
    isActive: boolean; 
    nextRefreshTime?: Date; 
    minutesUntilRefresh?: number;
  } {
    if (!this.refreshTimer || !this.accessToken) {
      return { isActive: false };
    }

    const expiration = this.getAccessTokenExpiration();
    if (!expiration) {
      return { isActive: false };
    }

    // คำนวณเวลาที่จะ refresh (5 นาทีก่อนหมดอายุ)
    const refreshTime = new Date(expiration.getTime() - (5 * 60 * 1000));
    const now = new Date();
    const minutesUntilRefresh = Math.max(0, Math.round((refreshTime.getTime() - now.getTime()) / 1000 / 60));

    return {
      isActive: true,
      nextRefreshTime: refreshTime,
      minutesUntilRefresh
    };
  }

  /**
   * ตรวจสอบว่า access token หมดอายุหรือยัง
   * @param bufferMinutes จำนวนนาทีที่จะถือว่าหมดอายุก่อนเวลาจริง (default: 5 นาที สำหรับ fallback)
   */
  public isAccessTokenExpired(bufferMinutes: number = 5): boolean {
    if (!this.accessToken) {
      console.log('❌ [AUTH] No access token');
      return true;
    }

    // ใช้ getAccessTokenExpiration() ที่มี robust parsing
    const expiration = this.getAccessTokenExpiration();
    
    if (!expiration) {
      console.log('❌ [AUTH] Token has no expiration - treating as expired');
      return true;
    }

    const currentTime = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
    const timeLeft = expiration.getTime() - currentTime;
    const isExpired = (expiration.getTime() - bufferTime) < currentTime;

    console.log('⏰ [AUTH] Token expiration check:', {
      currentTime: new Date(currentTime).toLocaleTimeString(),
      expTime: expiration.toLocaleTimeString(), 
      timeLeftMinutes: Math.round(timeLeft / 1000 / 60),
      bufferMinutes: bufferMinutes,
      isExpired: isExpired
    });

    if (isExpired) {
      console.log('⚠️ [AUTH] Token expired or will expire soon');
    } else {
      console.log('✅ [AUTH] Token is still valid');
    }

    return isExpired;
  }

  /**
   * ดึงวันหมดอายุของ access token
   */
  public getAccessTokenExpiration(): Date | null {
    if (!this.accessToken) {
      console.log('❌ [AUTH] No access token available for expiration check');
      return null;
    }

    try {
      // แยก JWT parts
      const tokenParts = this.accessToken.split('.');
      if (tokenParts.length !== 3) {
        console.error('❌ [AUTH] Invalid JWT format - expected 3 parts, got:', tokenParts.length);
        return null;
      }

      console.log('🔍 [AUTH] JWT parts:', {
        header: tokenParts[0].substring(0, 20) + '...',
        payload: tokenParts[1].substring(0, 20) + '...',
        signature: tokenParts[2].substring(0, 20) + '...'
      });

      // เพิ่ม padding ถ้าจำเป็น สำหรับ base64 decoding
      let payload = tokenParts[1];
      while (payload.length % 4) {
        payload += '=';
      }

      console.log('🔍 [AUTH] Base64 payload length:', payload.length);

      // Decode payload (ส่วนที่ 2 ของ JWT)
      let decodedPayload;
      try {
        // ลองใช้ atob ก่อน
        const decodedString = atob(payload);
        console.log('✅ [AUTH] atob decoding successful, decoded string length:', decodedString.length);
        decodedPayload = JSON.parse(decodedString);
      } catch (atobError) {
        console.log('⚠️ [AUTH] atob failed, trying manual base64 decode:', atobError);
        
        // ถ้า atob ไม่ได้ ลองใช้ manual base64 decode
        try {
          const decodedString = this.base64Decode(payload);
          console.log('✅ [AUTH] Manual base64 decode successful');
          decodedPayload = JSON.parse(decodedString);
        } catch (manualError) {
          console.error('❌ [AUTH] Manual base64 decode also failed:', manualError);
          throw manualError;
        }
      }

      console.log('🔍 [AUTH] Decoded payload:', {
        userId: decodedPayload.userId || 'N/A',
        type: decodedPayload.type || 'N/A',
        iat: decodedPayload.iat || 'N/A',
        exp: decodedPayload.exp || 'N/A'
      });
      
      // ตรวจสอบ exp field
      if (!decodedPayload.exp) {
        console.warn('⚠️ [AUTH] Token missing expiration field - using fallback calculation');
        console.warn('⚠️ [AUTH] Available fields:', Object.keys(decodedPayload));
        
        // ใช้ iat + 1 hour เป็น fallback expiration (standard JWT practice)
        if (decodedPayload.iat) {
          const fallbackExpiration = new Date((decodedPayload.iat + 3600) * 1000); // 1 hour from issued time
          console.warn('🔄 [AUTH] Using fallback expiration:', fallbackExpiration.toISOString());
          console.warn('⏰ [AUTH] Current time:', new Date().toISOString());
          console.warn('⏳ [AUTH] Fallback time remaining:', Math.round((fallbackExpiration.getTime() - Date.now()) / 1000 / 60), 'minutes');
          return fallbackExpiration;
        } else {
          console.error('❌ [AUTH] Token has no iat field either - cannot determine expiration');
          return null;
        }
      }

      // Convert Unix timestamp เป็น Date
      const expiration = new Date(decodedPayload.exp * 1000);
      console.log('✅ [AUTH] Token expires at:', expiration.toISOString());
      console.log('⏰ [AUTH] Current time:', new Date().toISOString());
      console.log('⏳ [AUTH] Time remaining:', Math.round((expiration.getTime() - Date.now()) / 1000 / 60), 'minutes');
      
      return expiration;
    } catch (error) {
      console.error('❌ [AUTH] Error parsing token expiration:', error);
      console.error('❌ [AUTH] Token length:', this.accessToken.length);
      console.error('❌ [AUTH] Token preview:', this.accessToken.substring(0, 50) + '...');
      return null;
    }
  }

  /**
   * Manual base64 decode for React Native compatibility
   */
  private base64Decode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    
    for (let i = 0; i < str.length; i += 4) {
      const a = chars.indexOf(str[i]);
      const b = chars.indexOf(str[i + 1]);
      const c = chars.indexOf(str[i + 2]);
      const d = chars.indexOf(str[i + 3]);
      
      const bitmap = (a << 18) | (b << 12) | (c << 6) | d;
      
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (c !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (d !== 64) result += String.fromCharCode(bitmap & 255);
    }
    
    return result;
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
      
      // ถ้า refresh token ใช้ไม่ได้แล้ว ให้ clear tokens และแจ้ง user
      if (error.status === 401 || error.data?.error?.code === 'UNAUTHORIZED') {
        console.log('🔄 Refresh token expired, user needs to login again');
        await this.clearAllTokens();
        
        // TODO: Navigate to login screen หรือแจ้ง user ให้ login ใหม่
        // สำหรับตอนนี้ให้ log ไว้
        console.log('📱 User needs to login again - refresh token expired');
      } else {
        await this.clearAllTokens();
      }
      
      return null;
    }
  }

  /**
   * ดึง access token ปัจจุบัน (จะ refresh อัตโนมัติถ้าหมดอายุ)
   */
  public async getValidAccessToken(): Promise<string | null> {
    console.log('🔍 [AUTH] Checking for valid access token...');
    console.log('🔍 [AUTH] Current memory state:');
    console.log('🔍 [AUTH] - Has accessToken:', !!this.accessToken);
    console.log('🔍 [AUTH] - Has refreshToken:', !!this.refreshToken);
    console.log('🔍 [AUTH] - AccessToken length:', this.accessToken ? this.accessToken.length : 0);

    // ถ้าไม่มี token เลย
    if (!this.accessToken) {
      console.log('❌ [AUTH] No access token available');
      console.log('🔍 [AUTH] Attempting to load from storage...');
      
      try {
        const tokens = await getTokens();
        if (tokens?.accessToken && tokens?.refreshToken) {
          console.log('🔄 [AUTH] Loaded tokens from storage');
          this.accessToken = tokens.accessToken;
          this.refreshToken = tokens.refreshToken;
          console.log('✅ [AUTH] Tokens restored from storage');
          console.log('✅ [AUTH] AccessToken length:', this.accessToken.length);
        } else {
          console.log('❌ [AUTH] No tokens in storage either');
          return null;
        }
      } catch (error) {
        console.error('❌ [AUTH] Failed to load tokens from storage:', error);
        return null;
      }
    }

    // ตรวจสอบว่า token หมดอายุหรือยัง
    console.log('🔍 [AUTH] Checking token expiration...');
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