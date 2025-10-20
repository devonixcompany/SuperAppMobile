// API Service Layer for AdminMookup
// ชั้นบริการ API สำหรับเชื่อมต่อกับ Backend

const API_BASE_URL = 'http://localhost:8080/api';

export interface ChargePoint {
  id: string;
  name: string;
  stationName: string;
  location: string;
  serialNumber: string;
  chargePointIdentity: string;
  protocol: string;
  brand: string;
  powerRating: number;
  connectorCount: number;
  status: string;
  isWhitelisted: boolean;
  isPublic: boolean;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  lastHeartbeat?: string;
  pricing?: {
    pricePerKwh: number;
    currency: string;
  };
  timePeriods?: Array<{
    startTime: string;
    endTime: string;
    pricePerKwh: number;
  }>;
}

export interface CreateChargePointRequest {
  id?: string; // Optional since it's auto-generated
  name: string;
  stationName: string;
  location: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  is24Hours: boolean;
  brand: string;
  serialNumber: string;
  powerRating: number;
  protocol: string;
  chargePointIdentity: string;
  connectorCount?: number;
  ownerId: string;
  ownershipType: string;
  isPublic: boolean;
  baseRate: number;
  peakRate: number;
  offPeakRate: number;
  peakStartTime: string;
  peakEndTime: string;
  offPeakStartTime: string;
  offPeakEndTime: string;
  maxPower: number;
  isWhitelisted?: boolean;
}

export interface UpdateChargePointRequest {
  name?: string;
  location?: string;
  protocol?: string;
  status?: string;
  pricing?: {
    pricePerKwh: number;
    currency: string;
  };
  timePeriods?: Array<{
    startTime: string;
    endTime: string;
    pricePerKwh: number;
  }>;
  isPublic?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // 🔌 Charge Point Management APIs
  // API สำหรับจัดการเครื่องชาร์จ

