
ปรับแก้ตามนี้ให้ผมหน่อย โดยปรับไฟล์
/Users/admin/Documents/GitHub/SuperAppMobile/backenBun
/Users/admin/Documents/GitHub/SuperAppMobile/ws-gateway
เเค่สองไฟล์นี้ไฟล์อื่นห้ามยุ่ง

เป้าหมาย

เพิ่มเครื่องชาร์จเข้าระบบโดยอิง Serial Number และ/หรือ ChargePointIdentity

เมื่อเครื่องเชื่อมต่อ WebSocket เข้ามา ให้ ยืนยันตัวตน ว่าถูก whitelist

ถ้าถูกต้อง: Accept → เก็บข้อมูลเครื่อง/อัปเดตสถานะ/สร้าง connectors อัตโนมัติ

ดึง จำนวนหัว และ (ถ้า vendor รองรับ) ชนิดหัว จาก GetConfiguration

เก็บ BootNotification/Heartbeat/MeterValues ลง DB

verify  ได้ว่าเครื่องชาร์จทีี่เชื่อมต่อมาตรงกับเครื่องชาร์จในฐานข้อมูล verify ผ่านรูปแบบ Res Req
หมายเหตุ: ใน OCPP 1.6 จะการันตีได้แน่นสุดคือ chargePointIdentity (มากับ URL path ตอนเปิด ws) และ serialNumber/vendor/model (มากับ BootNotification payload) — เราจะตรวจสอบทั้งคู่

0) ปรับสคีมา Prisma (เพิ่มนิดเดียวพอ)

เพิ่มฟิลด์เพื่อ track การเชื่อมต่อและข้อมูลจาก Boot:

model ChargePoint {
  // ...ของเดิม
  lastSeen             DateTime?         // อัปเดตตอน Heartbeat/Boot
  heartbeatIntervalSec Int?              // จาก BootNotification หรือ Config
  vendor               String?           // จาก BootNotification
  model                String?           // จาก BootNotification
  firmwareVersion      String?           // จาก BootNotification (ถ้ามี)
  ocppProtocolRaw      String?           // เช่น "ocpp1.6"
  ocppSessionId        String?           // ไอดีภายในของการเชื่อมต่อปัจจุบัน (ถ้ามี)
  // helper flags
  isWhitelisted        Boolean           @default(true) // เปิด/ปิดอนุญาตเชื่อมต่อ
}


ตาราง Connector ที่คุณมีอยู่แล้วใช้ได้เลย (เราจะเติมข้อมูลจากเครื่อง)

1) เพิ่มเครื่องชาร์จด้วย Serial Number + Identity (ฝั่ง Backend REST สำหรับ Ops)

API นี้ให้ทีม Ops เพิ่ม whitelist เครื่องล่วงหน้า (ก่อนเครื่องมาเชื่อมต่อ)

Endpoint: POST /admin/charge-points
Payload

{
  "id": "CP_BKK_001",
  "name": "สถานีทดสอบบางนา",
  "stationName": "Devonix Test Site",
  "location": "บางนา, กรุงเทพมหานคร",
  "serialNumber": "SN-AUTEL-23-001234",
  "chargePointIdentity": "ChargeStationOne-001",
  "protocol": "OCPP16",
  "brand": "Autel MaxiCharger AC",
  "powerRating": 22.0,
  "connectorCount": 2,
  "isWhitelisted": true
}


หลักการ

serialNumber และ chargePointIdentity ต้อง unique

เซ็ต isWhitelisted=true เพื่ออนุญาตให้เชื่อมต่อ

connectorCount ใส่คร่าว ๆ ได้ แต่หลังเชื่อมต่อเราจะ “ยืนยัน/ปรับ” จากค่าคอนฟิกจริง

2) WebSocket OCPP Server (Node + TypeScript, ไลบรารี ws)
2.1 โครงสร้าง URL สำหรับ OCPP 1.6

ให้เครื่องต่อมาที่:
wss://your-domain/ocpp/1.6/{chargePointIdentity}

เราจะ extract {chargePointIdentity} จาก path เพื่อ map ไปยังเครื่องใน DB

