const WebSocket = require('ws');

// ฟังก์ชันสำหรับสร้างการเชื่อมต่อ charge point
function createChargePointConnection(chargePointId, serialNumber) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8081', 'ocpp1.6');
    
    const connectionData = {
      chargePointId,
      serialNumber,
      ws,
      connected: false,
      authenticated: false,
      messages: []
    };

    ws.on('open', () => {
      console.log(`🔌 ${chargePointId}: เชื่อมต่อสำเร็จ`);
      connectionData.connected = true;
      
      // ส่ง BootNotification
      const bootNotification = [2, "1", "BootNotification", {
        "chargePointVendor": "EVBangna",
        "chargePointModel": "CP-Model-001",
        "chargePointSerialNumber": serialNumber,
        "firmwareVersion": "1.0.0"
      }];
      
      ws.send(JSON.stringify(bootNotification));
      console.log(`📤 ${chargePointId}: ส่ง BootNotification`);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        connectionData.messages.push(message);
        console.log(`📥 ${chargePointId}: รับข้อความ`, message);
        
        // ตรวจสอบ BootNotification Response
        if (message[0] === 3 && message[1] === "1") {
          if (message[2].status === "Accepted") {
            connectionData.authenticated = true;
            console.log(`✅ ${chargePointId}: BootNotification ได้รับการยอมรับ`);
            
            // ส่ง Heartbeat
            setTimeout(() => {
              const heartbeat = [2, "2", "Heartbeat", {}];
              ws.send(JSON.stringify(heartbeat));
              console.log(`💓 ${chargePointId}: ส่ง Heartbeat`);
            }, 1000);
          }
        }
        
        // ตอบกลับ Heartbeat Response
        if (message[0] === 3 && message[1] === "2") {
          console.log(`💓 ${chargePointId}: รับ Heartbeat Response`);
        }
        
      } catch (error) {
        console.error(`❌ ${chargePointId}: Error parsing message:`, error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 ${chargePointId}: การเชื่อมต่อปิด - Code: ${code}, Reason: ${reason}`);
      connectionData.connected = false;
    });

    ws.on('error', (error) => {
      console.error(`❌ ${chargePointId}: WebSocket error:`, error);
      reject(error);
    });

    // รอให้การเชื่อมต่อเสร็จสมบูรณ์
    setTimeout(() => {
      resolve(connectionData);
    }, 2000);
  });
}

// ทดสอบการเชื่อมต่อหลายเครื่องพร้อมกัน
async function testMultipleConnections() {
  console.log('🚀 เริ่มทดสอบการเชื่อมต่อหลายเครื่องพร้อมกัน...\n');
  
  const chargePoints = [
    { id: 'EVBANGNA-CP001', serial: 'SN001' },
    { id: 'EVBANGNA-CP002', serial: 'SN002' },
    { id: 'EVBANGNA-CP003', serial: 'SN003' },
    { id: 'EVBANGNA-CP004', serial: 'SN004' },
    { id: 'EVBANGNA-CP005', serial: 'SN005' }
  ];

  try {
    // สร้างการเชื่อมต่อทั้งหมดพร้อมกัน
    const connectionPromises = chargePoints.map(cp => 
      createChargePointConnection(cp.id, cp.serial)
    );
    
    console.log(`📡 กำลังสร้างการเชื่อมต่อ ${chargePoints.length} เครื่องพร้อมกัน...\n`);
    
    const connections = await Promise.all(connectionPromises);
    
    // รอสักครู่เพื่อให้ข้อความทั้งหมดถูกประมวลผล
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // สรุปผลการทดสอบ
    console.log('\n📊 สรุปผลการทดสอบ:');
    console.log('='.repeat(50));
    
    let connectedCount = 0;
    let authenticatedCount = 0;
    
    connections.forEach(conn => {
      const status = conn.connected ? '🟢 เชื่อมต่อ' : '🔴 ไม่เชื่อมต่อ';
      const auth = conn.authenticated ? '✅ ยืนยันตัวตน' : '❌ ไม่ยืนยันตัวตน';
      
      console.log(`${conn.chargePointId}: ${status} | ${auth} | ข้อความ: ${conn.messages.length}`);
      
      if (conn.connected) connectedCount++;
      if (conn.authenticated) authenticatedCount++;
    });
    
    console.log('='.repeat(50));
    console.log(`📈 สถิติการเชื่อมต่อ:`);
    console.log(`   - เชื่อมต่อสำเร็จ: ${connectedCount}/${chargePoints.length}`);
    console.log(`   - ยืนยันตัวตนสำเร็จ: ${authenticatedCount}/${chargePoints.length}`);
    
    if (connectedCount === chargePoints.length && authenticatedCount === chargePoints.length) {
      console.log('\n🎉 ระบบรองรับการเชื่อมต่อหลายเครื่องได้สำเร็จ!');
    } else {
      console.log('\n⚠️ มีปัญหาในการเชื่อมต่อบางเครื่อง');
    }
    
    // ปิดการเชื่อมต่อทั้งหมด
    console.log('\n🔌 กำลังปิดการเชื่อมต่อทั้งหมด...');
    connections.forEach(conn => {
      if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close();
      }
    });
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// เริ่มการทดสอบ
testMultipleConnections();