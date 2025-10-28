import { PrismaClient, OCPPVersion, ConnectorType, UserType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // สร้าง User
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      phoneNumber: '+66812345678',
      password: 'user123', // ในการใช้งานจริงควรเข้ารหัสก่อน
      firebaseUid: 'firebase123',
      fullName: 'John Doe',
      typeUser: 'NORMAL',
      status: 'ACTIVE'
    }
  })
  console.log('Created user:', user)

  // สร้าง UserVehicle
  const vehicle = await prisma.userVehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'กข 1234 กรุงเทพ',
      make: 'Tesla',
      model: 'Model 3',
      type: 'ELECTRIC'
    }
  })
  console.log('Created vehicle:', vehicle)

  // สร้าง ChargePoint
  const chargePoint1 = await prisma.chargePoint.create({
    data: {
      name: "Central World Charging Station",
      stationName: "EV Central World",
      location: "999/9 Rama I Rd, Pathum Wan, Pathum Wan District, Bangkok 10330",
      latitude: 13.7467,
      longitude: 100.5398,
      openingHours: "10:00-22:00",
      is24Hours: false,
      brand: "Autel MaxiCharger AC Wallbox 50kW",
      serialNumber: "SN-AUTEL-23-001234",
      powerRating: 50.0,
      powerSystem: 3,
      connectorCount: 2,
      protocol: "OCPP16",
      chargePointIdentity: "CPID-CENWORLD-001",
      status: "AVAILABLE",
      ownerId: user.id,
    },
  });
  console.log('Created charge point:', chargePoint1)

  const chargePoint2 = await prisma.chargePoint.create({
    data: {
      name: "Big C Ladprao Charging Station", 
      stationName: "EV Big C Ladprao",
      location: "97/11 Phahon Yothin Rd, Chatuchak, Bangkok 10900",
      latitude: 13.8167,
      longitude: 100.5692,
      openingHours: "09:00-21:00",
      is24Hours: false,
      brand: "Delta AC Mini Plus",
      serialNumber: "SN-DELTA-23-005678",
      powerRating: 22.0,
      powerSystem: 3,
      connectorCount: 1,
      protocol: "OCPP16",
      chargePointIdentity: "CPID-BIGCLAD-002",
      status: "AVAILABLE",
      ownerId: user.id,
    },
  });
  console.log('Created charge point:', chargePoint2)

  // สร้าง Connector สำหรับ ChargePoint แรก
  const connector1 = await prisma.connector.create({
    data: {
      chargePointId: chargePoint1.id,
      connectorId: 1,
      type: 'TYPE_2',
      typeDescription: 'Type 2 Connector',
      maxPower: 22.0,
      maxCurrent: 32.0
    }
  })
  console.log('Created connector:', connector1)

  // สร้าง Connector สำหรับ ChargePoint ที่สอง
  const connector2 = await prisma.connector.create({
    data: {
      chargePointId: chargePoint2.id,
      connectorId: 1,
      type: 'TYPE_2',
      typeDescription: 'Type 2 Connector',
      maxPower: 22.0,
      maxCurrent: 32.0
    }
  })
  console.log('Created connector:', connector2)

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })