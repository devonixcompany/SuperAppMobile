/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import API_CONFIG from '@/config/api.config';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@/types/models/auth';
import { http } from './client';

export const authService = {
  /**
   * Login with phone number and password
   */
  async login(credentials: LoginRequest) {
    return http.post<LoginResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      credentials,
      { skipAuth: true, retryOnAuthError: false }
    );
  },

  /**
   * Register a new user
   */
  async register(data: RegisterRequest) {
    return http.post<RegisterResponse>(
      API_CONFIG.ENDPOINTS.AUTH.REGISTER,
      data,
      { skipAuth: true, retryOnAuthError: false }
    );
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(data: VerifyOTPRequest) {
    return http.post<VerifyOTPResponse>(
      API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP,
      data,
      { skipAuth: true, retryOnAuthError: false }
    );
  },

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest) {
    return http.post<RefreshTokenResponse>(
      API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
      data,
      { skipAuth: true, retryOnAuthError: false }
    );
  },

  /**
   * Logout user
   */
  async logout() {
    return http.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(phoneNumber: string) {
    return http.post(
      API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { phoneNumber },
      { skipAuth: true, retryOnAuthError: false }
    );
  },

  /**
   * Reset password
   */
  async resetPassword(data: { phoneNumber: string; otp: string; newPassword: string }) {
    return http.post(
      API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
      data,
      { skipAuth: true, retryOnAuthError: false }
    );
  },
};
