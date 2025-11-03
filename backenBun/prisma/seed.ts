import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // สร้าง/อัปเดต Admin (ป้องกันซ้ำเมื่อรัน seed หลายครั้ง)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    },
    create: {
      email: 'admin@example.com',
      password: 'admin123', // ในการใช้งานจริงควรเข้ารหัสก่อน
      role: 'SUPERADMIN',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    }
  })
  console.log('Created admin:', admin)

  // สร้าง/อัปเดต User
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      phoneNumber: '+66812345678',
      password: 'user123',
      firebaseUid: 'firebase123',
      fullName: 'John Doe',
      typeUser: 'NORMAL',
      status: 'ACTIVE'
    },
    create: {
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

  // สร้าง/อัปเดต UserVehicle
  const vehicle = await prisma.userVehicle.upsert({
    where: { licensePlate: 'กข 1234 กรุงเทพ' },
    update: {
      userId: user.id,
      make: 'Tesla',
      model: 'Model 3',
      type: 'ELECTRIC'
    },
    create: {
      userId: user.id,
      licensePlate: 'กข 1234 กรุงเทพ',
      make: 'Tesla',
      model: 'Model 3',
      type: 'ELECTRIC'
    }
  })
  console.log('Created vehicle:', vehicle)

  // สร้าง/อัปเดต ChargePoint
  const chargePoint = await prisma.chargePoint.upsert({
    where: { id: 'CP_BKK_001' },
    update: {
      ownerId: user.id,
      name: 'Central World EV Station',
      stationName: 'Central World EV Station',
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
      ownershipType: 'PRIVATE',
      isPublic: true
    },
    create: {
      id: 'CP_BKK_001',
      name: 'Central World EV Station',
      stationName: 'Central World EV Station',
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

  // สร้าง/อัปเดต Connector
  const connector = await prisma.connector.upsert({
    where: { id: 'connector-cp-bkk-001-1' },
    update: {
      chargePointId: chargePoint.id,
      connectorId: 1,
      type: 'TYPE_2',
      typeDescription: 'Type 2 Connector',
      maxPower: 22.0,
      maxCurrent: 32.0
    },
    create: {
      id: 'connector-cp-bkk-001-1',
      chargePointId: chargePoint.id,
      connectorId: 1,
      type: 'TYPE_2',
      typeDescription: 'Type 2 Connector',
      maxPower: 22.0,
      maxCurrent: 32.0
    }
  })
  console.log('Created connector:', connector)

  // สร้าง/อัปเดต RFID Cards สำหรับผู้ใช้
  const primaryCard = await prisma.rfidCard.upsert({
    where: { cardNumber: '1234567890ABCDEF' },
    update: {
      ownerId: user.id,
      alias: 'บัตรหลัก',
      isPrimary: true,
      status: 'ACTIVE',
      deletedAt: null
    },
    create: {
      id: 'rfid-card-primary',
      ownerId: user.id,
      cardNumber: '1234567890ABCDEF',
      alias: 'บัตรหลัก',
      isPrimary: true,
      status: 'ACTIVE',
      activatedAt: new Date()
    }
  })
  const secondaryCard = await prisma.rfidCard.upsert({
    where: { cardNumber: 'ABCDEF1234567890' },
    update: {
      ownerId: user.id,
      alias: 'บัตรแผน',
      isPrimary: false,
      status: 'ACTIVE',
      deletedAt: null
    },
    create: {
      id: 'rfid-card-secondary',
      ownerId: user.id,
      cardNumber: 'ABCDEF1234567890',
      qrCodeValue: 'QR-ABCDEF1234567890',
      alias: 'บัตรแผน',
      isPrimary: false,
      status: 'ACTIVE'
    }
  })
  console.log('Seeded RFID cards:', { primaryCard, secondaryCard })
}

main()
  .catch((e) => {
    console.error(e)
    throw new Error('Seed failed')
  })
  .finally(async () => {
    await prisma.$disconnect()
  })





