# เอกสาร Flow การทำงานของ WebSocket และ REST API ในระบบ SuperApp

## สารบัญ
1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
3. [Flow การทำงานตั้งแต่เริ่มสแกน QR Code จนถึงการชาร์จเสร็จสิ้น](#flow-การทำงานตั้งแต่เริ่มสแกน-qr-code-จนถึงการชาร์จเสร็จสิ้น)
4. [รายละเอียด Components แต่ละส่วน](#รายละเอียด-components-แต่ละส่วน)
5. [WebSocket Messages และ OCPP Protocol](#websocket-messages-และ-ocpp-protocol)
6. [REST API Endpoints](#rest-api-endpoints)
7. [การจัดการ Errors และ Edge Cases](#การจัดการ-errors-และ-edge-cases)

---

## ภาพรวมระบบ

ระบบชาร์จรถยนต์ไฟฟ้า SuperApp ประกอบด้วย 3 ส่วนหลัก:

1. **SuperApp Mobile Application** (React Native)
   - แอปพลิเคชันสำหรับผู้ใช้งาน
   - ติดต่อกับ Backend ผ่าน REST API
   - เชื่อมต่อกับ WebSocket Gateway เพื่อรับสถานะการชาร์จแบบ real-time

2. **WebSocket Gateway** (Node.js + TypeScript)
   - ตัวกลางระหว่าง Mobile App และเครื่องชาร์จ (Charge Points)
   - รองรับ OCPP 1.6 และ 2.0 protocols
   - จัดการ WebSocket connections 2 ประเภท:
     - OCPP WebSocket สำหรับเครื่องชาร์จ
     - User WebSocket สำหรับ Mobile App

3. **Backend API Server** (Node.js)
   - จัดการข้อมูล users, transactions, payments
   - เก็บข้อมูลในฐานข้อมูล
   - สร้าง WebSocket URLs สำหรับ charging sessions

---

## สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SuperApp Mobile App                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ QR Scanner   │  │ Charge       │  │  REST API Services       │  │
│  │   Screen     │─▶│   Session    │◀─│ - chargepoint.service    │  │
│  └──────────────┘  │   Screen     │  │ - transaction.service    │  │
│                    └──────────────┘  └──────────────────────────┘  │
│                           │                      │                  │
│                           │                      │                  │
└───────────────────────────┼──────────────────────┼──────────────────┘
                            │                      │
                            │ WebSocket            │ HTTPS
                            │ (Real-time)          │ (REST API)
                            │                      │
         ┌──────────────────┼──────────────────────┼───────────────┐
         │                  ▼                      ▼               │
         │        ┌─────────────────────────────────────┐          │
         │        │      Backend API Server             │          │
         │        │  ┌─────────────────────────────┐    │          │
         │        │  │   REST API Endpoints        │    │          │
         │        │  │ - /api/chargepoints/...     │    │          │
         │        │  │ - /api/v1/user/...          │    │          │
         │        │  │ - /api/v1/user/transactions │    │          │
         │        │  └─────────────────────────────┘    │          │
         │        └─────────────────────────────────────┘          │
         │                         │                                │
         └─────────────────────────┼────────────────────────────────┘
                                   │ Database
                                   │ (Prisma ORM)
                                   ▼
                    ┌───────────────────────────┐
                    │      PostgreSQL DB        │
                    │  - Users                  │
                    │  - Charge Points          │
                    │  - Transactions           │
                    │  - Payments               │
                    └───────────────────────────┘
                    
         ┌───────────────────────────────────────────────────────┐
         │             WebSocket Gateway                         │
         │                                                       │
         │  ┌─────────────────┐      ┌─────────────────┐        │
         │  │  User WebSocket │      │  OCPP WebSocket │        │
         │  │  /user-cp/      │      │  /ocpp/         │        │
         │  │  {cpId}/{conn}/ │      │  {cpId}         │        │
         │  │  {userId}       │      │                 │        │
         │  └────────┬────────┘      └────────┬────────┘        │
         │           │                        │                 │
         │           │  ┌──────────────────┐  │                 │
         │           └──│  Session Manager │──┘                 │
         │              │  - gatewaySession│                    │
         │              │    Manager       │                    │
         │              │  - User          │                    │
         │              │    Connection    │                    │
         │              │    Manager       │                    │
         │              └──────────────────┘                    │
         └───────────────────────┬───────────────────────────────┘
                                 │ OCPP Protocol
                                 │ (WebSocket)
                                 │
         ┌───────────────────────┼───────────────────────────────┐
         │                       ▼                               │
         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
         │  │   Charge     │  │   Charge     │  │   Charge     ││
         │  │   Point 1    │  │   Point 2    │  │   Point N    ││
         │  │   (OCPP)     │  │   (OCPP)     │  │   (OCPP)     ││
         │  └──────────────┘  └──────────────┘  └──────────────┘│
         │              Physical Charging Stations               │
         └───────────────────────────────────────────────────────┘
```

---

## Flow การทำงานตั้งแต่เริ่มสแกน QR Code จนถึงการชาร์จเสร็จสิ้น

### Phase 1: สแกน QR Code และเตรียมการเชื่อมต่อ

#### Step 1.1: สแกน QR Code
**ไฟล์:** `SuperApp/app/(tabs)/qr-scanner/index.tsx`

```typescript
// User สแกน QR Code ที่เครื่องชาร์จ
// QR Code มีข้อมูล:
{
  "chargePointIdentity": "CP001",
  "connectorId": 1,
  "requestUrl": "https://api.example.com/api/chargepoints/CP001/1/websocket-url"
}
```

**การทำงาน:**
1. Camera สแกนและแปลง QR Code
2. ระบบแยกข้อมูล `chargePointIdentity` และ `connectorId`
3. ตรวจสอบ User credentials (userId, accessToken)
4. เตรียมข้อมูลสำหรับขอ WebSocket URL

---

#### Step 1.2: ขอ WebSocket URL จาก Backend
**Service:** `SuperApp/services/api/chargepoint.service.ts`

**REST API Call:**
```http
GET /api/chargepoints/{chargePointIdentity}/{connectorId}/websocket-url?userId={userId}
Authorization: Bearer {accessToken}
```

**การทำงาน:**
1. Mobile App เรียก `chargepointService.getWebSocketUrl()`
2. Backend ตรวจสอบ:
   - User มีบัตรเครดิตหรือไม่ (ถ้าไม่มีจะ return error 402)
   - Charge Point พร้อมใช้งานหรือไม่
   - Connector status
3. Backend สร้าง WebSocket URL พร้อมข้อมูล session

**Response ตัวอย่าง:**
```json
{
  "success": true,
  "data": {
    "websocketUrl": "ws://gateway.example.com:3000/user-cp/CP001/1/user123",
    "chargePoint": {
      "chargePointIdentity": "CP001",
      "name": "Charger 01",
      "stationName": "Central Station",
      "location": "Bangkok",
      "powerRating": 150,
      "brand": "ABB",
      "protocol": "OCPP 1.6"
    },
    "connector": {
      "connectorId": 1
    },
    "pricingTier": {
      "baseRate": 8.50,
      "currency": "THB",
      "name": "Standard Rate"
    }
  }
}
```

**Error Case - ไม่มีบัตรเครดิต:**
```json
{
  "success": false,
  "status": 402,
  "code": "NO_PAYMENT_CARDS",
  "message": "กรุณาเพิ่มบัตรเครดิตก่อนใช้งานเครื่องชาร์จ"
}
```

---

### Phase 2: เชื่อมต่อ WebSocket และเตรียมพร้อมชาร์จ

#### Step 2.1: Navigate ไปยัง Charge Session Screen
**ไฟล์:** `SuperApp/app/charge-session/index.tsx`

**การทำงาน:**
1. Router navigate พร้อม parameters:
   - `websocketUrl`: URL สำหรับเชื่อมต่อ WebSocket
   - `chargePointIdentity`, `connectorId`
   - ข้อมูลเครื่องชาร์จและราคา

---

#### Step 2.2: เชื่อมต่อ WebSocket กับ Gateway
**ไฟล์:** `SuperApp/app/charge-session/index.tsx`

**WebSocket Connection:**
```typescript
// เชื่อมต่อ WebSocket
const ws = new WebSocket(
  "ws://gateway.example.com:3000/user-cp/CP001/1/user123"
);

ws.onopen = () => {
  // เชื่อมต่อสำเร็จ
  setConnectionState("connected");
};

ws.onmessage = (event) => {
  // รับข้อความจาก Gateway
  handleIncomingMessage(JSON.parse(event.data));
};
```

---

#### Step 2.3: Gateway จัดการ User WebSocket Connection
**ไฟล์:** `ws-gateway/src/index.ts` (userWss.on('connection'))

**การทำงาน:**
1. WebSocket Gateway รับ connection
2. แยก path: `/user-cp/{chargePointId}/{connectorId}/{userId}`
3. ตรวจสอบว่า Charge Point เชื่อมต่ออยู่หรือไม่
4. เพิ่ม connection ลงใน `UserConnectionManager`
5. ส่งสถานะเริ่มต้นกลับไปยัง Mobile App

**Message ตัวอย่าง - สถานะเริ่มต้น:**
```json
{
  "type": "status",
  "timestamp": "2025-11-17T11:00:00.000Z",
  "data": {
    "chargePointId": "CP001",
    "connectorId": 1,
    "status": "Available",
    "isOnline": true,
    "message": "เชื่อมต่อสำเร็จ - หัวชาร์จอยู่ในสถานะ Available",
    "chargePointInfo": {
      "serialNumber": "SN123456",
      "identity": "CP001"
    }
  }
}
```

---

### Phase 3: เริ่มต้นการชาร์จ (Start Charging)

#### Step 3.1: User กดปุ่ม "เริ่มชาร์จ"
**ไฟล์:** `SuperApp/app/charge-session/index.tsx` (handleStartCharging)

**เงื่อนไข:**
- Connector status ต้องเป็น: `preparing`, `suspended_ev`, `suspended_evse`, `occupied`
- WebSocket ต้องเชื่อมต่ออยู่

---

#### Step 3.2: สร้าง Transaction ใน Backend
**Service:** `SuperApp/services/api/transaction.service.ts`

**REST API Call:**
```http
POST /api/v1/user/transactions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "chargePointIdentity": "CP001",
  "connectorId": 1,
  "userId": "user123",
  "websocketUrl": "ws://gateway.example.com:3000/user-cp/CP001/1/user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_1234567890",
    "chargePointIdentity": "CP001",
    "connectorId": 1,
    "userId": "user123",
    "status": "PENDING",
    "createdAt": "2025-11-17T11:00:00.000Z"
  }
}
```

**การทำงาน:**
1. Backend สร้าง transaction record ในฐานข้อมูล
2. ส่ง `transactionId` กลับมาให้ Mobile App
3. Mobile App เก็บ `transactionId` เพื่อใช้เป็น `idTag` ใน OCPP

---

#### Step 3.3: ส่งคำสั่ง RemoteStartTransaction ผ่าน WebSocket
**ไฟล์:** `SuperApp/app/charge-session/index.tsx`

**WebSocket Message:**
```json
{
  "type": "RemoteStartTransaction",
  "data": {
    "connectorId": 1,
    "idTag": "txn_1234567890",
    "timestamp": "2025-11-17T11:00:00.000Z"
  }
}
```

**การทำงาน:**
1. Mobile App ส่งข้อความผ่าน WebSocket
2. Gateway รับข้อความและตรวจสอบ Charge Point
3. Gateway แปลงเป็น OCPP message

---

#### Step 3.4: Gateway ส่งคำสั่งไปยัง Charge Point (OCPP)
**ไฟล์:** `ws-gateway/src/index.ts` (handleRemoteStartTransaction)

**OCPP Message:**
```json
[
  2,
  "remote-start-1234567890",
  "RemoteStartTransaction",
  {
    "connectorId": 1,
    "idTag": "txn_1234567890"
  }
]
```

**Format OCPP:**
- `[2, messageId, action, payload]`
- `2` = CALL message type
- `messageId` = unique identifier
- `action` = OCPP action name
- `payload` = request data

---

#### Step 3.5: Charge Point ตอบกลับและเริ่มชาร์จ
**OCPP Response from Charge Point:**
```json
[
  3,
  "remote-start-1234567890",
  {
    "status": "Accepted"
  }
]
```

**Gateway ส่งต่อไปยัง Mobile App:**
```json
{
  "type": "RemoteStartTransactionResponse",
  "timestamp": "2025-11-17T11:00:01.000Z",
  "data": {
    "status": "sent",
    "message": "คำสั่งเริ่มชาร์จถูกส่งไปยัง Charge Point แล้ว",
    "messageId": "remote-start-1234567890",
    "connectorId": 1,
    "idTag": "txn_1234567890"
  }
}
```

---

#### Step 3.6: Charge Point ส่ง StartTransaction
**OCPP Message from Charge Point:**
```json
[
  2,
  "start-txn-001",
  "StartTransaction",
  {
    "connectorId": 1,
    "idTag": "txn_1234567890",
    "meterStart": 1000,
    "timestamp": "2025-11-17T11:00:02.000Z"
  }
]
```

**Gateway ประมวลผลและส่งไปยัง Mobile App:**
```json
{
  "type": "StartTransaction",
  "timestamp": "2025-11-17T11:00:02.000Z",
  "data": {
    "transactionId": 42,
    "idTag": "txn_1234567890",
    "connectorId": 1,
    "meterStart": 1000,
    "timestamp": "2025-11-17T11:00:02.000Z"
  }
}
```

**การทำงานใน Mobile App:**
1. บันทึก `transactionId` (OCPP transaction ID)
2. บันทึก `startTime`
3. เริ่มนับเวลาที่ผ่านไป
4. อัพเดท UI

---

### Phase 4: ระหว่างการชาร์จ (Charging In Progress)

#### Step 4.1: Charge Point ส่ง StatusNotification
**OCPP Message:**
```json
[
  2,
  "status-001",
  "StatusNotification",
  {
    "connectorId": 1,
    "status": "Charging",
    "errorCode": "NoError",
    "timestamp": "2025-11-17T11:00:03.000Z"
  }
]
```

**Gateway ส่งต่อไปยัง Mobile App:**
```json
{
  "type": "connectorStatus",
  "timestamp": "2025-11-17T11:00:03.000Z",
  "data": {
    "connectorId": 1,
    "status": "Charging",
    "message": "หัวชาร์จอยู่ในสถานะ Charging"
  }
}
```

---

#### Step 4.2: Charge Point ส่ง MeterValues (Real-time Data)
**OCPP Message:**
```json
[
  2,
  "meter-001",
  "MeterValues",
  {
    "connectorId": 1,
    "transactionId": 42,
    "meterValue": [
      {
        "timestamp": "2025-11-17T11:00:05.000Z",
        "sampledValue": [
          {
            "value": "5.2",
            "context": "Sample.Periodic",
            "measurand": "Energy.Active.Import.Register",
            "unit": "kWh"
          },
          {
            "value": "22.5",
            "measurand": "Power.Active.Import",
            "unit": "kW"
          },
          {
            "value": "230",
            "measurand": "Voltage",
            "unit": "V"
          },
          {
            "value": "32",
            "measurand": "Current.Import",
            "unit": "A"
          },
          {
            "value": "65",
            "measurand": "SoC",
            "unit": "Percent"
          }
        ]
      }
    ]
  }
]
```

**Gateway ประมวลผลและส่งไปยัง Mobile App:**
```json
{
  "type": "charging_data",
  "timestamp": "2025-11-17T11:00:05.000Z",
  "data": {
    "connectorId": 1,
    "status": "Charging",
    "transactionId": 42,
    "energyDelivered": 5.2,
    "currentPower": 22.5,
    "voltage": 230,
    "current": 32,
    "chargingPercentage": 65,
    "startTime": "2025-11-17T11:00:02.000Z"
  }
}
```

**Mobile App อัพเดท UI:**
- พลังงานที่ได้รับ: 5.2 kWh
- กำลังไฟปัจจุบัน: 22.5 kW
- ระดับการชาร์จ: 65%
- คำนวณค่าใช้จ่าย: 5.2 kWh × 8.50 THB/kWh = 44.20 THB

---

#### Step 4.3: Heartbeat Messages
**การทำงาน:**
1. Charge Point ส่ง Heartbeat ทุก 30 วินาที
2. Gateway ตรวจสอบการเชื่อมต่อ
3. Gateway ส่ง Heartbeat ต่อไปยัง Mobile App

**Gateway to Mobile App:**
```json
{
  "type": "heartbeat",
  "timestamp": "2025-11-17T11:00:30.000Z"
}
```

---

### Phase 5: หยุดการชาร์จ (Stop Charging)

#### Step 5.1: User กดปุ่ม "หยุดชาร์จ"
**ไฟล์:** `SuperApp/app/charge-session/index.tsx` (handleStopCharging)

**WebSocket Message:**
```json
{
  "type": "RemoteStopTransaction",
  "data": {
    "connectorId": 1,
    "transactionId": 42,
    "timestamp": "2025-11-17T11:15:00.000Z"
  }
}
```

---

#### Step 5.2: Gateway ส่งคำสั่งไปยัง Charge Point
**OCPP Message:**
```json
[
  2,
  "remote-stop-1234567890",
  "RemoteStopTransaction",
  {
    "transactionId": 42
  }
]
```

**Charge Point ตอบกลับ:**
```json
[
  3,
  "remote-stop-1234567890",
  {
    "status": "Accepted"
  }
]
```

---

#### Step 5.3: Charge Point ส่ง StopTransaction
**OCPP Message:**
```json
[
  2,
  "stop-txn-001",
  "StopTransaction",
  {
    "transactionId": 42,
    "idTag": "txn_1234567890",
    "meterStop": 1150,
    "timestamp": "2025-11-17T11:15:01.000Z",
    "reason": "Remote"
  }
]
```

**Gateway ส่งต่อไปยัง Mobile App:**
```json
{
  "type": "StopTransaction",
  "timestamp": "2025-11-17T11:15:01.000Z",
  "data": {
    "transactionId": 42,
    "idTag": "txn_1234567890",
    "meterStop": 1150,
    "reason": "Remote"
  }
}
```

---

#### Step 5.4: อัพเดท Status เป็น "Finishing"
**Gateway ส่ง connectorStatus:**
```json
{
  "type": "connectorStatus",
  "timestamp": "2025-11-17T11:15:02.000Z",
  "data": {
    "connectorId": 1,
    "status": "Finishing",
    "message": "กำลังสรุปการชาร์จ"
  }
}
```

---

### Phase 6: ดึงสรุปข้อมูลและแสดงผล

#### Step 6.1: Mobile App ขอสรุปธุรกรรมจาก Backend
**Service:** `SuperApp/services/api/transaction.service.ts`

**REST API Call:**
```http
GET /api/v1/user/transactions/{transactionId}/summary
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_1234567890",
    "chargePointIdentity": "CP001",
    "connectorNumber": 1,
    "startTime": "2025-11-17T11:00:02.000Z",
    "endTime": "2025-11-17T11:15:01.000Z",
    "durationSeconds": 899,
    "totalEnergy": 15.2,
    "meterStart": 1000,
    "meterStop": 1150,
    "totalCost": 129.20,
    "appliedRate": 8.50,
    "stopReason": "Remote"
  }
}
```

**การคำนวณ:**
- พลังงานรวม: (meterStop - meterStart) / 1000 = 15.2 kWh
- ค่าใช้จ่าย: 15.2 kWh × 8.50 THB/kWh = 129.20 THB
- ระยะเวลา: 899 วินาที ≈ 15 นาที

---

#### Step 6.2: Navigate ไปยังหน้า Summary
**Navigation:**
```typescript
router.replace({
  pathname: "/charge-session/summary",
  params: {
    transactionId: "txn_1234567890",
    energy: "15.2",
    cost: "129.20",
    durationSeconds: "899",
    startTime: "2025-11-17T11:00:02.000Z",
    endTime: "2025-11-17T11:15:01.000Z",
    meterStart: "1000",
    meterStop: "1150",
    connectorId: "1",
    chargePointIdentity: "CP001",
    chargePointName: "Charger 01",
    rate: "8.50",
    currency: "THB"
  }
});
```

**หน้า Summary แสดง:**
- เวลาเริ่ม - เวลาสิ้นสุด
- ระยะเวลาทั้งหมด
- พลังงานที่ได้รับ
- ค่าใช้จ่าย
- ปุ่มกลับหน้าหลัก

---

## รายละเอียด Components แต่ละส่วน

### 1. QR Scanner Screen

**ไฟล์:** `SuperApp/app/(tabs)/qr-scanner/index.tsx`

**หน้าที่:**
- สแกน QR Code บนเครื่องชาร์จ
- แยกข้อมูล chargePointIdentity และ connectorId
- เรียก API เพื่อขอ WebSocket URL
- จัดการ errors (ไม่มีบัตรเครดิต, เครื่องชาร์จออฟไลน์)

**Key Functions:**
- `resolveScannedPayload()`: แปลงข้อมูล QR Code
- `handleBarCodeScanned()`: จัดการเมื่อสแกนสำเร็จ
- Error handling สำหรับ 402 (NO_PAYMENT_CARDS)

---

### 2. Charge Session Screen

**ไฟล์:** `SuperApp/app/charge-session/index.tsx`

**หน้าที่:**
- เชื่อมต่อ WebSocket กับ Gateway
- แสดงสถานะการชาร์จแบบ real-time
- ส่งคำสั่ง Start/Stop charging
- นับเวลาที่ผ่านไป
- คำนวณค่าใช้จ่าย
- ดึงสรุปธุรกรรมและ navigate ไปหน้า summary

**Key States:**
- `connectionState`: สถานะการเชื่อมต่อ WebSocket
- `chargingData`: ข้อมูลการชาร์จ real-time
- `transactionSummary`: สรุปธุรกรรมจาก backend
- `activeTransactionId`: OCPP transaction ID
- `backendTransactionId`: Backend transaction ID (idTag)

**Key Functions:**
- `handleStartCharging()`: เริ่มชาร์จ
- `handleStopCharging()`: หยุดชาร์จ
- `fetchTransactionSummary()`: ดึงสรุปจาก backend
- `handleIncomingMessage()`: จัดการข้อความจาก WebSocket

---

### 3. WebSocket Gateway

**ไฟล์:** `ws-gateway/src/index.ts`

**หน้าที่:**
- จัดการ WebSocket connections 2 ประเภท:
  1. OCPP WebSocket (`/ocpp/{chargePointId}`) สำหรับเครื่องชาร์จ
  2. User WebSocket (`/user-cp/{chargePointId}/{connectorId}/{userId}`) สำหรับ Mobile App
- แปลง OCPP messages เป็นรูปแบบที่ Mobile App เข้าใจ
- ส่งต่อคำสั่งจาก Mobile App ไปยังเครื่องชาร์จ
- จัดการ session และ heartbeat
- เก็บ cache ข้อมูลเครื่องชาร์จ

**Key Components:**
- `gatewaySessionManager`: จัดการ charge point sessions
- `UserConnectionManager`: จัดการ user connections
- `handleRemoteStartTransaction()`: จัดการคำสั่งเริ่มชาร์จ
- `handleRemoteStopTransaction()`: จัดการคำสั่งหยุดชาร์จ

**OCPP Message Format:**
```
[MessageType, MessageId, Action, Payload]
- MessageType: 2 (CALL), 3 (CALLRESULT), 4 (CALLERROR)
```

---

### 4. Backend API Services

**ไฟล์:** `SuperApp/services/api/chargepoint.service.ts`

**Methods:**
- `getWebSocketUrl()`: ขอ WebSocket URL สำหรับเครื่องชาร์จ
- `getStatus()`: ขอสถานะเครื่องชาร์จ
- `startCharging()`: เริ่มชาร์จ (ถ้าใช้ REST API)
- `stopCharging()`: หยุดชาร์จ (ถ้าใช้ REST API)

**ไฟล์:** `SuperApp/services/api/transaction.service.ts`

**Methods:**
- `createTransaction()`: สร้างธุรกรรมใหม่
- `getTransactionSummary()`: ดึงสรุปธุรกรรม
- `listTransactions()`: ดึงรายการธุรกรรม

---

## WebSocket Messages และ OCPP Protocol

### User WebSocket Messages (Mobile App ↔ Gateway)

#### 1. Status Message
```json
{
  "type": "status",
  "timestamp": "2025-11-17T11:00:00.000Z",
  "data": {
    "chargePointId": "CP001",
    "connectorId": 1,
    "status": "Available",
    "isOnline": true,
    "message": "เชื่อมต่อสำเร็จ"
  }
}
```

#### 2. Connector Status
```json
{
  "type": "connectorStatus",
  "timestamp": "2025-11-17T11:00:00.000Z",
  "data": {
    "connectorId": 1,
    "status": "Charging",
    "message": "หัวชาร์จอยู่ในสถานะ Charging"
  }
}
```

**Connector Status Values:**
- `Available`: พร้อมใช้งาน
- `Preparing`: กำลังเตรียม
- `Charging`: กำลังชาร์จ
- `SuspendedEV`: รถชาร์จเต็ม
- `SuspendedEVSE`: พักจากสถานี
- `Finishing`: กำลังสรุปการชาร์จ
- `Occupied`: มีรถเสียบอยู่
- `Unavailable`: ไม่พร้อมใช้งาน
- `Faulted`: ขัดข้อง

#### 3. Charging Data
```json
{
  "type": "charging_data",
  "timestamp": "2025-11-17T11:00:05.000Z",
  "data": {
    "connectorId": 1,
    "status": "Charging",
    "transactionId": 42,
    "energyDelivered": 5.2,
    "currentPower": 22.5,
    "voltage": 230,
    "current": 32,
    "chargingPercentage": 65,
    "startTime": "2025-11-17T11:00:02.000Z"
  }
}
```

#### 4. RemoteStartTransaction Request
```json
{
  "type": "RemoteStartTransaction",
  "data": {
    "connectorId": 1,
    "idTag": "txn_1234567890",
    "timestamp": "2025-11-17T11:00:00.000Z"
  }
}
```

#### 5. RemoteStopTransaction Request
```json
{
  "type": "RemoteStopTransaction",
  "data": {
    "connectorId": 1,
    "transactionId": 42,
    "timestamp": "2025-11-17T11:15:00.000Z"
  }
}
```

#### 6. StartTransaction Notification
```json
{
  "type": "StartTransaction",
  "timestamp": "2025-11-17T11:00:02.000Z",
  "data": {
    "transactionId": 42,
    "idTag": "txn_1234567890",
    "connectorId": 1,
    "meterStart": 1000,
    "timestamp": "2025-11-17T11:00:02.000Z"
  }
}
```

#### 7. StopTransaction Notification
```json
{
  "type": "StopTransaction",
  "timestamp": "2025-11-17T11:15:01.000Z",
  "data": {
    "transactionId": 42,
    "idTag": "txn_1234567890",
    "meterStop": 1150,
    "reason": "Remote"
  }
}
```

#### 8. Heartbeat
```json
{
  "type": "heartbeat",
  "timestamp": "2025-11-17T11:00:30.000Z"
}
```

#### 9. Error Message
```json
{
  "type": "error",
  "timestamp": "2025-11-17T11:00:00.000Z",
  "data": {
    "message": "Charge point is not connected",
    "code": "CHARGE_POINT_OFFLINE"
  }
}
```

---

### OCPP Messages (Gateway ↔ Charge Point)

#### Message Format
```
[MessageType, MessageId, Action, Payload]
```

**MessageType:**
- `2`: CALL (Request)
- `3`: CALLRESULT (Response)
- `4`: CALLERROR (Error)

#### 1. RemoteStartTransaction (CALL)
```json
[
  2,
  "remote-start-1234567890",
  "RemoteStartTransaction",
  {
    "connectorId": 1,
    "idTag": "txn_1234567890"
  }
]
```

**Response (CALLRESULT):**
```json
[
  3,
  "remote-start-1234567890",
  {
    "status": "Accepted"
  }
]
```

#### 2. StartTransaction (CALL from Charge Point)
```json
[
  2,
  "start-txn-001",
  "StartTransaction",
  {
    "connectorId": 1,
    "idTag": "txn_1234567890",
    "meterStart": 1000,
    "timestamp": "2025-11-17T11:00:02.000Z"
  }
]
```

**Response (CALLRESULT from Gateway):**
```json
[
  3,
  "start-txn-001",
  {
    "transactionId": 42,
    "idTagInfo": {
      "status": "Accepted"
    }
  }
]
```

#### 3. MeterValues (CALL from Charge Point)
```json
[
  2,
  "meter-001",
  "MeterValues",
  {
    "connectorId": 1,
    "transactionId": 42,
    "meterValue": [
      {
        "timestamp": "2025-11-17T11:00:05.000Z",
        "sampledValue": [
          {
            "value": "5.2",
            "context": "Sample.Periodic",
            "measurand": "Energy.Active.Import.Register",
            "unit": "kWh"
          },
          {
            "value": "22.5",
            "measurand": "Power.Active.Import",
            "unit": "kW"
          }
        ]
      }
    ]
  }
]
```

#### 4. StatusNotification (CALL from Charge Point)
```json
[
  2,
  "status-001",
  "StatusNotification",
  {
    "connectorId": 1,
    "status": "Charging",
    "errorCode": "NoError",
    "timestamp": "2025-11-17T11:00:03.000Z"
  }
]
```

#### 5. RemoteStopTransaction (CALL)
```json
[
  2,
  "remote-stop-1234567890",
  "RemoteStopTransaction",
  {
    "transactionId": 42
  }
]
```

#### 6. StopTransaction (CALL from Charge Point)
```json
[
  2,
  "stop-txn-001",
  "StopTransaction",
  {
    "transactionId": 42,
    "idTag": "txn_1234567890",
    "meterStop": 1150,
    "timestamp": "2025-11-17T11:15:01.000Z",
    "reason": "Remote"
  }
]
```

#### 7. Heartbeat (CALL from Charge Point)
```json
[
  2,
  "heartbeat-001",
  "Heartbeat",
  {}
]
```

**Response:**
```json
[
  3,
  "heartbeat-001",
  {
    "currentTime": "2025-11-17T11:00:30.000Z"
  }
]
```

---

## REST API Endpoints

### Authentication Endpoints
```
POST /api/v1/user/auth/login
POST /api/v1/user/auth/register
POST /api/v1/user/auth/refresh
GET  /api/v1/user/auth/me
```

### Chargepoint Endpoints
```
GET  /api/chargepoints/{identity}/{connectorId}/websocket-url?userId={userId}
     - ขอ WebSocket URL สำหรับเชื่อมต่อ

GET  /api/chargepoints/{identity}/status?userId={userId}
     - ขอสถานะเครื่องชาร์จ

GET  /api/chargepoints/{identity}
     - ขอข้อมูลเครื่องชาร์จ

GET  /api/v1/user/chargepoints
     - ดึงรายการเครื่องชาร์จทั้งหมด
```

### Station Endpoints
```
GET  /api/v1/user/stations?page={page}&limit={limit}
     - ดึงรายการสถานีชาร์จ

GET  /api/v1/user/stations/nearby?latitude={lat}&longitude={lng}&radius={km}
     - ค้นหาสถานีใกล้เคียง

GET  /api/v1/user/stations/{stationId}
     - ดึงข้อมูลสถานีเฉพาะ
```

### Transaction Endpoints
```
POST /api/v1/user/transactions
     Body: {
       "chargePointIdentity": "CP001",
       "connectorId": 1,
       "userId": "user123",
       "websocketUrl": "ws://..."
     }
     - สร้างธุรกรรมใหม่

GET  /api/v1/user/transactions/{transactionId}/summary
     - ดึงสรุปธุรกรรม

GET  /api/v1/user/transactions
     - ดึงประวัติธุรกรรม

GET  /api/v1/user/transactions/{transactionId}
     - ดึงข้อมูลธุรกรรมเฉพาะ
```

### Payment Endpoints
```
GET  /api/v1/user/payments/cards
     - ดึงรายการบัตรเครดิต

POST /api/v1/user/payments/cards
     - เพิ่มบัตรเครดิต

DELETE /api/v1/user/payments/cards/{cardId}
     - ลบบัตรเครดิต

POST /api/v1/user/payments/cards/{cardId}/default
     - ตั้งบัตรเป็นค่าเริ่มต้น
```

---

## การจัดการ Errors และ Edge Cases

### 1. ไม่มีบัตรเครดิต (402 Payment Required)
**When:** ขอ WebSocket URL
**Error:**
```json
{
  "success": false,
  "status": 402,
  "code": "NO_PAYMENT_CARDS",
  "message": "กรุณาเพิ่มบัตรเครดิตก่อนใช้งานเครื่องชาร์จ"
}
```
**Action:** แสดง Alert พร้อมปุ่มไปหน้าเพิ่มบัตร

---

### 2. Session หมดอายุ (401 Unauthorized)
**When:** API call ใดๆ
**Action:**
- ล้าง tokens และ credentials
- แสดง Alert
- Navigate ไปหน้า login

---

### 3. Charge Point ออฟไลน์
**When:** เชื่อมต่อ User WebSocket
**Error:**
```json
{
  "type": "error",
  "data": {
    "message": "Charge point is not connected",
    "code": "CHARGE_POINT_OFFLINE"
  }
}
```
**Action:** แสดง error message และปิด WebSocket

---

### 4. Transaction ไม่พบ
**When:** ขอสรุปธุรกรรม
**Action:** แสดง error และให้ user กลับหน้าหลัก

---

### 5. WebSocket Connection Lost
**Detection:**
- `ws.onclose` event
- `ws.onerror` event

**Action:**
- อัพเดท `connectionState` เป็น "closed" หรือ "error"
- แสดงสถานะในหน้า UI
- ไม่ auto-reconnect (ให้ user กลับไปสแกนใหม่)

---

### 6. Connector ไม่พร้อมใช้งาน
**When:** กดปุ่มเริ่มชาร์จ
**Condition:** Status ไม่ใช่ preparing, suspended_ev, suspended_evse, occupied

**Action:** แสดง Alert "ไม่สามารถเริ่มชาร์จได้"

---

### 7. ไม่มี Transaction ID เมื่อหยุดชาร์จ
**When:** กดปุ่มหยุดชาร์จ
**Condition:** `activeTransactionId` และ `backendTransactionId` เป็น null

**Action:** แสดง Alert "ไม่พบธุรกรรม โปรดลองใหม่อีกครั้ง"

---

## สรุป

ระบบชาร์จรถยนต์ไฟฟ้า SuperApp ใช้การผสมผสานระหว่าง **REST API** และ **WebSocket** เพื่อให้ได้ประสิทธิภาพสูงสุด:

### REST API ใช้สำหรับ:
1. Authentication และ authorization
2. สร้าง transaction records
3. ดึงข้อมูล master data (stations, chargepoints)
4. ดึงสรุปธุรกรรมหลังชาร์จเสร็จ
5. จัดการ payment methods

### WebSocket ใช้สำหรับ:
1. การเชื่อมต่อแบบ real-time กับเครื่องชาร์จ
2. ส่งคำสั่ง start/stop charging
3. รับข้อมูลการชาร์จแบบ real-time (power, energy, SoC)
4. รับการแจ้งเตือนสถานะการชาร์จ
5. Heartbeat เพื่อตรวจสอบการเชื่อมต่อ

### OCPP Protocol:
- ใช้ OCPP 1.6 (รองรับ 2.0 ด้วย)
- Message format: `[MessageType, MessageId, Action, Payload]`
- Gateway แปลงระหว่าง OCPP messages และ user-friendly messages

### Flow สรุป:
```
QR Scan → REST API (WebSocket URL) → WebSocket Connect → 
REST API (Create Transaction) → WebSocket (Start) → 
OCPP (Charging Data) → WebSocket (Real-time Updates) → 
WebSocket (Stop) → OCPP (Stop Transaction) → 
REST API (Summary) → Display Results
```

ระบบนี้ออกแบบมาเพื่อให้ผู้ใช้สามารถติดตามสถานะการชาร์จแบบ real-time พร้อมกับความปลอดภัยและความน่าเชื่อถือจาก REST API สำหรับข้อมูลสำคัญ
