# 📚 SuperApp Charging System - Documentation Index

## วิธีใช้เอกสารนี้

เอกสารชุดนี้อธิบาย **Flow การทำงานของระบบชาร์จรถยนต์ไฟฟ้า SuperApp** ตั้งแต่การสแกน QR Code จนถึงการแสดงผลสรุปการชาร์จ รวมถึงการทำงานของ WebSocket และ REST API

---

## 📑 รายการเอกสาร

### 1. 🚀 เริ่มต้นที่นี่: Quick Reference (ภาษาไทย)
**ไฟล์:** `QUICK_REFERENCE_TH.md`

**เหมาะสำหรับ:** นักพัฒนาที่ต้องการเริ่มต้นเข้าใจระบบอย่างรวดเร็ว

**เนื้อหา:**
- ส่วนประกอบหลักของระบบ (4 ส่วน)
- Flow การทำงานแบบย่อ 
- REST API ที่สำคัญพร้อมตัวอย่าง
- WebSocket Messages ทั้งหมด
- OCPP Messages
- ตารางสถานะต่างๆ
- วิธีแก้ไข Errors พร้อมโค้ด
- Tips และ Best Practices

**ใช้เมื่อ:**
- ✅ เริ่มทำงานกับโปรเจ็กต์ใหม่
- ✅ ต้องการหา API endpoint หรือ message format
- ✅ ต้องการแก้ไข error
- ✅ ต้องการ code examples

---

### 2. 📊 ไดอะแกรม: Flow Diagrams
**ไฟล์:** `FLOW_DIAGRAM.md`

**เหมาะสำหรับ:** ทีมที่ต้องการเข้าใจภาพรวมของระบบผ่าน diagrams

**เนื้อหา:**
1. Overall System Architecture
2. Complete Charging Flow (Sequence Diagram)
3. WebSocket Connection Flow
4. OCPP Message Processing
5. Transaction Lifecycle State Machine
6. Error Handling Flow
7. Real-time Data Flow
8. Payment Card Check Flow
9. Gateway Session Management
10. Summary Screen Navigation

**ใช้เมื่อ:**
- ✅ ต้องการเข้าใจ architecture
- ✅ ต้องการดู flow แบบ step-by-step
- ✅ อธิบายระบบให้คนอื่นเข้าใจ
- ✅ วางแผน feature ใหม่

---

### 3. 📖 เอกสารเต็ม: Complete Documentation (English)
**ไฟล์:** `WEBSOCKET_FLOW_DOCUMENTATION.md`

**เหมาะสำหรับ:** นักพัฒนาที่ต้องการเข้าใจรายละเอียดเชิงลึก

**เนื้อหา:**
- สถาปัตยกรรมระบบแบบละเอียด
- Flow การทำงาน 6 Phases:
  - Phase 1: QR Code Scanning
  - Phase 2: WebSocket Connection
  - Phase 3: Start Charging
  - Phase 4: Real-time Updates
  - Phase 5: Stop Charging
  - Phase 6: Summary Display
- Component Details
- Message Formats (WebSocket & OCPP)
- Complete API Reference
- Error Handling Strategies

**ใช้เมื่อ:**
- ✅ ต้องการเข้าใจทุกรายละเอียด
- ✅ Debugging ปัญหาที่ซับซ้อน
- ✅ เพิ่ม feature ใหม่
- ✅ ทำ code review

---

## 🎯 Quick Navigation

### เริ่มต้นใช้งาน
```
1. อ่าน QUICK_REFERENCE_TH.md (20 นาที)
   ↓
2. ดู FLOW_DIAGRAM.md - Diagram 1-3 (15 นาที)
   ↓
3. ลองรันโค้ดและทดสอบ
   ↓
4. อ่าน WEBSOCKET_FLOW_DOCUMENTATION.md เมื่อต้องการรายละเอียดเพิ่มเติม
```

### ต้องการหาข้อมูลเฉพาะเรื่อง

| หัวข้อ | เอกสาร | หน้า/Section |
|--------|--------|--------------|
| **Architecture Overview** | FLOW_DIAGRAM.md | Diagram #1 |
| **Complete Flow** | FLOW_DIAGRAM.md | Diagram #2 |
| **REST API Endpoints** | QUICK_REFERENCE_TH.md | "REST API ที่สำคัญ" |
| **WebSocket Messages** | QUICK_REFERENCE_TH.md | "WebSocket Messages" |
| **OCPP Protocol** | QUICK_REFERENCE_TH.md | "OCPP Messages" |
| **Error Handling** | QUICK_REFERENCE_TH.md | "การแก้ไข Errors" |
| **Connector Status** | QUICK_REFERENCE_TH.md | "สถานะต่างๆ" |
| **Transaction Flow** | WEBSOCKET_FLOW_DOCUMENTATION.md | "Phase 3-6" |
| **Code Examples** | QUICK_REFERENCE_TH.md | ทุก section |

