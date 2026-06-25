const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@trustcenter.local';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });
  
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        passwordHash: passwordHash,
        role: 'ADMIN',
        isEnabled: true
      }
    });
    console.log('Created default admin user:', admin.email);
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
