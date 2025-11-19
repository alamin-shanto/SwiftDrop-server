// src/routes/users.routes.ts
import express from "express";

const router = express.Router();

// Example admin-only endpoint placeholder
router.get("/", (_req, res) => {
  res.json({ message: "users root (admin only)" });
});

export default router;
