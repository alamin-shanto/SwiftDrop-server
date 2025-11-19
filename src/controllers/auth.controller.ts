import type { Request, Response } from "express";
import * as authService from "../services/auth.service";
import generateTrackingId from "../utilities/generateTrackingId";
import jwt from "jsonwebtoken";

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ status: "fail", message: "Missing required fields" });
    }

    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return res
        .status(409)
        .json({ status: "fail", message: "Email already registered" });
    }

    const user = await authService.createUser({ name, email, password, role });
    // create tokens
    // normalize _id to a string (safe and explicit)
    const userId = user._id?.toString?.() ?? String(user._id);

    const accessToken = authService.signAccessToken({
      id: userId,
      role: user.role,
    });
    const refreshToken = authService.signRefreshToken({ id: userId });

    // persist using string id
    await authService.saveRefreshToken(userId, refreshToken);

    return res.status(201).json({
      status: "success",
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ status: "fail", message: "Missing credentials" });

    const user = await authService.findUserByEmail(email);
    if (!user)
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid credentials" });

    const ok = await authService.comparePassword(password, user.password);
    if (!ok)
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid credentials" });

    if (user.isBlocked)
      return res
        .status(403)
        .json({ status: "fail", message: "User is blocked" });

    // normalize _id to a string (safe and explicit)
    const userId = user._id?.toString?.() ?? String(user._id);

    const accessToken = authService.signAccessToken({
      id: userId,
      role: user.role,
    });
    const refreshToken = authService.signRefreshToken({ id: userId });

    // persist using string id
    await authService.saveRefreshToken(userId, refreshToken);

    return res.json({
      status: "success",
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res
        .status(400)
        .json({ status: "fail", message: "Missing refresh token" });

    // verify token signature
    const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "change_refresh";
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    } catch (err) {
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid refresh token" });
    }

    // ensure payload.id is a string
    const userId = payload?.id ? String(payload.id) : null;
    if (!userId) {
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid refresh token payload" });
    }

    const valid = await authService.verifyRefreshToken(userId, refreshToken);
    if (!valid)
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid refresh token" });

    const user = await authService.findUserById(userId);
    if (!user)
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });

    // produce new tokens using string id
    const newAccess = authService.signAccessToken({
      id: user._id?.toString?.() ?? String(user._id),
      role: user.role,
    });
    const newRefresh = authService.signRefreshToken({
      id: user._id?.toString?.() ?? String(user._id),
    });
    await authService.saveRefreshToken(
      user._id?.toString?.() ?? String(user._id),
      newRefresh
    );

    return res.json({
      status: "success",
      data: { accessToken: newAccess, refreshToken: newRefresh },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(204).send(); // idempotent

    // clear refresh token
    await authService.saveRefreshToken(user.id, ""); // or set null
    return res.status(200).json({ status: "success", message: "Logged out" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user)
      return res
        .status(401)
        .json({ status: "fail", message: "Not authenticated" });

    const full = await authService.findUserById(user.id);
    if (!full)
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });

    return res.json({ status: "success", data: full.toJSON() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}
