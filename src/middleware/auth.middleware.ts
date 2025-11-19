// src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import type { IUser } from "../models/User.model";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET ?? "change_me";

export interface AuthedUser {
  id: string;
  role: string;
  email?: string;
}

/*
 * Authenticate middleware:
 * - verifies Bearer token
 * - optionally fetches user to ensure not blocked
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = (req.headers.authorization || "").split(" ");
    const token =
      authHeader.length === 2 && authHeader[0] === "Bearer"
        ? authHeader[1]
        : null;
    if (!token) {
      return res
        .status(401)
        .json({ status: "fail", message: "No token provided" });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid or expired token" });
    }

    // payload must contain an `id`
    if (!payload?.id) {
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid token payload" });
    }

    // confirm user exists and not blocked
    const user = (await User.findById(payload.id).select(
      "+isBlocked +role +email"
    )) as IUser | null;

    if (!user) {
      return res
        .status(401)
        .json({ status: "fail", message: "User not found" });
    }
    if (user.isBlocked) {
      return res
        .status(403)
        .json({ status: "fail", message: "User is blocked" });
    }

    // cast _id to ObjectId for TS so toString() is allowed
    const objectId = user._id as unknown as Types.ObjectId;

    // attach typed user to request
    (req as any).user = {
      id: objectId.toString(),
      role: user.role,
      email: user.email,
    } as AuthedUser;

    next();
  } catch (err) {
    console.error("auth.middleware error", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

/** Role guard: allow only the listed roles */
export function allowRoles(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthedUser | undefined;
    if (!user?.role || !allowed.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
