import { ChargePointStatus, OCPPVersion } from '@prisma/client';
import { Elysia, t } from 'elysia';
import { ValidationService } from '../validation/validation.service';
import { ChargePointService } from './chargepoint.service';

export const chargePointController = (
  chargePointService: ChargePointService,
  validationService: ValidationService
) =>
  new Elysia({ prefix: '/api/chargepoints' })
    
    // สร้างเครื่องชาร์จใหม่
    .post(
      '/',
      async ({ body, set }) => {
        try {
          const data = body as any;
          
          // Validate required fields
          if (!data.name || !data.stationName || !data.location || !data.brand || 
              !data.serialNumber || !data.powerRating || !data.protocol || !data.chargePointIdentity) {
            set.status = 400;
            return {
              success: false,
              message: 'กรุณาระบุข้อมูลที่จำเป็น: ชื่อ, ชื่อสถานี, ที่อยู่, ยี่ห้อ/รุ่น, Serial Number, กำลังไฟ, เวอร์ชัน OCPP, และ Charge Point Identity'
            };
          }

          // Validate station name length (2-80 characters)
          if (data.stationName.length < 2 || data.stationName.length > 80) {
            set.status = 400;
            return {
              success: false,
              message: 'ชื่อสถานีต้องมีความยาว 2-80 ตัวอักษร'
            };
          }

          // Validate serial number format (A-Z, 0-9, -, /, _)
          const serialNumberRegex = /^[A-Z0-9\-\/_]+$/;
          if (!serialNumberRegex.test(data.serialNumber)) {
            set.status = 400;
            return {
              success: false,
              message: 'Serial Number ต้องประกอบด้วยอักขระ A-Z, 0-9, -, /, _ เท่านั้น'
            };
          }

          // Validate power rating (> 0, max 2 decimal places)
          if (data.powerRating <= 0) {
            set.status = 400;
            return {
              success: false,
              message: 'กำลังไฟต้องมากกว่า 0'
            };
          }

          const powerDecimalPlaces = (data.powerRating.toString().split('.')[1] || '').length;
          if (powerDecimalPlaces > 2) {
            set.status = 400;
            return {
              success: false,
              message: 'กำลังไฟสามารถมีทศนิยมได้สูงสุด 2 ตำแหน่ง'
            };
          }

          // Validate connector count (>= 1)
          if (data.connectorCount && data.connectorCount < 1) {
            set.status = 400;
            return {
              success: false,
              message: 'จำนวนหัวชาร์จต้องมากกว่าหรือเท่ากับ 1'
            };
          }

          // Validate charge point identity (1-36 characters, A-Z, 0-9, -, _)
          const chargePointIdentityRegex = /^[A-Z0-9\-_]{1,36}$/;
          if (!chargePointIdentityRegex.test(data.chargePointIdentity)) {
            set.status = 400;
            return {
              success: false,
              message: 'Charge Point Identity ต้องมีความยาว 1-36 ตัวอักษร และประกอบด้วย A-Z, 0-9, -, _ เท่านั้น'
            };
          }

          // Validate opening hours format if provided
          if (data.openingHours && !data.is24Hours) {
            const timeRangeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRangeRegex.test(data.openingHours)) {
              set.status = 400;
              return {
                success: false,
                message: 'รูปแบบเวลาเปิด-ปิดไม่ถูกต้อง (ตัวอย่าง: 06:00-22:00)'
              };
            }
          }

          // Validate pricing fields
          if (data.baseRate <= 0) {
            set.status = 400;
            return {
              success: false,
              message: 'ราคาพื้นฐานต้องมากกว่า 0'
            };
          }

          const baseRateDecimalPlaces = (data.baseRate.toString().split('.')[1] || '').length;
          if (baseRateDecimalPlaces > 2) {
            set.status = 400;
            return {
              success: false,
              message: 'ราคาพื้นฐานสามารถมีทศนิยมได้สูงสุด 2 ตำแหน่ง'
            };
          }

          if (data.peakRate !== undefined) {
            if (data.peakRate <= 0) {
              set.status = 400;
              return {
                success: false,
                message: 'ราคาช่วง Peak ต้องมากกว่า 0'
              };
            }

            const peakRateDecimalPlaces = (data.peakRate.toString().split('.')[1] || '').length;
            if (peakRateDecimalPlaces > 2) {
              set.status = 400;
              return {
                success: false,
                message: 'ราคาช่วง Peak สามารถมีทศนิยมได้สูงสุด 2 ตำแหน่ง'
              };
            }
          }

          if (data.offPeakRate !== undefined) {
            if (data.offPeakRate <= 0) {
              set.status = 400;
              return {
                success: false,
                message: 'ราคาช่วง Off-Peak ต้องมากกว่า 0'
              };
            }

            const offPeakRateDecimalPlaces = (data.offPeakRate.toString().split('.')[1] || '').length;
            if (offPeakRateDecimalPlaces > 2) {
              set.status = 400;
              return {
                success: false,
                message: 'ราคาช่วง Off-Peak สามารถมีทศนิยมได้สูงสุด 2 ตำแหน่ง'
              };
            }
          }

          // Validate pricing time periods
          const timeValidation = validationService.validatePricingTimes(
            data.peakStartTime,
            data.peakEndTime,
            data.offPeakStartTime,
            data.offPeakEndTime
          );

          if (!timeValidation.isValid) {
            set.status = 400;
            return {
              success: false,
              message: timeValidation.errors.join(', ')
            };
          }

          // Validate OCPP version
          if (!Object.values(OCPPVersion).includes(data.protocol)) {
            set.status = 400;
            return {
              success: false,
              message: 'เวอร์ชัน OCPP ไม่ถูกต้อง'
            };
          }

          const chargePoint = await chargePointService.createChargePoint(data);
          
          return {
            success: true,
            message: 'สร้างเครื่องชาร์จสำเร็จ',
            data: chargePoint
          };
        } catch (error: any) {
          console.error('Error creating charge point:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '🔌 Create Charge Point',
          description: `
สร้างเครื่องชาร์จใหม่พร้อม WebSocket URL สำหรับการเชื่อมต่อ OCPP

**คุณสมบัติ:**
- สร้าง ID เครื่องชาร์จอัตโนมัติ
- สร้าง WebSocket URL ตามเวอร์ชัน OCPP
- รองรับการกำหนดพิกัด GPS
- สร้าง connectors ตามจำนวนที่กำหนด

**OCPP Versions รองรับ:**
- OCPP16 (OCPP 1.6)
- OCPP20 (OCPP 2.0)
- OCPP21 (OCPP 2.1)
          `,
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { 
                      type: 'string', 
                      description: 'ชื่อเครื่องชาร์จ',
                      example: 'Central World Charging Station' 
                    },
                    stationName: { 
                      type: 'string', 
                      description: 'ชื่อสถานี (2-80 ตัวอักษร)',
                      example: 'EV บางนา' 
                    },
                    location: { 
                      type: 'string', 
                      description: 'ที่อยู่เครื่องชาร์จ',
                      example: '999/9 Rama I Rd, Pathumwan, Bangkok' 
                    },
                    latitude: { 
                      type: 'number', 
                      description: 'ละติจูด',
                      example: 13.7563 
                    },
                    longitude: { 
                      type: 'number', 
                      description: 'ลองจิจูด',
                      example: 100.5018 
                    },
                    openingHours: { 
                      type: 'string', 
                      description: 'เวลาเปิด-ปิด (เช่น 06:00-22:00)',
                      example: '06:00-22:00' 
                    },
                    is24Hours: { 
                      type: 'boolean', 
                      description: 'ตลอด 24 ชั่วโมงหรือไม่',
                      example: false 
                    },
                    brand: { 
                      type: 'string', 
                      description: 'ยี่ห้อ/รุ่น',
                      example: 'Autel MaxiCharger AC Wallbox 7kW' 
                    },
                    serialNumber: { 
                      type: 'string', 
                      description: 'Serial Number (A-Z, 0-9, -, /, _)',
                      example: 'SN-AUTEL-23-001234' 
                    },
                    powerRating: { 
                      type: 'number', 
                      description: 'กำลังไฟ (kW) > 0, ทศนิยม ≤ 2 ตำแหน่ง',
                      example: 7.4 
                    },
                    protocol: { 
                      type: 'string', 
                      enum: ['OCPP16', 'OCPP20', 'OCPP21'],
                      description: 'เวอร์ชัน OCPP ที่รองรับ',
                      example: 'OCPP16' 
                    },
                    chargePointIdentity: { 
                      type: 'string', 
                      description: 'Charge Point Identity (1-36 ตัวอักษร, A-Z, 0-9, -, _)',
                      example: 'EVBANGNA-CP001' 
                    },
                    maxPower: { 
                      type: 'number', 
                      description: 'กำลังไฟสูงสุด (kW) - deprecated, ใช้ powerRating แทน',
                      example: 22.0 
                    },
                    connectorCount: { 
                      type: 'integer', 
                      description: 'จำนวนหัวชาร์จ (≥ 1)',
                      example: 2 
                    },
                    ownerId: { 
                      type: 'string', 
                      description: 'ID ของเจ้าของ (สำหรับเครื่องชาร์จส่วนตัว)',
                      example: 'user_123' 
                    },
                    ownershipType: { 
                      type: 'string', 
                      enum: ['PUBLIC', 'PRIVATE', 'SHARED'],
                      description: 'ประเภทความเป็นเจ้าของ',
                      example: 'PUBLIC' 
                    },
                    isPublic: { 
                      type: 'boolean', 
                      description: 'เปิดให้บริการสาธารณะหรือไม่',
                      example: true 
                    },
                    baseRate: { 
                      type: 'number', 
                      description: 'ราคาพื้นฐาน (บาท/kWh) > 0, ทศนิยม ≤ 2 ตำแหน่ง',
                      example: 8.50 
                    },
                    peakRate: { 
                      type: 'number', 
                      description: 'ราคาช่วง Peak (บาท/kWh) > 0, ทศนิยม ≤ 2 ตำแหน่ง',
                      example: 12.00 
                    },
                    offPeakRate: { 
                      type: 'number', 
                      description: 'ราคาช่วง Off-Peak (บาท/kWh) > 0, ทศนิยม ≤ 2 ตำแหน่ง',
                      example: 6.50 
                    },
                    peakStartTime: {
                      type: 'string',
                      description: 'เวลาเริ่มต้นช่วง Peak (HH:MM)',
                      example: '09:00'
                    },
                    peakEndTime: {
                      type: 'string', 
                      description: 'เวลาสิ้นสุดช่วง Peak (HH:MM)',
                      example: '17:00'
                    },
                    offPeakStartTime: {
                      type: 'string',
                      description: 'เวลาเริ่มต้นช่วง Off-Peak (HH:MM)',
                      example: '22:00'
                    },
                    offPeakEndTime: {
                      type: 'string',
                      description: 'เวลาสิ้นสุดช่วง Off-Peak (HH:MM)', 
                      example: '06:00'
                    }
                  },
                  required: ['name', 'stationName', 'location', 'brand', 'serialNumber', 'powerRating', 'protocol', 'chargePointIdentity', 'baseRate']
                }
              }
            }
          },
          responses: {
            201: {
              description: 'สร้างเครื่องชาร์จสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'สร้างเครื่องชาร์จสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'CP_1705123456_A1B2C3D4' },
                          name: { type: 'string', example: 'Central World Charging Station' },
                          location: { type: 'string', example: '999/9 Rama I Rd, Pathumwan, Bangkok' },
                          protocol: { type: 'string', example: 'OCPP16' },
                          urlwebSocket: { type: 'string', example: 'ws://localhost:8081/ocpp/16/CP_1705123456_A1B2C3D4' },
                          status: { type: 'string', example: 'AVAILABLE' },
                          connectorCount: { type: 'integer', example: 2 },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'ข้อมูลไม่ถูกต้อง',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'กรุณาระบุชื่อ ที่อยู่ และเวอร์ชัน OCPP' }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          name: t.String({ default: 'Central World Charging Station' }),
          stationName: t.String({ default: 'EV บางนา' }),
          location: t.String({ default: '999/9 Rama I Rd, Pathumwan, Bangkok' }),
          latitude: t.Optional(t.Number({ default: 13.7563 })),
          longitude: t.Optional(t.Number({ default: 100.5018 })),
          openingHours: t.Optional(t.String({ default: '06:00-22:00' })),
          is24Hours: t.Optional(t.Boolean({ default: false })),
          brand: t.String({ default: 'Autel MaxiCharger AC Wallbox 7kW' }),
          serialNumber: t.String({ default: 'SN-AUTEL-23-001234' }),
          powerRating: t.Number({ default: 7.4 }),
          protocol: t.String({ default: 'OCPP16' }),
          chargePointIdentity: t.String({ default: 'EVBANGNA-CP001' }),
          urlwebSocket: t.String({ default: 'ws://localhost:8081/ocpp/1.6/EVBANGNA-CP001' }), // เพิ่มฟิลด์ URL WebSocket
          connectorCount: t.Optional(t.Number({ default: 2 })),
          ownerId: t.Optional(t.String({ default: 'user_123' })),
          ownershipType: t.Optional(t.String({ default: 'PUBLIC' })),
          isPublic: t.Optional(t.Boolean({ default: true })),
          // Pricing fields
          baseRate: t.Number({ default: 8.50 }),
          peakRate: t.Optional(t.Number({ default: 12.00 })),
          offPeakRate: t.Optional(t.Number({ default: 6.50 })),
          peakStartTime: t.Optional(t.String({ 
            default: '09:00',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          peakEndTime: t.Optional(t.String({ 
            default: '17:00',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          offPeakStartTime: t.Optional(t.String({ 
            default: '22:00',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          offPeakEndTime: t.Optional(t.String({ 
            default: '06:00',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          // Deprecated field
          maxPower: t.Optional(t.Number({ default: 22.0 }))
        })
      }
    )

    // API สำหรับ ws-gateway ดึงข้อมูลเครื่องชาร์จทั้งหมด
    .get(
      '/ws-gateway/chargepoints',
      async ({ set }) => {
        try {
          const chargePoints = await chargePointService.getAllChargePointsForWSGateway();
          
          return {
            success: true,
            data: chargePoints
          };
        } catch (error) {
          console.error('Error fetching charge points for ws-gateway:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['ChargePoint'],
          summary: 'ดึงข้อมูลเครื่องชาร์จสำหรับ ws-gateway',
          description: 'API สำหรับ ws-gateway ดึงข้อมูล serial ID และ URL WebSocket ของเครื่องชาร์จทั้งหมด',
          responses: {
            200: {
              description: 'ดึงข้อมูลสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'CP_1234567890_ABCD1234' },
                            serialNumber: { type: 'string', example: 'SN-AUTEL-23-001234' },
                            urlwebSocket: { type: 'string', example: 'ws://localhost:8081/ocpp/1.6/EVBANGNA-CP001' },
                            chargePointIdentity: { type: 'string', example: 'EVBANGNA-CP001' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            500: {
              description: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครื่องชาร์จ' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    )

    // ดึงรายการเครื่องชาร์จทั้งหมด
    .get(
      '/',
      async ({ query, set }) => {
        try {
          const options = {
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 10,
            status: query.status as ChargePointStatus,
            protocol: query.protocol as OCPPVersion,
            ownerId: query.ownerId,
            isPublic: query.isPublic ? query.isPublic === 'true' : undefined
          };

          const result = await chargePointService.findAllChargePoints(options);
          
          return {
            success: true,
            data: result
          };
        } catch (error: any) {
          console.error('Error fetching charge points:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '📋 Get All Charge Points',
          description: 'ดึงรายการเครื่องชาร์จทั้งหมดพร้อมตัวกรองและการแบ่งหน้า',
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'หน้าที่ต้องการ',
              schema: { type: 'string', default: '1' }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'จำนวนรายการต่อหน้า (สูงสุด 100)',
              schema: { type: 'string', default: '10' }
            },
            {
              name: 'status',
              in: 'query',
              description: 'กรองตามสถานะ',
              schema: { type: 'string', enum: ['AVAILABLE', 'OCCUPIED', 'UNAVAILABLE', 'FAULTED', 'MAINTENANCE'] }
            },
            {
              name: 'protocol',
              in: 'query',
              description: 'กรองตามเวอร์ชัน OCPP',
              schema: { type: 'string', enum: ['OCPP16', 'OCPP20', 'OCPP21'] }
            },
            {
              name: 'ownerId',
              in: 'query',
              description: 'กรองตาม ID เจ้าของ',
              schema: { type: 'string' }
            },
            {
              name: 'isPublic',
              in: 'query',
              description: 'กรองตามการเปิดให้บริการสาธารณะ',
              schema: { type: 'string', enum: ['true', 'false'] }
            }
          ]
        },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          protocol: t.Optional(t.String()),
          ownerId: t.Optional(t.String()),
          isPublic: t.Optional(t.String())
        })
      }
    )

    // ดึงข้อมูลเครื่องชาร์จตาม ID
    .get(
      '/:id',
      async ({ params, set }) => {
        try {
          const { id } = params;
          const chargePoint = await chargePointService.findChargePointById(id);
          
          if (!chargePoint) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จที่ระบุ'
            };
          }
          
          return {
            success: true,
            data: chargePoint
          };
        } catch (error: any) {
          console.error('Error fetching charge point:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '🔍 Get Charge Point by ID',
          description: 'ดึงข้อมูลเครื่องชาร์จตาม ID พร้อมข้อมูลรายละเอียด',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          id: t.String()
        })
      }
    )

    // อัปเดตข้อมูลเครื่องชาร์จ
    .put(
      '/:id',
      async ({ params, body, set }) => {
        try {
          const { id } = params;
          const updateData = body as any;
          
          // ตรวจสอบว่าเครื่องชาร์จมีอยู่จริง
          const existingChargePoint = await chargePointService.findChargePointById(id);
          if (!existingChargePoint) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จที่ระบุ'
            };
          }

          const updatedChargePoint = await chargePointService.updateChargePoint(id, updateData);
          
          return {
            success: true,
            message: 'อัปเดตข้อมูลเครื่องชาร์จสำเร็จ',
            data: updatedChargePoint
          };
        } catch (error: any) {
          console.error('Error updating charge point:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '✏️ Update Charge Point',
          description: 'อัปเดตข้อมูลเครื่องชาร์จ หากเปลี่ยนเวอร์ชัน OCPP จะสร้าง WebSocket URL ใหม่',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          name: t.Optional(t.String()),
          location: t.Optional(t.String()),
          latitude: t.Optional(t.Number()),
          longitude: t.Optional(t.Number()),
          protocol: t.Optional(t.String()),
          status: t.Optional(t.String()),
          maxPower: t.Optional(t.Number()),
          connectorCount: t.Optional(t.Number()),
          ownershipType: t.Optional(t.String()),
          isPublic: t.Optional(t.Boolean()),
          // Pricing fields
          baseRate: t.Optional(t.Number()),
          peakRate: t.Optional(t.Number()),
          offPeakRate: t.Optional(t.Number()),
          // Time period fields
          peakStartTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          peakEndTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          offPeakStartTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          offPeakEndTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          }))
        })
      }
    )

    // ลบเครื่องชาร์จ (เปลี่ยนสถานะเป็น UNAVAILABLE)
    .delete(
      '/:id',
      async ({ params, set }) => {
        try {
          const { id } = params;
          
          // ตรวจสอบว่าเครื่องชาร์จมีอยู่จริง
          const existingChargePoint = await chargePointService.findChargePointById(id);
          if (!existingChargePoint) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จที่ระบุ'
            };
          }

          await chargePointService.deleteChargePoint(id);
          
          return {
            success: true,
            message: 'ปิดใช้งานเครื่องชาร์จสำเร็จ'
          };
        } catch (error: any) {
          console.error('Error deleting charge point:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการปิดใช้งานเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '🗑️ Delete Charge Point',
          description: 'ปิดใช้งานเครื่องชาร์จ (เปลี่ยนสถานะเป็น UNAVAILABLE)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          id: t.String()
        })
      }
    )

    // อัปเดต Pricing Schedule แยกต่างหาก
    .put(
      '/:id/pricing',
      async ({ params, body, set }) => {
        try {
          const { id } = params;
          const pricingData = body as {
            baseRate?: number;
            peakRate?: number;
            offPeakRate?: number;
            peakStartTime?: string;
            peakEndTime?: string;
            offPeakStartTime?: string;
            offPeakEndTime?: string;
          };

          // ตรวจสอบ validation สำหรับ pricing fields
          if (pricingData.baseRate !== undefined && (pricingData.baseRate <= 0 || !/^\d+(\.\d{1,2})?$/.test(pricingData.baseRate.toString()))) {
            set.status = 400;
            return {
              success: false,
              message: 'ราคาพื้นฐานต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง'
            };
          }

          if (pricingData.peakRate !== undefined && (pricingData.peakRate <= 0 || !/^\d+(\.\d{1,2})?$/.test(pricingData.peakRate.toString()))) {
            set.status = 400;
            return {
              success: false,
              message: 'ราคาช่วง Peak ต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง'
            };
          }

          if (pricingData.offPeakRate !== undefined && (pricingData.offPeakRate <= 0 || !/^\d+(\.\d{1,2})?$/.test(pricingData.offPeakRate.toString()))) {
            set.status = 400;
            return {
              success: false,
              message: 'ราคาช่วง Off-Peak ต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง'
            };
          }

          // ตรวจสอบ validation สำหรับ time fields
          const timeFields = {
            peakStartTime: pricingData.peakStartTime,
            peakEndTime: pricingData.peakEndTime,
            offPeakStartTime: pricingData.offPeakStartTime,
            offPeakEndTime: pricingData.offPeakEndTime
          };

          const hasTimeFields = Object.values(timeFields).some(time => time !== undefined);
          if (hasTimeFields) {
            const validationResult = validationService.validatePricingTimes(
              timeFields.peakStartTime,
              timeFields.peakEndTime,
              timeFields.offPeakStartTime,
              timeFields.offPeakEndTime
            );

            if (!validationResult.isValid) {
             set.status = 400;
             return {
               success: false,
               message: validationResult.errors.join(', ')
             };
           }
          }

          const updatedChargePoint = await chargePointService.updatePricingSchedule(id, pricingData);

          return {
            success: true,
            message: 'อัปเดต Pricing Schedule สำเร็จ',
            data: updatedChargePoint
          };
        } catch (error: any) {
          console.error('Error updating pricing schedule:', error);
          set.status = 500;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการอัปเดต Pricing Schedule'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '💰 Update Pricing Schedule',
          description: 'อัปเดต Pricing Schedule สำหรับเครื่องชาร์จ รวมถึงราคาและช่วงเวลา Peak/Off-Peak',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          baseRate: t.Optional(t.Number({ minimum: 0.01 })),
          peakRate: t.Optional(t.Number({ minimum: 0.01 })),
          offPeakRate: t.Optional(t.Number({ minimum: 0.01 })),
          peakStartTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          peakEndTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          offPeakStartTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          })),
          offPeakEndTime: t.Optional(t.String({ 
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          }))
        })
      }
    )

    // ตรวจสอบการเชื่อมต่อ OCPP
    .post(
      '/:id/validate-ocpp',
      async ({ params, body, set }) => {
        try {
          const { id } = params;
          const { version } = body as { version: OCPPVersion };
          
          const validation = await chargePointService.validateOCPPConnection(id, version);
          
          return {
            success: true,
            data: validation
          };
        } catch (error: any) {
          console.error('Error validating OCPP connection:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ OCPP'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '🔍 Validate OCPP Connection',
          description: 'ตรวจสอบว่าเวอร์ชัน OCPP ที่เครื่องชาร์จส่งมาตรงกับที่กำหนดไว้หรือไม่',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          version: t.String()
        })
      }
    )

    // ค้นหาเครื่องชาร์จใกล้เคียง
    .get(
      '/nearby/:latitude/:longitude',
      async ({ params, query, set }) => {
        try {
          const { latitude, longitude } = params;
          const radius = query.radius ? parseFloat(query.radius) : 10;
          
          const lat = parseFloat(latitude);
          const lng = parseFloat(longitude);
          
          if (isNaN(lat) || isNaN(lng)) {
            set.status = 400;
            return {
              success: false,
              message: 'พิกัดไม่ถูกต้อง'
            };
          }
          
          const nearbyChargePoints = await chargePointService.findNearbyChargePoints(lat, lng, radius);
          
          return {
            success: true,
            data: nearbyChargePoints
          };
        } catch (error: any) {
          console.error('Error finding nearby charge points:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการค้นหาเครื่องชาร์จใกล้เคียง'
          };
        }
      },
      {
        detail: {
          tags: ['Charge Points'],
          summary: '📍 Find Nearby Charge Points',
          description: 'ค้นหาเครื่องชาร์จใกล้เคียงตามพิกัด GPS',
          parameters: [
            {
              name: 'latitude',
              in: 'path',
              required: true,
              description: 'ละติจูด',
              schema: { type: 'string', example: '13.7563' }
            },
            {
              name: 'longitude',
              in: 'path',
              required: true,
              description: 'ลองจิจูด',
              schema: { type: 'string', example: '100.5018' }
            },
            {
              name: 'radius',
              in: 'query',
              description: 'รัศมีการค้นหา (กิโลเมตร)',
              schema: { type: 'string', default: '10' }
            }
          ]
        },
        params: t.Object({
          latitude: t.String(),
          longitude: t.String()
        }),
        query: t.Object({
          radius: t.Optional(t.String())
        })
      }
    );