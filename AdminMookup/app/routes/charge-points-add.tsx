import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Navigation } from '../components/Navigation';
import { apiService, type CreateChargePointRequest } from '../services/api';

interface FormErrors {
  id?: string;
  name?: string;
  stationName?: string;
  location?: string;
  latitude?: string;
  longitude?: string;
  openingHours?: string;
  brand?: string;
  serialNumber?: string;
  powerRating?: string;
  chargePointIdentity?: string;
  protocol?: string;
  connectorCount?: string;
  ownerId?: string;
  ownershipType?: string;
  baseRate?: string;
  peakRate?: string;
  offPeakRate?: string;
  peakStartTime?: string;
  peakEndTime?: string;
  offPeakStartTime?: string;
  offPeakEndTime?: string;
  maxPower?: string;
  general?: string;
}

export function meta() {
  return [
    { title: 'เพิ่มเครื่องชาร์จใหม่ - Admin Mookup' },
    { name: 'description', content: 'เพิ่มเครื่องชาร์จใหม่เข้าสู่ระบบ' }
  ];
}

export default function AddChargePoint() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formData, setFormData] = useState<CreateChargePointRequest>({
    name: '',
    stationName: '',
    location: '',
    latitude: 0,
    longitude: 0,
    openingHours: '06:00-22:00',
    is24Hours: false,
    brand: '',
    serialNumber: '',
    powerRating: 0,
    protocol: 'OCPP16',
    chargePointIdentity: '',
    connectorCount: 1,
    ownerId: 'user_123',
    ownershipType: 'PUBLIC',
    isPublic: true,
    baseRate: 0,
    peakRate: 0,
    offPeakRate: 0,
    peakStartTime: '09:00',
    peakEndTime: '17:00',
    offPeakStartTime: '22:00',
    offPeakEndTime: '06:00',
    maxPower: 0,
    isWhitelisted: false
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Basic Information
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อเครื่องชาร์จ';
    } else if (formData.name.length < 3) {
      newErrors.name = 'ชื่อเครื่องชาร์จต้องมีอย่างน้อย 3 ตัวอักษร';
    }

    if (!formData.stationName.trim()) {
      newErrors.stationName = 'กรุณากรอกชื่อสถานี';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'กรุณากรอกที่อยู่';
    } else if (formData.location.length < 10) {
      newErrors.location = 'ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร';
    }

    // Coordinates validation
    if (formData.latitude < -90 || formData.latitude > 90) {
      newErrors.latitude = 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90';
    }

    if (formData.longitude < -180 || formData.longitude > 180) {
      newErrors.longitude = 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180';
    }

    // Opening hours validation
    if (!formData.is24Hours && !formData.openingHours.trim()) {
      newErrors.openingHours = 'กรุณากรอกเวลาเปิด-ปิด';
    } else if (!formData.is24Hours && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(formData.openingHours)) {
      newErrors.openingHours = 'รูปแบบเวลาไม่ถูกต้อง (เช่น 06:00-22:00)';
    }

    // Technical specifications
    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = 'กรุณากรอกหมายเลขซีเรียล';
    }

    if (!formData.chargePointIdentity.trim()) {
      newErrors.chargePointIdentity = 'กรุณากรอก Charge Point Identity';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'กรุณากรอกยี่ห้อ';
    }

    if (formData.powerRating <= 0) {
      newErrors.powerRating = 'กำลังไฟต้องมากกว่า 0';
    } else if (formData.powerRating > 1000) {
      newErrors.powerRating = 'กำลังไฟต้องไม่เกิน 1000 kW';
    }

    if (formData.maxPower <= 0) {
      newErrors.maxPower = 'กำลังไฟสูงสุดต้องมากกว่า 0';
    } else if (formData.maxPower > 1000) {
      newErrors.maxPower = 'กำลังไฟสูงสุดต้องไม่เกิน 1000 kW';
    }

    if (formData.connectorCount && formData.connectorCount < 1) {
      newErrors.connectorCount = 'จำนวนหัวชาร์จต้องอย่างน้อย 1';
    } else if (formData.connectorCount && formData.connectorCount > 10) {
      newErrors.connectorCount = 'จำนวนหัวชาร์จต้องไม่เกิน 10';
    }

    // Ownership validation
    if (!formData.ownerId.trim()) {
      newErrors.ownerId = 'กรุณากรอก Owner ID';
    }

    if (!formData.ownershipType.trim()) {
      newErrors.ownershipType = 'กรุณาเลือกประเภทความเป็นเจ้าของ';
    }

    // Pricing validation
    if (formData.baseRate < 0) {
      newErrors.baseRate = 'ราคาพื้นฐานต้องไม่ติดลบ';
    }

    if (formData.peakRate < 0) {
      newErrors.peakRate = 'ราคาช่วงเวลาเร่งด่วนต้องไม่ติดลบ';
    }

    if (formData.offPeakRate < 0) {
      newErrors.offPeakRate = 'ราคาช่วงเวลาปกติต้องไม่ติดลบ';
    }

    // Time validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.peakStartTime)) {
      newErrors.peakStartTime = 'รูปแบบเวลาไม่ถูกต้อง (เช่น 09:00)';
    }

    if (!timeRegex.test(formData.peakEndTime)) {
      newErrors.peakEndTime = 'รูปแบบเวลาไม่ถูกต้อง (เช่น 17:00)';
    }

    if (!timeRegex.test(formData.offPeakStartTime)) {
      newErrors.offPeakStartTime = 'รูปแบบเวลาไม่ถูกต้อง (เช่น 22:00)';
    }

    if (!timeRegex.test(formData.offPeakEndTime)) {
      newErrors.offPeakEndTime = 'รูปแบบเวลาไม่ถูกต้อง (เช่น 06:00)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const response = await apiService.createChargePoint(formData);
      
      if (response.success) {
        setSuccessMessage('เพิ่มเครื่องชาร์จสำเร็จ! กำลังเปลี่ยนหน้า...');
        setTimeout(() => {
          navigate('/charge-points');
        }, 1500);
      } else {
        setErrors({ general: response.message || 'ไม่สามารถเพิ่มเครื่องชาร์จได้' });
      }
    } catch (error: any) {
      console.error('Error creating charge point:', error);
      
      // Handle different types of errors
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message?.includes('Serial Number')) {
          setErrors({ serialNumber: 'Serial Number นี้มีอยู่ในระบบแล้ว' });
        } else if (errorData.message?.includes('Charge Point Identity')) {
          setErrors({ chargePointIdentity: 'Charge Point Identity นี้มีอยู่ในระบบแล้ว' });
        } else {
          setErrors({ general: errorData.message || 'ข้อมูลไม่ถูกต้อง' });
        }
      } else if (error.response?.status === 500) {
        setErrors({ general: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' });
      } else {
        setErrors({ general: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/charge-points"
              className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">เพิ่มเครื่องชาร์จใหม่</h1>
          </div>
          <p className="text-gray-600">กรอกข้อมูลเครื่องชาร์จใหม่เพื่อเพิ่มเข้าสู่ระบบ</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* General Error Message */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 font-medium">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ID field is now hidden since it's auto-generated */}
            
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อเครื่องชาร์จ *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="เช่น Central World Charging Station"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="stationName" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อสถานี *
              </label>
              <input
                type="text"
                id="stationName"
                name="stationName"
                required
                value={formData.stationName}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.stationName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="เช่น Central World Station"
              />
              {errors.stationName && <p className="mt-1 text-sm text-red-600">{errors.stationName}</p>}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                ที่ตั้ง *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="เช่น กรุงเทพมหานคร, ประเทศไทย"
              />
              {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
            </div>

            {/* Coordinates Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-2">
                  ละติจูด (Latitude) *
                </label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  required
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.latitude ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="เช่น 13.7563"
                />
                {errors.latitude && <p className="mt-1 text-sm text-red-600">{errors.latitude}</p>}
              </div>

              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-2">
                  ลองจิจูด (Longitude) *
                </label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  required
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.longitude ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="เช่น 100.5018"
                />
                {errors.longitude && <p className="mt-1 text-sm text-red-600">{errors.longitude}</p>}
              </div>
            </div>

            {/* Opening Hours Section */}
            <div>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="is24Hours"
                  name="is24Hours"
                  checked={formData.is24Hours}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is24Hours" className="ml-3 block text-sm font-medium text-gray-700">
                  เปิดบริการ 24 ชั่วโมง
                </label>
              </div>

              {!formData.is24Hours && (
                <div>
                  <label htmlFor="openingHours" className="block text-sm font-medium text-gray-700 mb-2">
                    เวลาเปิด-ปิด *
                  </label>
                  <input
                    type="text"
                    id="openingHours"
                    name="openingHours"
                    required={!formData.is24Hours}
                    value={formData.openingHours}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.openingHours ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="เช่น 06:00-22:00"
                  />
                  {errors.openingHours && <p className="mt-1 text-sm text-red-600">{errors.openingHours}</p>}
                </div>
              )}
            </div>

            {/* Serial Number */}
            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number *
              </label>
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                required
                value={formData.serialNumber}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.serialNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="เช่น SN-AUTEL-23-001234"
              />
              {errors.serialNumber && <p className="mt-1 text-sm text-red-600">{errors.serialNumber}</p>}
            </div>

            {/* Charge Point Identity */}
            <div>
              <label htmlFor="chargePointIdentity" className="block text-sm font-medium text-gray-700 mb-2">
                Charge Point Identity *
              </label>
              <input
                type="text"
                id="chargePointIdentity"
                name="chargePointIdentity"
                required
                value={formData.chargePointIdentity}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.chargePointIdentity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="เช่น EVBANGNA-CP001"
              />
              {errors.chargePointIdentity && <p className="mt-1 text-sm text-red-600">{errors.chargePointIdentity}</p>}
            </div>

            {/* Protocol */}
            <div>
              <label htmlFor="protocol" className="block text-sm font-medium text-gray-700 mb-2">
                OCPP Protocol *
              </label>
              <select
                id="protocol"
                name="protocol"
                required
                value={formData.protocol}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.protocol ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="OCPP16">OCPP 1.6</option>
                <option value="OCPP20">OCPP 2.0</option>
                <option value="OCPP21">OCPP 2.1</option>
              </select>
              {errors.protocol && <p className="mt-1 text-sm text-red-600">{errors.protocol}</p>}
            </div>

            {/* Brand */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                ยี่ห้อ *
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                required
                value={formData.brand}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.brand ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="เช่น Autel, ABB, Schneider"
              />
              {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
            </div>

            {/* Power Rating */}
            <div>
              <label htmlFor="powerRating" className="block text-sm font-medium text-gray-700 mb-2">
                กำลังไฟ (kW) *
              </label>
              <input
                type="number"
                id="powerRating"
                name="powerRating"
                required
                min="1"
                max="350"
                step="0.1"
                value={formData.powerRating}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.powerRating ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="22"
              />
              {errors.powerRating && <p className="mt-1 text-sm text-red-600">{errors.powerRating}</p>}
            </div>

            {/* Max Power */}
            <div>
              <label htmlFor="maxPower" className="block text-sm font-medium text-gray-700 mb-2">
                กำลังไฟสูงสุด (kW) *
              </label>
              <input
                type="number"
                id="maxPower"
                name="maxPower"
                required
                min="1"
                max="1000"
                step="0.1"
                value={formData.maxPower}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.maxPower ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="120"
              />
              {errors.maxPower && <p className="mt-1 text-sm text-red-600">{errors.maxPower}</p>}
            </div>

            {/* Connector Count */}
            <div>
              <label htmlFor="connectorCount" className="block text-sm font-medium text-gray-700 mb-2">
                จำนวน Connector *
              </label>
              <input
                type="number"
                id="connectorCount"
                name="connectorCount"
                required
                min="1"
                max="10"
                value={formData.connectorCount}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.connectorCount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="2"
              />
              {errors.connectorCount && <p className="mt-1 text-sm text-red-600">{errors.connectorCount}</p>}
            </div>

            {/* Ownership Section */}
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลความเป็นเจ้าของ</h3>
              
              <div>
                <label htmlFor="ownerId" className="block text-sm font-medium text-gray-700 mb-2">
                  Owner ID *
                </label>
                <input
                  type="text"
                  id="ownerId"
                  name="ownerId"
                  required
                  value={formData.ownerId}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.ownerId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="เช่น user_123"
                />
                {errors.ownerId && <p className="mt-1 text-sm text-red-600">{errors.ownerId}</p>}
              </div>

              <div>
                <label htmlFor="ownershipType" className="block text-sm font-medium text-gray-700 mb-2">
                  ประเภทความเป็นเจ้าของ *
                </label>
                <select
                  id="ownershipType"
                  name="ownershipType"
                  required
                  value={formData.ownershipType}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.ownershipType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">เลือกประเภทความเป็นเจ้าของ</option>
                  <option value="PUBLIC">สาธารณะ (PUBLIC)</option>
                  <option value="PRIVATE">ส่วนตัว (PRIVATE)</option>
                  <option value="CORPORATE">องค์กร (CORPORATE)</option>
                </select>
                {errors.ownershipType && <p className="mt-1 text-sm text-red-600">{errors.ownershipType}</p>}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-3 block text-sm text-gray-900">
                  เปิดให้บริการสาธารณะ
                </label>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลราคา</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="baseRate" className="block text-sm font-medium text-gray-700 mb-2">
                    ราคาพื้นฐาน (บาท/kWh) *
                  </label>
                  <input
                    type="number"
                    id="baseRate"
                    name="baseRate"
                    required
                    min="0"
                    step="0.01"
                    value={formData.baseRate}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.baseRate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="8.5"
                  />
                  {errors.baseRate && <p className="mt-1 text-sm text-red-600">{errors.baseRate}</p>}
                </div>

                <div>
                  <label htmlFor="peakRate" className="block text-sm font-medium text-gray-700 mb-2">
                    ราคาช่วงเร่งด่วน (บาท/kWh) *
                  </label>
                  <input
                    type="number"
                    id="peakRate"
                    name="peakRate"
                    required
                    min="0"
                    step="0.01"
                    value={formData.peakRate}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.peakRate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="12"
                  />
                  {errors.peakRate && <p className="mt-1 text-sm text-red-600">{errors.peakRate}</p>}
                </div>

                <div>
                  <label htmlFor="offPeakRate" className="block text-sm font-medium text-gray-700 mb-2">
                    ราคาช่วงปกติ (บาท/kWh) *
                  </label>
                  <input
                    type="number"
                    id="offPeakRate"
                    name="offPeakRate"
                    required
                    min="0"
                    step="0.01"
                    value={formData.offPeakRate}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.offPeakRate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="6.5"
                  />
                  {errors.offPeakRate && <p className="mt-1 text-sm text-red-600">{errors.offPeakRate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="peakStartTime" className="block text-sm font-medium text-gray-700 mb-2">
                    เวลาเริ่มช่วงเร่งด่วน *
                  </label>
                  <input
                    type="time"
                    id="peakStartTime"
                    name="peakStartTime"
                    required
                    value={formData.peakStartTime}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.peakStartTime ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.peakStartTime && <p className="mt-1 text-sm text-red-600">{errors.peakStartTime}</p>}
                </div>

                <div>
                  <label htmlFor="peakEndTime" className="block text-sm font-medium text-gray-700 mb-2">
                    เวลาสิ้นสุดช่วงเร่งด่วน *
                  </label>
                  <input
                    type="time"
                    id="peakEndTime"
                    name="peakEndTime"
                    required
                    value={formData.peakEndTime}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.peakEndTime ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.peakEndTime && <p className="mt-1 text-sm text-red-600">{errors.peakEndTime}</p>}
                </div>

                <div>
                  <label htmlFor="offPeakStartTime" className="block text-sm font-medium text-gray-700 mb-2">
                    เวลาเริ่มช่วงปกติ *
                  </label>
                  <input
                    type="time"
                    id="offPeakStartTime"
                    name="offPeakStartTime"
                    required
                    value={formData.offPeakStartTime}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.offPeakStartTime ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.offPeakStartTime && <p className="mt-1 text-sm text-red-600">{errors.offPeakStartTime}</p>}
                </div>

                <div>
                  <label htmlFor="offPeakEndTime" className="block text-sm font-medium text-gray-700 mb-2">
                    เวลาสิ้นสุดช่วงปกติ *
                  </label>
                  <input
                    type="time"
                    id="offPeakEndTime"
                    name="offPeakEndTime"
                    required
                    value={formData.offPeakEndTime}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.offPeakEndTime ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.offPeakEndTime && <p className="mt-1 text-sm text-red-600">{errors.offPeakEndTime}</p>}
                </div>
              </div>
            </div>

            {/* Whitelist Setting */}
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="isWhitelisted"
                name="isWhitelisted"
                checked={formData.isWhitelisted}
                onChange={handleInputChange}
                disabled={loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isWhitelisted" className="ml-3 block text-sm text-gray-900">
                เพิ่มเข้า Whitelist ทันที (อนุญาตให้เชื่อมต่อ OCPP ได้)
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <Link
                to="/charge-points"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {loading && (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {loading ? 'กำลังเพิ่ม...' : 'เพิ่มเครื่องชาร์จ'}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">คำแนะนำ</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Serial Number</strong> และ <strong>Charge Point Identity</strong> ต้องไม่ซ้ำกับที่มีอยู่ในระบบ</li>
                  <li>การเพิ่มเข้า Whitelist จะอนุญาตให้เครื่องชาร์จเชื่อมต่อ OCPP ได้ทันที</li>
                  <li>ข้อมูลบางส่วนจะถูกปรับปรุงอัตโนมัติเมื่อเครื่องชาร์จเชื่อมต่อครั้งแรก</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}