# CSMS Backend

Charging Station Management System (CSMS) Backend ที่รองรับหลายเวอร์ชันของ OCPP (Open Charge Point Protocol)

## ภาพรวม

CSMS Backend เป็นระบบหลังบ้านสำหรับจัดการสถานีชาร์จรถยนต์ไฟฟ้า ที่ออกแบบมาเพื่อรองรับหลายเวอร์ชันของ OCPP พร้อมสถาปัตยกรรมแบบ Layered Modular System

## สถาปัตยกรรม

ระบบถูกออกแบบตามสถาปัตยกรรมแบบ 5 ชั้น (5-Layer Architecture):

### Layer 1: OCPP Gateway / Listener
- รับการเชื่อมต่อจาก Charge Point (CP) ผ่าน WebSocket/WSS
- ระบุเวอร์ชัน OCPP ที่ CP ใช้ (1.6, 2.0.1, 2.1)
- จัดการการเชื่อมต่อและการส่งข้อความ

### Layer 2: Protocol Adapter (Version Interpreters)
- แปลงรูปแบบข้อความจากแต่ละเวอร์ชัน OCPP
- แปลงเป็นรูปแบบข้อมูลมาตรฐานภายใน (Internal Standard Message)
- รองรับ OCPP 1.6, 2.0.1, และ 2.1

### Layer 3: Core Business Logic (CSMS)
- จัดการตรรกะทางธุรกิจหลัก
- การอนุญาตผู้ใช้ (Authorization)
- การจัดการธุรกรรม (Transaction Management)
- การจัดการอุปกรณ์ (Device Management)
- การชาร์จอัจฉริยะ (Smart Charging)

### Layer 4: Real-Time Data Pipeline
- จัดการการไหลของข้อมูลเรียลไทม์
- Message Broker/Queue สำหรับจัดการข้อมูล
- ส่งข้อมูลสถานะการชาร์จและค่ามิเตอร์

### Layer 5: External API
- REST API สำหรับการเชื่อมต่อกับแอปพลิเคชันลูกค้า
- WebSocket Server สำหรับส่งข้อมูลเรียลไทม์
- จัดการการสั่งการระยะไกล (Remote Commands)

## คุณสมบัติหลัก

- **Multi-Version OCPP Support**: รองรับ OCPP 1.6, 2.0.1, และ 2.1
- **Modular Architecture**: แยกส่วนการจัดการโปรโตคอลออกจากตรรกะทางธุรกิจ
- **Real-Time Communication**: ส่งข้อมูลแบบเรียลไทม์ผ่าน WebSocket
- **Scalable Design**: รองรับการขยายตัวของระบบ
- **TypeScript**: พัฒนาด้วย TypeScript เพื่อความปลอดภัยของโค้ด
- **Event-Driven**: ใช้รูปแบบ Event-Driven Architecture

## เทคโนโลยีที่ใช้

- **Node.js** - Runtime Environment
- **TypeScript** - Programming Language
- **WebSocket** - Real-time Communication
- **Express.js** - REST API Framework
- **EventEmitter** - Event System
- **Docker** - Containerization

## การติดตั้งและการใช้งาน

### ข้อกำหนดเบื้องต้น

- Node.js 18+ หรือ Docker
- npm หรือ yarn

### การติดตั้งด้วย npm

```bash
# Clone repository
git clone <repository-url>
cd csms-backend

# Install dependencies
npm install

# Build the project
npm run build

# Start the application
npm start
```

### การติดตั้งด้วย Docker

```bash
# Build Docker image
docker build -t csms-backend .

# Run container
docker run -p 8080:8080 -p 3000:3000 -p 3001:3001 csms-backend
```

### การตั้งค่า Environment Variables

สร้างไฟล์ `.env` และกำหนดค่าตัวแปรต่อไปนี้:

