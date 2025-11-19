// src/services/auth.service.ts
import User, { IUser } from "../models/User.model";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { Types } from "mongoose";

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);

// keep secrets typed as jwt.Secret
const JWT_SECRET = (process.env.JWT_SECRET || "change_me") as jwt.Secret;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "15m";

const REFRESH_SECRET = (process.env.REFRESH_TOKEN_SECRET ||
  "change_refresh") as jwt.Secret;
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "7d";

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}

export function signAccessToken(payload: Record<string, any>) {
  // cast expiresIn to any to satisfy @types/jsonwebtoken's narrower type
  const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES as unknown as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function signRefreshToken(payload: Record<string, any>) {
  const options: jwt.SignOptions = {
    expiresIn: REFRESH_EXPIRES as unknown as any,
  };
  return jwt.sign(payload, REFRESH_SECRET, options);
}

export async function saveRefreshToken(
  userId: Types.ObjectId | string,
  refreshToken: string
) {
  const hash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await User.findByIdAndUpdate(userId, { refreshTokenHash: hash });
}

export async function verifyRefreshToken(userId: string, token: string) {
  const user = await User.findById(userId);
  if (!user || !user.refreshTokenHash) return false;
  return bcrypt.compare(token, user.refreshTokenHash);
}

export async function createUser(userPayload: Partial<IUser>) {
  const hashed = await hashPassword(userPayload.password!);
  const user = await User.create({ ...userPayload, password: hashed });
  return user;
}

export async function findUserByEmail(email: string) {
  return User.findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string) {
  return User.findById(id);
}
