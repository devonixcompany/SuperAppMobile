ขั้นตอน 1: กำหนดบทบาทและโฟลว์

เครื่องชาร์จ (Charge Point) เชื่อม WebSocket มาหา CSMS → ใช้ OCPP messages เช่น BootNotification, Heartbeat, MeterValues, StatusNotification

CSMS รับข้อความจากเครื่องชาร์จ → ตีความ / อัปเดตฐานข้อมูล (สถานะ, มิเตอร์, หัวชาร์จ)

CSMS ส่งเหตุการณ์ (event) แบบเรียลไทม์ไปให้ผู้ใช้ที่สนใจ (User UI) ผ่านช่องทาง WebSocket (หรือ SSE/MQTT)

ผู้ใช้ (ผ่าน Web/Mobile) เชื่อม WebSocket กับ CSMS UI endpoint → สมัคร (subscribe) เครื่องชาร์จที่ตนสนใจ → รับการอัปเดตแบบเรียลไทม์

ขั้นตอน 2: กำหนด API & WebSocket Endpoint ที่ต้องทำ

REST API สำหรับผู้ใช้:

สมัครเครื่องชาร์จที่ตนสนใจ (subscribe)

ดึงสถานะปัจจุบันของเครื่อง เช่น จำนวนหัว, กำลังชาร์จ, พลังงานที่ใช้

WebSocket endpoint สำหรับผู้ใช้:

URL เช่น wss://api.yourdomain.com/ws/users

เมื่อเชื่อมต่อ → ตรวจสิทธิผู้ใช้ (token) → ส่งคำสั่ง subscribe เช่น { action: "subscribe", chargePointId: "CP_BKK_001" }

เมื่อมีเหตุการณ์จากเครื่องที่ผู้ใช้สมัครไว้ → ส่งข้อมูลไปให้ทันที

ขั้นตอน 3: โฟลว์ของ WebSocket ระหว่าง CSMS ↔ผู้ใช้

เมื่อเครื่องชาร์จส่งข้อความ เช่น MeterValues / StatusNotification → CSMS รับและบันทึก

CSMS ตรวจว่าเครื่องใดที่เชื่อมอยู่ และมีผู้ใช้ (UI) สมัครอยู่ว่า “สนใจเครื่องนี้” หรือไม่

CSMS ส่งเหตุการณ์ (event payload) ไปยังผู้ใช้ที่สมัคร ผ่าน WebSocket UI

ผู้ใช้ได้รับและอัปเดต UI แบบทันที

ขั้นตอน 4: กำหนดชนิดของ “เหตุการณ์” (Events) ที่ผู้ใช้ควรได้

เริ่ม/หยุดการชาร์จ (StartTransaction / StopTransaction)

พลังงานที่ชาร์จ (MeterValues) ทุก n วินาที

สถานะหัวชาร์จ/สถานี (StatusNotification) เช่น Available, Occupied, Faulted

จำนวนหัวชาร์จ, กำลังที่ใช้, ชนิดหัว (ตอนเชื่อมเครื่อง+config)

เครื่องออฟไลน์ / reconnect

ขั้นตอน 5: ตรวจสอบสิทธิ &การสมัคร

เมื่อผู้ใช้สมัครเครื่อง (subscribe) → ตรวจว่า user มีสิทธิ ดูเครื่องนั้น (owner หรือได้รับสิทธิ)

บันทึก mapping user ↔ chargePointId ↔ WebSocket session

เมื่อมี session UI หลุด/disconnect → clean up subscription

ขั้นตอน 6: เก็บสถานะทันที (Snapshot) +แสดงเมื่อผู้ใช้เข้ามา

เมื่อผู้ใช้เปิดหน้า UI → ดึงสถานะล่าสุดของเครื่องก่อน (ผ่าน REST) เช่น กำลังชาร์จอยู่ไหม, จำนวนหัว, กำลังไฟ, มิเตอร์ล่าสุด

จากนั้นเปิด WebSocket เพื่อรับอัปเดตเรียลไทม์

ขั้นตอน 7: ตั้งระบบ WebSocket/Message Broker เพื่อรองรับหลายผู้ใช้

ใช้ Pub/Sub (เช่น Redis, Kafka) เพื่อกระจายเหตุการณ์จาก CSMS → UI sessions

WebSocket server สำหรับผู้ใช้ต้องสามารถรับและส่งข้อความจำนวนมากพร้อมกัน → ต้องวาง architecture รองรับ scale 
Medium
+1

ตั้ง policy เช่น timeout, disconnect idle users, throttle ข้อความ (ถ้าข้อมูลเยอะ)

ขั้นตอน 8: เชื่อมโยงกับฐานข้อมูลและโมเดลที่มีอยู่

ในฐานข้อมูล ChargePoint มี field connectorCount → ใช้แสดงจำนวนหัว

ตาราง Connector เก็บหัวแยกแต่ละอัน → ดึงชนิด (type) และ maxCurrent หรือ maxPower

เมื่อผู้ใช้สมัครเครื่อง → UI จะเห็นจำนวนหัว + ชนิดหัว จากฐานข้อมูลก่อน

จากนั้นรับเหตุการณ์ real-time เช่น “หัว 2 กำลังชาร์จ” จาก WebSocket