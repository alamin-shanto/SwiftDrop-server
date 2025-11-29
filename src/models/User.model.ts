import { Schema, model, Document } from "mongoose";

export type Role = "sender" | "receiver" | "admin" | "delivery";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string; // hashed
  role: Role;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  refreshTokenHash?: string;
  // optional profile fields
  phone?: string;
  address?: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["sender", "receiver", "admin", "delivery"],
      default: "sender",
    },
    isBlocked: { type: Boolean, default: false },
    refreshTokenHash: { type: String },
    phone: String,
    address: String,
  },
  { timestamps: true, collection: "users" }
);

export default model<IUser>("User", UserSchema);
