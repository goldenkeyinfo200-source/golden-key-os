import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET киритилмаган ёки жуда қисқа. Камида 32 та белги бўлиши керак.'
    );
  }

  return secret;
};

export const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      companyId: user.companyId ?? null,
      branchId: user.branchId ?? null,
    },
    getJwtSecret(),
    {
      expiresIn: '12h',
      issuer: 'golden-key-os',
      audience: 'golden-key-crm',
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'golden-key-os',
    audience: 'golden-key-crm',
  });
};