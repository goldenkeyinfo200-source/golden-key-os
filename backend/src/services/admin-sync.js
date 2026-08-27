import bcrypt from 'bcryptjs';

import { prisma } from '../config/prisma.js';

export async function syncSuperAdminFromEnv() {
  const rawLogin = process.env.ADMIN_LOGIN?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!rawLogin || !password) {
    console.log(
      'ℹ️ ADMIN_LOGIN/ADMIN_PASSWORD берилмаган — Super Admin синхронизацияси ўтказиб юборилди.'
    );
    return;
  }

  if (password.length < 8) {
    throw new Error(
      'ADMIN_PASSWORD камида 8 та белгидан иборат бўлиши керак'
    );
  }

  const login = rawLogin.toLowerCase();
  const fullName =
    process.env.ADMIN_FULL_NAME?.trim() || 'Golden Key Super Admin';

  const email =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;

  const phone = process.env.ADMIN_PHONE?.trim() || null;

  const existing = await prisma.user.findFirst({
    where: {
      login: {
        equals: login,
        mode: 'insensitive',
      },
    },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        fullName,
        login,
        email,
        phone,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    console.log(`✅ Super Admin яратилди: ${login}`);
    return;
  }

  const passwordMatches =
    existing.passwordHash
      ? await bcrypt.compare(password, existing.passwordHash)
      : false;

  const updateData = {
    fullName,
    role: 'SUPER_ADMIN',
    isActive: true,
  };

  // Optional env fields only overwrite DB when explicitly supplied.
  if (process.env.ADMIN_EMAIL?.trim()) {
    updateData.email = email;
  }

  if (process.env.ADMIN_PHONE?.trim()) {
    updateData.phone = phone;
  }

  if (!passwordMatches) {
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  await prisma.user.update({
    where: {
      id: existing.id,
    },
    data: updateData,
  });

  console.log(
    passwordMatches
      ? `✅ Super Admin текширилди: ${login}`
      : `✅ Super Admin пароли Railway ADMIN_PASSWORD билан синхронланди: ${login}`
  );
}
