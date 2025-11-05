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

class UserService {
  /**
   * ดึงข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน
   * @returns ผลลัพธ์โปรไฟล์จาก API
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('User Service - Getting profile');
      
      const response = await http.get<UserProfile>(
        '/api/user/profile'
      );

      console.log('User Service - Profile response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Get Profile Error:', error);
      throw error;
    }
  }

  /**
   * อัปเดตข้อมูลโปรไฟล์ของผู้ใช้
   * @param data - ข้อมูลที่ต้องการแก้ไข
   * @returns ผลลัพธ์โปรไฟล์ใหม่จาก API
   */
  async updateProfile(
    data: UpdateUserProfileRequest
  ): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('User Service - Updating profile:', data);
      
      const response = await http.put<UserProfile>(
        '/api/user/profile',
        data
      );

      console.log('User Service - Update profile response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Update Profile Error:', error);
      throw error;
    }
  }

  /**
   * เปลี่ยนรหัสผ่านของผู้ใช้
   * @param data - ชุดข้อมูลรหัสผ่านเดิมและใหม่
   * @returns ข้อความแจ้งผลสำเร็จจาก API
   */
  async changePassword(
    data: ChangePasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('User Service - Changing password');
      
      const response = await http.post<{ message: string }>(
        '/api/user/change-password',
        data
      );

      console.log('User Service - Change password response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Change Password Error:', error);
      throw error;
    }
  }

  /**
   * ลบบัญชีผู้ใช้แบบถาวร
   * @returns ข้อความแจ้งผลสำเร็จจาก API
   */
  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('User Service - Deleting account');
      
      const response = await http.delete<{ message: string }>(
        '/api/user/account'
      );

      console.log('User Service - Delete account response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Delete Account Error:', error);
      throw error;
    }
  }

  /**
   * ดึงประวัติการชาร์จของผู้ใช้
   * @returns รายการธุรกรรมการชาร์จ
   */
  async getChargingHistory(): Promise<ApiResponse<any[]>> {
    try {
      console.log('User Service - Getting charging history');
      
      const response = await http.get<any[]>(
        '/api/user/charging-history'
      );

      console.log('User Service - Charging history response:', response);
      return response;
    } catch (error) {
      console.error('User Service - Get Charging History Error:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลวิธีชำระเงินของผู้ใช้
   * @returns รายการวิธีชำระเงินที่ผูกไว้
   */
  async getPaymentMethods(): Promise<ApiResponse<any[]>> {
    try {
      console.log('User Service - Getting payment methods');
      
      const response = await http.get<any[]>(
        '/api/user/payment-methods'
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
