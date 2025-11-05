/**
 * Authentication Context
 * จัดการสถานะการเข้าสู่ระบบทั้งแอป
 * ใช้ AuthManager เป็น core และ expose ผ่าน React Context
 */

import { authManager, type LoginCredentials, type LoginResponse } from '@/services/auth/AuthManager';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  phoneNumber: string;
  fullName?: string;
  typeUser: string;
  status: string;
  createdAt: string;
}

interface AuthContextType {
  // สถานะ
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  
  // ข้อมูล token
  tokenInfo: {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    isExpired: boolean;
    expiration: Date | null;
  };
  
  // ฟังก์ชัน
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tokenInfo, setTokenInfo] = useState({
    hasAccessToken: false,
    hasRefreshToken: false,
    isExpired: true,
    expiration: null as Date | null,
  });

  /**
   * อัปเดตสถานะ authentication
   */
  const updateAuthState = () => {
    const loggedIn = authManager.isLoggedIn();
    const authenticated = authManager.isAuthenticated();
    const info = authManager.getTokenInfo();
    const userFromToken = authManager.getUserFromToken();

    setIsLoggedIn(loggedIn);
    setIsAuthenticated(authenticated);
    setTokenInfo({
      hasAccessToken: info.hasAccessToken,
      hasRefreshToken: info.hasRefreshToken,
      isExpired: info.isExpired,
      expiration: info.expiration,
    });

    // ถ้ามี token ให้ดึงข้อมูล user จาก token
    if (userFromToken) {
      setUser({
        id: userFromToken.userId,
        phoneNumber: userFromToken.phoneNumber,
        fullName: '', // จะต้องดึงจาก API หรือ storage
        typeUser: userFromToken.typeUser,
        status: 'ACTIVE', // สมมติ
        createdAt: new Date(userFromToken.iat * 1000).toISOString(),
      });
    } else {
      setUser(null);
    }

    console.log('🔄 Auth state updated:', {
      loggedIn,
      authenticated,
      hasToken: info.hasAccessToken,
      isExpired: info.isExpired,
      expiration: info.expiration,
    });
  };

  /**
   * ตรวจสอบสถานะการเข้าสู่ระบบเมื่อเริ่มแอป
   */
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Checking authentication status...');
      
      // รอให้ AuthManager โหลด tokens จาก storage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      updateAuthState();
      
      // ถ้ามี token แต่หมดอายุ ให้ลอง refresh
      if (authManager.isLoggedIn() && authManager.isAccessTokenExpired()) {
        console.log('⏰ Token expired, attempting refresh...');
        const newToken = await authManager.refreshAccessToken();
        
        if (newToken) {
          console.log('✅ Token refreshed successfully');
          updateAuthState();
        } else {
          console.log('❌ Token refresh failed, user needs to login again');
          await authManager.logout();
          updateAuthState();
        }
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      // ถ้าเกิดข้อผิดพลาด ให้ logout
      await authManager.logout();
      updateAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * เข้าสู่ระบบ
   */
  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      console.log('🔐 Logging in...');
      const response = await authManager.login(credentials);
      
      // อัปเดต user state
      setUser(response.user);
      updateAuthState();
      
      console.log('✅ Login successful');
      return response;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  /**
   * ออกจากระบบ
   */
  const logout = async (): Promise<void> => {
    try {
      console.log('👋 Logging out...');
      await authManager.logout();
      
      // ล้างสถานะ
      setUser(null);
      updateAuthState();
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // ล้างสถานะแม้ logout ล้มเหลว
      setUser(null);
      updateAuthState();
    }
  };

  /**
   * รีเฟรช token
   */
  const refreshToken = async (): Promise<string | null> => {
    try {
      console.log('🔄 Refreshing token...');
      const newToken = await authManager.refreshAccessToken();
      
      if (newToken) {
        updateAuthState();
        console.log('✅ Token refreshed');
      } else {
        console.log('❌ Token refresh failed');
        await logout();
      }
      
      return newToken;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      await logout();
      return null;
    }
  };

  // ตรวจสอบสถานะเมื่อเริ่มแอป
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // ตั้ง interval เพื่อตรวจสอบ token expiration
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      const info = authManager.getTokenInfo();
      
      // ถ้า token จะหมดอายุใน 5 นาที ให้ refresh
      if (info.hasAccessToken && info.expiration) {
        const timeUntilExpiry = info.expiration.getTime() - Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0) {
          console.log('⏰ Token will expire soon, refreshing...');
          refreshToken();
        }
      }
    }, 60000); // ตรวจสอบทุกนาที

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const contextValue: AuthContextType = {
    // สถานะ
    isLoggedIn,
    isAuthenticated,
    isLoading,
    user,
    tokenInfo,
    
    // ฟังก์ชัน
    login,
    logout,
    refreshToken,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook สำหรับใช้ AuthContext
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook สำหรับตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
 */
export const useAuthStatus = () => {
  const { isLoggedIn, isAuthenticated, isLoading } = useAuth();
  return { isLoggedIn, isAuthenticated, isLoading };
};

/**
 * Hook สำหรับดึงข้อมูลผู้ใช้
 */
export const useUser = () => {
  const { user, isAuthenticated } = useAuth();
  return { user, isAuthenticated };
};