---

## 💻 ตัวอย่างการใช้งาน

### สถานการณ์ 1: เริ่มพัฒนา Feature ใหม่
```
คำถาม: จะเพิ่มฟีเจอร์แสดง estimated cost ระหว่างชาร์จยังไง?

📚 อ่านเอกสาร:
1. QUICK_REFERENCE_TH.md → "ข้อมูลการชาร์จ Real-time"
   - ดู charging_data message format
   
2. FLOW_DIAGRAM.md → Diagram #7 "Real-time Data Flow"
   - เข้าใจว่าข้อมูลไหลมายังไง
   
3. WEBSOCKET_FLOW_DOCUMENTATION.md → "Phase 4: Real-time Updates"
   - ดูรายละเอียดการคำนวณ cost
   
💡 Solution:
const cost = energyKWh * effectiveRate;
// effectiveRate มาจาก baseRate หรือ transactionSummary.appliedRate
```

### สถานการณ์ 2: แก้ Bug
```
ปัญหา: User กดปุ่ม Stop แล้วไม่มีอะไรเกิดขึ้น

📚 อ่านเอกสาร:
1. QUICK_REFERENCE_TH.md → "การแก้ไข Errors"
   - ตรวจสอบ error cases
   
2. FLOW_DIAGRAM.md → Diagram #5 "Transaction Lifecycle"
   - ดู state ที่สามารถ stop ได้
   
3. WEBSOCKET_FLOW_DOCUMENTATION.md → "Phase 5: Stop Charging"
   - ดู conditions และ error handling
   
💡 Solution:
- ตรวจสอบ transactionId ไม่เป็น null
- ตรวจสอบ WebSocket connection state
- ตรวจสอบ connector status
```

### สถานการณ์ 3: ทำความเข้าใจ OCPP Protocol
```
คำถาม: OCPP message format เป็นยังไง?

📚 อ่านเอกสาร:
1. QUICK_REFERENCE_TH.md → "OCPP Messages"
   - ดู message format: [MessageType, MessageId, Action, Payload]
   - ดูตัวอย่าง 7 actions หลัก
   
2. FLOW_DIAGRAM.md → Diagram #4 "OCPP Message Processing"
   - เข้าใจการประมวลผล OCPP messages
   
3. WEBSOCKET_FLOW_DOCUMENTATION.md → "OCPP Messages" section
   - ดูรายละเอียดแต่ละ message type
```

---

## 🔍 คำศัพท์และคำย่อ

| คำศัพท์ | ความหมาย |
|---------|----------|
| **OCPP** | Open Charge Point Protocol - โปรโตคอลสำหรับสื่อสารกับเครื่องชาร์จ |
| **Charge Point (CP)** | เครื่องชาร์จรถยนต์ไฟฟ้า |
| **Connector** | หัวชาร์จ (แต่ละเครื่องอาจมีหลายหัว) |
| **Gateway** | ตัวกลางระหว่าง Mobile App และ Charge Point |
| **Transaction** | ธุรกรรมการชาร์จหนึ่งครั้ง |
| **idTag** | รหัสประจำตัวสำหรับเริ่มชาร์จ (ใช้ Backend Transaction ID) |
| **MeterValues** | ค่าวัดจากเครื่องชาร์จ (พลังงาน, กำลังไฟ, แรงดัน ฯลฯ) |
| **SoC** | State of Charge - ระดับแบตเตอรี่ (%) |
| **kWh** | กิโลวัตต์-ชั่วโมง - หน่วยวัดพลังงาน |
| **kW** | กิโลวัตต์ - หน่วยวัดกำลังไฟ |

---

## 🛠️ การใช้งานเอกสารในแต่ละบทบาท

### Backend Developer
**ควรอ่าน:**
1. QUICK_REFERENCE_TH.md → REST API ที่สำคัญ
2. FLOW_DIAGRAM.md → Diagram #2, #8
3. WEBSOCKET_FLOW_DOCUMENTATION.md → REST API Endpoints

**Focus:**
- Transaction creation และ management
- Payment validation
- Summary calculation

---

### Frontend/Mobile Developer
**ควรอ่าน:**
1. QUICK_REFERENCE_TH.md → WebSocket Messages, Error Handling
2. FLOW_DIAGRAM.md → Diagram #2, #3, #7, #10
3. WEBSOCKET_FLOW_DOCUMENTATION.md → Phase 1-6

**Focus:**
- QR Scanner implementation
- WebSocket connection management
- Real-time UI updates
- Error handling

---

