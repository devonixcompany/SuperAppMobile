# Frontend WebSocket System สำหรับการติดตามสถานะเครื่องชาร์จ

ระบบ WebSocket นี้ช่วยให้ Frontend สามารถเชื่อมต่อและติดตามสถานะเครื่องชาร์จแบบเรียลไทม์ได้

## 🚀 การเริ่มต้นใช้งาน

### การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# Build โปรเจค
npm run build

# เริ่มต้นระบบ
node dist/use-connect/index.js
```

### การเชื่อมต่อ WebSocket

Frontend สามารถเชื่อมต่อได้ที่:
```
ws://localhost:8081/{chargePointId}/{connectorId}
```

**ตัวอย่าง:**
- `ws://localhost:8081/CP001/1` - เครื่องชาร์จ CP001, หัวชาร์จที่ 1
- `ws://localhost:8081/CP002/2` - เครื่องชาร์จ CP002, หัวชาร์จที่ 2

## 📊 ข้อมูลที่ได้รับ

### 1. ข้อมูลการชาร์จ (Charging Data)
```json
{
  "type": "charging_data",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "connectorId": 1,
    "status": "CHARGING",
    "chargingPercentage": 65.5,
    "currentPower": 15.2,
    "currentMeter": 1234.567,
    "voltage": 230.5,
    "current": 66.1,
    "temperature": 32.5,
    "sessionId": "session-CP001-1",
    "transactionId": 12345,
    "startTime": "2024-01-15T09:00:00.000Z",
    "duration": 5400,
    "energyDelivered": 13.8,
    "cost": 62.1
  }
}
```

### 2. ข้อความสถานะ (Status Message)
```json
{
  "type": "status",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "chargePointId": "CP001",
    "connectorId": 1,
    "status": "AVAILABLE",
    "isOnline": true,
    "message": "เครื่องชาร์จออนไลน์"
  }
}
```

### 3. Heartbeat
```json
{
  "type": "heartbeat",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "serverTime": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. ข้อความข้อผิดพลาด (Error Message)
```json
{
  "type": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "code": "SESSION_NOT_FOUND",
    "message": "ไม่พบ session สำหรับเครื่องชาร์จ CP001"
  }
}
```

## 🔌 สถานะหัวชาร์จ

| สถานะ | คำอธิบาย |
|-------|----------|
| `AVAILABLE` | พร้อมใช้งาน |
| `PREPARING` | กำลังเตรียมการชาร์จ |
| `CHARGING` | กำลังชาร์จ |
| `FINISHING` | กำลังจบการชาร์จ |
| `UNAVAILABLE` | ไม่พร้อมใช้งาน |
| `FAULTED` | เกิดข้อผิดพลาด |

## 💻 ตัวอย่างการใช้งาน

### JavaScript/TypeScript
```javascript
const ws = new WebSocket('ws://localhost:8081/CP001/1');

ws.onopen = function() {
    console.log('เชื่อมต่อสำเร็จ');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    
    switch(message.type) {
        case 'charging_data':
            updateChargingDisplay(message.data);
            break;
        case 'status':
            updateStatusDisplay(message.data);
            break;
        case 'error':
            showError(message.data);
            break;
    }
};

ws.onerror = function(error) {
    console.error('WebSocket Error:', error);
};

ws.onclose = function() {
    console.log('การเชื่อมต่อปิด');
};

function updateChargingDisplay(data) {
    document.getElementById('charging-percentage').textContent = data.chargingPercentage + '%';
    document.getElementById('current-power').textContent = data.currentPower + ' kW';
    document.getElementById('energy-delivered').textContent = data.energyDelivered + ' kWh';
    document.getElementById('cost').textContent = data.cost + ' บาท';
}
```

### React Hook
```javascript
import { useState, useEffect } from 'react';

