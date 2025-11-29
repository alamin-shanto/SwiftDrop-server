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

app.use((req, _res, next) => {
  console.log(
    "Incoming Origin:",
    req.headers.origin,
    "Method:",
    req.method,
    "URL:",
    req.url
  );
  next();
});

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://swiftdrop-client.netlify.app/",
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string) => void
  ) => {
    // allow non-browser requests
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin); // echo back the exact origin
    }
    console.warn("Blocked CORS origin:", origin);
    return callback(new Error("CORS not allowed for origin " + origin));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.options("/*", cors(corsOptions));
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
