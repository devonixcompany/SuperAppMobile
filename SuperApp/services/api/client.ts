/**
 * โมดูล client สำหรับเรียก API ด้วย axios
 * ดูแลการแนบ access token และรีเฟรช token ให้อัตโนมัติ
 */

import API_CONFIG from '@/config/api.config';
import type { AuthTokens } from '@/utils/keychain';
import { clearTokens, getTokens, storeTokens } from '@/utils/keychain';
import axios, {
    AxiosError,
    AxiosHeaders,
    AxiosRequestConfig,
} from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

export interface ApiRequestConfig<T = any>
  extends AxiosRequestConfig<T> {
  /**
   * ระบุให้ข้ามการแนบ Authorization header
   */
  skipAuth?: boolean;
  /**
   * ระบุว่าให้ลองรีเฟรช token เมื่อเจอ 401 หรือไม่ (ค่าเริ่มต้น: true)
   */
  retryOnAuthError?: boolean;
  /**
   * ธงภายในเพื่อป้องกันการวนรีเฟรชซ้ำ
   */
  _retry?: boolean;
}

// เก็บชุด endpoint ที่ไม่ต้องแนบ token
const PUBLIC_ENDPOINTS = new Set([
  API_CONFIG.ENDPOINTS.AUTH.LOGIN,
  API_CONFIG.ENDPOINTS.AUTH.REGISTER,
  API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
  API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP,
  API_CONFIG.ENDPOINTS.AUTH.RESEND_OTP,
  API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
  API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
]);

let cachedTokens: AuthTokens | null = null;
let refreshPromise: Promise<AuthTokens | null> | null = null;

// สร้าง axios instance กลางสำหรับเรียก API หลัก
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.REQUEST.TIMEOUT,
  headers: {
    ...API_CONFIG.HEADERS.DEFAULT,
  },
});

// สร้าง instance แยกสำหรับเรียก refresh token เพื่อเลี่ยง interceptor
const refreshClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.REQUEST.TIMEOUT,
  headers: {
    ...API_CONFIG.HEADERS.DEFAULT,
  },
});

const normalizeEndpoint = (endpoint: string) => {
  if (!endpoint) {
    return '/';
  }

  const [rawPath] = endpoint.split('?');

  if (/^https?:\/\//i.test(rawPath)) {
    try {
      const { pathname } = new URL(rawPath);
      if (!pathname) {
        return '/';
      }
      return pathname.startsWith('/') ? pathname : `/${pathname}`;
    } catch {
      return '/';
    }
  }

  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
};

const shouldSkipAuth = (endpoint: string, skipAuth?: boolean) => {
  if (typeof skipAuth === 'boolean') {
    return skipAuth;
  }

  return PUBLIC_ENDPOINTS.has(normalizeEndpoint(endpoint));
};

const loadTokens = async () => {
  if (cachedTokens) {
    return cachedTokens;
  }

  cachedTokens = await getTokens();
  return cachedTokens;
};

const persistTokens = async (tokens: AuthTokens | null) => {
  if (tokens) {
    cachedTokens = tokens;
    await storeTokens(tokens);
  } else {
    cachedTokens = null;
    await clearTokens();
  }
};

const ensureHeadersObject = (config: ApiRequestConfig) => {
  if (!config.headers) {
    config.headers = {};
  }

  if (config.headers instanceof AxiosHeaders) {
    const plainHeaders = config.headers.toJSON();
    config.headers = { ...plainHeaders };
  }

  return config.headers as Record<string, string>;
};

const isFormDataPayload = (payload: unknown) =>
  typeof FormData !== 'undefined' && payload instanceof FormData;

