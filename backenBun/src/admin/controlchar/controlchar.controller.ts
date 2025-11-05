import { Elysia, t } from 'elysia';
import { JWTService } from '../../lib/jwt';
import { requireAdminAuth } from '../../middleware/admin-auth';
import {
  AdminChargePointService,
  CreateChargePointData,
  UpdateChargePointData
} from './controlchar.service';

export const adminChargePointController = (jwtService: JWTService) => {
  console.log('🏭 Creating admin chargepoint controller with jwtService');
  const authMiddleware = requireAdminAuth(jwtService);
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
        chargepointname: t.String({ 
          minLength: 1, 
          description: 'ชื่อจุดชาร์จ',
          example: 'สถานีชาร์จ PTT สาขาลาดพร้าว'
        }),
        stationId: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'รหัสสถานี', 
          default: null,
          example: null
        })),
        location: t.String({ 
          minLength: 1, 
          description: 'ที่อยู่',
          example: '123 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900'
        }),
        latitude: t.Optional(t.Number({ 
          description: 'ละติจูด', 
          default: 0,
          example: 13.7563
        })),
        longitude: t.Optional(t.Number({ 
          description: 'ลองจิจูด', 
          default: 0,
          example: 100.5018
        })),
        openingHours: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'เวลาเปิด-ปิด', 
          default: null,
          example: '06:00-22:00'
        })),
        is24Hours: t.Optional(t.Boolean({ 
          description: 'เปิด 24 ชั่วโมง', 
          default: false,
          example: false
        })),
        brand: t.String({ 
          minLength: 1, 
          description: 'ยี่ห้อ/รุ่น',
          example: 'ABB Terra AC'
        }),
        serialNumber: t.String({ 
          minLength: 1, 
          description: 'Serial Number',
          example: 'ABB-TAC-2024-001'
        }),
        powerRating: t.Number({ 
          minimum: 0, 
          description: 'กำลังไฟ (kW)',
          example: 22
        }),
        powerSystem: t.Optional(t.Number({ 
          enum: [1, 3], 
          description: 'ระบบไฟฟ้า (1=เฟสเดียว, 3=สามเฟส)', 
          default: 1,
          example: 3
        })),
        connectorCount: t.Optional(t.Number({ 
          minimum: 1, 
          description: 'จำนวนหัวชาร์จ', 
          default: 1,
          example: 2
        })),
        protocol: t.String({ 
          enum: ['OCPP16', 'OCPP20', 'OCPP21'], 
          description: 'เวอร์ชัน OCPP',
          example: 'OCPP16'
        }),
        csmsUrl: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'URL ของ CSMS', 
          default: null,
          example: 'wss://csms.example.com/ocpp'
        })),
        chargePointIdentity: t.String({ 
          minLength: 1, 
          maxLength: 36, 
          description: 'Charge Point Identity',
          example: 'CP-PTT-LP-001'
        }),
        // เพิ่มฟิลด์ที่ขาดหายไป
        maxPower: t.Optional(t.Number({ 
          minimum: 0, 
          description: 'กำลังไฟสูงสุด (kW)', 
          default: 0,
          example: 22
        })),
        heartbeatIntervalSec: t.Optional(t.Number({ 
          minimum: 1, 
          description: 'ช่วงเวลา Heartbeat (วินาที)', 
          default: 300,
          example: 300
        })),
        vendor: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'ผู้ผลิต', 
          default: null,
          example: 'ABB'
        })),
        model: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'รุ่น', 
          default: null,
          example: 'Terra AC W22-T-R-0'
        })),
        firmwareVersion: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'เวอร์ชัน Firmware', 
          default: null,
          example: '1.6.2024.1'
        })),
        ocppProtocolRaw: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'OCPP Protocol Raw', 
          default: null,
          example: 'ocpp1.6'
        })),
        isWhitelisted: t.Optional(t.Boolean({ 
          description: 'อนุญาตให้ใช้งาน', 
          default: true,
          example: true
        })),
        ownerId: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'รหัสเจ้าของ', 
          default: null,
          example: null
        })),
        ownershipType: t.Optional(t.String({ 
          enum: ['PUBLIC', 'PRIVATE'], 
          description: 'ประเภทความเป็นเจ้าของ', 
          default: 'PUBLIC',
          example: 'PUBLIC'
        })),
        isPublic: t.Optional(t.Boolean({ 
          description: 'เปิดให้สาธาระ', 
          default: true,
          example: true
        })),
        onPeakRate: t.Optional(t.Number({ 
          minimum: 0, 
          description: 'อัตราค่าไฟช่วงเวลาเร่งด่วน (บาท/kWh)', 
          default: 10.0,
          example: 12.5
        })),
        onPeakStartTime: t.Optional(t.String({ 
          description: 'เวลาเริ่มช่วงเร่งด่วน (HH:MM)', 
          default: '10:00',
          example: '09:00'
        })),
        onPeakEndTime: t.Optional(t.String({ 
          description: 'เวลาสิ้นสุดช่วงเร่งด่วน (HH:MM)', 
          default: '12:00',
          example: '22:00'
        })),
        offPeakRate: t.Optional(t.Number({ 
          minimum: 0, 
          description: 'อัตราค่าไฟช่วงเวลาปกติ (บาท/kWh)', 
          default: 20.0,
          example: 8.5
        })),
        offPeakStartTime: t.Optional(t.String({ 
          description: 'เวลาเริ่มช่วงปกติ (HH:MM)', 
          default: '16:00',
          example: '22:01'
        })),
        offPeakEndTime: t.Optional(t.String({ 
          description: 'เวลาสิ้นสุดช่วงปกติ (HH:MM)', 
          default: '22:00',
          example: '08:59'
        })),
        urlwebSocket: t.Optional(t.Union([t.String(), t.Null()], { 
          description: 'URL WebSocket', 
          default: null,
          example: 'wss://ws.chargepoint.example.com/cp001'
        }))
      }),
      detail: {
        tags: ['Admin ChargePoint'],
        summary: 'สร้างจุดชาร์จใหม่',
        description: 'สร้างจุดชาร์จใหม่ในระบบ'
      },
      response: {
        200: t.Object({
          success: t.Boolean({ example: true }),
          message: t.String({ example: 'สร้างจุดชาร์จสำเร็จ' }),
          data: t.Object({
            id: t.String({ example: 'cm123abc456def' }),
            chargepointname: t.String({ example: 'สถานีชาร์จ PTT สาขาลาดพร้าว' }),
            stationId: t.Union([t.String(), t.Null()], { example: null }),
            location: t.String({ example: '123 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900' }),
            latitude: t.Union([t.Number(), t.Null()], { example: 13.7563 }),
            longitude: t.Union([t.Number(), t.Null()], { example: 100.5018 }),
            openingHours: t.Union([t.String(), t.Null()], { example: '06:00-22:00' }),
            is24Hours: t.Boolean({ example: false }),
            brand: t.String({ example: 'ABB Terra AC' }),
            serialNumber: t.String({ example: 'ABB-TAC-2024-001' }),
            powerRating: t.Number({ example: 22 }),
            powerSystem: t.Number({ example: 3 }),
            connectorCount: t.Number({ example: 2 }),
            protocol: t.String({ example: 'OCPP16' }),
            csmsUrl: t.Union([t.String(), t.Null()], { example: 'wss://csms.example.com/ocpp' }),
            chargePointIdentity: t.String({ example: 'CP-PTT-LP-001' }),
            chargepointstatus: t.String({ example: 'AVAILABLE' }),
            maxPower: t.Union([t.Number(), t.Null()], { example: 22 }),
            lastSeen: t.Union([t.String(), t.Null()], { example: null }),
            heartbeatIntervalSec: t.Union([t.Number(), t.Null()], { example: 300 }),
            vendor: t.Union([t.String(), t.Null()], { example: 'ABB' }),
            model: t.Union([t.String(), t.Null()], { example: 'Terra AC W22-T-R-0' }),
            firmwareVersion: t.Union([t.String(), t.Null()], { example: '1.6.2024.1' }),
            ocppProtocolRaw: t.Union([t.String(), t.Null()], { example: 'ocpp1.6' }),
            isWhitelisted: t.Boolean({ example: true }),
            ownerId: t.Union([t.String(), t.Null()], { example: null }),
            ownershipType: t.String({ example: 'PUBLIC' }),
            isPublic: t.Boolean({ example: true }),
            onPeakRate: t.Number({ example: 12.5 }),
            onPeakStartTime: t.String({ example: '09:00' }),
            onPeakEndTime: t.String({ example: '22:00' }),
            offPeakRate: t.Number({ example: 8.5 }),
            offPeakStartTime: t.String({ example: '22:01' }),
            offPeakEndTime: t.String({ example: '08:59' }),
            urlwebSocket: t.Union([t.String(), t.Null()], { example: 'wss://ws.chargepoint.example.com/cp001' }),
            createdAt: t.String({ example: '2024-01-15T10:30:00.000Z' }),
            updatedAt: t.String({ example: '2024-01-15T10:30:00.000Z' })
          })
        }),
        400: t.Object({
          success: t.Boolean({ example: false }),
          message: t.String({ example: 'เกิดข้อผิดพลาดในการสร้างจุดชาร์จ' })
        })
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
        isWhitelisted: t.Optional(t.Boolean({ description: 'อนุญาตให้ใช้งาน' })),
        ownerId: t.Optional(t.String({ description: 'รหัสเจ้าของ' })),
        ownershipType: t.Optional(t.String({ enum: ['PUBLIC', 'PRIVATE'], description: 'ประเภทความเป็นเจ้าของ' })),
        isPublic: t.Optional(t.Boolean({ description: 'เปิดให้สาธาระ' })),
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
      },
      response: {
        200: t.Object({
          success: t.Boolean({ example: true }),
          message: t.String({ example: 'อัปเดตจุดชาร์จสำเร็จ' }),
          data: t.Object({
            id: t.String({ example: 'cm123abc456def' }),
            chargepointname: t.String({ example: 'สถานีชาร์จ PTT สาขาลาดพร้าว' }),
            stationId: t.Union([t.String(), t.Null()], { example: null }),
            location: t.String({ example: '123 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900' }),
            latitude: t.Union([t.Number(), t.Null()], { example: 13.7563 }),
            longitude: t.Union([t.Number(), t.Null()], { example: 100.5018 }),
            openingHours: t.Union([t.String(), t.Null()], { example: '06:00-22:00' }),
            is24Hours: t.Boolean({ example: false }),
            brand: t.String({ example: 'ABB Terra AC' }),
            serialNumber: t.String({ example: 'ABB-TAC-2024-001' }),
            powerRating: t.Number({ example: 22 }),
            powerSystem: t.Number({ example: 3 }),
            connectorCount: t.Number({ example: 2 }),
            protocol: t.String({ example: 'OCPP16' }),
            csmsUrl: t.Union([t.String(), t.Null()], { example: 'wss://csms.example.com/ocpp' }),
            chargePointIdentity: t.String({ example: 'CP-PTT-LP-001' }),
            chargepointstatus: t.String({ example: 'AVAILABLE' }),
            maxPower: t.Union([t.Number(), t.Null()], { example: 22 }),
            lastSeen: t.Union([t.String(), t.Null()], { example: null }),
            heartbeatIntervalSec: t.Union([t.Number(), t.Null()], { example: 300 }),
            vendor: t.Union([t.String(), t.Null()], { example: 'ABB' }),
            model: t.Union([t.String(), t.Null()], { example: 'Terra AC W22-T-R-0' }),
            firmwareVersion: t.Union([t.String(), t.Null()], { example: '1.6.2024.1' }),
            ocppProtocolRaw: t.Union([t.String(), t.Null()], { example: 'ocpp1.6' }),
            isWhitelisted: t.Boolean({ example: true }),
            ownerId: t.Union([t.String(), t.Null()], { example: null }),
            ownershipType: t.String({ example: 'PUBLIC' }),
            isPublic: t.Boolean({ example: true }),
            onPeakRate: t.Number({ example: 12.5 }),
            onPeakStartTime: t.String({ example: '09:00' }),
            onPeakEndTime: t.String({ example: '22:00' }),
            offPeakRate: t.Number({ example: 8.5 }),
            offPeakStartTime: t.String({ example: '22:01' }),
            offPeakEndTime: t.String({ example: '08:59' }),
            urlwebSocket: t.Union([t.String(), t.Null()], { example: 'wss://ws.chargepoint.example.com/cp001' }),
            createdAt: t.String({ example: '2024-01-15T10:30:00.000Z' }),
            updatedAt: t.String({ example: '2024-01-15T10:30:00.000Z' })
          })
        }),
        400: t.Object({
          success: t.Boolean({ example: false }),
          message: t.String({ example: 'เกิดข้อผิดพลาดในการอัปเดตจุดชาร์จ' })
        })
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
      },
      response: {
        200: t.Object({
          success: t.Boolean({ example: true }),
          message: t.String({ example: 'ลบจุดชาร์จสำเร็จ' })
        }),
        400: t.Object({
          success: t.Boolean({ example: false }),
          message: t.String({ example: 'เกิดข้อผิดพลาดในการลบจุดชาร์จ' })
        })
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
      },
      response: {
        200: t.Object({
          success: t.Boolean({ example: true }),
          message: t.String({ example: 'ดึงรายการจุดชาร์จสำเร็จ' }),
          data: t.Array(t.Object({
            id: t.String({ example: 'cm123abc456def' }),
            chargepointname: t.String({ example: 'สถานีชาร์จ PTT สาขาลาดพร้าว' }),
            stationId: t.Union([t.String(), t.Null()], { example: null }),
            location: t.String({ example: '123 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900' }),
            latitude: t.Union([t.Number(), t.Null()], { example: 13.7563 }),
            longitude: t.Union([t.Number(), t.Null()], { example: 100.5018 }),
            openingHours: t.Union([t.String(), t.Null()], { example: '06:00-22:00' }),
            is24Hours: t.Boolean({ example: false }),
            brand: t.String({ example: 'ABB Terra AC' }),
            serialNumber: t.String({ example: 'ABB-TAC-2024-001' }),
            powerRating: t.Number({ example: 22 }),
            powerSystem: t.Number({ example: 3 }),
            connectorCount: t.Number({ example: 2 }),
            protocol: t.String({ example: 'OCPP16' }),
            csmsUrl: t.Union([t.String(), t.Null()], { example: 'wss://csms.example.com/ocpp' }),
            chargePointIdentity: t.String({ example: 'CP-PTT-LP-001' }),
            chargepointstatus: t.String({ example: 'AVAILABLE' }),
            maxPower: t.Union([t.Number(), t.Null()], { example: 22 }),
            lastSeen: t.Union([t.String(), t.Null()], { example: null }),
            heartbeatIntervalSec: t.Union([t.Number(), t.Null()], { example: 300 }),
            vendor: t.Union([t.String(), t.Null()], { example: 'ABB' }),
            model: t.Union([t.String(), t.Null()], { example: 'Terra AC W22-T-R-0' }),
            firmwareVersion: t.Union([t.String(), t.Null()], { example: '1.6.2024.1' }),
            ocppProtocolRaw: t.Union([t.String(), t.Null()], { example: 'ocpp1.6' }),
            isWhitelisted: t.Boolean({ example: true }),
            ownerId: t.Union([t.String(), t.Null()], { example: null }),
            ownershipType: t.String({ example: 'PUBLIC' }),
            isPublic: t.Boolean({ example: true }),
            onPeakRate: t.Number({ example: 12.5 }),
            onPeakStartTime: t.String({ example: '09:00' }),
            onPeakEndTime: t.String({ example: '22:00' }),
            offPeakRate: t.Number({ example: 8.5 }),
            offPeakStartTime: t.String({ example: '22:01' }),
            offPeakEndTime: t.String({ example: '08:59' }),
            urlwebSocket: t.Union([t.String(), t.Null()], { example: 'wss://ws.chargepoint.example.com/cp001' }),
            createdAt: t.String({ example: '2024-01-15T10:30:00.000Z' }),
            updatedAt: t.String({ example: '2024-01-15T10:30:00.000Z' })
          })),
          pagination: t.Object({
            page: t.Number({ example: 1 }),
            limit: t.Number({ example: 10 }),
            total: t.Number({ example: 25 }),
            totalPages: t.Number({ example: 3 })
          })
        }),
        400: t.Object({
          success: t.Boolean({ example: false }),
          message: t.String({ example: 'เกิดข้อผิดพลาดในการดึงรายการจุดชาร์จ' })
        })
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
    },
    {
      params: t.Object({
        id: t.String({ description: 'รหัสจุดชาร์จ' })
      }),
      detail: {
        tags: ['Admin ChargePoint'],
        summary: 'ดึงข้อมูลจุดชาร์จ',
        description: 'ดึงข้อมูลจุดชาร์จตาม ID'
      },
      response: {
        200: t.Object({
          success: t.Boolean({ example: true }),
          message: t.String({ example: 'ดึงข้อมูลจุดชาร์จสำเร็จ' }),
          data: t.Object({
            id: t.String({ example: 'cm123abc456def' }),
            chargepointname: t.String({ example: 'สถานีชาร์จ PTT สาขาลาดพร้าว' }),
            stationId: t.Union([t.String(), t.Null()], { example: null }),
            location: t.String({ example: '123 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900' }),
            latitude: t.Union([t.Number(), t.Null()], { example: 13.7563 }),
            longitude: t.Union([t.Number(), t.Null()], { example: 100.5018 }),
            openingHours: t.Union([t.String(), t.Null()], { example: '06:00-22:00' }),
            is24Hours: t.Boolean({ example: false }),
            brand: t.String({ example: 'ABB Terra AC' }),
            serialNumber: t.String({ example: 'ABB-TAC-2024-001' }),
            powerRating: t.Number({ example: 22 }),
            powerSystem: t.Number({ example: 3 }),
            connectorCount: t.Number({ example: 2 }),
            protocol: t.String({ example: 'OCPP16' }),
            csmsUrl: t.Union([t.String(), t.Null()], { example: 'wss://csms.example.com/ocpp' }),
            chargePointIdentity: t.String({ example: 'CP-PTT-LP-001' }),
            chargepointstatus: t.String({ example: 'AVAILABLE' }),
            maxPower: t.Union([t.Number(), t.Null()], { example: 22 }),
            lastSeen: t.Union([t.String(), t.Null()], { example: null }),
            heartbeatIntervalSec: t.Union([t.Number(), t.Null()], { example: 300 }),
            vendor: t.Union([t.String(), t.Null()], { example: 'ABB' }),
            model: t.Union([t.String(), t.Null()], { example: 'Terra AC W22-T-R-0' }),
            firmwareVersion: t.Union([t.String(), t.Null()], { example: '1.6.2024.1' }),
            ocppProtocolRaw: t.Union([t.String(), t.Null()], { example: 'ocpp1.6' }),
            isWhitelisted: t.Boolean({ example: true }),
            ownerId: t.Union([t.String(), t.Null()], { example: null }),
            ownershipType: t.String({ example: 'PUBLIC' }),
            isPublic: t.Boolean({ example: true }),
            onPeakRate: t.Number({ example: 12.5 }),
            onPeakStartTime: t.String({ example: '09:00' }),
            onPeakEndTime: t.String({ example: '22:00' }),
            offPeakRate: t.Number({ example: 8.5 }),
            offPeakStartTime: t.String({ example: '22:01' }),
            offPeakEndTime: t.String({ example: '08:59' }),
            urlwebSocket: t.Union([t.String(), t.Null()], { example: 'wss://ws.chargepoint.example.com/cp001' }),
            createdAt: t.String({ example: '2024-01-15T10:30:00.000Z' }),
            updatedAt: t.String({ example: '2024-01-15T10:30:00.000Z' })
          })
        }),
        404: t.Object({
          success: t.Boolean({ example: false }),
          message: t.String({ example: 'ไม่พบจุดชาร์จ' })
        })
      }
    }
  );
};
