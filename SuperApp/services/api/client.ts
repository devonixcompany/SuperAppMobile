/**
 * HTTP Client Configuration
 * Centralized API client with automatic token handling
 */

import API_CONFIG from '@/config/api.config';
import type { AuthTokens } from '@/utils/keychain';
import { clearTokens, getTokens, storeTokens } from '@/utils/keychain';

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

export interface ApiRequestOptions extends RequestInit {
  /**
   * Skip attaching Authorization header even if tokens exist
   */
  skipAuth?: boolean;

  /**
   * Disable automatic refresh handling for 401 responses
   */
  retryOnAuthError?: boolean;

  headers?: Record<string, string>;
}

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

const resolveEndpoint = (endpoint: string) => {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

const normalizeEndpoint = (endpoint: string) => {
  const cleaned = endpoint.split('?')[0];
  if (!cleaned.startsWith('/')) {
    return `/${cleaned}`;
  }

  return cleaned;
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

const safeParseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Failed to parse JSON response', error);
    return null;
  }
};

const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens | null> => {
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(resolveEndpoint(API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        const payload = await safeParseResponse(response);

        if (!response.ok) {
          throw {
            message: payload?.message || 'Failed to refresh token',
            status: response.status,
            data: payload,
          } as ApiError;
        }

        const tokens: AuthTokens = {
          accessToken: payload?.data?.accessToken ?? payload?.accessToken,
          refreshToken: payload?.data?.refreshToken ?? payload?.refreshToken,
        };

        if (!tokens.accessToken || !tokens.refreshToken) {
          throw {
            message: 'Invalid token payload received from refresh endpoint',
            status: response.status,
            data: payload,
          } as ApiError;
        }

        await persistTokens(tokens);
        return tokens;
      } catch (error) {
        console.error('Token refresh failed', error);
        await persistTokens(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

const prepareHeaders = (
  baseHeaders: Record<string, string>,
  customHeaders?: Record<string, string>
) => ({
  ...baseHeaders,
  ...(customHeaders || {}),
});

const prepareBody = (body?: any) => {
  const hasFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body === undefined || body === null) {
    return { payload: undefined, isFormData: false };
  }

  if (hasFormData) {
    return { payload: body, isFormData: true };
  }

  if (typeof body === 'string') {
    return { payload: body, isFormData: false };
  }

  // Assume JSON payload for objects
  return { payload: JSON.stringify(body), isFormData: false };
};

const executeRequest = async <T>(
  endpoint: string,
  options: ApiRequestOptions,
  attachAuth: boolean,
  attemptRefresh: boolean,
  isFormData: boolean
): Promise<ApiResponse<T>> => {
  const url = resolveEndpoint(endpoint);
  const defaultHeaders = API_CONFIG.HEADERS.DEFAULT;
  const headers = prepareHeaders(defaultHeaders, options.headers);

  let tokens = attachAuth ? await loadTokens() : null;

  if (attachAuth && tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  if (isFormData && headers['Content-Type']) {
    delete headers['Content-Type'];
  }

  const requestInit: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, requestInit);
  const data = await safeParseResponse(response);

  if (response.status === API_CONFIG.STATUS_CODES.UNAUTHORIZED && attachAuth && attemptRefresh) {
    tokens = await loadTokens();
    const refreshed = await refreshAccessToken(tokens?.refreshToken ?? '');

    if (refreshed?.accessToken) {
      const retryHeaders = prepareHeaders(defaultHeaders, options.headers);
      retryHeaders.Authorization = `Bearer ${refreshed.accessToken}`;

      if (isFormData && retryHeaders['Content-Type']) {
        delete retryHeaders['Content-Type'];
      }

      const retryInit: RequestInit = {
        ...options,
        headers: retryHeaders,
      };

      const retryResponse = await fetch(url, retryInit);
      const retryData = await safeParseResponse(retryResponse);

      if (!retryResponse.ok) {
        throw {
          message: retryData?.message || 'Request failed',
          status: retryResponse.status,
          data: retryData,
        } as ApiError;
      }

      return retryData ?? ({} as ApiResponse<T>);
    }
  }

  if (!response.ok) {
    throw {
      message: data?.message || 'Request failed',
      status: response.status,
      data,
    } as ApiError;
  }

  return data ?? ({} as ApiResponse<T>);
};

/**
 * Base fetch wrapper with automatic token handling
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth, retryOnAuthError = true, body, ...rest } = options;
  const attachAuth = !shouldSkipAuth(endpoint, skipAuth);

  const { payload, isFormData } = prepareBody(body);

  const prepared: ApiRequestOptions = {
    ...rest,
    body: payload,
  };

  try {
    return await executeRequest<T>(endpoint, prepared, attachAuth, retryOnAuthError, isFormData);
  } catch (error: any) {
    if (error?.status) {
      throw error;
    }

    throw {
      message: error?.message || 'Network error occurred',
      status: 0,
    } as ApiError;
  }
}

/**
 * HTTP Methods helpers
 */
export const http = {
  get: <T = any>(endpoint: string, options: ApiRequestOptions = {}) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options: ApiRequestOptions = {}) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, options: ApiRequestOptions = {}) =>
    apiClient<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = any>(endpoint: string, body?: any, options: ApiRequestOptions = {}) =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = any>(endpoint: string, options: ApiRequestOptions = {}) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};

export const authTokens = {
  /**
   * Manually prime the in-memory token cache
   */
  prime: (tokens: AuthTokens | null) => {
    cachedTokens = tokens;
  },
};
