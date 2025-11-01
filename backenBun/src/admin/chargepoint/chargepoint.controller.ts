import { Elysia, t } from 'elysia';
import {
  AdminChargePointService,
  CreateChargePointData,
  UpdateChargePointData
} from './chargepoint.service';
import { requireAdminAuth } from '../../middleware/admin-auth';
import { JWTService } from '../../lib/jwt';

export const adminChargePointController = (jwtService: JWTService) => {
  console.log('🏭 Creating admin chargepoint controller with jwtService');
  const authMiddleware = requireAdminAuth(jwtService);
  console.log('🔧 Admin auth middleware created:', authMiddleware);
  
  console.log('🎯 Admin chargepoint controller created with middleware');
  return new Elysia({ prefix: '/api/admin/chargepoint' })
    .use(authMiddleware)
    .decorate('adminChargePointService', new AdminChargePointService())
  .post(
    '/create',
    async ({ body, set, adminChargePointService }) => {
      console.log('🎯 Admin chargepoint create route called');
      try {
        const payload = body as CreateChargePointData;
        const result = await adminChargePointService.createChargePoint(payload);
        return {
          success: true,
          message: 'สร้างจุดชาร์จสำเร็จ',
          data: result
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการสร้างจุดชาร์จ'
        };
      }
    },
    {
      body: t.Object({
        chargepointname: t.String({ minLength: 1, description: 'ชื่อจุดชาร์จ' }),
        stationId: t.Optional(t.String({ description: 'รหัสสถานี' })),
        location: t.String({ minLength: 1, description: 'ที่อยู่' }),
        latitude: t.Optional(t.Number({ description: 'ละติจูด' })),
        longitude: t.Optional(t.Number({ description: 'ลองจิจูด' })),
        openingHours: t.Optional(t.String({ description: 'เวลาเปิด-ปิด' })),
        is24Hours: t.Optional(t.Boolean({ description: 'เปิด 24 ชั่วโมง' })),
        brand: t.String({ minLength: 1, description: 'ยี่ห้อ/รุ่น' }),
        serialNumber: t.String({ minLength: 1, description: 'Serial Number' }),
        powerRating: t.Number({ minimum: 0, description: 'กำลังไฟ (kW)' }),
        powerSystem: t.Optional(t.Number({ enum: [1, 3], description: 'ระบบไฟฟ้า' })),
        connectorCount: t.Optional(t.Number({ minimum: 1, description: 'จำนวนหัวชาร์จ' })),
        protocol: t.String({ enum: ['OCPP16', 'OCPP20', 'OCPP21'], description: 'เวอร์ชัน OCPP' }),
        csmsUrl: t.Optional(t.String({ description: 'URL ของ CSMS' })),
        chargePointIdentity: t.String({ minLength: 1, maxLength: 36, description: 'Charge Point Identity' }),
        // เพิ่มฟิลด์ที่ขาดหายไป
        maxPower: t.Optional(t.Number({ minimum: 0, description: 'กำลังไฟสูงสุด (kW)' })),
        heartbeatIntervalSec: t.Optional(t.Number({ minimum: 1, description: 'ช่วงเวลา Heartbeat (วินาที)' })),
        vendor: t.Optional(t.String({ description: 'ผู้ผลิต' })),
        model: t.Optional(t.String({ description: 'รุ่น' })),
        firmwareVersion: t.Optional(t.String({ description: 'เวอร์ชัน Firmware' })),
        ocppProtocolRaw: t.Optional(t.String({ description: 'OCPP Protocol Raw' })),
        ocppSessionId: t.Optional(t.String({ description: 'OCPP Session ID' })),
        isWhitelisted: t.Optional(t.Boolean({ description: 'อนุญาตให้ใช้งาน', default: true })),
        ownerId: t.Optional(t.String({ description: 'รหัสเจ้าของ' })),
        ownershipType: t.Optional(t.String({ enum: ['PUBLIC', 'PRIVATE'], description: 'ประเภทความเป็นเจ้าของ', default: 'PUBLIC' })),
        isPublic: t.Optional(t.Boolean({ description: 'เปิดให้สาธารณะ', default: true })),
        onPeakRate: t.Optional(t.Number({ minimum: 0, description: 'อัตราค่าไฟช่วงเวลาเร่งด่วน (บาท/kWh)', default: 10.0 })),
        onPeakStartTime: t.Optional(t.String({ description: 'เวลาเริ่มช่วงเร่งด่วน', default: '10:00' })),
        onPeakEndTime: t.Optional(t.String({ description: 'เวลาสิ้นสุดช่วงเร่งด่วน', default: '12:00' })),
        offPeakRate: t.Optional(t.Number({ minimum: 0, description: 'อัตราค่าไฟช่วงเวลาปกติ (บาท/kWh)', default: 20.0 })),
        offPeakStartTime: t.Optional(t.String({ description: 'เวลาเริ่มช่วงปกติ', default: '16:00' })),
        offPeakEndTime: t.Optional(t.String({ description: 'เวลาสิ้นสุดช่วงปกติ', default: '22:00' })),
        urlwebSocket: t.Optional(t.String({ description: 'URL WebSocket' }))
      }),
      detail: {
        tags: ['Admin ChargePoint'],
        summary: 'สร้างจุดชาร์จใหม่',
        description: 'สร้างจุดชาร์จใหม่ในระบบ'
      }
    }
  )
  .put(
    '/update/:id',
    async ({ params, body, set, adminChargePointService }) => {
      try {
        const payload = body as UpdateChargePointData;
        const result = await adminChargePointService.updateChargePoint(params.id, payload);
        return {
          success: true,
          message: 'อัปเดตจุดชาร์จสำเร็จ',
          data: result
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการอัปเดตจุดชาร์จ'
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'รหัสจุดชาร์จ' })
      }),
      body: t.Object({
        chargepointname: t.Optional(t.String({ minLength: 1, description: 'ชื่อจุดชาร์จ' })),
        stationId: t.Optional(t.String({ description: 'รหัสสถานี' })),
        location: t.Optional(t.String({ minLength: 1, description: 'ที่อยู่' })),
        latitude: t.Optional(t.Number({ description: 'ละติจูด' })),
        longitude: t.Optional(t.Number({ description: 'ลองจิจูด' })),
        openingHours: t.Optional(t.String({ description: 'เวลาเปิด-ปิด' })),
        is24Hours: t.Optional(t.Boolean({ description: 'เปิด 24 ชั่วโมง' })),
        brand: t.Optional(t.String({ minLength: 1, description: 'ยี่ห้อ/รุ่น' })),
        serialNumber: t.Optional(t.String({ minLength: 1, description: 'Serial Number' })),
        powerRating: t.Optional(t.Number({ minimum: 0, description: 'กำลังไฟ (kW)' })),
        powerSystem: t.Optional(t.Number({ enum: [1, 3], description: 'ระบบไฟฟ้า' })),
        connectorCount: t.Optional(t.Number({ minimum: 1, description: 'จำนวนหัวชาร์จ' })),
        protocol: t.Optional(t.String({ enum: ['OCPP16', 'OCPP20', 'OCPP21'], description: 'เวอร์ชัน OCPP' })),
        csmsUrl: t.Optional(t.String({ description: 'URL ของ CSMS' })),
        chargePointIdentity: t.Optional(t.String({ minLength: 1, maxLength: 36, description: 'Charge Point Identity' })),
        // เพิ่มฟิลด์ที่ขาดหายไป
        maxPower: t.Optional(t.Number({ minimum: 0, description: 'กำลังไฟสูงสุด (kW)' })),
        heartbeatIntervalSec: t.Optional(t.Number({ minimum: 1, description: 'ช่วงเวลา Heartbeat (วินาที)' })),
        vendor: t.Optional(t.String({ description: 'ผู้ผลิต' })),
        model: t.Optional(t.String({ description: 'รุ่น' })),
        firmwareVersion: t.Optional(t.String({ description: 'เวอร์ชัน Firmware' })),
        ocppProtocolRaw: t.Optional(t.String({ description: 'OCPP Protocol Raw' })),
        ocppSessionId: t.Optional(t.String({ description: 'OCPP Session ID' })),
        isWhitelisted: t.Optional(t.Boolean({ description: 'อนุญาตให้ใช้งาน' })),
        ownerId: t.Optional(t.String({ description: 'รหัสเจ้าของ' })),
        ownershipType: t.Optional(t.String({ enum: ['PUBLIC', 'PRIVATE'], description: 'ประเภทความเป็นเจ้าของ' })),
        isPublic: t.Optional(t.Boolean({ description: 'เปิดให้สาธารณะ' })),
        onPeakRate: t.Optional(t.Number({ minimum: 0, description: 'อัตราค่าไฟช่วงเวลาเร่งด่วน (บาท/kWh)' })),
        onPeakStartTime: t.Optional(t.String({ description: 'เวลาเริ่มช่วงเร่งด่วน' })),
        onPeakEndTime: t.Optional(t.String({ description: 'เวลาสิ้นสุดช่วงเร่งด่วน' })),
        offPeakRate: t.Optional(t.Number({ minimum: 0, description: 'อัตราค่าไฟช่วงเวลาปกติ (บาท/kWh)' })),
        offPeakStartTime: t.Optional(t.String({ description: 'เวลาเริ่มช่วงปกติ' })),
        offPeakEndTime: t.Optional(t.String({ description: 'เวลาสิ้นสุดช่วงปกติ' })),
        urlwebSocket: t.Optional(t.String({ description: 'URL WebSocket' }))
      }),
      detail: {
        tags: ['Admin ChargePoint'],
        summary: 'อัปเดตจุดชาร์จ',
        description: 'อัปเดตข้อมูลจุดชาร์จ'
      }
    }
  )
  .delete(
    '/delete/:id',
    async ({ params, set, adminChargePointService }) => {
      try {
        await adminChargePointService.deleteChargePoint(params.id);
        return {
          success: true,
          message: 'ลบจุดชาร์จสำเร็จ'
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการลบจุดชาร์จ'
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'รหัสจุดชาร์จ' })
      }),
      detail: {
        tags: ['Admin ChargePoint'],
        summary: 'ลบจุดชาร์จ',
        description: 'ลบจุดชาร์จออกจากระบบ'
      }
    }
  )
  .get(
    '/list',
    async ({ query, set, adminChargePointService }) => {
      console.log('🎯 Admin chargepoint list route called');
      try {
        const result = await adminChargePointService.getChargePoints(query);
        return {
          success: true,
          message: 'ดึงข้อมูลจุดชาร์จสำเร็จ',
          data: result
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจุดชาร์จ'
        };
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1, description: 'หน้า' })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100, description: 'จำนวนต่อหน้า' })),
        search: t.Optional(t.String({ description: 'ค้นหา' })),
        stationId: t.Optional(t.String({ description: 'รหัสสถานี' }))
      }),
      detail: {
        tags: ['Admin ChargePoint'],
        summary: 'ดึงรายการจุดชาร์จ',
        description: 'ดึงรายการจุดชาร์จทั้งหมด'
      }
    }
  )
  .get(
    '/:id',
    async ({ params, set, adminChargePointService }) => {
      try {
        const result = await adminChargePointService.getChargePointById(params.id);
        return {
          success: true,
          message: 'ดึงข้อมูลจุดชาร์จสำเร็จ',
          data: result
        };
      } catch (error: any) {
        set.status = 404;
        return {
          success: false,
          message: error.message || 'ไม่พบจุดชาร์จ'
        };
      }
    }
  );
};
