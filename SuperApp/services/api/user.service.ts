import { http } from './client';
import type { ApiResponse } from './client';

export interface UserProfile {
  id: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  firebaseUid: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  fullName?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserApiParams {
  accessToken: string;
}

class UserService {
  /**
   * Get user profile
   * @param params - Access token for authentication
   * @returns Promise with user profile data
   */
  async getProfile(params: UserApiParams): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('User Service - Getting profile');
      
      const response = await http.get<UserProfile>(
        '/api/user/profile',
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('User Service - Profile response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Get Profile Error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param data - Profile data to update
   * @param params - Access token for authentication
   * @returns Promise with updated user profile
   */
  async updateProfile(
    data: UpdateUserProfileRequest,
    params: UserApiParams
  ): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('User Service - Updating profile:', data);
      
      const response = await http.put<UserProfile>(
        '/api/user/profile',
        data,
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('User Service - Update profile response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Update Profile Error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param data - Password change data
   * @param params - Access token for authentication
   * @returns Promise with success response
   */
  async changePassword(
    data: ChangePasswordRequest,
    params: UserApiParams
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('User Service - Changing password');
      
      const response = await http.post<{ message: string }>(
        '/api/user/change-password',
        data,
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('User Service - Change password response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Change Password Error:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @param params - Access token for authentication
   * @returns Promise with success response
   */
  async deleteAccount(params: UserApiParams): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('User Service - Deleting account');
      
      const response = await http.delete<{ message: string }>(
        '/api/user/account',
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('User Service - Delete account response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Delete Account Error:', error);
      throw error;
    }
  }

  /**
   * Get user charging history
   * @param params - Access token for authentication
   * @returns Promise with charging history data
   */
  async getChargingHistory(params: UserApiParams): Promise<ApiResponse<any[]>> {
    try {
      console.log('User Service - Getting charging history');
      
      const response = await http.get<any[]>(
        '/api/user/charging-history',
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('User Service - Charging history response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Get Charging History Error:', error);
      throw error;
    }
  }

  /**
   * Get user payment methods
   * @param params - Access token for authentication
   * @returns Promise with payment methods data
   */
  async getPaymentMethods(params: UserApiParams): Promise<ApiResponse<any[]>> {
    try {
      console.log('User Service - Getting payment methods');
      
      const response = await http.get<any[]>(
        '/api/user/payment-methods',
        {
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('User Service - Payment methods response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Get Payment Methods Error:', error);
      throw error;
    }
  }
}

export const userService = new UserService();