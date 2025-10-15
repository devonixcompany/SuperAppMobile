Builder

Used 1 context

จากการวิเคราะห์ `schema.prisma` ผมจะอธิบายรายละเอียดของแต่ละตารางและตัวแปรให้คุณฟังครับ:

## 📊 โครงสร้างฐานข้อมูล CSMS
### 1. ตาราง User (ผู้ใช้งาน)
```
model User {
  id          String   @id @default(cuid())     // รหัสผู้ใช้ (Primary 
  Key)
  phoneNumber String   @unique                  // เบอร์โทรศัพท์ 
  (ใช้สำหรับล็อกอิน)
  name        String?                          // ชื่อผู้ใช้ (ไม่บังคับ)
  email       String?                          // อีเมล (ไม่บังคับ)
  status      UserStatus @default(ACTIVE)      // สถานะ: ACTIVE, 
  BLOCKED, EXPIRED
  createdAt   DateTime @default(now())         // วันที่สร้าง
  updatedAt   DateTime @updatedAt              // วันที่อัปเดตล่าสุด
}
```
หน้าที่ : จัดเก็บข้อมูลผู้ใช้ที่ลงทะเบียนด้วยเบอร์โทรศัพท์

### 2. ตาราง UserVehicle (รถยนต์ของผู้ใช้)
```
model UserVehicle {
  id           String    @id @default(cuid())   // รหัสรถ
  userId       String                           // รหัสผู้ใช้ (Foreign 
  Key)
  licensePlate String    @unique                // ทะเบียนรถ (ไม่ซ้ำ)
  make         String?                          // ยี่ห้อรถ (เช่น Tesla, 
  BMW)
  model        String?                          // รุ่นรถ (เช่น Model 3, 
  i3)
  type         VehicleType @default(ELECTRIC)   // ประเภท: ELECTRIC, 
  HYBRID, PLUGIN_HYBRID
}
```
หน้าที่ : เก็บข้อมูลรถยนต์ของผู้ใช้แต่ละคน (1 คนมีได้หลายคัน)

### 3. ตาราง ChargePoint (เครื่องชาร์จ)
```
model ChargePoint {
  id              String           @id           // รหัสเครื่องชาร์จ
  name            String                         // ชื่อเครื่องชาร์จ
  location        String                         // ที่อยู่
  latitude        Float?                         // พิกัด GPS (ละติจูด)
  longitude       Float?                         // พิกัด GPS (ลองจิจูด)
  protocol        OCPPVersion                    // เวอร์ชัน OCPP: 
  OCPP16, OCPP20, OCPP21
  status          ChargePointStatus @default(AVAILABLE) // สถานะ: 
  AVAILABLE, OCCUPIED, UNAVAILABLE, FAULTED, MAINTENANCE
  maxPower        Float?                         // กำลังไฟสูงสุด (kW)
  connectorCount  Int              @default(1)   // จำนวน connector
}
```
หน้าที่ : เก็บข้อมูลเครื่องชาร์จแต่ละตัว รวมถึงตำแหน่งและข้อมูลทางเทคนิค

### 4. ตาราง Connector (หัวชาร์จ)
```
model Connector {
  id             String             @id @default(cuid()) // รหัส 
  connector
  chargePointId  String                                  // 
  รหัสเครื่องชาร์จ (Foreign Key)
  connectorId    Int                                     // หมายเลข 
  connector (1, 2, 3...)
  type           ConnectorType      @default(TYPE_2)     // ประเภท: 
  TYPE_1, TYPE_2, CHADEMO, CCS_COMBO_1, CCS_COMBO_2, TESLA, GB_T
  status         ConnectorStatus    @default(AVAILABLE)  // สถานะ: 
  AVAILABLE, OCCUPIED, RESERVED, UNAVAILABLE, FAULTED
  maxPower       Float?                                  // 
  กำลังไฟสูงสุด (kW)
  maxCurrent     Float?                                  // กระแสสูงสุด 
  (A)
}
```
หน้าที่ : เก็บข้อมูลหัวชาร์จแต่ละตัว (1 เครื่องชาร์จมีได้หลาย connector)

