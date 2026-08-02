import { Router } from "express";

import authRouter from "./auth.js";
import casesRouter from "./cases.js";
import healthRouter from "./health.js";
import bankOffersRouter from "./bank-offers.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/cases", casesRouter);
router.use("/bank-offers", bankOffersRouter);

router.get("/", (_req, res) => {
  res.json({
    name: "Golden Key OS API",
    version: "0.3.0",

    modules: {
      health: "/api/health",
      login: "/api/auth/login",
      currentUser: "/api/auth/me",
      cases: "/api/cases",
      caseStats: "/api/cases/stats",
      bankOffers: "/api/bank-offers"
    }
  });
});

export default router;