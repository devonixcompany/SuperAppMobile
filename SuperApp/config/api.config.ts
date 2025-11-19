import env from './env';

/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

export const API_CONFIG = {
  // Base URL
  BASE_URL: env.apiUrl,
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/api/v1/user/auth/login',
      REGISTER: '/api/v1/user/auth/register',
      REFRESH_TOKEN: '/api/v1/user/auth/refresh',
      LOGOUT: '/api/v1/user/auth/logout',
      VERIFY_OTP: '/api/v1/user/auth/verify-otp',
      RESEND_OTP: '/api/v1/user/auth/resend-otp',
      FORGOT_PASSWORD: '/api/v1/user/auth/forgot-password',
      RESET_PASSWORD: '/api/v1/user/auth/reset-password',
    },
    
    // User Management
    USER: {
      PROFILE: '/api/v1/user/profile',
      UPDATE_PROFILE: '/api/v1/user/profile',
      CHANGE_PASSWORD: '/api/v1/user/change-password',
      DELETE_ACCOUNT: '/api/v1/user/account',
      CHARGING_HISTORY: '/api/v1/user/charging-history',
      PAYMENT_METHODS: '/api/v1/user/payment-methods',
    },
    
    // Chargepoint Management
    CHARGEPOINT: {
      WEBSOCKET_URL: (identity: string, connectorId: number) => 
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/${connectorId}/websocket-url`,
      STATUS: (identity: string) => 
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/status`,
      START_CHARGING: (identity: string, connectorId: number) => 
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/${connectorId}/start`,
      STOP_CHARGING: (identity: string, connectorId: number) => 
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/${connectorId}/stop`,
      LIST: '/api/v1/user/chargepoints',
      DETAILS: (identity: string) => 
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}`,
    },
    
    // Payment
    PAYMENT: {
      CARDS: '/api/v1/user/payment/cards',
      ADD_CARD: '/api/v1/user/payment/cards',
      REMOVE_CARD: (cardId: string) => 
        `/api/v1/user/payment/cards/${cardId}`,
      SET_DEFAULT_CARD: (cardId: string) =>
        `/api/v1/user/payment/cards/${cardId}/default`,
      PROCESS_PAYMENT: '/api/v1/user/payment/process',
      PAYMENT_HISTORY: '/api/v1/user/payment/history',
      STATUS: (paymentId: string) => `/api/v1/user/payment/status/${encodeURIComponent(paymentId)}`,
    },
    
    // Notifications
    NOTIFICATIONS: {
      LIST: '/api/v1/user/notifications',
      MARK_READ: (notificationId: string) => 
        `/api/v1/user/notifications/${notificationId}/read`,
      MARK_ALL_READ: '/api/v1/user/notifications/read-all',
      SETTINGS: '/api/v1/user/notifications/settings',
    },
    
    // Transactions
    TRANSACTIONS: {
      CREATE: '/api/v1/user/transactions',
      SUMMARY: (transactionId: string) => 
        `/api/v1/user/transactions/${encodeURIComponent(transactionId)}/summary`,
      LIST: '/api/v1/user/transactions',
      USER_TRANSACTIONS: (userId: string) => 
        `/api/v1/user/transactions/user/${encodeURIComponent(userId)}`,
    },
  },
  
  // Request Configuration
  REQUEST: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
  
  // Headers
  HEADERS: {
    DEFAULT: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    WITH_AUTH: (token: string) => ({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    }),
  },
  
  // Response Status Codes
  STATUS_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    TIMEOUT_ERROR: 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง',
    UNAUTHORIZED: 'กรุณาเข้าสู่ระบบใหม่',
    FORBIDDEN: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
    NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
    SERVER_ERROR: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
    UNKNOWN_ERROR: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง',
  },
} as const;

export default API_CONFIG;
