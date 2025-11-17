# คู่มืออ้างอิงด่วน - ระบบชาร์จรถยนต์ไฟฟ้า SuperApp

## 📋 สารบัญ

1. [ส่วนประกอบหลักของระบบ](#ส่วนประกอบหลักของระบบ)
2. [การทำงานแบบย่อ (Quick Flow)](#การทำงานแบบย่อ-quick-flow)
3. [REST API ที่สำคัญ](#rest-api-ที่สำคัญ)
4. [WebSocket Messages](#websocket-messages)
5. [OCPP Messages](#ocpp-messages)
6. [สถานะต่างๆ](#สถานะต่างๆ)
7. [การแก้ไข Errors](#การแก้ไข-errors)

---

## ส่วนประกอบหลักของระบบ

### 1. 📱 SuperApp (Mobile Application)
- **เทคโนโลยี**: React Native + TypeScript
- **หน้าที่**: แอปพลิเคชันสำหรับผู้ใช้งาน
- **ไฟล์สำคัญ**:
  - `app/(tabs)/qr-scanner/index.tsx` - สแกน QR Code
  - `app/charge-session/index.tsx` - หน้าจอการชาร์จ
  - `services/api/chargepoint.service.ts` - API สำหรับเครื่องชาร์จ
  - `services/api/transaction.service.ts` - API สำหรับธุรกรรม

### 2. 🌐 WebSocket Gateway
- **เทคโนโลยี**: Node.js + TypeScript + ws library
- **หน้าที่**: ตัวกลางระหว่าง Mobile App และเครื่องชาร์จ
- **ไฟล์สำคัญ**:
  - `ws-gateway/src/index.ts` - Main server
  - `ws-gateway/src/handlers/gatewaySessionManager.ts` - จัดการ sessions
  - `ws-gateway/src/services/UserConnectionManager.ts` - จัดการ user connections

### 3. 🖥️ Backend API
- **เทคโนโลยี**: Node.js + Express + Prisma + PostgreSQL
- **หน้าที่**: จัดการข้อมูล users, transactions, payments
- **Endpoints หลัก**:
  - `/api/chargepoints/...` - เครื่องชาร์จ
  - `/api/v1/user/...` - ผู้ใช้
  - `/api/v1/user/transactions/...` - ธุรกรรม

### 4. ⚡ Charging Stations
- **เทคโนโลยี**: OCPP 1.6 / 2.0
- **หน้าที่**: เครื่องชาร์จรถยนต์ไฟฟ้าจริง
- **การสื่อสาร**: WebSocket + OCPP Protocol

---

## การทำงานแบบย่อ (Quick Flow)

```
1. สแกน QR Code
   ↓
2. ขอ WebSocket URL จาก Backend (REST API)
   ↓
3. เชื่อมต่อ WebSocket กับ Gateway
   ↓
4. สร้าง Transaction (REST API)
   ↓
5. ส่งคำสั่งเริ่มชาร์จ (WebSocket)
   ↓
6. รับข้อมูล Real-time (WebSocket)
   ├─ พลังงานที่ได้รับ (kWh)
   ├─ กำลังไฟ (kW)
   ├─ แรงดัน, กระแส (V, A)
   └─ ระดับแบตเตอรี่ (%)
   ↓
7. ส่งคำสั่งหยุดชาร์จ (WebSocket)
   ↓
8. ขอสรุปธุรกรรม (REST API)
   ↓
9. แสดงผลสรุป
```

---

## REST API ที่สำคัญ

### 🔐 Authentication
```http
POST /api/v1/user/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {...}
  }
}
```

### ⚡ ขอ WebSocket URL
```http
GET /api/chargepoints/{chargePointIdentity}/{connectorId}/websocket-url?userId={userId}
Authorization: Bearer {accessToken}

Response (Success):
{
  "success": true,
  "data": {
    "websocketUrl": "ws://gateway:3000/user-cp/CP001/1/user123",
    "chargePoint": {
      "chargePointIdentity": "CP001",
      "name": "Charger 01",
      "powerRating": 150,
      "brand": "ABB"
    },
    "pricingTier": {
      "baseRate": 8.50,
      "currency": "THB"
    }
  }
}

Response (Error - No Payment Card):
{
  "success": false,
  "status": 402,
  "code": "NO_PAYMENT_CARDS",
  "message": "กรุณาเพิ่มบัตรเครดิตก่อนใช้งานเครื่องชาร์จ"
}
```

### 📝 สร้าง Transaction
```http
POST /api/v1/user/transactions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "chargePointIdentity": "CP001",
  "connectorId": 1,
  "userId": "user123",
  "websocketUrl": "ws://..."
}

Response:
{
  "success": true,
  "data": {
    "transactionId": "txn_1234567890",
    "status": "PENDING",
    "createdAt": "2025-11-17T11:00:00.000Z"
  }
}
```

### 📊 ขอสรุปธุรกรรม
```http
GET /api/v1/user/transactions/{transactionId}/summary
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "transactionId": "txn_1234567890",
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

---

## WebSocket Messages

### 📡 เชื่อมต่อ WebSocket
```javascript
const ws = new WebSocket(
  "ws://gateway:3000/user-cp/CP001/1/user123"
);

ws.onopen = () => {
  console.log("เชื่อมต่อสำเร็จ");
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("ได้รับข้อความ:", message);
};
```

### ✉️ Message Types (Mobile App → Gateway)

#### 1. เริ่มชาร์จ (RemoteStartTransaction)
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

#### 2. หยุดชาร์จ (RemoteStopTransaction)
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

### 📨 Message Types (Gateway → Mobile App)

#### 1. สถานะเริ่มต้น
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

#### 2. สถานะหัวชาร์จ
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

#### 3. ข้อมูลการชาร์จ Real-time
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

#### 4. การเริ่มธุรกรรม
```json
{
  "type": "StartTransaction",
  "timestamp": "2025-11-17T11:00:02.000Z",
  "data": {
    "transactionId": 42,
    "idTag": "txn_1234567890",
    "connectorId": 1,
    "meterStart": 1000
  }
}
```

#### 5. การหยุดธุรกรรม
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

#### 6. Heartbeat
```json
{
  "type": "heartbeat",
  "timestamp": "2025-11-17T11:00:30.000Z"
}
```

#### 7. Error
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

## OCPP Messages

### 📐 รูปแบบ OCPP Message
```
[MessageType, MessageId, Action, Payload]
```

**MessageType:**
- `2` = CALL (Request)
- `3` = CALLRESULT (Response)
- `4` = CALLERROR (Error)

### 🔌 OCPP Actions ที่สำคัญ

#### 1. RemoteStartTransaction
```json
[
  2,
  "remote-start-123",
  "RemoteStartTransaction",
  {
    "connectorId": 1,
    "idTag": "txn_1234567890"
  }
]
```

#### 2. StartTransaction
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

#### 3. MeterValues
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

#### 4. StatusNotification
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

#### 5. RemoteStopTransaction
```json
[
  2,
  "remote-stop-123",
  "RemoteStopTransaction",
  {
    "transactionId": 42
  }
]
```

#### 6. StopTransaction
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

#### 7. Heartbeat
```json
[
  2,
  "heartbeat-001",
  "Heartbeat",
  {}
]
```

---

## สถานะต่างๆ

### 🔌 Connector Status

| Status | ภาษาไทย | คำอธิบาย |
|--------|---------|----------|
| `Available` | พร้อมใช้งาน | หัวชาร์จว่าง พร้อมให้บริการ |
| `Preparing` | กำลังเตรียม | กำลังเตรียมพร้อมสำหรับการชาร์จ |
| `Charging` | กำลังชาร์จ | กำลังชาร์จอยู่ |
| `SuspendedEV` | รถชาร์จเต็ม | รถแบตเตอรี่เต็ม หยุดชาร์จโดยรถ |
| `SuspendedEVSE` | พักจากสถานี | หยุดชาร์จโดยสถานี |
| `Finishing` | กำลังสรุป | กำลังสรุปการชาร์จ |
| `Occupied` | มีรถเสียบอยู่ | มีปลั๊กเสียบอยู่แต่ยังไม่ชาร์จ |
| `Unavailable` | ไม่พร้อมใช้งาน | หัวชาร์จไม่พร้อมใช้งาน |
| `Faulted` | ขัดข้อง | หัวชาร์จมีปัญหา |

### 📊 Transaction Status

| Status | ภาษาไทย | คำอธิบาย |
|--------|---------|----------|
| `PENDING` | รอดำเนินการ | สร้าง transaction แล้ว รอเริ่มชาร์จ |
| `ACTIVE` | กำลังดำเนินการ | กำลังชาร์จอยู่ |
| `COMPLETED` | เสร็จสิ้น | ชาร์จเสร็จสิ้นแล้ว |
| `CANCELLED` | ยกเลิก | ยกเลิกการชาร์จ |
| `FAILED` | ล้มเหลว | การชาร์จล้มเหลว |

### 🔗 WebSocket Connection State

| State | ภาษาไทย | คำอธิบาย |
|-------|---------|----------|
| `connecting` | กำลังเชื่อมต่อ | กำลังพยายามเชื่อมต่อ |
| `connected` | เชื่อมต่อแล้ว | เชื่อมต่อสำเร็จ |
| `error` | เกิดข้อผิดพลาด | เกิดข้อผิดพลาดในการเชื่อมต่อ |
| `closed` | ปิดการเชื่อมต่อ | การเชื่อมต่อถูกปิด |

---

## การแก้ไข Errors

### ❌ Error Codes และวิธีแก้ไข

#### 1. `401 Unauthorized` - Session หมดอายุ
**สาเหตุ:** Token หมดอายุหรือไม่ถูกต้อง

**วิธีแก้ไข:**
```typescript
// 1. ล้าง tokens และ credentials
await clearTokens();
await clearCredentials();

// 2. แสดง Alert
Alert.alert("เซสชันหมดอายุ", "กรุณาเข้าสู่ระบบใหม่");

// 3. Navigate ไปหน้า login
router.replace("/login");
```

---

#### 2. `402 Payment Required` - ไม่มีบัตรเครดิต
**สาเหตุ:** ผู้ใช้ยังไม่ได้เพิ่มบัตรเครดิต

**วิธีแก้ไข:**
```typescript
Alert.alert(
  "กรุณาเพิ่มบัตร",
  "กรุณาเพิ่มบัตรเครดิตก่อนใช้งานเครื่องชาร์จ",
  [
    { text: "ยกเลิก", style: "cancel" },
    { 
      text: "เพิ่มบัตร",
      onPress: () => router.push("/card")
    }
  ]
);
```

---

#### 3. `CHARGE_POINT_OFFLINE` - เครื่องชาร์จออฟไลน์
**สาเหตุ:** เครื่องชาร์จไม่ได้เชื่อมต่อกับ Gateway

**วิธีแก้ไข:**
```typescript
ws.send(JSON.stringify({
  type: 'error',
  data: {
    message: 'Charge point is not connected',
    code: 'CHARGE_POINT_OFFLINE'
  }
}));

// ปิด WebSocket connection
ws.close();

// แจ้งผู้ใช้
Alert.alert(
  "เครื่องชาร์จออฟไลน์",
  "เครื่องชาร์จไม่ได้เชื่อมต่อกับระบบ กรุณาลองใหม่อีกครั้ง"
);
```

---

#### 4. `INVALID_TRANSACTION_ID` - Transaction ID ไม่ถูกต้อง
**สาเหตุ:** Transaction ID เป็น null หรือไม่ใช่ตัวเลข

**วิธีแก้ไข:**
```typescript
// ตรวจสอบ Transaction ID ก่อนส่งคำสั่ง
const transactionId = activeTransactionId ?? chargingData?.transactionId;

if (transactionId === null || !Number.isFinite(transactionId)) {
  Alert.alert(
    "ไม่พบธุรกรรม",
    "ระบบยังไม่ได้รับ Transaction ID จากสถานี โปรดลองใหม่อีกครั้ง"
  );
  return;
}
```

---

#### 5. WebSocket Connection Lost
**สาเหตุ:** การเชื่อมต่อ WebSocket ขาดหาย

**วิธีจัดการ:**
```typescript
ws.onclose = () => {
  setConnectionState("closed");
  
  // อัพเดท UI
  // ไม่ auto-reconnect (ให้ user กลับไปสแกนใหม่)
};

ws.onerror = (event) => {
  setConnectionState("error");
  
  Alert.alert(
    "การเชื่อมต่อมีปัญหา",
    "ไม่สามารถเชื่อมต่อกับเครื่องชาร์จได้ กรุณาลองใหม่อีกครั้ง"
  );
};
```

---

#### 6. Network Error
**สาเหตุ:** ไม่มีอินเทอร์เน็ตหรือเซิร์ฟเวอร์ไม่ตอบสนอง

**วิธีจัดการ:**
```typescript
try {
  const response = await api.get(...);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    Alert.alert(
      "ไม่สามารถเชื่อมต่อ",
      "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
      [
        { text: "ลองใหม่", onPress: () => retry() },
        { text: "ยกเลิก", style: "cancel" }
      ]
    );
  }
}
```

---

## 💡 Tips และ Best Practices

### 1. การตรวจสอบ Connection State
```typescript
// ตรวจสอบก่อนส่งคำสั่ง
if (connectionState !== "connected") {
  Alert.alert("ไม่สามารถส่งคำสั่งได้", "ยังไม่ได้เชื่อมต่อกับเครื่องชาร์จ");
  return;
}

// ตรวจสอบ WebSocket readyState
if (!ws || ws.readyState !== WebSocket.OPEN) {
  appendLog("error", "ยังไม่ได้เชื่อมต่อ WebSocket");
  return false;
}
```

### 2. การจัดการ Transaction ID
```typescript
// เก็บ Transaction ID 2 แบบ
const [activeTransactionId, setActiveTransactionId] = useState(null); // OCPP transaction ID
const [backendTransactionId, setBackendTransactionId] = useState(null); // Backend transaction ID

// ใช้ idTag เป็น backend transaction ID
const idTag = backendTransactionId; // "txn_1234567890"
```

### 3. การคำนวณค่าใช้จ่าย
```typescript
// ใช้ rate จาก backend เป็นหลัก
const effectiveRate = baseRate ?? transactionSummary?.appliedRate;

// คำนวณ cost
const cost = energyKWh * effectiveRate;
```

### 4. การจัดการเวลา
```typescript
// บันทึกเวลาเริ่มต้น
const startTimestamp = new Date().toISOString();
setSessionStartTime(startTimestamp);

// คำนวณเวลาที่ผ่านไป
const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
setElapsedSeconds(elapsed);
```

### 5. การ Format ข้อมูล
```typescript
// Format เลขทศนิยม
const formatNumber = (value, fractionDigits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(fractionDigits);
};

// Format เวลา
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours} ชม. ${minutes} นาที ${secs} วินาที`;
  }
  return `${minutes} นาที ${secs} วินาที`;
};

// Format ราคา
const formatCurrency = (value, currency = "บาท") => {
  if (value === undefined || value === null) {
    return `0.00 ${currency}`;
  }
  return `${value.toFixed(2)} ${currency}`;
};
```

---

## 📚 อ้างอิง

### เอกสารเพิ่มเติม
- `WEBSOCKET_FLOW_DOCUMENTATION.md` - เอกสารครบถ้วนทั้งหมด
- `FLOW_DIAGRAM.md` - ไดอะแกรม Mermaid 10 แผนภาพ
- `PROJECT_STRUCTURE.md` - โครงสร้างโปรเจ็กต์
- `API_DOCUMENTATION.md` - เอกสาร API (ถ้ามี)

### ไฟล์สำคัญ
- `SuperApp/app/(tabs)/qr-scanner/index.tsx`
- `SuperApp/app/charge-session/index.tsx`
- `SuperApp/services/api/chargepoint.service.ts`
- `SuperApp/services/api/transaction.service.ts`
- `ws-gateway/src/index.ts`
- `charging-websocket-api/src/index.ts`

### OCPP Documentation
- [OCPP 1.6 Specification](https://www.openchargealliance.org/protocols/ocpp-16/)
- [OCPP 2.0.1 Specification](https://www.openchargealliance.org/protocols/ocpp-201/)

---

## 🎯 สรุป

ระบบชาร์จรถยนต์ไฟฟ้า SuperApp ใช้:
- **REST API** สำหรับ: Authentication, Create Transaction, Get Summary
- **WebSocket** สำหรับ: Real-time data, Start/Stop commands
- **OCPP Protocol** สำหรับ: การสื่อสารกับเครื่องชาร์จ

การทำงานหลัก: **QR Scan → REST API → WebSocket → OCPP → Real-time Updates → Summary**
