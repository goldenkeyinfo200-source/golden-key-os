import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { prisma } from '../src/config/prisma.js';

const requiredEnv = (name) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} environment variable киритилмаган`);
  }

  return value;
};

const run = async () => {
  const fullName =
    process.env.ADMIN_FULL_NAME?.trim() || 'Golden Key Super Admin';

  const login = requiredEnv('ADMIN_LOGIN').toLowerCase();
  const password = requiredEnv('ADMIN_PASSWORD');

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD камида 8 та белгидан иборат бўлиши керак');
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const phone = process.env.ADMIN_PHONE?.trim() || null;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: {
      login,
    },
    update: {
      fullName,
      email,
      phone,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      fullName,
      login,
      email,
      phone,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      login: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  console.log('✅ Super Admin тайёр:');
  console.table(user);
};

run()
  .catch((error) => {
    console.error('❌ Админ яратишда хато:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });