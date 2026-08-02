import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  return res.status(200).json({
    ok: true,
    success: true,
    message: 'Bank Offers API ишлаяпти',
    module: 'bank-offers',
  });
});

router.get('/health', (_req, res) => {
  return res.status(200).json({
    ok: true,
    service: 'bank-offers',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

export default router;
