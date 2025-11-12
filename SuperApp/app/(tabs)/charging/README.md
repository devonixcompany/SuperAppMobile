# Charging Station Map Feature

## การตั้งค่า Google Maps API Key

### 1. สร้าง Google Maps API Key

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจกต์ใหม่ หรือเลือกโปรเจกต์ที่มีอยู่
3. เปิดใช้งาน APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API (ถ้าต้องการใช้ search)
4. สร้าง API Key:
   - ไปที่ **APIs & Services > Credentials**
   - คลิก **Create Credentials > API Key**
   - บันทึก API Key ที่ได้

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ใน root directory ของโปรเจกต์:

```bash
# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# API URL
EXPO_PUBLIC_API_URL=http://your-backend-url:8080

# Other configs
EXPO_PUBLIC_APP_ENV=development
```

### 3. เพิ่ม API Key Restrictions (แนะนำ)

เพื่อความปลอดภัย ควรจำกัดการใช้งาน API Key:

#### สำหรับ Android:
1. ไปที่ Google Cloud Console > Credentials
2. เลือก API Key ที่สร้างไว้
3. ใน **Application restrictions** เลือก **Android apps**
4. เพิ่ม package name และ SHA-1 fingerprint:
   - Package name: `com.anonymous.SuperApp` (หรือตามที่ตั้งค่าใน app.config.js)
   - หา SHA-1 ด้วยคำสั่ง:
     ```bash
     cd android
     ./gradlew signingReport
     ```

#### สำหรับ iOS:
1. ไปที่ Google Cloud Console > Credentials
2. เลือก API Key ที่สร้างไว้
3. ใน **Application restrictions** เลือก **iOS apps**
4. เพิ่ม Bundle ID: `com.anonymous.SuperApp` (หรือตามที่ตั้งค่าใน app.config.js)

### 4. Build App ใหม่

หลังจากตั้งค่า environment variables แล้ว ต้อง build app ใหม่:

```bash
# สำหรับ iOS
npx expo prebuild --platform ios
npx expo run:ios

# สำหรับ Android
npx expo prebuild --platform android
npx expo run:android
```

## Features

### ✅ แสดงแผนที่ด้วย Google Maps
- แสดง markers ของสถานีชาร์จทั้งหมด
- สี markers แสดงสถานะ:
  - 🟢 สีเขียว = ว่าง (available)
  - 🟠 สีส้ม = กำลังใช้งาน (in-use)
  - 🔴 สีแดง = ไม่พร้อมใช้งาน (offline)

### ✅ ค้นหาสถานีชาร์จ
- ค้นหาด้วยชื่อสถานี
- ค้นหาด้วยที่อยู่

### ✅ แสดงตำแหน่งของผู้ใช้
- ขออนุญาตเข้าถึงตำแหน่ง
- แสดง marker ตำแหน่งปัจจุบัน
- ปุ่ม "My Location" เพื่อกลับไปยังตำแหน่งของผู้ใช้

### ✅ Bottom Sheet สำหรับแสดงรายละเอียด
- แสดงรายละเอียดสถานีชาร์จเมื่อคลิกที่ marker
- ข้อมูลที่แสดง:
  - ชื่อสถานี
  - ที่อยู่
  - เวลาเปิด-ปิด
  - ประเภทหัวชาร์จ (AC/DC)
  - กำลังไฟ
  - ราคาต่อหน่วย
- ปุ่ม "นำทาง" เพื่อนำทางไปยังสถานี

### ✅ เชื่อมต่อกับ Backend API
- ดึงข้อมูลสถานีชาร์จจาก API
- Fallback ไปใช้ mock data ถ้าโหลดไม่สำเร็จ
- แสดง loading indicator ขณะโหลดข้อมูล

## API Endpoints ที่ใช้

```typescript
// ดึงรายการสถานีชาร์จทั้งหมด
GET /api/chargepoints?isPublic=true

// ดึงข้อมูลสถานีชาร์จเฉพาะ
GET /api/chargepoints/:id

// ค้นหาสถานีชาร์จใกล้เคียง
GET /api/chargepoints?latitude=XX&longitude=XX&radius=5

// ค้นหาสถานีชาร์จด้วย keyword
GET /api/chargepoints?search=keyword
```

## โครงสร้างไฟล์

```
SuperApp/
├── app/(tabs)/charging/
│   └── index.tsx              # หน้าแผนที่สถานีชาร์จ
├── services/
│   └── chargingStation.service.ts  # API service
├── types/
│   └── charging.types.ts      # Type definitions
├── config/
│   ├── api.config.ts          # API configuration
│   └── env.ts                 # Environment config
└── app.config.js              # Expo configuration
```

## การใช้งาน

1. **เปิดแอป** - หน้าจอจะขออนุญาตเข้าถึงตำแหน่ง
2. **ค้นหาสถานี** - ใช้ search bar ด้านบนเพื่อค้นหา
3. **คลิกที่ marker** - เพื่อดูรายละเอียดสถานีชาร์จ
4. **นำทาง** - กดปุ่ม "นำทาง" เพื่อเปิด navigation app
5. **My Location** - กดปุ่มที่มุมล่างขวาเพื่อกลับไปยังตำแหน่งของคุณ

## Troubleshooting

### แผนที่ไม่แสดง
1. ตรวจสอบว่าตั้งค่า `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` แล้ว
2. ตรวจสอบว่า enable APIs ที่จำเป็นแล้ว
3. Build app ใหม่หลังจากเพิ่ม API key

### ไม่สามารถเข้าถึงตำแหน่งได้
1. ตรวจสอบว่าให้สิทธิ์แอปในการเข้าถึงตำแหน่งแล้ว
2. สำหรับ iOS: ตรวจสอบ Info.plist
3. สำหรับ Android: ตรวจสอบ AndroidManifest.xml

### API ไม่ทำงาน
1. ตรวจสอบ `EXPO_PUBLIC_API_URL` ใน .env
2. ตรวจสอบว่า backend ทำงานอยู่
3. ดูใน console สำหรับ error messages

## TODO / Improvements

- [ ] เพิ่ม filter สถานีตามสถานะ
- [ ] เพิ่มการคำนวณระยะทาง
- [ ] เพิ่มการแสดง route บนแผนที่
- [ ] เพิ่ม clustering สำหรับ markers เยอะๆ
- [ ] เพิ่ม favorite stations
- [ ] เพิ่มการแจ้งเตือนเมื่อสถานีว่าง