### Gateway/OCPP Developer
**ควรอ่าน:**
1. QUICK_REFERENCE_TH.md → OCPP Messages
2. FLOW_DIAGRAM.md → Diagram #3, #4, #9
3. WEBSOCKET_FLOW_DOCUMENTATION.md → OCPP Protocol section

**Focus:**
- OCPP message processing
- Session management
- Message relay logic

---

### QA/Tester
**ควรอ่าน:**
1. QUICK_REFERENCE_TH.md → สถานะต่างๆ, การแก้ไข Errors
2. FLOW_DIAGRAM.md → Diagram #2, #5, #6
3. WEBSOCKET_FLOW_DOCUMENTATION.md → Error Handling

**Focus:**
- Test scenarios
- Error cases
- State transitions
- Edge cases

---

### Project Manager/Product Owner
**ควรอ่าน:**
1. FLOW_DIAGRAM.md → Diagram #1, #2
2. QUICK_REFERENCE_TH.md → การทำงานแบบย่อ

**Focus:**
- System overview
- User journey
- Feature planning

---

## 📝 การอัพเดทเอกสาร

### เมื่อไหร่ควรอัพเดท
- ✅ เพิ่ม API endpoint ใหม่
- ✅ เปลี่ยน message format
- ✅ เพิ่ม error case ใหม่
- ✅ เปลี่ยนแปลง flow การทำงาน
- ✅ อัพเดท OCPP version

### วิธีอัพเดท
1. อัพเดท QUICK_REFERENCE_TH.md ก่อน (ใช้บ่อยที่สุด)
2. อัพเดท FLOW_DIAGRAM.md ถ้า flow เปลี่ยน
3. อัพเดท WEBSOCKET_FLOW_DOCUMENTATION.md สำหรับรายละเอียด
4. Commit พร้อม message ที่ชัดเจน

---

## 🎓 Learning Path

### สำหรับนักพัฒนาใหม่
```
Week 1: System Overview
├─ Day 1-2: อ่าน QUICK_REFERENCE_TH.md ทั้งหมด
├─ Day 3-4: ดู FLOW_DIAGRAM.md ทุกแผนภาพ
└─ Day 5: ลองรันและทดสอบระบบ

Week 2: Deep Dive
├─ Day 1-2: อ่าน WEBSOCKET_FLOW_DOCUMENTATION.md Phase 1-3
├─ Day 3-4: อ่าน Phase 4-6
└─ Day 5: ทำความเข้าใจ Error Handling

Week 3: Hands-on
├─ Day 1-2: ลองแก้ bug ง่ายๆ
├─ Day 3-4: ลองเพิ่ม feature เล็กๆ
└─ Day 5: Review code และถามคำถาม
```

---

## 💬 ติดต่อและสอบถาม

หากมีคำถามเกี่ยวกับเอกสาร:
1. อ่านเอกสารทั้ง 3 ไฟล์ก่อน
2. ค้นหาใน QUICK_REFERENCE_TH.md
3. ดู diagram ที่เกี่ยวข้องใน FLOW_DIAGRAM.md
4. อ่านรายละเอียดใน WEBSOCKET_FLOW_DOCUMENTATION.md
5. ยังไม่เข้าใจ → ถาม team lead หรือ senior developer

---

## 🚀 Next Steps

หลังจากอ่านเอกสารแล้ว:
1. ✅ ทดลองรัน SuperApp บน emulator/device
2. ✅ ทดสอบสแกน QR code (ใช้ QR generator ใน `generate_qr.py`)
3. ✅ ดู WebSocket messages ใน console logs
4. ✅ ลองส่งคำสั่ง Start/Stop charging
5. ✅ ศึกษาโค้ดใน files ที่ระบุไว้ในเอกสาร
6. ✅ ลองแก้ bug หรือเพิ่ม feature ง่ายๆ

---

## 📌 สรุป

**3 เอกสารหลัก:**
1. 🚀 **QUICK_REFERENCE_TH.md** - เริ่มต้นที่นี่
2. 📊 **FLOW_DIAGRAM.md** - ดูภาพรวม
3. 📖 **WEBSOCKET_FLOW_DOCUMENTATION.md** - เข้าใจลึก

**เป้าหมาย:** ให้ทุกคนในทีมเข้าใจระบบชาร์จรถยนต์ไฟฟ้าได้อย่างรวดเร็วและถูกต้อง

**ใช้เวลาอ่าน:**
- Quick Read: 30 นาที (QUICK_REFERENCE_TH.md)
- Medium Read: 1 ชั่วโมง (+ FLOW_DIAGRAM.md)
- Complete Read: 2-3 ชั่วโมง (ทั้ง 3 ไฟล์)

---

*Last Updated: 2025-11-17*
*Version: 1.0.0*
