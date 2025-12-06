// src/routes/parcels.routes.ts
import { Router } from "express";
import * as parcelsController from "../controllers/parcels.controller";
import { authenticate } from "../middleware/auth.middleware";
import { allowRoles } from "../middleware/role.middleware";

const router = Router();

// Stats (open endpoint or restrict in controller)
router.get(
  "/stats",
  parcelsController.getStats ??
    ((req, res) =>
      res.json({ total: 0, delivered: 0, inTransit: 0, monthly: [] }))
);

// Public tracking by trackingId
router.get(
  "/track/:trackingId",
  parcelsController.getParcelByTrackingHandler ??
    ((req, res) => res.status(501).json({ error: "not implemented" }))
);

// Authenticated parcel creation (sender)
router.post(
  "/",
  authenticate,
  allowRoles("sender"),
  parcelsController.createParcelHandler ??
    ((req, res) => res.status(501).json({ error: "not implemented" }))
);

// List parcels (auth inside controller will filter by role)
router.get(
  "/",
  authenticate,
  parcelsController.listParcelsHandler ??
    ((req, res) => res.status(501).json({ error: "not implemented" }))
);

// --- Status update routes (admin/delivery) ---

// Support both PUT and PATCH: frontend can call either
router.put(
  "/:id/status",
  authenticate,
  allowRoles("admin", "delivery"),
  parcelsController.updateStatusHandler ??
    ((req, res) => res.status(501).json({ error: "not implemented" }))
);

router.patch(
  "/:id/status",
  authenticate,
  allowRoles("admin", "delivery"),
  parcelsController.updateStatusHandler ??
    ((req, res) => res.status(501).json({ error: "not implemented" }))
);

// --- Cancel routes (sender/admin) ---

router.put(
  "/:id/cancel",
  authenticate,
  allowRoles("sender", "admin"),
  parcelsController.cancelParcelHandler ??
    ((req, res) => res.status(501).json({ error: "not implemented" }))
);

router.patch(
  "/:id/cancel",
  authenticate,
  allowRoles("sender", "admin"),
  parcelsController.cancelParcelHandler ??
    ((req, res) => res.status(501).json({ error: "not implemented" }))
);

export default router;