```env
# Gateway Configuration
OCPP_PORT=8080
OCPP_ENABLE_LOGGING=true
OCPP_MAX_CONNECTIONS=1000

# REST API Configuration
REST_PORT=3000
REST_CORS_ENABLED=true
REST_CORS_ORIGINS=*
REST_RATE_LIMIT_ENABLED=true
REST_RATE_LIMIT_WINDOW=900000
REST_RATE_LIMIT_MAX=100

# WebSocket API Configuration
WS_PORT=3001
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=1000

# Database Configuration
DB_MYSQL_HOST=localhost
DB_MYSQL_PORT=3306
DB_MYSQL_USERNAME=root
DB_MYSQL_PASSWORD=password
DB_MYSQL_DATABASE=csms

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_DIRECTORY=./logs
```

## การพัฒนา

### คำสั่งพื้นฐาน

```bash
# Development mode with hot reload
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

### โครงสร้างโปรเจค

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── layer1-gateway/   # OCPP Gateway / Listener
│   ├── layer2-adapter/   # Protocol Adapter
│   ├── layer3-core/      # Core Business Logic
│   ├── layer4-pipeline/  # Real-Time Data Pipeline
│   ├── layer5-api/       # External API
│   └── index.ts          # Main entry point
├── tests/                # Test files
├── dist/                 # Compiled JavaScript
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── Dockerfile            # Docker configuration
└── README.md             # This file
```

## API Documentation

### REST API Endpoints

- `GET /api/status` - ตรวจสอบสถานะระบบ
- `POST /api/charge-points/:id/start` - เริ่มการชาร์จ
- `POST /api/charge-points/:id/stop` - หยุดการชาร์จ
- `GET /api/transactions` - ดึงข้อมูลธุรกรรม
- `GET /api/charge-points` - ดึงข้อมูลสถานีชาร์จ

### WebSocket Events

- `chargePointConnected` - เมื่อ Charge Point เชื่อมต่อ
- `chargePointDisconnected` - เมื่อ Charge Point ตัดการเชื่อมต่อ
- `transactionStarted` - เมื่อเริ่มธุรกรรม
- `transactionStopped` - เมื่อสิ้นสุดธุรกรรม
- `meterValues` - ค่ามิเตอร์แบบเรียลไทม์
- `statusNotification` - การแจ้งเตือนสถานะ

## การทดสอบ

### การทดสอบด้วย Unit Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- authorization.test.ts
```

### การทดสอบด้วย OCPP Simulator

ใช้ OCPP Simulator เพื่อทดสอบการเชื่อมต่อกับ Charge Point:

```bash
# Install OCPP Simulator
npm install -g ocpp-simulator

# Connect to CSMS Backend
ocpp-simulator connect --url ws://localhost:8080 --version 1.6
```

## การติดตั้งบน Production

### การติดตั้งด้วย Docker Compose

```yaml
version: '3.8'
services:
  csms-backend:
    build: .
    ports:
      - "8080:8080"
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_MYSQL_HOST=mysql
    depends_on:
      - mysql
      - redis
  
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: csms
    volumes:
      - mysql_data:/var/lib/mysql
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

### การติดตั้งบน Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: csms-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: csms-backend
  template:
    metadata:
      labels:
        app: csms-backend
    spec:
      containers:
      - name: csms-backend
        image: csms-backend:latest
        ports:
        - containerPort: 8080
        - containerPort: 3000
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
```

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **การเชื่อมต่อ WebSocket ล้มเหลว**
   - ตรวจสอบว่า port 8080 เปิดอยู่
   - ตรวจสอบ firewall settings

2. **ข้อผิดพลาดในการแปลง Protocol**
   - ตรวจสอบว่า OCPP version ถูกต้อง
   - ตรวจสอบ message format

3. **ปัญหาการเชื่อมต่อ Database**
   - ตรวจสอบ connection string
   - ตรวจสอบว่า database ทำงานอยู่

### Logging

ระบบจะบันทึก log ไว้ใน `./logs` directory และแสดงผลใน console:

```bash
# View logs
tail -f logs/csms.log

# View error logs
tail -f logs/error.log
```

## การมีส่วนร่วมในการพัฒนา

1. Fork repository
2. สร้าง feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add some amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. สร้าง Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ติดต่อ

- Project Repository: [GitHub Repository]
- Documentation: [Documentation Link]
- Issues: [Issues Link]