function useChargingData(chargePointId, connectorId) {
    const [data, setData] = useState(null);
    const [status, setStatus] = useState('connecting');
    const [error, setError] = useState(null);

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8081/${chargePointId}/${connectorId}`);
        
        ws.onopen = () => setStatus('connected');
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === 'charging_data') {
                setData(message.data);
            } else if (message.type === 'error') {
                setError(message.data);
            }
        };
        
        ws.onerror = () => setStatus('error');
        ws.onclose = () => setStatus('disconnected');
        
        return () => ws.close();
    }, [chargePointId, connectorId]);

    return { data, status, error };
}

// การใช้งาน
function ChargingMonitor({ chargePointId, connectorId }) {
    const { data, status, error } = useChargingData(chargePointId, connectorId);
    
    if (status === 'connecting') return <div>กำลังเชื่อมต่อ...</div>;
    if (error) return <div>ข้อผิดพลาด: {error.message}</div>;
    if (!data) return <div>ไม่มีข้อมูล</div>;
    
    return (
        <div>
            <h3>เครื่องชาร์จ {chargePointId} หัวที่ {connectorId}</h3>
            <p>สถานะ: {data.status}</p>
            <p>เปอร์เซ็นต์: {data.chargingPercentage}%</p>
            <p>กำลังไฟ: {data.currentPower} kW</p>
            <p>พลังงานที่จ่าย: {data.energyDelivered} kWh</p>
            <p>ค่าใช้จ่าย: {data.cost} บาท</p>
        </div>
    );
}
```

## 🧪 การทดสอบ

### ทดสอบการเชื่อมต่อ
```bash
# ทดสอบการเชื่อมต่อเดียว
node -e "
const { runSimpleTest } = require('./dist/use-connect/testClient.js');
runSimpleTest('CP001', 1, 30);
"

# ทดสอบหลายการเชื่อมต่อ
node -e "
const { runMultiConnectionTest } = require('./dist/use-connect/testClient.js');
const connections = [
  { chargePointId: 'CP001', connectorId: 1 },
  { chargePointId: 'CP001', connectorId: 2 },
  { chargePointId: 'CP002', connectorId: 1 }
];
runMultiConnectionTest(connections, 30);
"
```

### ทดสอบด้วย wscat
```bash
# ติดตั้ง wscat
npm install -g wscat

# เชื่อมต่อทดสอบ
wscat -c ws://localhost:8081/CP001/1
```

## ⚙️ การตั้งค่า

### Environment Variables
```bash
# พอร์ต WebSocket (ค่าเริ่มต้น: 8081)
FRONTEND_WS_PORT=8081

# ปิดการเริ่มต้นอัตโนมัติ
DISABLE_AUTO_START=true

# โหมดทดสอบ
NODE_ENV=test
```

### การตั้งค่าขั้นสูง
```javascript
import { 
  startFrontendWebSocketSystem,
  DEFAULT_TRANSMISSION_SETTINGS,
  DEFAULT_VALIDATION_SETTINGS,
  DEFAULT_REALTIME_SETTINGS
} from './use-connect';

// ปรับแต่งการตั้งค่า
const customSettings = {
  ...DEFAULT_REALTIME_SETTINGS,
  dataUpdateIntervalMs: 3000,  // อัปเดตทุก 3 วินาที
  simulateData: false          // ใช้ข้อมูลจริง
};

const server = startFrontendWebSocketSystem(8081);
```

## 🔧 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **ไม่สามารถเชื่อมต่อได้**
   - ตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่
   - ตรวจสอบพอร์ตที่ใช้
   - ตรวจสอบ URL การเชื่อมต่อ

2. **ไม่ได้รับข้อมูล**
   - ตรวจสอบว่าเครื่องชาร์จออนไลน์
   - ตรวจสอบ session ของเครื่องชาร์จ
   - ตรวจสอบ connector ID

3. **ข้อมูลไม่อัปเดต**
   - ตรวจสอบการตั้งค่า interval
   - ตรวจสอบการเชื่อมต่อ OCPP

### การดู Log
```bash
# เริ่มเซิร์ฟเวอร์พร้อม debug
DEBUG=* node dist/use-connect/index.js

# ดูสถิติระบบ
node -e "
const { getSystemStats } = require('./dist/use-connect/index.js');
console.log(JSON.stringify(getSystemStats(), null, 2));
"
```

## 📁 โครงสร้างไฟล์

```
use-connect/
├── index.ts                    # จุดเริ่มต้นหลัก
├── types.ts                    # ประเภทข้อมูลและ interface
├── frontendWebSocketServer.ts  # WebSocket server สำหรับ frontend
├── sessionValidator.ts         # ตรวจสอบ session และสถานะ
├── realTimeDataManager.ts      # จัดการข้อมูลเรียลไทม์
├── testClient.ts              # ไคลเอนต์ทดสอบ
└── README.md                  # เอกสารนี้
```

## 🤝 การพัฒนาต่อ

### การเพิ่มฟีเจอร์ใหม่
1. เพิ่ม interface ใน `types.ts`
2. อัปเดต `realTimeDataManager.ts` สำหรับข้อมูลใหม่
3. อัปเดต `frontendWebSocketServer.ts` สำหรับการส่งข้อมูล
4. เพิ่มการทดสอบใน `testClient.ts`

### การปรับปรุงประสิทธิภาพ
- ปรับ interval การอัปเดตข้อมูล
- เพิ่มการ cache ข้อมูล
- ปรับปรุงการจัดการหน่วยความจำ

## 📞 การติดต่อ

หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อทีมพัฒนา