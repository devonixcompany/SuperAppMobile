import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // สร้าง Admin
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@example.com',
      password: 'admin123', // ในการใช้งานจริงควรเข้ารหัสก่อน
      role: 'SUPERADMIN',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    }
  })
  console.log('Created admin:', admin)

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
  const chargePoint = await prisma.chargePoint.create({
    data: {
      id: 'CP_BKK_001',
      name: 'Central World EV Station',
      stationName: 'EV Station Central World',
      location: '999/9 Rama I Rd, Pathumwan, Bangkok',
      latitude: 13.7463,
      longitude: 100.5388,
      openingHours: '06:00-22:00',
      is24Hours: false,
      brand: 'Autel MaxiCharger AC Wallbox',
      serialNumber: 'SN-AUTEL-23-001234',
      powerRating: 22.0,
      powerSystem: 3,
      connectorCount: 2,
      protocol: 'OCPP16',
      chargePointIdentity: 'CP001',
      ownerId: user.id,
      ownershipType: 'PRIVATE',
      isPublic: true
    }
  })
  console.log('Created charge point:', chargePoint)

  // สร้าง Connector
  const connector = await prisma.connector.create({
    data: {
      chargePointId: chargePoint.id,
      connectorId: 1,
      type: 'TYPE_2',
      typeDescription: 'Type 2 Connector',
      maxPower: 22.0,
      maxCurrent: 32.0
    }
  })
  console.log('Created connector:', connector)
}

main()
  .catch((e) => {
    console.error(e)
    throw new Error('Seed failed')
  })
  .finally(async () => {
    await prisma.$disconnect()
  })