import { ChargePointStatus, OCPPVersion } from '@prisma/client';
import { Elysia, t } from 'elysia';
import { ValidationService } from '../validation/validation.service';
import { ChargePointService } from './chargepoint.service';

export const chargePointController = (
  chargePointService: ChargePointService,
  validationService: ValidationService
) =>
  new Elysia({ prefix: '/api/chargepoints' })
    
    /**
     * Update connection status
     */
    .put(
      '/:chargePointIdentity/connection-status',
      async ({ params, body, set }) => {
        try {
          const { chargePointIdentity } = params;
          const { isConnected } = body as { isConnected: boolean };
          
          const updatedChargePoint = await chargePointService.updateConnectionStatus(
            chargePointIdentity,
            isConnected
          );
          
          return {
            success: true,
            data: updatedChargePoint,
            message: 'Connection status updated successfully'
          };
        } catch (error: any) {
          set.status = 500;
          return {
            success: false,
            error: error.message,
            message: 'Failed to update connection status'
          };
        }
      },
      {
        params: t.Object({
          chargePointIdentity: t.String()
        }),
        body: t.Object({
          isConnected: t.Boolean()
        })
      }
    )

    /**
     * Admin API สำหรับเพิ่มเครื่องชาร์จเข้า whitelist
     * ใช้สำหรับการอนุญาตให้เครื่องชาร์จสามารถเชื่อมต่อ OCPP ได้
     */
    .post(
      '/admin/charge-points',
      async ({ body, set }) => {
        try {
          console.log('🔐 คำขอเพิ่ม Charge Point เข้า whitelist:', body);
          
          const data = body as any;
          
          // ตรวจสอบข้อมูลที่จำเป็นทั้งหมด (ไม่รวม id เพราะจะ auto-generate)
          if (!data.name || !data.stationName || !data.location || 
              !data.serialNumber || !data.chargePointIdentity || !data.protocol || 
              !data.brand || !data.powerRating) {
            console.error('❌ ข้อมูลไม่ครบถ้วนสำหรับการเพิ่มเข้า whitelist');
            set.status = 400;
            return {
              success: false,
              message: 'กรุณาระบุข้อมูลที่จำเป็น: name, stationName, location, serialNumber, chargePointIdentity, protocol, brand, powerRating'
            };
          }

          // ตรวจสอบความซ้ำซ้อนของ serialNumber
          const existingSerial = await chargePointService.findBySerialNumber(data.serialNumber);
          if (existingSerial) {
            console.error(`❌ serialNumber ${data.serialNumber} มีอยู่ในระบบแล้ว`);
            set.status = 400;
            return {
              success: false,
              message: 'Serial Number นี้มีอยู่ในระบบแล้ว'
            };
          }

          // ตรวจสอบความซ้ำซ้อนของ chargePointIdentity
          const existingIdentity = await chargePointService.findByChargePointIdentity(data.chargePointIdentity);
          if (existingIdentity) {
            console.error(`❌ chargePointIdentity ${data.chargePointIdentity} มีอยู่ในระบบแล้ว`);
            set.status = 400;
            return {
              success: false,
              message: 'Charge Point Identity นี้มีอยู่ในระบบแล้ว'
            };
          }

          // สร้างเครื่องชาร์จใหม่ในระบบ
          const chargePoint = await chargePointService.createChargePointForWhitelist({
            id: data.id,
            name: data.name,
            stationName: data.stationName,
            location: data.location,
            serialNumber: data.serialNumber,
            chargePointIdentity: data.chargePointIdentity,
            protocol: data.protocol,
            brand: data.brand,
            powerRating: data.powerRating,
            connectorCount: data.connectorCount || 2,
            isWhitelisted: data.isWhitelisted ?? true // เพิ่มเข้า whitelist ทันที
          });

          console.log(`✅ เพิ่ม Charge Point ${data.chargePointIdentity} เข้า whitelist สำเร็จ`);

          set.status = 201;
          return {
            success: true,
            message: 'เพิ่มเครื่องชาร์จเข้า whitelist สำเร็จ',
            data: chargePoint
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการเพิ่มเครื่องชาร์จเข้า whitelist:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการเพิ่มเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['Admin'],
          summary: '🔐 Add Charge Point to Whitelist',
          description: `
เพิ่มเครื่องชาร์จเข้าระบบ whitelist สำหรับอนุญาตให้เชื่อมต่อ OCPP

**หลักการ:**
- serialNumber และ chargePointIdentity ต้อง unique
- เซ็ต isWhitelisted=true เพื่ออนุญาตให้เชื่อมต่อ
- connectorCount ใส่คร่าว ๆ ได้ แต่หลังเชื่อมต่อเราจะ "ยืนยัน/ปรับ" จากค่าคอนฟิกจริง
          `,
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { 
                      type: 'string', 
                      description: 'รหัสจุดชาร์จ',
                      example: 'CP_BKK_001' 
                    },
                    name: { 
                      type: 'string', 
                      description: 'ชื่อจุดชาร์จ',
                      example: 'สถานีทดสอบบางนา' 
                    },
                    stationName: { 
                      type: 'string', 
                      description: 'ชื่อสถานี',
                      example: 'Devonix Test Site' 
                    },
                    location: { 
                      type: 'string', 
                      description: 'ที่อยู่',
                      example: 'บางนา, กรุงเทพมหานคร' 
                    },
                    serialNumber: { 
                      type: 'string', 
                      description: 'Serial Number',
                      example: 'SN-AUTEL-23-001234' 
                    },
                    chargePointIdentity: { 
                      type: 'string', 
                      description: 'Charge Point Identity',
                      example: 'ChargeStationOne-001' 
                    },
                    protocol: { 
                      type: 'string', 
                      enum: ['OCPP16', 'OCPP20', 'OCPP21'],
                      description: 'เวอร์ชัน OCPP',
                      example: 'OCPP16' 
                    },
                    brand: { 
                      type: 'string', 
                      description: 'ยี่ห้อ/รุ่น',
                      example: 'Autel MaxiCharger AC' 
                    },
                    powerRating: { 
                      type: 'number', 
                      description: 'กำลังไฟ (kW)',
                      example: 22.0 
                    },
                    connectorCount: { 
                      type: 'integer', 
                      description: 'จำนวนหัวชาร์จ',
                      example: 2 
                    },
                    isWhitelisted: { 
                      type: 'boolean', 
                      description: 'อนุญาตให้เชื่อมต่อหรือไม่',
                      example: true 
                    }
                  },
                  required: ['name', 'stationName', 'location', 'serialNumber', 'chargePointIdentity', 'protocol', 'brand', 'powerRating']
                }
              }
            }
          },
          responses: {
            201: {
              description: 'เพิ่มเครื่องชาร์จเข้า whitelist สำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'เพิ่มเครื่องชาร์จเข้า whitelist สำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'CP_BKK_001' },
                          name: { type: 'string', example: 'สถานีทดสอบบางนา' },
                          serialNumber: { type: 'string', example: 'SN-AUTEL-23-001234' },
                          chargePointIdentity: { type: 'string', example: 'ChargeStationOne-001' },
                          isWhitelisted: { type: 'boolean', example: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          id: t.Optional(t.String()),
          name: t.String(),
          stationName: t.String(),
          location: t.String(),
          serialNumber: t.String(),
          chargePointIdentity: t.String(),
          protocol: t.String(),
          brand: t.String(),
          powerRating: t.Number(),
          connectorCount: t.Optional(t.Number({ default: 2 })),
          isWhitelisted: t.Optional(t.Boolean({ default: true }))
        })
      }
    )
    
    /**
     * Heartbeat endpoint สำหรับอัปเดต lastSeen
     * ใช้อัปเดต timestamp ล่าสุดที่เครื่องชาร์จส่ง heartbeat มา
     */
    .post(
      '/:chargePointIdentity/heartbeat',
      async ({ params, body, set }) => {
        try {
          console.log('💓 รับ Heartbeat จาก Charge Point:', params.chargePointIdentity, body);
          
          const { chargePointIdentity } = params;
          const { lastSeen } = body as { lastSeen: string };

          if (!lastSeen) {
            console.error('❌ ไม่มี lastSeen timestamp ใน heartbeat request');
            set.status = 400;
            return {
              success: false,
              message: 'กรุณาระบุ lastSeen'
            };
          }

          const updatedChargePoint = await chargePointService.updateHeartbeat(chargePointIdentity, lastSeen);
          
          if (!updatedChargePoint) {
            console.error(`❌ ไม่พบเครื่องชาร์จ chargePointIdentity: ${chargePointIdentity} สำหรับการอัปเดต heartbeat`);
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จ'
            };
          }

          console.log(`✅ อัปเดต heartbeat สำเร็จสำหรับ Charge Point: ${chargePointIdentity}`);

          return {
            success: true,
            message: 'อัปเดต heartbeat สำเร็จ',
            data: updatedChargePoint
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการอัปเดต heartbeat:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดต heartbeat'
          };
        }
      },
      {
        detail: {
          tags: ['OCPP'],
          summary: '💓 Update Heartbeat',
          description: 'อัปเดต lastSeen timestamp จาก Heartbeat message'
        },
        body: t.Object({
          lastSeen: t.String()
        })
      }
    )
    
    // Status notification endpoint สำหรับอัปเดตสถานะ connector
    .post(
      '/:chargePointIdentity/status',
      async ({ params, body, set }) => {
        try {
          const { chargePointIdentity } = params;
          const statusData = body as {
            connectorId: number;
            status: string;
            errorCode: string;
            timestamp?: string;
            info?: string;
            vendorId?: string;
            vendorErrorCode?: string;
          };

          if (!statusData.connectorId || !statusData.status || !statusData.errorCode) {
            set.status = 400;
            return {
              success: false,
              message: 'กรุณาระบุ connectorId, status และ errorCode'
            };
          }

          const result = await chargePointService.updateConnectorStatus(chargePointIdentity, statusData);
          
          return {
            success: true,
            message: 'อัปเดตสถานะ connector สำเร็จ',
            data: result
          };
        } catch (error: any) {
          console.error('Error updating connector status:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ connector'
          };
        }
      },
      {
        detail: {
          tags: ['OCPP'],
          summary: '🔌 Update Connector Status',
          description: 'อัปเดตสถานะ connector จาก StatusNotification message'
        },
        body: t.Object({
          connectorId: t.Number(),
          status: t.String(),
          errorCode: t.String(),
          timestamp: t.Optional(t.String()),
          info: t.Optional(t.String()),
          vendorId: t.Optional(t.String()),
          vendorErrorCode: t.Optional(t.String())
        })
      }
    )
    
    /**
     * Validate whitelist endpoint สำหรับ ws-gateway
     * ใช้ตรวจสอบว่าเครื่องชาร์จได้รับอนุญาตให้เชื่อมต่อหรือไม่
     */
    .post(
      '/validate-whitelist',
      async ({ body, set }) => {
        try {
          console.log('🔍 ตรวจสอบ whitelist สำหรับ Charge Point:', body);
          
          const { serialNumber, chargePointIdentity } = body as { serialNumber: string; chargePointIdentity: string };
          
          if (!serialNumber || !chargePointIdentity) {
            console.error('❌ ข้อมูลไม่ครบถ้วนสำหรับการตรวจสอบ whitelist');
            set.status = 400;
            return {
              success: false,
              message: 'กรุณาระบุ serialNumber และ chargePointIdentity'
            };
          }

          // ค้นหาเครื่องชาร์จด้วย serialNumber และ chargePointIdentity
          const chargePoint = await chargePointService.findBySerialAndIdentity(serialNumber, chargePointIdentity);
          
          if (!chargePoint) {
            console.warn(`⚠️ ไม่พบเครื่องชาร์จ serialNumber: ${serialNumber}, identity: ${chargePointIdentity}`);
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จในระบบ',
              data: { isValid: false }
            };
          }

          // ตรวจสอบว่าอยู่ใน whitelist หรือไม่
          const isValid = chargePoint.isWhitelisted === true;
          
          console.log(`${isValid ? '✅' : '❌'} Charge Point ${chargePointIdentity}: ${isValid ? 'ได้รับอนุญาต' : 'ไม่ได้รับอนุญาต'}`);
          
          return {
            success: true,
            message: isValid ? 'เครื่องชาร์จได้รับอนุญาต' : 'เครื่องชาร์จไม่ได้รับอนุญาต',
            data: {
              isValid,
              chargePointId: chargePoint.id
            }
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการตรวจสอบ whitelist:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบ whitelist'
          };
        }
      },
      {
        detail: {
          tags: ['OCPP'],
          summary: '🔍 Validate Charge Point Whitelist',
          description: 'ตรวจสอบว่าเครื่องชาร์จได้รับอนุญาตให้เชื่อมต่อหรือไม่ โดยใช้ serialNumber และ chargePointIdentity'
        },
        body: t.Object({
          serialNumber: t.String(),
          chargePointIdentity: t.String()
        })
      }
    )
    
    /**
     * Update from BootNotification endpoint
     * ใช้อัปเดตข้อมูลเครื่องชาร์จจาก BootNotification message
     */
    .post(
      '/:chargePointIdentity/update-from-boot',
      async ({ params, body, set }) => {
        try {
          console.log('🔄 อัปเดตข้อมูลจาก BootNotification สำหรับ Charge Point:', params.chargePointIdentity, body);
          
          const { chargePointIdentity } = params;
          const updateData = body as {
            vendor?: string;
            model?: string;
            firmwareVersion?: string;
            serialNumber?: string;
            lastSeen?: string;
            heartbeatIntervalSec?: number;
            ocppProtocolRaw?: string;
          };

          const updatedChargePoint = await chargePointService.updateFromBootNotification(chargePointIdentity, updateData);
          
          if (!updatedChargePoint) {
            console.error(`❌ ไม่พบเครื่องชาร์จ chargePointIdentity: ${chargePointIdentity} สำหรับการอัปเดต`);
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จ'
            };
          }

          console.log(`✅ อัปเดตข้อมูลจาก BootNotification สำเร็จสำหรับ Charge Point: ${chargePointIdentity}`);

          return {
            success: true,
            message: 'อัปเดตข้อมูลจาก BootNotification สำเร็จ',
            data: updatedChargePoint
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการอัปเดตข้อมูลจาก BootNotification:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
          };
        }
      },
      {
        detail: {
          tags: ['OCPP'],
          summary: '🔄 Update from BootNotification',
          description: 'อัปเดตข้อมูลเครื่องชาร์จจาก BootNotification message'
        }
      }
    )
    
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
      '/:chargePointIdentity',
      async ({ params, set }) => {
        try {
          const { chargePointIdentity } = params;
          const chargePoint = await chargePointService.findByChargePointIdentity(chargePointIdentity);
          
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
              name: 'chargePointIdentity',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          chargePointIdentity: t.String()
        })
      }
    )

    // อัปเดตข้อมูลเครื่องชาร์จ
    .put(
      '/:chargePointIdentity',
      async ({ params, body, set }) => {
        try {
          const { chargePointIdentity } = params;
          const updateData = body as any;
          
          // ตรวจสอบว่าเครื่องชาร์จมีอยู่จริง
          const existingChargePoint = await chargePointService.findByChargePointIdentity(chargePointIdentity);
          if (!existingChargePoint) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จที่ระบุ'
            };
          }

          const updatedChargePoint = await chargePointService.updateChargePoint(chargePointIdentity, updateData);
          
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
              name: 'chargePointIdentity',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          chargePointIdentity: t.String()
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
      '/:chargePointIdentity',
      async ({ params, set }) => {
        try {
          const { chargePointIdentity } = params;
          
          // ตรวจสอบว่าเครื่องชาร์จมีอยู่จริง
          const existingChargePoint = await chargePointService.findByChargePointIdentity(chargePointIdentity);
          if (!existingChargePoint) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จที่ระบุ'
            };
          }

          await chargePointService.deleteChargePoint(chargePointIdentity);
          
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
              name: 'chargePointIdentity',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          chargePointIdentity: t.String()
        })
      }
    )

    // อัปเดต Pricing Schedule แยกต่างหาก
    .put(
      '/:chargePointIdentity/pricing',
      async ({ params, body, set }) => {
        try {
          const { chargePointIdentity } = params;
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

          const updatedChargePoint = await chargePointService.updatePricingSchedule(chargePointIdentity, pricingData);

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
              name: 'chargePointIdentity',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          chargePointIdentity: t.String()
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
      '/:chargePointIdentity/validate-ocpp',
      async ({ params, body, set }) => {
        try {
          const { chargePointIdentity } = params;
          const { ocppVersion } = body as { ocppVersion: string };
          
          const result = await chargePointService.validateOCPPConnection(chargePointIdentity, ocppVersion);
          
          return {
            success: result.isValid,
            data: result
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
              name: 'chargePointIdentity',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ]
        },
        params: t.Object({
          chargePointIdentity: t.String()
        }),
        body: t.Object({
          ocppVersion: t.String()
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
    )

    /**
     * ตรวจสอบว่าเครื่องชาร์จมีข้อมูล connectors ในฐานข้อมูลหรือไม่
     */
    .get('/check-connectors/:chargePointIdentity', async ({ params, set }) => {
      try {
        const { chargePointIdentity } = params;
        
        if (!chargePointIdentity) {
          set.status = 400;
          return { error: 'Charge point identity is required' };
        }

        const result = await chargePointService.hasConnectorData(chargePointIdentity);
        
        return {
          success: true,
          data: result
        };
      } catch (error: any) {
        console.error('Error checking connector data:', error);
        set.status = 500;
        return { 
          error: 'Failed to check connector data',
          message: error.message 
        };
      }
    }, {
      detail: {
        tags: ['Charge Points'],
        summary: '🔌 Check Connector Data',
        description: 'ตรวจสอบว่าเครื่องชาร์จมีข้อมูล connectors ในฐานข้อมูลหรือไม่'
      },
      params: t.Object({
        chargePointIdentity: t.String()
      })
    })

    /**
     * สร้าง connectors สำหรับเครื่องชาร์จ
     */
    .post('/create-connectors', async ({ body, set }) => {
      try {
        const { chargePointIdentity, numberOfConnectors, connectorDetails } = body as { 
          chargePointIdentity: string; 
          numberOfConnectors: number;
          connectorDetails?: Array<{ connectorId: number; type?: string; maxCurrent?: number }>;
        };
        
        if (!chargePointIdentity || !numberOfConnectors) {
          set.status = 400;
          return { error: 'Charge point identity and number of connectors are required' };
        }

        if (numberOfConnectors < 1 || numberOfConnectors > 10) {
          set.status = 400;
          return { error: 'Number of connectors must be between 1 and 10' };
        }

        const normalizedConnectorDetails = Array.isArray(connectorDetails)
          ? connectorDetails
              .filter(detail => typeof detail.connectorId === 'number' && detail.connectorId > 0)
              .map(detail => ({
                connectorId: Math.trunc(detail.connectorId),
                type: typeof detail.type === 'string' && detail.type.trim() ? detail.type.trim() : undefined,
                maxCurrent: typeof detail.maxCurrent === 'number' ? detail.maxCurrent : undefined
              }))
          : undefined;

        const connectors = await chargePointService.createConnectorsForChargePoint(
          chargePointIdentity, 
          numberOfConnectors,
          normalizedConnectorDetails
        );
        
        return {
          success: true,
          data: {
            message: `Created/updated ${connectors.length} connectors successfully`,
            connectors
          }
        };
      } catch (error: any) {
        console.error('Error creating connectors:', error);
        set.status = 500;
        return { 
          error: 'Failed to create connectors',
          message: error.message 
        };
      }
    }, {
      detail: {
        tags: ['Charge Points'],
        summary: '🔌 Create Connectors',
        description: 'สร้างหรืออัปเดต connectors สำหรับเครื่องชาร์จ พร้อมรองรับข้อมูลชนิดหัวชาร์จและกระแสสูงสุด'
      },
      body: t.Object({
        chargePointIdentity: t.String(),
        numberOfConnectors: t.Number(),
        connectorDetails: t.Optional(t.Array(t.Object({
          connectorId: t.Number(),
          type: t.Optional(t.String()),
          maxCurrent: t.Optional(t.Number())
        })))
      })
    });