  /**
   * เพิ่มเครื่องชาร์จใหม่เข้าสู่ระบบ
   * Add new charge point to the system
   */
  async createChargePoint(data: CreateChargePointRequest): Promise<ApiResponse<ChargePoint>> {
    return this.request<ChargePoint>('/chargepoints/admin/charge-points', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * ดึงรายการเครื่องชาร์จทั้งหมด (พร้อม pagination)
   * Get all charge points with pagination
   */
  async getChargePoints(params?: {
    page?: number;
    limit?: number;
    status?: string;
    protocol?: string;
    ownerId?: string;
    isPublic?: boolean;
  }): Promise<PaginatedResponse<ChargePoint>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/chargepoints${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.request<any>(endpoint);
    
    // Transform the response to match PaginatedResponse interface
    // Backend returns: { success: true, data: { data: [...], pagination: {...} } }
    const responseData = response.data || {};
    
    return {
      success: response.success,
      data: responseData.data || [],
      pagination: responseData.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    };
  }

  /**
   * ดึงข้อมูลเครื่องชาร์จตาม ID
   * Get charge point by ID
   */
  async getChargePointById(id: string): Promise<ApiResponse<ChargePoint>> {
    return this.request<ChargePoint>(`/chargepoints/${id}`);
  }

  /**
   * อัปเดตข้อมูลเครื่องชาร์จ
   * Update charge point data
   */
  async updateChargePoint(id: string, data: UpdateChargePointRequest): Promise<ApiResponse<ChargePoint>> {
    return this.request<ChargePoint>(`/chargepoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * ลบเครื่องชาร์จ (logical delete - เปลี่ยนสถานะเป็น UNAVAILABLE)
   * Delete charge point (logical delete - change status to UNAVAILABLE)
   */
  async deleteChargePoint(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/chargepoints/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * ดึงรายการเครื่องชาร์จสำหรับ WebSocket Gateway
   * Get charge points for WebSocket Gateway
   */
  async getChargePointsForGateway(): Promise<ApiResponse<Array<{
    serialId: string;
    wsUrl: string;
  }>>> {
    return this.request('/chargepoints/ws-gateway/chargepoints');
  }

  // 📊 Statistics and Monitoring APIs
  // API สำหรับสถิติและการติดตาม

  /**
   * ดึงสถิติเครื่องชาร์จ
   * Get charge point statistics
   */
  async getChargePointStats(): Promise<ApiResponse<{
    total: number;
    available: number;
    occupied: number;
    unavailable: number;
    faulted: number;
    whitelisted: number;
    protocols: Record<string, number>;
  }>> {
    // This would need to be implemented in the backend
    return this.request('/chargepoints/stats');
  }

  // 🔍 Search and Filter Utilities
  // ยูทิลิตี้สำหรับค้นหาและกรอง

  /**
   * ค้นหาเครื่องชาร์จตามคำค้นหา
   * Search charge points by query
   */
  async searchChargePoints(query: string, filters?: {
    status?: string;
    protocol?: string;
    location?: string;
  }): Promise<ApiResponse<ChargePoint[]>> {
    const searchParams = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          searchParams.append(key, value);
        }
      });
    }

    return this.request<ChargePoint[]>(`/chargepoints/search?${searchParams.toString()}`);
  }
}

// Export singleton instance
// ส่งออก instance เดียว
export const apiService = new ApiService();

// Export utility functions
// ส่งออกฟังก์ชันยูทิลิตี้

/**
 * แปลงสถานะเป็นภาษาไทย
 * Convert status to Thai
 */
export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'AVAILABLE': 'พร้อมใช้งาน',
    'OCCUPIED': 'กำลังใช้งาน',
    'UNAVAILABLE': 'ไม่พร้อมใช้งาน',
    'FAULTED': 'เสียหาย',
    'PREPARING': 'กำลังเตรียม',
    'CHARGING': 'กำลังชาร์จ',
    'SUSPENDED_EVSE': 'หยุดชั่วคราว (EVSE)',
    'SUSPENDED_EV': 'หยุดชั่วคราว (EV)',
    'FINISHING': 'กำลังจบการชาร์จ'
  };
  return statusMap[status] || status;
};

/**
 * แปลง Protocol เป็นชื่อที่อ่านง่าย
 * Convert protocol to readable name
 */
export const getProtocolLabel = (protocol: string): string => {
  const protocolMap: Record<string, string> = {
    'OCPP16': 'OCPP 1.6',
    'OCPP20': 'OCPP 2.0',
    'OCPP21': 'OCPP 2.1'
  };
  return protocolMap[protocol] || protocol;
};

/**
 * แปลงสีสถานะ
 * Get status color
 */
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'AVAILABLE': 'text-green-600 bg-green-100',
    'OCCUPIED': 'text-blue-600 bg-blue-100',
    'UNAVAILABLE': 'text-gray-600 bg-gray-100',
    'FAULTED': 'text-red-600 bg-red-100',
    'PREPARING': 'text-yellow-600 bg-yellow-100',
    'CHARGING': 'text-blue-600 bg-blue-100',
    'SUSPENDED_EVSE': 'text-orange-600 bg-orange-100',
    'SUSPENDED_EV': 'text-orange-600 bg-orange-100',
    'FINISHING': 'text-purple-600 bg-purple-100'
  };
  return colorMap[status] || 'text-gray-600 bg-gray-100';
};

/**
 * ฟอร์แมตวันที่เป็นภาษาไทย
 * Format date to Thai locale
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * คำนวณเวลาที่ผ่านมาตั้งแต่ heartbeat ล่าสุด
 * Calculate time since last heartbeat
 */
export const getTimeSinceLastHeartbeat = (lastHeartbeat?: string): string => {
  if (!lastHeartbeat) return 'ไม่เคยเชื่อมต่อ';
  
  const now = new Date();
  const last = new Date(lastHeartbeat);
  const diffMs = now.getTime() - last.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'เพิ่งเชื่อมต่อ';
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} วันที่แล้ว`;
};