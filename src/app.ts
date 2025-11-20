// src/app.ts
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import parcelsRouter from "./routes/parcels.routes";
import usersRouter from "./routes/users.routes";
import authRouter from "./routes/auth.routes";
import { getDashboardSummary } from "./controllers/dashboard.controller";
import { authenticate, allowRoles } from "./middleware/auth.middleware";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

/**
 * Express app
 */
const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/**
 * Public / auth routes
 */
if (authRouter) {
  app.use("/api/auth", authRouter);
}

/**
 * API routes
 */
app.use("/api/parcels", parcelsRouter);

/**
 * Protect admin user management routes with authentication + role check
 */
app.use("/api/users", authenticate, allowRoles("admin"), usersRouter);

/**
 * Dashboard summary: allow admin/sender/receiver
 */
app.get(
  "/api/dashboard/summary",
  authenticate,
  allowRoles("admin", "sender", "receiver"),
  getDashboardSummary
);

/**
 * Healthcheck
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/**
 * Root route for Render / browser checks
 */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "SwiftDrop API is running",
    uptime: process.uptime(),
  });
});

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

/**
 * Central error handler
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // lightweight error normalization
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: unknown }).status) || 500
      : 500;
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message?: unknown }).message)
      : "Internal server error";

  console.error("Server error:", err);
  res.status(status).json({ error: message });
});

export default app;
