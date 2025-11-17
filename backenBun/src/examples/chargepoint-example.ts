// @ts-nocheck
import { PrismaClient, OCPPVersion, ChargePointStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function chargePointExamples() {
  try {
    // 1. สร้าง ChargePoint ใหม่
    const station = await prisma.station.upsert({
      where: { stationname: "EV Station Central World" },
      update: {},
      create: {
        stationname: "EV Station Central World"
      }
    })

    const newChargePoint = await prisma.charge_points.create({
      data: {
        id: "CP_BKK_001",
        chargepointname: "Central World EV Station",
        stationId: station.id,
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
        protocol: OCPPVersion.OCPP16,
        chargePointIdentity: "CP001",
        
        
        // ราคา
        onPeakRate: 8.5,
        offPeakRate: 4.5,
      }
    })
    console.log('Created new charge point:', newChargePoint)

    // 2. ค้นหา ChargePoint ทั้งหมด
    const allChargePoints = await prisma.charge_points.findMany({
      where: {
        isPublic: true,
        chargepointstatus: ChargePointStatus.AVAILABLE
      },
      include: {
        connectors: true,
        owner: true
      }
    })
    console.log('All available public charge points:', allChargePoints)

    // 3. ค้นหา ChargePoint เฉพาะ
    const specificChargePoint = await prisma.charge_points.findUnique({
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
    const updatedChargePoint = await prisma.charge_points.update({
      where: {
        id: "CP_BKK_001"
      },
      data: {
        chargepointstatus: ChargePointStatus.MAINTENANCE,
        lastSeen: new Date(),
        heartbeatIntervalSec: 300
      }
    })
    console.log('Updated charge point:', updatedChargePoint)

    // 5. ลบ ChargePoint
    const deletedChargePoint = await prisma.charge_points.delete({
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