2.2 Session Store (in-memory) สำหรับจับคู่ CP ↔ ws
// session.ts
export type Session = {
  ws: WebSocket;
  chargePointId: string; // DB id
  identity: string;      // chargePointIdentity
  messageMap: Map<string, (res: any) => void>; // รอคู่กับ messageId
};

export const sessionsByIdentity = new Map<string, Session>();

2.3 ตัวอย่าง Server
import { WebSocketServer } from 'ws';
import { prisma } from './prisma'; // import PrismaClient
import { v4 as uuid } from 'uuid';
import * as url from 'url';

const wss = new WebSocketServer({ port: 8080 });

// Helper: ส่ง CALL / CALLRESULT
function sendCall(ws: WebSocket, action: string, payload: any) {
  const messageId = uuid();
  const frame = [2, messageId, action, payload];
  ws.send(JSON.stringify(frame));
  return messageId;
}

wss.on('connection', async (ws, req) => {
  // 1) อ่าน chargePointIdentity จาก URL
  const u = url.parse(req.url || '', true);
  const parts = (u.pathname || '').split('/').filter(Boolean);
  // expected: /ocpp/1.6/{identity}
  const identity = parts[2]; 

  if (!identity) {
    ws.close(1008, 'Missing chargePointIdentity');
    return;
  }

  // 2) หาเครื่องใน DB
  const cp = await prisma.chargePoint.findUnique({
    where: { chargePointIdentity: identity },
  });

  // 3) ตรวจ whitelist
  if (!cp || !cp.isWhitelisted) {
    // ปฏิเสธตั้งแต่ handshake หรือรับไว้แล้วตอบ Boot เป็น Rejected ก็ได้
    ws.close(1008, 'Not whitelisted');
    return;
  }

  // 4) สร้าง session
  const sessionId = uuid();
  sessionsByIdentity.set(identity, {
    ws,
    chargePointId: cp.id,
    identity,
    messageMap: new Map(),
  });

  // 5) ตั้ง event handlers
  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // OCPP 1.6 JSON Frames: [MessageTypeId, UniqueId, Action/Payload, Payload?]
      const type = msg[0];
      const uniqueId = msg[1];

      if (type === 2) {
        // CALL from CP -> CSMS
        const action = msg[2];
        const payload = msg[3] || {};

        if (action === 'BootNotification') {
          // ตรวจ serialNumber จาก payload เทียบกับ DB
          const serialFromBoot = payload.chargePointSerialNumber || payload.serialNumber;
          const vendor = payload.chargePointVendor;
          const model = payload.chargePointModel;
          const firmware = payload.firmwareVersion;

          if (cp.serialNumber && serialFromBoot && cp.serialNumber !== serialFromBoot) {
            // serial ไม่ตรง → Reject
            const res = [3, uniqueId, {
              status: 'Rejected',
              currentTime: new Date().toISOString(),
              heartbeatInterval: 60
            }];
            ws.send(JSON.stringify(res));
            ws.close(1008, 'Serial mismatch');
            return;
          }

          // อัปเดต DB จาก boot
          await prisma.chargePoint.update({
            where: { id: cp.id },
            data: {
              vendor,
              model,
              firmwareVersion: firmware,
              lastSeen: new Date(),
              ocppSessionId: sessionId,
              ocppProtocolRaw: 'ocpp1.6',
            },
          });

          // Accept + ตั้ง heartbeat
          const heartbeatInterval = 60;
          const res = [3, uniqueId, {
            status: 'Accepted',
            currentTime: new Date().toISOString(),
            heartbeatInterval
          }];
          ws.send(JSON.stringify(res));

          // ตามด้วยดึงค่าคอนฟิกจำนวนหัว
          setTimeout(() => {
            const mid = sendCall(ws, 'GetConfiguration', { key: ['NumberOfConnectors'] });
            // เก็บ callback ถ้าต้องการ
            // sessionsByIdentity.get(identity)?.messageMap.set(mid, (payload) => {...});
          }, 500);

        } else if (action === 'Heartbeat') {
          // ตอบกลับ heartbeat
          await prisma.chargePoint.update({
            where: { id: cp.id },
            data: { lastSeen: new Date() }
          });
          ws.send(JSON.stringify([3, uniqueId, { currentTime: new Date().toISOString() }]));

        } else if (action === 'StatusNotification') {
          // อัปเดตสถานะหัว/เครื่อง
          const { connectorId, status } = payload; // status: Available/Occupied/Faulted...
          if (connectorId && connectorId > 0) {
            // อัปเดตตัว connector
            await prisma.connector.upsert({
              where: { chargePointId_connectorId: { chargePointId: cp.id, connectorId } },
              create: { chargePointId: cp.id, connectorId, status },
              update: { status }
            });
          } else {
            // สถานะรวมของเครื่อง
            await prisma.chargePoint.update({
              where: { id: cp.id },
              data: { status }
            });
          }
          ws.send(JSON.stringify([3, uniqueId, {}]));

        } else if (action === 'MeterValues') {
          // บันทึกค่ามิเตอร์เข้า transaction ที่ active (ถ้ามี)
          // ...ตามโครง Transaction/MeterValue ของคุณ
          ws.send(JSON.stringify([3, uniqueId, {}]));
        } else {
          // รองรับ action อื่น ๆ ตามต้องการ
          ws.send(JSON.stringify([3, uniqueId, {}]));
        }
      } else if (type === 3) {
        // CALLRESULT for requests we sent (e.g., GetConfiguration)
        const payload = msg[2];
        // ตัวอย่าง: รับ NumberOfConnectors แล้ว sync เข้าฐาน
        if (payload && payload.configurationKey) {
          const kv = Object.fromEntries(
            payload.configurationKey.map((k: any) => [k.key, k.value])
          );

          if (kv.NumberOfConnectors) {
            const count = parseInt(kv.NumberOfConnectors, 10);
            if (!Number.isNaN(count) && count > 0) {
              // sync connectors: สร้าง/คงที่ตามจำนวน
              for (let i = 1; i <= count; i++) {
                await prisma.connector.upsert({
                  where: { chargePointId_connectorId: { chargePointId: cp.id, connectorId: i } },
                  create: { chargePointId: cp.id, connectorId: i },
                  update: {},
                });
              }
              // ลบตัวที่เกิน
              await prisma.connector.deleteMany({
                where: { chargePointId: cp.id, connectorId: { gt: count } }
              });

              await prisma.chargePoint.update({
                where: { id: cp.id },
                data: { connectorCount: count }
              });
            }
          }

          // พยายามดึงชนิดหัว (ถ้า vendor ใส่ไว้)
          // ตัวอย่างคีย์ vendor ที่พบ: "Connector1-Type", "Connector2-Type"
          const typeKeys = Object.keys(kv).filter(k => /^Connector\d+-Type$/i.test(k));
          for (const k of typeKeys) {
            const n = parseInt(k.match(/\d+/)?.[0] || '0', 10);
            if (n > 0) {
              // map ค่าสตริงจาก config → enum ConnectorType ของเรา
              const v = String(kv[k]).toLowerCase();
              let t: any = 'TYPE_2';
              if (v.includes('type 2')) t = 'TYPE_2';
              else if (v.includes('ccs2') || v.includes('ccs combo 2')) t = 'CCS_COMBO_2';
              else if (v.includes('ccs1') || v.includes('ccs combo 1')) t = 'CCS_COMBO_1';
              else if (v.includes('chademo')) t = 'CHADEMO';
              else if (v.includes('type 1')) t = 'TYPE_1';
              // อัปเดต connector.type
              await prisma.connector.update({
                where: { chargePointId_connectorId: { chargePointId: cp.id, connectorId: n } },
                data: { type: t }
              });
            }
          }
        }
      } else if (type === 4) {
        // CALLERROR
        console.error('CALLERROR', msg);
      }
    } catch (e) {
      console.error('Parse/Handle error', e);
    }
  });

  ws.on('close', async () => {
    sessionsByIdentity.delete(identity);
    await prisma.chargePoint.update({
      where: { id: cp.id },
      data: { ocppSessionId: null }
    });
  });
});