### 5. ตาราง Transaction (ธุรกรรมการชาร์จ)
```
model Transaction {
  id             String           @id @default(cuid())   // รหัสธุรกรรม
  transactionId  String           @unique                // 
  รหัสธุรกรรมจาก OCPP
  userId         String                                  // รหัสผู้ใช้
  vehicleId      String?                                 // รหัสรถ 
  (ไม่บังคับ)
  chargePointId  String                                  // 
  รหัสเครื่องชาร์จ
  connectorId    String                                  // รหัส 
  connector
  startTime      DateTime                                // 
  เวลาเริ่มชาร์จ
  endTime        DateTime?                               // 
  เวลาสิ้นสุดชาร์จ
  startMeterValue Float           @default(0)            // 
  ค่ามิเตอร์ตอนเริ่ม (kWh)
  endMeterValue   Float?                                 // 
  ค่ามิเตอร์ตอนสิ้นสุด (kWh)
  totalEnergy     Float?                                 // 
  พลังงานทั้งหมด (kWh)
  totalCost       Float?                                 // 
  ค่าใช้จ่ายทั้งหมด
  status          TransactionStatus @default(ACTIVE)     // สถานะ: 
  ACTIVE, COMPLETED, FAILED, CANCELED
  stopReason     String?                                 // เหตุผลที่หยุด
}
```
หน้าที่ : บันทึกการชาร์จแต่ละครั้ง รวมถึงข้อมูลพลังงานและค่าใช้จ่าย

### 6. ตาราง MeterValue (ค่ามิเตอร์)
```
model MeterValue {
  id            String   @id @default(cuid())  // รหัสค่ามิเตอร์
  transactionId String                         // รหัสธุรกรรม (Foreign 
  Key)
  timestamp     DateTime                       // เวลาที่บันทึก
  value         Float                          // ค่ามิเตอร์ (kWh)
  power         Float?                         // กำลังไฟ (kW)
  current       Float?                         // กระแส (A)
  voltage       Float?                         // แรงดัน (V)
}
```
หน้าที่ : เก็บค่ามิเตอร์แบบ Real-time ระหว่างการชาร์จ

### 7. ตาราง ChargingSession (เซสชันการชาร์จ)
```
model ChargingSession {
  id            String           @id @default(cuid())    // รหัสเซสชัน
  sessionId     String           @unique                 // 
  รหัสเซสชันจากระบบ
  chargePointId String                                   // 
  รหัสเครื่องชาร์จ
  connectorId   String                                   // รหัส 
  connector
  userId        String?                                  // รหัสผู้ใช้ 
  (ไม่บังคับ)
  status        SessionStatus    @default(ACTIVE)        // สถานะ: 
  ACTIVE, COMPLETED, FAILED, TIMEOUT
  startTime     DateTime         @default(now())         // เวลาเริ่ม
  endTime       DateTime?                                // เวลาสิ้นสุด
  lastActivity  DateTime         @default(now())         // กิจกรรมล่าสุด
}
```
หน้าที่ : ติดตามเซสชันการชาร์จแบบ Real-time

### 8. ตาราง Reservation (การจองเครื่องชาร์จ)
```
model Reservation {
  id            String           @id @default(cuid())    // รหัสการจอง
  userId        String                                   // รหัสผู้ใช้
  chargePointId String                                   // 
  รหัสเครื่องชาร์จ
  connectorId   String?                                  // รหัส 
  connector (ไม่บังคับ)
  startTime     DateTime                                 // เวลาเริ่มจอง
  endTime       DateTime                                 // 
  เวลาสิ้นสุดจอง
  status        ReservationStatus @default(ACTIVE)       // สถานะ: 
  ACTIVE, COMPLETED, CANCELED, EXPIRED
}
```
หน้าที่ : จัดการการจองเครื่องชาร์จล่วงหน้า

### 9. ตาราง ChargingProfile (โปรไฟล์การชาร์จ)
```
model ChargingProfile {
  id                String   @id @default(cuid())       // รหัสโปรไฟล์
  chargePointId     String?                             // 
  รหัสเครื่องชาร์จ (ไม่บังคับ)
  connectorId       String?                             // รหัส 
  connector (ไม่บังคับ)
  name              String                              // ชื่อโปรไฟล์
  description       String?                             // คำอธิบาย
  chargingRateUnit  RateUnit @default(A)                // หน่วย: A 
  (แอมแปร์), W (วัตต์), kW (กิโลวัตต์)
  chargingSchedule  Json                                // 
  ตารางเวลาการชาร์จ (JSON)
  stackLevel        Int      @default(1)                // ระดับความสำคัญ
  validFrom         DateTime?                           // 
  วันที่เริ่มใช้งาน
  validTo           DateTime?                           // วันที่สิ้นสุด
}
```
หน้าที่ : กำหนดโปรไฟล์การชาร์จ เช่น ตารางเวลา อัตราการชาร์จ

