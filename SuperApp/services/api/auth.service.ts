/**
 * Authentication Service
 * Handles all auth-related API calls
 */

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
    return http.post<LoginResponse>('/api/auth/login', credentials);
  },

  /**
   * Register a new user
   */
  async register(data: RegisterRequest) {
    return http.post<RegisterResponse>('/api/auth/register', data);
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(data: VerifyOTPRequest) {
    return http.post<VerifyOTPResponse>('/api/auth/verify-otp', data);
  },

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest) {
    return http.post<RefreshTokenResponse>('/api/auth/refresh-token', data);
  },

  /**
   * Logout user
   */
  async logout() {
    return http.post('/api/auth/logout');
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(phoneNumber: string) {
    return http.post('/api/auth/request-password-reset', { phoneNumber });
  },

  /**
   * Reset password
   */
  async resetPassword(data: { phoneNumber: string; otp: string; newPassword: string }) {
    return http.post('/api/auth/reset-password', data);
  },
};
