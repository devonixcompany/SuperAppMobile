/**
 * API Hooks
 * ใช้ AuthManager สำหรับ API calls พร้อม automatic token refresh
 */

import { authManager } from '@/services/auth/AuthManager';
import { useCallback, useEffect, useState } from 'react';

interface UseApiOptions {
  immediate?: boolean; // เรียก API ทันทีเมื่อ mount (default: true)
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook สำหรับเรียก API แบบ manual
 */
export function useApi<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (overrideData?: any) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const requestOptions = {
        ...options,
        data: overrideData !== undefined ? overrideData : options.data,
      };
      
      const result = await authManager.apiCall<T>(endpoint, requestOptions);
      
      setState({
        data: result,
        loading: false,
        error: null,
      });
      
      return result;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error('API call failed');
      
      setState({
        data: null,
        loading: false,
        error: apiError,
      });
      
      throw apiError;
    }
  }, [endpoint, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook สำหรับเรียก API แบบ automatic (เรียกทันทีเมื่อ mount)
 */
export function useApiQuery<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
  } & UseApiOptions = {}
) {
  const { immediate = true, onSuccess, onError, ...apiOptions } = options;
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async (overrideData?: any) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const requestOptions = {
        ...apiOptions,
        data: overrideData !== undefined ? overrideData : apiOptions.data,
      };
      
      const result = await authManager.apiCall<T>(endpoint, requestOptions);
      
      setState({
        data: result,
        loading: false,
        error: null,
      });
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error('API call failed');
      
      setState({
        data: null,
        loading: false,
        error: apiError,
      });
      
      onError?.(apiError);
      throw apiError;
    }
  }, [endpoint, apiOptions, onSuccess, onError]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  // เรียก API เมื่อ mount (ถ้า immediate = true)
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    refetch,
    reset,
  };
}

/**
 * Hook สำหรับ GET request
 */
export function useGet<T = any>(
  endpoint: string,
  options: UseApiOptions & { headers?: Record<string, string> } = {}
) {
  return useApiQuery<T>(endpoint, {
    method: 'GET',
    ...options,
  });
}

/**
 * Hook สำหรับ POST request
 */
export function usePost<T = any>(
  endpoint: string,
  options: { headers?: Record<string, string> } = {}
) {
  return useApi<T>(endpoint, {
    method: 'POST',
    ...options,
  });
}

/**
 * Hook สำหรับ PUT request
 */
export function usePut<T = any>(
  endpoint: string,
  options: { headers?: Record<string, string> } = {}
) {
  return useApi<T>(endpoint, {
    method: 'PUT',
    ...options,
  });
}

/**
 * Hook สำหรับ DELETE request
 */
export function useDelete<T = any>(
  endpoint: string,
  options: { headers?: Record<string, string> } = {}
) {
  return useApi<T>(endpoint, {
    method: 'DELETE',
    ...options,
  });
}

/**
 * Hook สำหรับ Charge Points API
 */
export function useChargePoints() {
  return useGet('/api/chargepoints', {
    onSuccess: (data) => {
      console.log('✅ Charge points loaded:', data?.length || 0);
    },
    onError: (error) => {
      console.error('❌ Failed to load charge points:', error);
    },
  });
}

/**
 * Hook สำหรับ User Profile API
 */
export function useUserProfile() {
  return useGet('/api/profile', {
    onSuccess: (data) => {
      console.log('✅ User profile loaded:', data?.user?.phoneNumber);
    },
    onError: (error) => {
      console.error('❌ Failed to load user profile:', error);
    },
  });
}

/**
 * Hook สำหรับ Transactions API
 */
export function useTransactions(userId?: string) {
  const endpoint = userId ? `/api/v1/user/transactions/user/${userId}` : '/api/v1/user/transactions';
  
  return useGet(endpoint, {
    immediate: !!userId, // เรียกเมื่อมี userId เท่านั้น
    onSuccess: (data) => {
      console.log('✅ Transactions loaded:', data?.length || 0);
    },
    onError: (error) => {
      console.error('❌ Failed to load transactions:', error);
    },
  });
}

/**
 * Hook สำหรับสร้าง Transaction
 */
export function useCreateTransaction() {
  return usePost('/api/v1/user/transactions');
}

/**
 * Hook สำหรับ WebSocket URL
 */
export function useWebSocketUrl(chargePointId: string, connectorId: number, userId: string) {
  const endpoint = `/api/v1/user/chargepoints/${chargePointId}/${connectorId}/websocket-url?userId=${userId}`;
  
  return useGet(endpoint, {
    immediate: !!(chargePointId && connectorId && userId),
    onSuccess: (data) => {
      console.log('✅ WebSocket URL loaded:', data?.websocketUrl);
    },
    onError: (error) => {
      console.error('❌ Failed to load WebSocket URL:', error);
    },
  });
}