### 10. ตาราง OCPPMessage (ข้อความ OCPP)
```
model OCPPMessage {
  id          String       @id @default(cuid())         // รหัสข้อความ
  messageId   String                                    // 
  รหัสข้อความจาก OCPP
  chargePointId String                                  // 
  รหัสเครื่องชาร์จ
  direction   MessageDirection                          // ทิศทาง: 
  INBOUND (เข้า), OUTBOUND (ออก)
  action      String                                    // ชื่อ action 
  (BootNotification, StartTransaction, etc.)
  payload     Json                                      // ข้อมูลที่ส่ง 
  (JSON)
  timestamp   DateTime     @default(now())              // เวลาที่ส่ง
}
```
หน้าที่ : บันทึกข้อความ OCPP ทั้งหมดเพื่อการ Debug และ Audit

### 11. ตาราง Notification (การแจ้งเตือน)
```
model Notification {
  id        String           @id @default(cuid())       // 
  รหัสการแจ้งเตือน
  userId    String?                                     // รหัสผู้ใช้ 
  (ไม่บังคับ - สำหรับแจ้งเตือนทั่วไป)
  title     String                                      // หัวข้อ
  message   String                                      // ข้อความ
  type      NotificationType                            // ประเภท: 
  CHARGING_STARTED, CHARGING_STOPPED, CHARGING_COMPLETED, 
  PAYMENT_REQUIRED, SYSTEM_MAINTENANCE, GENERAL
  isRead    Boolean          @default(false)            // 
  อ่านแล้วหรือยัง
  createdAt DateTime         @default(now())            // วันที่สร้าง
}
```
หน้าที่ : จัดการการแจ้งเตือนให้ผู้ใช้

## 🔗 ความสัมพันธ์ระหว่างตาราง
1. 1.
   User → UserVehicle (1:N) - ผู้ใช้หนึ่งคนมีรถได้หลายคัน
2. 2.
   User → Transaction (1:N) - ผู้ใช้หนึ่งคนมีธุรกรรมได้หลายครั้ง
3. 3.
   ChargePoint → Connector (1:N) - เครื่องชาร์จหนึ่งตัวมี connector ได้หลายตัว
4. 4.
   Transaction → MeterValue (1:N) - ธุรกรรมหนึ่งครั้งมีค่ามิเตอร์หลายจุด
5. 5.
   ChargePoint → ChargingSession (1:N) - เครื่องชาร์จหนึ่งตัวมีเซสชันได้หลายครั้ง
## 💡 จุดเด่นของการออกแบบ
1. 1.
   ครอบคลุมครบถ้วน : มีตารางสำหรับทุกส่วนของระบบ CSMS
2. 2.
   รองรับ OCPP : มีตาราง OCPPMessage สำหรับบันทึกข้อความทั้งหมด
3. 3.
   Real-time Monitoring : มี ChargingSession และ MeterValue สำหรับติดตามแบบเรียลไทม์
4. 4.
   Flexible : รองรับเครื่องชาร์จหลายประเภทและ OCPP หลายเวอร์ชัน
5. 5.
   User-friendly : ลงทะเบียนด้วยเบอร์โทรศัพท์ มีระบบแจ้งเตือน
ฐานข้อมูลนี้ออกแบบมาเพื่อรองรับการทำงานของระบบ CSMS อย่างครบถ้วน ตั้งแต่การจัดการผู้ใช้ เครื่องชาร์จ การชาร์จ ไปจนถึงการแจ้งเตือนและการจอง

Piyathida Anchom

Copy

Delete

ใช้ตอนไหนยกตัวอย่างภาษษคน

