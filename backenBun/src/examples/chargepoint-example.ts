import { PrismaClient, OCPPVersion, ConnectorType } from '@prisma/client'

const prisma = new PrismaClient()

async function chargePointExamples() {
  try {
    // 1. สร้าง ChargePoint ใหม่
    const newChargePoint = await prisma.chargePoint.create({
      data: {
        id: "CP_BKK_001",
        name: "Central World EV Station",
        stationName: "EV Station Central World",
        location: "999/9 Rama I Rd, Pathumwan, Bangkok",
        latitude: 13.7463,
        longitude: 100.5388,
        openingHours: "06:00-22:00",
        is24Hours: false,
        
        // ข้อมูลเครื่องชาร์จ
        brand: "Autel MaxiCharger AC Wallbox",
        serialNumber: "SN-AUTEL-23-001234",
        powerRating: 22.0,
        powerSystem: 3, // Three Phase
        connectorCount: 2,
        
        // ข้อมูล OCPP
        protocol: "OCPP16",
        chargePointIdentity: "CP001",
        
        // ข้อมูลหัวชาร์จที่ 1
        connector1: "TYPE_2",
        serialNumber1: "CONN-001-A",
        connectorId1: 1,
        powerRating1: 22.0,
        
        // ข้อมูลหัวชาร์จที่ 2
        connector2: "TYPE_2",
        serialNumber2: "CONN-001-B",
        connectorId2: 2,
        powerRating2: 22.0,

        // ข้อมูลหัวชาร์จที่ 3-4 (required fields)
        powerRating3: 0,
        powerRating4: 0,
        
        // ราคา
        onPeakRate: 8.5,
        offPeakRate: 4.5,
      }
    })
    console.log('Created new charge point:', newChargePoint)

    // 2. ค้นหา ChargePoint ทั้งหมด
    const allChargePoints = await prisma.chargePoint.findMany({
      where: {
        isPublic: true,
        status: 'AVAILABLE'
      },
      include: {
        connectors: true,
        owner: true
      }
    })
    console.log('All available public charge points:', allChargePoints)

    // 3. ค้นหา ChargePoint เฉพาะ
    const specificChargePoint = await prisma.chargePoint.findUnique({
      where: {
        id: "CP_BKK_001"
      },
      include: {
        transactions: {
          where: {
            status: 'ACTIVE'
          }
        }
      }
    })
    console.log('Specific charge point with active transactions:', specificChargePoint)

    // 4. อัพเดต ChargePoint
    const updatedChargePoint = await prisma.chargePoint.update({
      where: {
        id: "CP_BKK_001"
      },
      data: {
        status: 'MAINTENANCE',
        lastSeen: new Date(),
        heartbeatIntervalSec: 300
      }
    })
    console.log('Updated charge point:', updatedChargePoint)

    // 5. ลบ ChargePoint
    const deletedChargePoint = await prisma.chargePoint.delete({
      where: {
        id: "CP_BKK_001"
      }
    })
    console.log('Deleted charge point:', deletedChargePoint)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// รันตัวอย่าง
chargePointExamples()