console.log('OCPP 1.6 WS server on ws://0.0.0.0:8080');

3) ขั้นตอน “ยืนยันเครื่อง” แบบละเอียด

Whitelist ล่วงหน้า

ทีม Ops เพิ่ม serialNumber + chargePointIdentity ใน DB ด้วย API ข้างบน

เครื่องต่อ WebSocket

เรา parse {identity} จาก URL → หา record ใน DB → ถ้าไม่เจอหรือ isWhitelisted=false → ปิดการเชื่อมต่อ

BootNotification

รับ payload → เทียบ serialNumber จาก Boot กับ DB

ถ้า DB มี serial และ ไม่ตรง → ส่ง status=Rejected + ปิดการเชื่อม

ถ้าตรงหรือยังไม่กำหนดใน DB → อัปเดตข้อมูลจาก Boot (vendor/model/firmware/lastSeen) → ตอบ Accepted พร้อม heartbeatInterval

หลัง Accept

ส่ง GetConfiguration ขอ NumberOfConnectors (และถ้าเป็นไปได้ ConnectorN-Type)

Sync ตาราง Connector ให้เท่ากับจำนวนจริง และอัปเดตชนิดหัวตามที่ได้มา

Heartbeat/StatusNotification

อัปเดต lastSeen และสถานะหัว/เครื่องให้ทันสมัย

