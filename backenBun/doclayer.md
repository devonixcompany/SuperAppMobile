## 🏗️ สถาปัตยกรรมระบบ (5 Layers)
1. 1.
   Layer 1 - Gateway : จัดการการเชื่อมต่อ WebSocket กับเครื่องชาร์จ
2. 2.
   Layer 2 - Adapter : แปลงข้อความ OCPP (รองรับ 1.6, 2.0.1, 2.1)
3. 3.
   Layer 3 - Core : ตรรกะหลักของระบบ (Transaction, Authorization, Device Management)
4. 4.
   Layer 4 - Pipeline : จัดการข้อมูลแบบ Real-time และ Message Queue
5. 5.
   Layer 5 - API : REST API และ WebSocket สำหรับแอปพลิเคชันลูกค้า
## 🚗 ฟีเจอร์หลักที่ผู้ใช้สามารถทำได้
### 1. การเชื่อมต่อเครื่องชาร์จ
- รองรับการเชื่อมต่อเครื่องชาร์จผ่าน WebSocket
- รองรับ OCPP 1.6, 2.0.1, และ 2.1
- ตรวจสอบสถานะการเชื่อมต่อแบบ Real-time
### 2. การสั่งชาร์จ (Remote Start Transaction)
- สั่งเริ่มการชาร์จจากระยะไกลผ่าน REST API
- ระบุเครื่องชาร์จและ connector ที่ต้องการ
- ส่งคำสั่งผ่าน OCPP protocol
### 3. การสั่งหยุดชาร์จ (Remote Stop Transaction)
- สั่งหยุดการชาร์จจากระยะไกล
- ระบุ transaction ID ที่ต้องการหยุด
- อัปเดตสถานะ connector เป็น Available
### 4. การดูสถานะการชาร์จ
- ติดตามสถานะเครื่องชาร์จแบบ Real-time
- ดูข้อมูล meter values (พลังงาน, กำลังไฟ, กระแส, แรงดัน)
- ตรวจสอบสถานะ connector แต่ละตัว
## 📊 ข้อมูลที่ระบบจัดเก็บ
### ข้อมูลผู้ใช้
- ลงทะเบียนด้วยเบอร์โทรศัพท์
- จัดการข้อมูลรถยนต์ (ทะเบียน, ยี่ห้อ, รุ่น)
- ประวัติการใช้งาน
### ข้อมูลเครื่องชาร์จ
- ตำแหน่งที่ตั้ง (GPS)
- จำนวนและประเภท connector
- กำลังไฟสูงสุด
- สถานะปัจจุบัน
### ข้อมูลการชาร์จ
- Transaction history
- Meter values แบบ Real-time
- ค่าใช้จ่าย
- เวลาเริ่ม-สิ้นสุด
## 🔧 เทคโนโลยีที่ใช้
- Backend : Node.js + TypeScript
- Database : PostgreSQL + Prisma ORM
- Real-time : WebSocket + Redis
- API : Express.js + REST API
- Authentication : JWT
- Logging : Winston
- Testing : Jest
## 🚀 วิธีการใช้งาน
### สำหรับผู้พัฒนา
```
# ติดตั้ง dependencies
npm install

# รันในโหมด development
npm run dev

# Build สำหรับ production
npm run build
npm start
```
### API Endpoints หลัก
- GET /api/charge-points - ดูรายการเครื่องชาร์จ
- GET /api/charge-points/:id - ดูข้อมูลเครื่องชาร์จ
- POST /api/remote-start - สั่งเริ่มชาร์จ
- POST /api/remote-stop - สั่งหยุดชาร์จ
### การเชื่อมต่อ WebSocket
- Port 8080: สำหรับเครื่องชาร์จ (OCPP)
- Port 3001: สำหรับแอปพลิเคชันลูกค้า
## 💡 จุดเด่นของระบบ
1. 1.
   รองรับ OCPP หลายเวอร์ชัน - ใช้งานได้กับเครื่องชาร์จหลากหลายยี่ห้อ
2. 2.
   Real-time Monitoring - ติดตามสถานะแบบเรียลไทม์
3. 3.
   Scalable Architecture - ออกแบบให้รองรับการขยายตัว
4. 4.
   Complete Database Schema - จัดเก็บข้อมูลครบถ้วน
5. 5.
   Modern Tech Stack - ใช้เทคโนโลยีทันสมัย
ระบบนี้พร้อมใช้งานสำหรับการจัดการเครื่องชาร์จรถยนต์ไฟฟ้าแบบครบวงจร ตั้งแต่การเชื่อมต่อ การควบคุม ไปจนถึงการติดตามและรายงานผล