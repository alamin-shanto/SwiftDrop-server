import { Router } from "express";
import * as parcelsController from "../controllers/parcels.controller";
import { authenticate } from "../middleware/auth.middleware";
import { allowRoles } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/stats",
  parcelsController.getStats ??
    ((req, res) => {
      res.json({ total: 0, delivered: 0, inTransit: 0, monthly: [] });
    })
);

/**
 * Public tracking by trackingId
 */
router.get("/track/:trackingId", parcelsController.getParcelByTrackingHandler);

/**
 * Authenticated routes
 */
router.post(
  "/",
  authenticate,
  allowRoles("sender"),
  parcelsController.createParcelHandler
);
router.get("/", authenticate, parcelsController.listParcelsHandler); // role-filtering inside controller

// update status by admin/delivery personnel
router.put(
  "/:id/status",
  authenticate,
  allowRoles("admin", "delivery"),
  parcelsController.updateStatusHandler
);

// cancel by sender before dispatch OR admin
router.put(
  "/:id/cancel",
  authenticate,
  allowRoles("sender", "admin"),
  parcelsController.cancelParcelHandler
);

export default router;
