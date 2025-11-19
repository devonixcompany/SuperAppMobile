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
      VERIFY_PHONE: '/api/v1/user/auth/phone/verify',
      GET_ME: '/api/v1/user/auth/me',
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
      VEHICLES: '/api/v1/user/vehicles',
      NEWS: '/api/v1/user/news',
      TAX_INVOICES: '/api/v1/user/tax-invoices',
    },

    // Chargepoint Management
    CHARGEPOINT: {
      WEBSOCKET_URL: (identity: string, connectorId: number) =>
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/${connectorId}/websocket-url`,
      STATUS: (identity: string, connectorId?: number) =>
        connectorId
          ? `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/connectors/${connectorId}/status`
          : `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/status`,
      START_CHARGING: (identity: string, connectorId: number) =>
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/${connectorId}/start`,
      STOP_CHARGING: (identity: string, connectorId: number) =>
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}/${connectorId}/stop`,
      LIST: '/api/v1/user/chargepoints',
      DETAILS: (identity: string) =>
        `/api/v1/user/chargepoints/${encodeURIComponent(identity)}`,
    },

    // Stations
    STATIONS: {
      LIST: '/api/v1/user/stations',
      NEARBY: '/api/v1/user/stations/nearby',
      DETAILS: (stationId: string) =>
        `/api/v1/user/stations/${encodeURIComponent(stationId)}`,
    },

    // Payment
    PAYMENT: {
      CARDS: '/api/v1/user/payments/cards',
      ADD_CARD: '/api/v1/user/payments/cards',
      REMOVE_CARD: (cardId: string) =>
        `/api/v1/user/payments/cards/${cardId}`,
      SET_DEFAULT_CARD: (cardId: string) =>
        `/api/v1/user/payments/cards/${cardId}/default`,
      PROCESS_PAYMENT: '/api/v1/user/payments/process',
      PAYMENT_HISTORY: '/api/v1/user/payments/history',
      STATUS: (paymentId: string) => `/api/v1/user/payments/status/${encodeURIComponent(paymentId)}`,
    },

    // Charging
    CHARGING: {
      INITIATE: '/api/v1/user/charging/initiate',
      START: '/api/v1/user/charging/start',
      STOP: '/api/v1/user/charging/stop',
      STATUS: '/api/v1/user/charging/status',
      HISTORY: '/api/v1/user/charging/history',
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
      DETAILS: (transactionId: string) =>
        `/api/v1/user/transactions/${encodeURIComponent(transactionId)}`,
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