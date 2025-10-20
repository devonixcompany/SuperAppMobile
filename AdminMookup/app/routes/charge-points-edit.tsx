import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Navigation } from "../components/Navigation";
import { apiService, type ChargePoint, type UpdateChargePointRequest } from "../services/api";

interface FormErrors {
  name?: string;
  location?: string;
  pricePerKwh?: string;
  currency?: string;
}

export function meta() {
  return [
    { title: "แก้ไขเครื่องชาร์จ - AdminMookup" },
    { name: "description", content: "แก้ไขข้อมูลเครื่องชาร์จ EV" },
  ];
}

export default function EditChargePoint() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [chargePoint, setChargePoint] = useState<ChargePoint | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    if (!chargePoint) return false;
    
    const newErrors: FormErrors = {};

    if (!chargePoint.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อเครื่องชาร์จ';
    } else if (chargePoint.name.length < 3) {
      newErrors.name = 'ชื่อเครื่องชาร์จต้องมีอย่างน้อย 3 ตัวอักษร';
    }

    if (!chargePoint.location.trim()) {
      newErrors.location = 'กรุณากรอกที่อยู่';
    } else if (chargePoint.location.length < 10) {
      newErrors.location = 'ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร';
    }

    if (chargePoint.pricing) {
      if (!chargePoint.pricing.pricePerKwh || chargePoint.pricing.pricePerKwh <= 0) {
        newErrors.pricePerKwh = 'ราคาต่อหน่วยต้องมากกว่า 0';
      } else if (chargePoint.pricing.pricePerKwh > 100) {
        newErrors.pricePerKwh = 'ราคาต่อหน่วยต้องไม่เกิน 100 บาท';
      }

      if (!chargePoint.pricing.currency.trim()) {
        newErrors.currency = 'กรุณาเลือกสกุลเงิน';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    fetchChargePoint();
  }, [id]);

  const fetchChargePoint = async () => {
    try {
      const response = await apiService.getChargePointById(id!);
      
      if (response.success && response.data) {
        setChargePoint(response.data);
      } else {
        alert('ไม่พบข้อมูลเครื่องชาร์จ');
        navigate('/charge-points');
      }
    } catch (error) {
      console.error('Error fetching charge point:', error);
      alert('ไม่สามารถโหลดข้อมูลเครื่องชาร์จได้');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!chargePoint) return;
    
    const { name, value, type } = e.target;
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    if (name.startsWith('pricing.')) {
      const field = name.split('.')[1];
      setChargePoint(prev => {
        if (!prev) return null;
        return {
           ...prev,
           pricing: {
             pricePerKwh: prev.pricing?.pricePerKwh || 0,
             currency: prev.pricing?.currency || 'THB',
             [field]: type === 'number' ? parseFloat(value) || 0 : value
           }
         };
      });
    } else {
      setChargePoint(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [name]: type === 'number' ? parseFloat(value) || 0 : 
                   type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargePoint) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const updateData: UpdateChargePointRequest = {
        name: chargePoint.name,
        location: chargePoint.location,
        protocol: chargePoint.protocol,
        status: chargePoint.status,
        pricing: chargePoint.pricing,
        isPublic: chargePoint.isPublic
      };

      const response = await apiService.updateChargePoint(id!, updateData);
      
      if (response.success) {
        alert('อัปเดตข้อมูลเครื่องชาร์จสำเร็จ');
        navigate('/charge-points');
      } else {
        alert('ไม่สามารถอัปเดตข้อมูลเครื่องชาร์จได้');
      }
    } catch (error) {
      console.error('Error updating charge point:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!chargePoint) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">ไม่พบข้อมูลเครื่องชาร์จ</p>
          <Link to="/charge-points" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
            กลับไปหน้ารายการ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">แก้ไขเครื่องชาร์จ</h1>
              <p className="mt-2 text-gray-600">
                แก้ไขข้อมูลเครื่องชาร์จ: {chargePoint.name}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลพื้นฐาน</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID เครื่องชาร์จ
                  </label>
                  <input
                    type="text"
                    value={chargePoint.id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">ไม่สามารถแก้ไขได้</p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อเครื่องชาร์จ *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={chargePoint.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อสถานี
                  </label>
                  <input
                    type="text"
                    value={chargePoint.stationName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">อัปเดตจาก BootNotification</p>
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
                    value={chargePoint.location}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.location && (
                    <p className="text-red-600 text-sm mt-1">{errors.location}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Technical Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลเทคนิค</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={chargePoint.serialNumber}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">ไม่สามารถแก้ไขได้</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charge Point Identity
                  </label>
                  <input
                    type="text"
                    value={chargePoint.chargePointIdentity}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">ไม่สามารถแก้ไขได้</p>
                </div>

                <div>
                  <label htmlFor="protocol" className="block text-sm font-medium text-gray-700 mb-2">
                    OCPP Protocol *
                  </label>
                  <select
                    id="protocol"
                    name="protocol"
                    required
                    value={chargePoint.protocol}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="OCPP16">OCPP 1.6</option>
                    <option value="OCPP20">OCPP 2.0</option>
                    <option value="OCPP21">OCPP 2.1</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    สถานะ *
                  </label>
                  <select
                    id="status"
                    name="status"
                    required
                    value={chargePoint.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="AVAILABLE">พร้อมใช้งาน</option>
                    <option value="OCCUPIED">กำลังใช้งาน</option>
                    <option value="UNAVAILABLE">ไม่พร้อมใช้งาน</option>
                    <option value="FAULTED">เสียหาย</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ยี่ห้อ
                  </label>
                  <input
                    type="text"
                    value={chargePoint.brand}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">อัปเดตจาก BootNotification</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    กำลังไฟ (kW)
                  </label>
                  <input
                    type="number"
                    value={chargePoint.powerRating}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">อัปเดตจาก BootNotification</p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">ราคา</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="pricing.pricePerKwh" className="block text-sm font-medium text-gray-700 mb-2">
                    ราคาต่อ kWh (บาท)
                  </label>
                  <input
                    type="number"
                    id="pricing.pricePerKwh"
                    name="pricing.pricePerKwh"
                    min="0"
                    step="0.01"
                    value={chargePoint.pricing?.pricePerKwh || 0}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.pricePerKwh ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="8.50"
                  />
                  {errors.pricePerKwh && (
                    <p className="text-red-600 text-sm mt-1">{errors.pricePerKwh}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="pricing.currency" className="block text-sm font-medium text-gray-700 mb-2">
                    สกุลเงิน
                  </label>
                  <select
                    id="pricing.currency"
                    name="pricing.currency"
                    value={chargePoint.pricing?.currency || 'THB'}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.currency ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="THB">บาท (THB)</option>
                    <option value="USD">ดอลลาร์ (USD)</option>
                    <option value="EUR">ยูโร (EUR)</option>
                  </select>
                  {errors.currency && (
                    <p className="text-red-600 text-sm mt-1">{errors.currency}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">การตั้งค่า</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isWhitelisted"
                    name="isWhitelisted"
                    checked={chargePoint.isWhitelisted}
                    disabled
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded opacity-50"
                  />
                  <label htmlFor="isWhitelisted" className="ml-2 block text-sm text-gray-500">
                    อยู่ใน Whitelist (ไม่สามารถแก้ไขได้)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    name="isPublic"
                    checked={chargePoint.isPublic}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                    เปิดให้บริการสาธารณะ
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <Link
                to="/charge-points"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">หมายเหตุ</h3>
              <div className="mt-2 text-sm text-amber-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>ข้อมูลบางส่วนจะถูกอัปเดตอัตโนมัติจาก OCPP messages</li>
                  <li>Serial Number และ Charge Point Identity ไม่สามารถแก้ไขได้</li>
                  <li>การเปลี่ยนสถานะจะส่งผลต่อการแสดงผลในแอปพลิเคชัน</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}