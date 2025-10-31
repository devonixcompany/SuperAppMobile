/**
 * Authentication Types
 */

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface RegisterResponse {
  user: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  firebaseUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VerifyOTPRequest {
  phoneNumber: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}
