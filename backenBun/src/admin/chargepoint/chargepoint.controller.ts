import { Elysia, t } from 'elysia';
import { AdminChargePointService } from './chargepoint.service';

export const adminChargePointController = new Elysia({ prefix: '/admin/chargepoint' })
  .decorate('adminChargePointService', new AdminChargePointService())
  .post(
    '/create',
    async ({ body, set, adminChargePointService }) => {
      try {
        const { chargepointname, ...rest } = body as any;
        const result = await adminChargePointService.createChargePoint({
          ...rest,
          name: chargepointname
        });
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
        stationName: t.Optional(t.String({ description: 'Station name' })),
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
        chargePointIdentity: t.String({ minLength: 1, maxLength: 36, description: 'Charge Point Identity' })
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
        const { chargepointname, ...rest } = body as any;
        const result = await adminChargePointService.updateChargePoint(params.id, {
          ...rest,
          ...(chargepointname !== undefined ? { name: chargepointname } : {})
        });
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
        stationName: t.Optional(t.String({ description: 'Station name' })),
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
        chargePointIdentity: t.Optional(t.String({ minLength: 1, maxLength: 36, description: 'Charge Point Identity' }))
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
    },
    {
      params: t.Object({
        id: t.String({ description: 'รหัสจุดชาร์จ' })
      }),
      detail: {
        tags: ['Admin ChargePoint'],
        summary: 'ดึงข้อมูลจุดชาร์จ',
        description: 'ดึงข้อมูลจุดชาร์จตาม ID'
      }
    }
  );

