// @ts-nocheck
import { ChargePointStatus, OCPPVersion } from '@prisma/client';
import { Elysia, t } from 'elysia';
import { ValidationService } from '../validation/validation.service';
import { ChargePointService } from './chargepoint.service';

const WS_GATEWAY_API_KEY = process.env.WS_GATEWAY_API_KEY || 'your-api-key';

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
     * Get all charge points for ws-gateway
     * ดึงข้อมูลเครื่องชาร์จทั้งหมดสำหรับ ws-gateway
     */
    .get(
      '/ws-gateway/chargepoints',
      async ({ headers, set }) => {
        try {
          // ตรวจสอบ API Key
          const apiKey = headers['x-api-key'];
          if (apiKey !== WS_GATEWAY_API_KEY) {
            console.error('❌ Invalid API key for ws-gateway endpoint');
            set.status = 401;
            return {
              success: false,
              message: 'Unauthorized'
            };
          }

          console.log('📋 ดึงข้อมูลเครื่องชาร์จทั้งหมดสำหรับ ws-gateway');
          
          const chargePoints = await chargePointService.getAllChargePointsForWSGateway();
          
          console.log(`✅ ดึงข้อมูลเครื่องชาร์จสำเร็จ จำนวน: ${chargePoints.length} เครื่อง`);
          
          return {
            success: true,
            data: chargePoints,
            message: 'ดึงข้อมูลเครื่องชาร์จสำเร็จ'
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการดึงข้อมูลเครื่องชาร์จสำหรับ ws-gateway:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครื่องชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['WS-Gateway'],
          summary: '📋 Get All Charge Points for WS-Gateway',
          description: 'ดึงข้อมูลเครื่องชาร์จทั้งหมดสำหรับ WebSocket Gateway'
        }
      }
    )
    
    /**
     * Update from BootNotification endpoint
     * ใช้อัปเดตข้อมูลเครื่องชาร์จจาก BootNotification message
     */
    .post(
      '/:chargePointIdentity/update-from-boot',
      async ({ params, body, query, set }) => {
        try {
          console.log('🔄 อัปเดตข้อมูลจาก BootNotification สำหรับ Charge Point:', params.chargePointIdentity, body);
          console.log('📋 Query parameters:', query);
          
          const { chargePointIdentity } = params;
          const { y } = query;
          
          const updateData = body as {
            vendor?: string;
            model?: string;
            firmwareVersion?: string;
            serialNumber?: string;
            lastSeen?: string;
            heartbeatIntervalSec?: number;
            ocppProtocolRaw?: string;
          };

          // ถ้ามี parameter y ให้ log หรือประมวลผลตามต้องการ
          if (y) {
            console.log(`🔧 พารามิเตอร์ y ที่ได้รับ: ${y}`);
          }

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
            data: updatedChargePoint,
            ...(y && { yParameter: y }) // เพิ่ม y parameter ใน response ถ้ามี
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
          description: 'อัปเดตข้อมูลเครื่องชาร์จจาก BootNotification message รองรับ query parameter y',
          parameters: [
            {
              name: 'y',
              in: 'query',
              description: 'พารามิเตอร์เสริม y',
              schema: { type: 'string' },
              required: false
            }
          ]
        },
        query: t.Object({
          y: t.Optional(t.String())
        })
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
            data: result.data
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
              required: false,
              description: 'หน้าที่ต้องการ',
              schema: { type: 'string', default: '1' }
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'จำนวนรายการต่อหน้า (สูงสุด 100)',
              schema: { type: 'string', default: '10' }
            },
            {
              name: 'status',
              in: 'query',
              required: false,
              description: 'กรองตามสถานะ',
              schema: { type: 'string', enum: ['AVAILABLE', 'OCCUPIED', 'UNAVAILABLE', 'FAULTED', 'MAINTENANCE'] }
            },
            {
              name: 'protocol',
              in: 'query',
              required: false,
              description: 'กรองตามเวอร์ชัน OCPP',
              schema: { type: 'string', enum: ['OCPP16', 'OCPP20', 'OCPP21'] }
            },
            {
              name: 'ownerId',
              in: 'query',
              required: false,
              description: 'กรองตาม ID เจ้าของ',
              schema: { type: 'string' }
            },
            {
              name: 'isPublic',
              in: 'query',
              required: false,
              description: 'กรองตามการเปิดให้บริการสาธารณะ',
              schema: { type: 'string', enum: ['true', 'false'] }
            }
          ]
        },
        response: {
          200: t.Object({
            success: t.Boolean({ example: true }),
            message: t.Optional(t.String({ example: 'ดึงข้อมูลเครื่องชาร์จสำเร็จ' })),
            data: t.Array(t.Object({
              id: t.String({ example: 'cm123abc456def' }),
              chargepointname: t.String({ example: 'สถานีชาร์จ PTT สาขาลาดพร้าว' }),
              stationId: t.Optional(t.Union([t.String(), t.Null()], { example: null })),
              location: t.Optional(t.String({ example: '123 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900' })),
              latitude: t.Optional(t.Union([t.Number(), t.String(), t.Any(), t.Null()], { example: 13.7563 })),
              longitude: t.Optional(t.Union([t.Number(), t.String(), t.Any(), t.Null()], { example: 100.5018 })),
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
              lastSeen: t.Union([t.String(), t.Date(), t.Null()], { example: null }),
              heartbeatIntervalSec: t.Union([t.Number(), t.Null()], { example: 300 }),
              vendor: t.Union([t.String(), t.Null()], { example: 'ABB' }),
              model: t.Union([t.String(), t.Null()], { example: 'Terra AC W22-T-R-0' }),
              firmwareVersion: t.Union([t.String(), t.Null()], { example: '1.6.2024.1' }),
              ocppProtocolRaw: t.Union([t.String(), t.Null()], { example: 'ocpp1.6' }),
              isWhitelisted: t.Boolean({ example: true }),
              ownerId: t.Optional(t.Union([t.String(), t.Null()], { example: null })),
              ownershipType: t.String({ example: 'PUBLIC' }),
              isPublic: t.Boolean({ example: true }),
              onPeakRate: t.Optional(t.Number({ example: 12.5 })),
              onPeakStartTime: t.Optional(t.String({ example: '09:00' })),
              onPeakEndTime: t.Optional(t.String({ example: '22:00' })),
              offPeakRate: t.Optional(t.Number({ example: 8.5 })),
              offPeakStartTime: t.Optional(t.String({ example: '22:01' })),
              offPeakEndTime: t.Optional(t.String({ example: '08:59' })),
              urlwebSocket: t.Union([t.String(), t.Null()], { example: 'wss://ws.chargepoint.example.com/cp001' }),
              createdAt: t.Union([t.String(), t.Date()], { example: '2024-01-15T10:30:00.000Z' }),
              updatedAt: t.Union([t.String(), t.Date()], { example: '2024-01-15T10:30:00.000Z' }),
              owner: t.Optional(t.Union([t.Object({
                id: t.String({ example: 'user_123abc456def' }),
                email: t.String({ example: 'owner@example.com' }),
                fullName: t.Union([t.String(), t.Null()], { example: 'John Doe' })
              }), t.Null()], { example: null })),
              _count: t.Object({
                transactions: t.Number({ example: 5 })
              }),
              connectors: t.Array(t.Object({
                id: t.String({ example: 'conn_123abc456def' }),
                chargePointId: t.String({ example: 'cm123abc456def' }),
                connectorId: t.Number({ example: 1 }),
                type: t.Union([t.String(), t.Any()], { example: 'TYPE_2' }),
                typeDescription: t.Union([t.String(), t.Null()], { example: 'Type 2 Mennekes' }),
                connectorstatus: t.Union([t.String(), t.Any()], { example: 'AVAILABLE' }),
                maxPower: t.Union([t.Number(), t.Null()], { example: 22 }),
                maxCurrent: t.Union([t.Number(), t.Null()], { example: 32 }),
                createdAt: t.Optional(t.Union([t.String(), t.Date()], { example: '2024-01-15T10:30:00.000Z' })),
                updatedAt: t.Optional(t.Union([t.String(), t.Date()], { example: '2024-01-15T10:30:00.000Z' }))
              }), { example: [
                {
                  id: 'conn_123abc456def',
                  connectorId: 1,
                  type: 'TYPE_2',
                  typeDescription: 'Type 2 Mennekes',
                  connectorstatus: 'AVAILABLE',
                  maxCurrent: 32,
                  createdAt: '2024-01-15T10:30:00.000Z',
                  updatedAt: '2024-01-15T10:30:00.000Z'
                },
                {
                  id: 'conn_789xyz012ghi',
                  connectorId: 2,
                  type: 'TYPE_2',
                  typeDescription: 'Type 2 Mennekes',
                  connectorstatus: 'OCCUPIED',
                  maxCurrent: 32,
                  createdAt: '2024-01-15T10:30:00.000Z',
                  updatedAt: '2024-01-15T10:30:00.000Z'
                }
              ] })
            }))
          }),
          500: t.Object({
            success: t.Boolean({ example: false }),
            message: t.String({ example: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครื่องชาร์จ' })
          })
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
          
          const nearbyChargePoints = await chargePointService.findAllChargePoints({ latitude: lat, longitude: lng, radius });
          
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
    })

    /**
     * Get WebSocket URL for specific charge point and connector
     * GET /api/chargepoints/:chargePointIdentity/:connectorId/websocket-url
     */
    .get(
      '/:chargePointIdentity/:connectorId/websocket-url',
      async ({ params, query, set }) => {
        try {
          const { chargePointIdentity, connectorId } = params;
          const { userId } = query;
          const connectorIdNum = parseInt(connectorId);
          console.log("get websocket url start")
          if (isNaN(connectorIdNum)) {
            set.status = 400;
            return {
              success: false,
              message: 'Connector ID must be a valid number'
            };
          }

          // Verify user ID is provided
          if (!userId) {
            set.status = 400;
            return {
              success: false,
              message: 'User ID is required'
            };
          }
       
          console.log("check user id getwebscoket userId",userId)

          const result = await chargePointService.getWebSocketUrl(chargePointIdentity, connectorIdNum, userId);

          return {
            success: true,
            data: result,
            message: 'WebSocket URL retrieved successfully'
          };
        } catch (error: any) {
          console.error('Error getting WebSocket URL:', error);
          
          // จัดการ error code พิเศษสำหรับไม่มีบัตรเครดิต
          if (error.code === 'NO_PAYMENT_CARDS') {
            set.status = 402; // Payment Required
            return {
              success: false,
              error: error.message,
              code: 'NO_PAYMENT_CARDS',
              message: 'ผู้ใช้ยังไม่ได้เพิ่มบัตรเครดิต กรุณาเพิ่มบัตรก่อนใช้งาน',
              action: 'ADD_PAYMENT_CARD'
            };
          }
          
          set.status = error.message.includes('not found') ? 404 : 500;
          return {
            success: false,
            error: error.message,
            message: 'Failed to get WebSocket URL'
          };
        }
      },
      {
        params: t.Object({
          chargePointIdentity: t.String(),
          connectorId: t.String()
        }),
        query: t.Object({
          userId: t.String()
        }),
        detail: {
          tags: ['Charge Points'],
          summary: '🔗 Get WebSocket URL',
          description: 'ดึง WebSocket URL สำหรับเชื่อมต่อกับเครื่องชาร์จและหัวชาร์จที่ระบุ พร้อม verify user ID',
          security: [
            {
              bearerAuth: []
            }
          ],
          parameters: [
            {
              name: 'chargePointIdentity',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            },
            {
              name: 'connectorId',
              in: 'path',
              required: true,
              description: 'ID ของหัวชาร์จ',
              schema: { type: 'string', example: '1' }
            },
            {
              name: 'userId',
              in: 'query',
              required: true,
              description: 'ID ของผู้ใช้งาน',
              schema: { type: 'string', example: 'user_uuid_here' }
            }
          ]
        }
      }
    )

    // New endpoints for viewing charge points (moved from index.ts)
    .get(
      '/list',
      async ({ set }) => {
        try {
          const chargePoints = await chargePointService.findAllChargePoints();
          
          set.status = 200;
          return {
            success: true,
            data: chargePoints
          };
        } catch (error) {
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
          summary: '📋 Get All Charge Points (Legacy API)',
          description: 'ดึงข้อมูลเครื่องชาร์จทั้งหมด (API เดิมจาก index.ts)',
          responses: {
            200: {
              description: 'ดึงข้อมูลเครื่องชาร์จสำเร็จ',
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
                            id: { type: 'string' },
                            name: { type: 'string' },
                            location: { type: 'string' },
                            status: { type: 'string' },
                            latitude: { type: 'number' },
                            longitude: { type: 'number' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    )

    .get(
      '/detail/:id',
      async ({ params, set }) => {
        try {
          const chargePoint = await chargePointService.findByChargePointIdentity(params.id);
          
          if (!chargePoint) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบเครื่องชาร์จที่ระบุ'
            };
          }

          set.status = 200;
          return {
            success: true,
            data: chargePoint
          };
        } catch (error) {
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
          summary: '🔍 Get Charge Point by ID (Legacy API)',
          description: 'ดึงข้อมูลเครื่องชาร์จตาม ID (API เดิมจาก index.ts)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของเครื่องชาร์จ',
              schema: { type: 'string', example: 'CP_BKK_001' }
            }
          ],
          responses: {
            200: {
              description: 'ดึงข้อมูลเครื่องชาร์จสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          location: { type: 'string' },
                          status: { type: 'string' },
                          latitude: { type: 'number' },
                          longitude: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            },
            404: {
              description: 'ไม่พบเครื่องชาร์จ'
            }
          }
        },
        params: t.Object({
          id: t.String()
        })
      }
    );
