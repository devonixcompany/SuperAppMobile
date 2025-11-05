import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password';

const prisma = new PrismaClient();

async function seedAdmins() {
  try {
    console.log('🌱 Starting admin seed...');

    // Create superadmin accounts
    const superadmins = [
      {
        email: 'superadmin1@superapp.com',
        password: 'SuperAdmin123!',
        firstName: 'Super',
        lastName: 'Admin One',
        role: 'SUPERADMIN' as const,
      },
      {
        email: 'superadmin2@superapp.com',
        password: 'SuperAdmin456!',
        firstName: 'Super',
        lastName: 'Admin Two',
        role: 'SUPERADMIN' as const,
      },
    ];

    for (const admin of superadmins) {
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: admin.email },
      });

      if (!existingAdmin) {
        const hashedPassword = await hashPassword(admin.password);
        
        const newAdmin = await prisma.admin.create({
          data: {
            email: admin.email,
            password: hashedPassword,
            role: admin.role,
            firstName: admin.firstName,
            lastName: admin.lastName,
            isActive: true,
          },
        });

        console.log(`✅ Created superadmin: ${admin.email}`);
      } else {
        console.log(`⚠️ Superadmin already exists: ${admin.email}`);
      }
    }

    // Create a staff account
    const staffEmail = 'staff@superapp.com';
    const existingStaff = await prisma.admin.findUnique({
      where: { email: staffEmail },
    });

    if (!existingStaff) {
      const staffPassword = await hashPassword('StaffPass123!');
      
      const newStaff = await prisma.admin.create({
        data: {
          email: staffEmail,
          password: staffPassword,
          role: 'STAFF',
          firstName: 'Staff',
          lastName: 'User',
          isActive: true,
        },
      });

      console.log(`✅ Created staff: ${staffEmail}`);
    } else {
      console.log(`⚠️ Staff already exists: ${staffEmail}`);
    }

    console.log('🎉 Admin seed completed successfully!');
    
    console.log('\n📋 Admin Login Credentials:');
    console.log('==========================================');
    console.log('Superadmin 1:');
    console.log('  Email: superadmin1@superapp.com');
    console.log('  Password: SuperAdmin123!');
    console.log('');
    console.log('Superadmin 2:');
    console.log('  Email: superadmin2@superapp.com');
    console.log('  Password: SuperAdmin456!');
    console.log('');
    console.log('Staff:');
    console.log('  Email: staff@superapp.com');
    console.log('  Password: StaffPass123!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedAdmins()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedAdmins };
