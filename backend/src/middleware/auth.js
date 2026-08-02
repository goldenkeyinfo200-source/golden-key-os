import { prisma } from '../config/prisma.js';
import { verifyAccessToken } from '../services/token.js';

export const auth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Тизимга кириш талаб қилинади',
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        error: 'Авторизация токени топилмади',
      });
    }

    const payload = verifyAccessToken(token);

    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string'
    ) {
      return res.status(401).json({
        error: 'Авторизация токени нотўғри',
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        telegramId: true,
        role: true,
        isActive: true,
        companyId: true,
        branchId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Фойдаланувчи топилмади ёки фаол эмас',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error?.name === 'JsonWebTokenError' ||
      error?.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        error:
          error.name === 'TokenExpiredError'
            ? 'Сеанс муддати тугаган. Қайта киринг.'
            : 'Авторизация токени ҳақиқий эмас',
      });
    }

    next(error);
  }
};

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Тизимга кириш талаб қилинади',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Бу амал учун рухсатингиз йўқ',
      });
    }

    next();
  };
};