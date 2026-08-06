import { Router } from "express";

const router = Router();

// Барча филиаллар
router.get("/", async (req, res) => {
  try {
    const branches = [
      {
        id: 1,
        name: "Қўқон марказ",
        city: "Қўқон",
      },
      {
        id: 2,
        name: "Марғилон",
        city: "Марғилон",
      },
      {
        id: 3,
        name: "Фарғона",
        city: "Фарғона",
      },
    ];

    res.json(branches);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;