การอนุญาตเริ่มชาร์จ

ใช้ Authorize/StartTransaction ตาม OCPP flow ปกติ

4) วิธี “ดูว่าเครื่องมีกี่หัว แต่ละหัวรองรับอะไร”

อัตโนมัติ:

หลัง Boot → CSMS ส่ง GetConfiguration key:

NumberOfConnectors → จำนวนหัว

(ถ้า vendor ใส่) Connector1-Type, Connector2-Type, … → ชนิดหัว (Type 2, CCS2, CHAdeMO ฯลฯ)

อัปเดตตาราง Connector ตามผลลัพธ์

สำรอง:

หาก vendor ไม่ส่งชนิดหัวผ่าน config → ให้ตั้งค่าในหน้า Admin (แก้ที่ Connector.type) หรือใช้ DataTransfer กับ vendor ที่รองรับ

5) ตัวอย่าง “คำสั่งฝั่ง CSMS” ที่ควรมี (เรียกผ่านปุ่ม Admin ก็ได้)
// ส่ง RemoteStart
function remoteStart(identity: string, connectorId: number, idTag: string) {
  const s = sessionsByIdentity.get(identity);
  if (!s) throw new Error('Charger not connected');
  const reqId = sendCall(s.ws, 'RemoteStartTransaction', { connectorId, idTag });
  return reqId;
}

// ส่ง RemoteStop
function remoteStop(identity: string, transactionId: number) {
  const s = sessionsByIdentity.get(identity);
  if (!s) throw new Error('Charger not connected');
  return sendCall(s.ws, 'RemoteStopTransaction', { transactionId });
}

// ขอค่า Config ใหม่ (เช่นตอนกดปุ่ม “Refresh connectors”)
function refreshConnectors(identity: string) {
  const s = sessionsByIdentity.get(identity);
  if (!s) throw new Error('Charger not connected');
  return sendCall(s.ws, 'GetConfiguration', { key: ['NumberOfConnectors', 'Connector1-Type', 'Connector2-Type', 'Connector3-Type', 'Connector4-Type'] });
}

6) สรุป Flow ที่ทีมต้องทำตามลำดับ

Implement REST: POST /admin/charge-points เพื่อ whitelist โดยใช้ serialNumber + chargePointIdentity

Implement OCPP WS Server:

ดึง chargePointIdentity จาก URL

ตรวจ whitelist / ปฏิเสธทันทีถ้าไม่ได้รับอนุญาต

รองรับ BootNotification → ตรวจ serialNumber → Accept/Reject → อัปเดต DB

หลัง Accept → ส่ง GetConfiguration ดึง NumberOfConnectors