model OCPPMessage {

id          String @id @default (cuid())         // รหัสข้อความ

messageId   String                                    // รหัสข้อความจาก OCPP

chargePointId String                                  // รหัสเครื่องชาร์จ

direction   MessageDirection                          // ทิศทาง: INBOUND (เข้า), OUTBOUND (ออก)

action      String                                    // ชื่อ action (BootNotification, StartTransaction, etc.)

payload     Json                                      // ข้อมูลที่ส่ง (JSON)

timestamp   DateTime @default (now())              // เวลาที่ส่ง

}

Builder

ตาราง OCPPMessage ใช้สำหรับเก็บบันทึกข้อความทั้งหมดที่แลกเปลี่ยนระหว่างระบบ CSMS กับเครื่องชาร์จผ่านโปรโตคอล OCPP ซึ่งช่วยในการติดตาม debug และตรวจสอบการสื่อสารของระบบ

## ตัวอย่างการใช้งานในภาษาคน:
### 1. เมื่อเครื่องชาร์จเชื่อมต่อครั้งแรก (BootNotification)
```
{
  "id": "cm123abc456",
  "messageId": "boot-001",
  "chargePointId": "CP001",
  "direction": "INBOUND",
  "action": "BootNotification",
  "payload": {
    "chargePointVendor": "Tesla",
    "chargePointModel": "Supercharger V3",
    "chargePointSerialNumber": "SC001234",
    "firmwareVersion": "1.2.3"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```
### 2. เมื่อผู้ใช้เริ่มชาร์จ (StartTransaction)
```
{
  "id": "cm456def789",
  "messageId": "start-tx-001",
  "chargePointId": "CP001",
  "direction": "INBOUND",
  "action": "StartTransaction",
  "payload": {
    "connectorId": 1,
    "idTag": "RFID123456",
    "meterStart": 12500,
    "timestamp": "2024-01-15T14:20:00Z"
  },
  "timestamp": "2024-01-15T14:20:01Z"
}
```
### 3. เมื่อระบบส่งคำสั่งให้หยุดชาร์จ (RemoteStopTransaction)
```
{
  "id": "cm789ghi012",
  "messageId": "remote-stop-001",
  "chargePointId": "CP001",
  "direction": "OUTBOUND",
  "action": "RemoteStopTransaction",
  "payload": {
    "transactionId": 12345
  },
  "timestamp": "2024-01-15T16:45:00Z"
}
```
### 4. เมื่อเครื่องชาร์จส่งค่าพลังงาน (MeterValues)
```
{
  "id": "cm345jkl678",
  "messageId": "meter-001",
  "chargePointId": "CP002",
  "direction": "INBOUND",
  "action": "MeterValues",
  "payload": {
    "connectorId": 1,
    "transactionId": 12345,
    "meterValue": [
      {
        "timestamp": "2024-01-15T15:30:00Z",
        "sampledValue": [
          {
            "value": "15000",
            "measurand": "Energy.Active.Import.Register",
            "unit": "Wh"
          }
        ]
      }
    ]
  },
  "timestamp": "2024-01-15T15:30:01Z"
}
```
### 5. เมื่อเครื่องชาร์จรายงานสถานะ (StatusNotification)
```
{
  "id": "cm567mno890",
  "messageId": "status-001",
  "chargePointId": "CP003",
  "direction": "INBOUND",
  "action": "StatusNotification",
  "payload": {
    "connectorId": 1,
    "status": "Charging",
    "errorCode": "NoError",
    "timestamp": "2024-01-15T12:15:00Z"
  },
  "timestamp": "2024-01-15T12:15:01Z"
}
```
## ประโยชน์ของการเก็บข้อมูลนี้:
1. 1.
   การติดตามปัญหา : เมื่อมีปัญหาการชาร์จ สามารถดูประวัติข้อความเพื่อหาสาเหตุ
2. 2.
   การตรวจสอบ : ตรวจสอบว่าเครื่องชาร์จส่งข้อมูลถูกต้องหรือไม่
3. 3.
   การวิเคราะห์ : วิเคราะห์รูปแบบการใช้งานและประสิทธิภาพของระบบ
4. 4.
   การปฏิบัติตามกฎหมาย : เก็บบันทึกสำหรับการตรวจสอบจากหน่วยงานราชการ
ตาราง OCPPMessage จึงเป็นเหมือน "บันทึกการสนทนา" ระหว่างระบบกับเครื่องชาร์จทุกครั้งที่มีการสื่อสาร