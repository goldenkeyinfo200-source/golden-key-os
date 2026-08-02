import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bank Offers API ishlayapti"
  });
});

export default router;