// src/services/parcel.service.ts
import Parcel, { IParcel } from "../models/Parcel.model";
import { Types } from "mongoose";
import generateTrackingId from "../utilities/generateTrackingId";

export interface CreateParcelDTO {
  senderId: string;
  receiverId: string;
  origin: string;
  destination: string;
  weight?: number;
  price?: number;
  note?: string;
}

export async function createParcel(dto: CreateParcelDTO) {
  const trackingId = generateTrackingId();

  // convert string IDs to ObjectId (matches model)
  const senderObjectId = new Types.ObjectId(dto.senderId);
  const receiverObjectId = new Types.ObjectId(dto.receiverId);

  // initial status log: include updatedBy as sender
  const statusLog: any = {
    status: "Created",
    timestamp: new Date(),
    note: dto.note || "Parcel created",
    // include updatedBy as ObjectId so model's IStatusLog (if required) accepts it.
    updatedBy: senderObjectId,
  };

  const parcel = await Parcel.create({
    trackingId,
    senderId: senderObjectId,
    receiverId: receiverObjectId,
    origin: dto.origin,
    destination: dto.destination,
    weight: dto.weight,
    price: dto.price,
    status: "Created",
    statusLogs: [statusLog],
  } as Partial<IParcel>);

  return parcel;
}

export async function getParcelByTrackingId(trackingId: string) {
  return Parcel.findOne({ trackingId })
    .populate("senderId", "name email")
    .populate("receiverId", "name email");
}

export async function getParcelById(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return Parcel.findById(id)
    .populate("senderId", "name email")
    .populate("receiverId", "name email");
}

export async function buildParcelsQuery(filters: any) {
  const q: any = {};
  if (filters.status) q.status = filters.status;
  if (filters.senderId) q.senderId = filters.senderId;
  if (filters.receiverId) q.receiverId = filters.receiverId;
  if (filters.trackingId) q.trackingId = filters.trackingId;
  if (filters.q) {
    const regex = new RegExp(filters.q, "i");
    q.$or = [{ origin: regex }, { destination: regex }, { trackingId: regex }];
  }
  if (filters.fromDate || filters.toDate) {
    q.createdAt = {};
    if (filters.fromDate) q.createdAt.$gte = new Date(filters.fromDate);
    if (filters.toDate) q.createdAt.$lte = new Date(filters.toDate);
  }
  return q;
}

export async function listParcels({
  filters = {},
  page = 1,
  limit = 10,
  sort = "-createdAt",
}: any) {
  const q = await buildParcelsQuery(filters);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Parcel.find(q)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("senderId", "name email")
      .populate("receiverId", "name email"),
    Parcel.countDocuments(q),
  ]);
  return { items, total };
}

export async function updateParcelStatus(
  parcelId: string,
  status: string,
  updatedBy?: string,
  note?: string
) {
  const p = await getParcelById(parcelId);
  if (!p) return null;

  p.status = status;

  // build the status log object and only include updatedBy when provided
  const log: any = {
    status,
    timestamp: new Date(),
    note,
  };
  if (updatedBy) {
    log.updatedBy = new Types.ObjectId(updatedBy);
  }

  // push typed object (casting to any/unknown to avoid exactOptionalPropertyTypes friction)
  p.statusLogs.push(log as unknown as any);

  await p.save();
  return p;
}

export async function cancelParcel(parcelId: string, userId?: string) {
  const p = await getParcelById(parcelId);
  if (!p) return null;
  if (["Dispatched", "InTransit", "Delivered"].includes(p.status)) {
    throw new Error("Cannot cancel parcel after dispatch");
  }
  p.status = "Cancelled";

  const log: any = {
    status: "Cancelled",
    timestamp: new Date(),
    note: "Cancelled by user",
  };
  if (userId) {
    log.updatedBy = new Types.ObjectId(userId);
  }

  p.statusLogs.push(log as unknown as any);
  await p.save();
  return p;
}
