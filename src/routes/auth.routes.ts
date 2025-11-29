// src/routes/auth.routes.ts
import express from "express";
import * as authController from "../controllers/auth.controller";

const router = express.Router();

// Register (already wired)
router.post("/register", authController.register);

// Login -> use real controller if available
router.post(
  "/login",
  authController.login ??
    ((_req, res) => {
      res.status(501).json({ error: "login not implemented" });
    })
);

// Refresh token -> use real controller name `refreshToken`
router.post(
  "/refresh",
  authController.refreshToken ??
    ((_req, res) => {
      res.status(501).json({ error: "refresh not implemented" });
    })
);

// (optional) logout / me routes
router.post(
  "/logout",
  authController.logout ??
    ((_req, res) => {
      res.status(501).json({ error: "logout not implemented" });
    })
);
router.get(
  "/me",
  authController.me ??
    ((_req, res) => {
      res.status(501).json({ error: "me not implemented" });
    })
);

export default router;