const refreshAccessToken = async (refreshToken: string) => {
  if (!refreshToken) {
    console.log('❌ [HTTP] No refresh token available');
    return null;
  }

  if (!refreshPromise) {
    console.log('🔄 [HTTP] Starting token refresh process...');
    refreshPromise = (async () => {
      try {
        const response = await refreshClient.post<ApiResponse<AuthTokens>>(
          API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
          { refreshToken }
        );

        console.log('📡 [HTTP] Refresh token response:', {
          status: response.status,
          success: response.data?.success
        });

        const payload = response.data;
        const tokens: AuthTokens = {
          accessToken: payload?.data?.accessToken ?? (payload as any)?.accessToken,
          refreshToken: payload?.data?.refreshToken ?? (payload as any)?.refreshToken ?? refreshToken,
        };

        if (!tokens.accessToken || !tokens.refreshToken) {
          throw new Error('Invalid token payload received');
        }

        // ตรวจสอบ token ใหม่
        try {
          const newPayload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
          const expTime = new Date(newPayload.exp * 1000);
          console.log('✅ [HTTP] New token received:', {
            expTime: expTime.toLocaleTimeString(),
            userId: newPayload.userId
          });
        } catch (error) {
          console.log('⚠️ [HTTP] Could not decode new token:', error);
        }

        await persistTokens(tokens);
        return tokens;
      } catch (error) {
        console.error('❌ [HTTP] Token refresh failed:', error);
        await persistTokens(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

const normalizeApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as ApiResponse | undefined;
    const messageFromResponse =
      (responseData?.message && typeof responseData.message === 'string'
        ? responseData.message
        : undefined) ||
      (responseData?.error && typeof responseData.error === 'string'
        ? responseData.error
        : undefined);

    return {
      message: messageFromResponse || error.message || 'เกิดข้อผิดพลาดจากการเชื่อมต่อ',
      status: error.response?.status,
      data: responseData,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 0,
    };
  }

  return {
    message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    status: 0,
    data: error,
  };
};

// Interceptor ก่อนส่งคำขอเพื่อแนบ token
api.interceptors.request.use(async (config) => {
  const requestConfig = config as ApiRequestConfig;
  requestConfig.skipAuth = shouldSkipAuth(requestConfig.url ?? '', requestConfig.skipAuth);

  console.log(`📡 [HTTP] Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);

  const headers = ensureHeadersObject(requestConfig);

  if (!headers.Accept) {
    headers.Accept = API_CONFIG.HEADERS.DEFAULT.Accept;
  }

  if (isFormDataPayload(requestConfig.data)) {
    if (headers['Content-Type']) {
      delete headers['Content-Type'];
    }
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = API_CONFIG.HEADERS.DEFAULT['Content-Type'];
  }

  if (!requestConfig.skipAuth) {
    const tokens = await loadTokens();
    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
      
      // ตรวจสอบ token expiration
      try {
        const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const timeLeft = payload.exp - currentTime;
        
        console.log(`🎫 [HTTP] Using token:`, {
          tokenLength: tokens.accessToken.length,
          tokenPreview: `${tokens.accessToken.substring(0, 20)}...`,
          expTime: new Date(payload.exp * 1000).toLocaleTimeString(),
          timeLeft: timeLeft > 0 ? `${timeLeft} seconds` : 'EXPIRED'
        });
      } catch (error) {
        console.log('❌ [HTTP] Error checking token expiration:', error);
      }
    } else {
      console.log('❌ [HTTP] No access token available');
    }
  } else {
    console.log('🌐 [HTTP] Public endpoint, skipping auth');
  }

  if (typeof requestConfig.retryOnAuthError === 'undefined') {
    requestConfig.retryOnAuthError = true;
  }

  return requestConfig;
});

// Interceptor หลังรับคำตอบเพื่อจัดการ 401 และโยน error ที่เหมาะสม
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [HTTP] Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const requestConfig = (error.config || {}) as ApiRequestConfig;
    const status = error.response?.status;

    console.log(`❌ [HTTP] Error: ${status} ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);

    const shouldAttemptRefresh =
      status === API_CONFIG.STATUS_CODES.UNAUTHORIZED &&
      !requestConfig.skipAuth &&
      requestConfig.retryOnAuthError !== false &&
      !requestConfig._retry;

    if (shouldAttemptRefresh) {
      console.log('🔄 [HTTP] 401 Unauthorized, attempting token refresh...');
      requestConfig._retry = true;

      try {
        const tokens = await loadTokens();
        console.log('🔍 [HTTP] Current tokens:', {
          hasAccessToken: !!tokens?.accessToken,
          hasRefreshToken: !!tokens?.refreshToken
        });

        const refreshed = await refreshAccessToken(tokens?.refreshToken ?? '');

        if (refreshed?.accessToken) {
          console.log('✅ [HTTP] Token refreshed successfully, retrying request');
          const headers = ensureHeadersObject(requestConfig);
          headers.Authorization = `Bearer ${refreshed.accessToken}`;
          return api(requestConfig);
        } else {
          console.log('❌ [HTTP] Token refresh failed');
        }
      } catch (refreshError) {
        console.error('❌ [HTTP] Error during token refresh:', refreshError);
      }

      await persistTokens(null);
      console.log('🗑️ [HTTP] Tokens cleared due to refresh failure');
    }

    return Promise.reject(error);
  }
);

// ฟังก์ชันเรียก API หลักที่แปลงเป็น ApiResponse<T>
export async function apiClient<T = any>(
  endpoint: string,
  config: ApiRequestConfig = {}
): Promise<ApiResponse<T>> {
  const finalConfig: ApiRequestConfig = {
    ...config,
    url: endpoint,
  };

  if (typeof finalConfig.retryOnAuthError === 'undefined') {
    finalConfig.retryOnAuthError = true;
  }

  try {
    const response = await api.request<ApiResponse<T>>(finalConfig);
    return response.data ?? ({} as ApiResponse<T>);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// helper สำหรับ method ยอดนิยม
export const http = {
  get: <T = any>(endpoint: string, config: ApiRequestConfig = {}) =>
    apiClient<T>(endpoint, { ...config, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, config: ApiRequestConfig = {}) =>
    apiClient<T>(endpoint, { ...config, method: 'POST', data }),

  put: <T = any>(endpoint: string, data?: any, config: ApiRequestConfig = {}) =>
    apiClient<T>(endpoint, { ...config, method: 'PUT', data }),

  patch: <T = any>(endpoint: string, data?: any, config: ApiRequestConfig = {}) =>
    apiClient<T>(endpoint, { ...config, method: 'PATCH', data }),

  delete: <T = any>(endpoint: string, config: ApiRequestConfig = {}) =>
    apiClient<T>(endpoint, { ...config, method: 'DELETE' }),
};

export const authTokens = {
  // ใช้ prime เพื่อเก็บ token ในหน่วยความจำล่วงหน้า
  prime: (tokens: AuthTokens | null) => {
    cachedTokens = tokens;
  },
};
