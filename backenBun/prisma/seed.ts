import { ConnectorType, OCPPVersion, OwnershipType, Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
// const { OwnershipType, OCPPVersion, ConnectorType } = Prisma;

async function seedAdminAndUser() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    },
    create: {
      id: randomUUID(),
      email: 'admin@example.com',
      password: adminPassword,
      role: 'SUPERADMIN',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    }
  });

  console.log('✅ Admin ready:', admin.email);

  const userPassword = await bcrypt.hash('user123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      phoneNumber: '+66812345678',
      password: userPassword,
      firebaseUid: 'firebase-uid-001',
      fullName: 'John Doe',
      typeUser: 'NORMAL',
      status: 'ACTIVE'
    },
    create: {
      id: randomUUID(),
      email: 'user@example.com',
      phoneNumber: '+66812345678',
      password: userPassword,
      firebaseUid: 'firebase-uid-001',
      fullName: 'John Doe',
      typeUser: 'NORMAL',
      status: 'ACTIVE'
    }
  });

  console.log('✅ User ready:', user.email);

  const newUserPassword = await bcrypt.hash('Plankton123', 10);

  const newUser = await prisma.user.upsert({
    where: { phoneNumber: '+66814266508' },
    update: {
      password: newUserPassword,
      fullName: 'New User',
      typeUser: 'NORMAL',
      status: 'ACTIVE'
    },
    create: {
      id: randomUUID(),
      email: 'newuser@example.com',
      phoneNumber: '+66814266508',
      password: newUserPassword,
      firebaseUid: 'firebase-uid-002',
      fullName: 'New User',
      typeUser: 'NORMAL',
      status: 'ACTIVE'
    }
  });

  console.log('✅ New User ready:', newUser.phoneNumber);

  return user;
}

async function seedStation() {
  const now = new Date();

  const station = await prisma.station.upsert({
    where: { stationname: 'Central World EV Station' },
    update: {
      location: '999/9 Rama I Rd, Pathumwan, Bangkok',
      latitude: new Prisma.Decimal('13.7463'),
      longitude: new Prisma.Decimal('100.5388'),
      onPeakRate: 12,
      onPeakStartTime: '09:00',
      onPeakEndTime: '22:00',
      offPeakRate: 6,
      offPeakStartTime: '22:00',
      offPeakEndTime: '09:00'
    },
    create: {
      stationname: 'Central World EV Station',
      location: '999/9 Rama I Rd, Pathumwan, Bangkok',
      latitude: new Prisma.Decimal('13.7463'),
      longitude: new Prisma.Decimal('100.5388'),
      onPeakRate: 12,
      onPeakStartTime: '09:00',
      onPeakEndTime: '22:00',
      offPeakRate: 6,
      offPeakStartTime: '22:00',
      offPeakEndTime: '09:00'
    }
  });

  console.log('✅ Station ready:', station.stationname);

  return station;
}

async function seedChargePoint(userId: string, stationId: string) {
  const now = new Date();

  const chargePoint = await prisma.charge_points.upsert({
    where: { chargePointIdentity: 'CP-TH-BKK-001' },
    update: {
      chargepointname: 'Central World AC Wallbox',
      stationId,
      openingHours: '06:00-22:00',
      is24Hours: false,
      brand: 'Autel MaxiCharger AC Wallbox',
      serialNumber: 'SN-AUTEL-23-001234',
      powerRating: 22,
      powerSystem: 3,
      connectorCount: 2,
      protocol: OCPPVersion.OCPP16,
      chargepointstatus: 'AVAILABLE',
      ownerId: userId,
      ownershipType: OwnershipType.PRIVATE,
      isPublic: true
    },
    create: {
      id: 'cp-central-world-001',
      chargepointname: 'Central World AC Wallbox',
      stationId,
      openingHours: '06:00-22:00',
      is24Hours: false,
      brand: 'Autel MaxiCharger AC Wallbox',
      serialNumber: 'SN-AUTEL-23-001234',
      powerRating: 22,
      powerSystem: 3,
      connectorCount: 2,
      protocol: OCPPVersion.OCPP16,
      chargePointIdentity: 'CP-TH-BKK-001',
      ownerId: userId,
      ownershipType: OwnershipType.PRIVATE,
      isPublic: true
    }
  });

  console.log('✅ Charge point ready:', chargePoint.chargepointname);

  return chargePoint;
}

async function seedConnectors(chargePointId: string) {
  const connectorDefinitions = [
    {
      connectorId: 1,
      type: ConnectorType.TYPE_2,
      typeDescription: 'Type 2 Connector',
      maxPower: 22,
      maxCurrent: 32
    },
    {
      connectorId: 2,
      type: ConnectorType.CCS_COMBO_2,
      typeDescription: 'CCS Combo 2 Connector',
      maxPower: 50,
      maxCurrent: 125
    }
  ];

  for (const definition of connectorDefinitions) {
    const connector = await prisma.connectors.upsert({
      where: {
        chargePointId_connectorId: {
          chargePointId,
          connectorId: definition.connectorId
        }
      },
      update: {
        type: definition.type,
        typeDescription: definition.typeDescription,
        maxPower: definition.maxPower,
        maxCurrent: definition.maxCurrent,
        connectorstatus: 'AVAILABLE'
      },
      create: {
        chargePointId,
        connectorId: definition.connectorId,
        type: definition.type,
        typeDescription: definition.typeDescription,
        maxPower: definition.maxPower,
        maxCurrent: definition.maxCurrent,
        connectorstatus: 'AVAILABLE'
      }
    });

    console.log(`  → Connector ${connector.connectorId} ready (${connector.type})`);
  }
}

async function seedUserVehicle(userId: string) {
  const vehicle = await prisma.user_vehicles.upsert({
    where: { licensePlate: 'กข 1234 กรุงเทพ' },
    update: {
      userId,
      make: 'Tesla',
      model: 'Model 3',
      type: 'ELECTRIC'
    },
    create: {
      id: randomUUID(),
      userId,
      licensePlate: 'กข 1234 กรุงเทพ',
      make: 'Tesla',
      model: 'Model 3',
      type: 'ELECTRIC'
    }
  });

  console.log('✅ Vehicle ready:', vehicle.licensePlate);
}

async function main() {
  try {
    const user = await seedAdminAndUser();
    const station = await seedStation();
    const chargePoint = await seedChargePoint(user.id, station.id);
    await seedConnectors(chargePoint.id);
    await seedUserVehicle(user.id);

    console.log('\n🎉 Seed complete!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
