// src/routes/auth.routes.ts
import express from "express";

const router = express.Router();

// Minimal auth endpoints (stubs)
router.post("/login", (_req, res) => {
  res.json({ message: "login endpoint (stub)" });
});

router.post("/refresh", (_req, res) => {
  res.json({ message: "refresh endpoint (stub)" });
});

export default router;
