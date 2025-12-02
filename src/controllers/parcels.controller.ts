// src/controllers/parcels.controller.ts
import type { Request, Response } from "express";
import * as parcelService from "../services/parcel.service";
import * as userService from "../services/user.service";
import { Types } from "mongoose";
import {
  parsePagination,
  buildPaginationResult,
} from "../utilities/pagination";

/**
 * Create parcel handler.
 * Accepts receiverId as either a Mongo ObjectId or a shortId and resolves it.
 */
export async function createParcelHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res
        .status(401)
        .json({ status: "fail", message: "Not authenticated" });
    }

    let { receiverId, origin, destination, weight, price, note } =
      req.body || {};
    if (!receiverId || !origin || !destination) {
      return res
        .status(400)
        .json({ status: "fail", message: "Missing required parcel fields" });
    }

    // If receiverId looks like a shortId (not a valid ObjectId), try resolve to _id
    if (!Types.ObjectId.isValid(String(receiverId))) {
      const found = await userService.findByShortId(String(receiverId));
      if (!found) {
        return res
          .status(404)
          .json({ status: "fail", message: "Receiver not found" });
      }
      receiverId = String(found._id);
    }

    const senderId = String(user.id);

    const dto = {
      senderId,
      receiverId: String(receiverId),
      origin,
      destination,
      weight,
      price,
      note,
    };

    const parcel = await parcelService.createParcel(dto);
    return res.status(201).json({ status: "success", data: parcel });
  } catch (err: any) {
    console.error("createParcelHandler error:", err);
    return res.status(400).json({
      status: "fail",
      message: err?.message || "Could not create parcel",
    });
  }
}

/**
 * Public tracking by trackingId
 */
export async function getParcelByTrackingHandler(req: Request, res: Response) {
  try {
    const trackingId = req.params.trackingId;
    if (!trackingId) {
      return res
        .status(400)
        .json({ status: "fail", message: "Missing trackingId parameter" });
    }

    const parcel = await parcelService.getParcelByTrackingId(
      String(trackingId)
    );
    if (!parcel)
      return res
        .status(404)
        .json({ status: "fail", message: "Parcel not found" });
    return res.json({ status: "success", data: parcel });
  } catch (err) {
    console.error("getParcelByTrackingHandler error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

/**
 * List parcels with pagination + role-based filtering
 */
export async function listParcelsHandler(req: Request, res: Response) {
  try {
    const { page, limit, sort } = parsePagination(req.query);
    const user = (req as any).user;
    const filters: any = { ...req.query };

    if (user && user.role === "sender") filters.senderId = String(user.id);
    if (user && user.role === "receiver") filters.receiverId = String(user.id);

    const { items, total } = await parcelService.listParcels({
      filters,
      page,
      limit,
      sort,
    });
    return res.json(buildPaginationResult(items, total, page, limit));
  } catch (err) {
    console.error("listParcelsHandler error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

/**
 * Update parcel status (admin/delivery)
 */
export async function updateStatusHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id)
      return res
        .status(401)
        .json({ status: "fail", message: "Not authenticated" });

    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ status: "fail", message: "Missing parcel id" });

    const { status, note } = req.body;
    if (!status)
      return res
        .status(400)
        .json({ status: "fail", message: "Missing status" });

    const updated = await parcelService.updateParcelStatus(
      String(id),
      String(status),
      String(user.id),
      note
    );
    if (!updated)
      return res
        .status(404)
        .json({ status: "fail", message: "Parcel not found" });
    return res.json({ status: "success", data: updated });
  } catch (err: any) {
    console.error("updateStatusHandler error:", err);
    return res
      .status(400)
      .json({
        status: "fail",
        message: err?.message || "Could not update status",
      });
  }
}

/**
 * Cancel parcel (sender/admin)
 */
export async function cancelParcelHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id)
      return res
        .status(401)
        .json({ status: "fail", message: "Not authenticated" });

    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ status: "fail", message: "Missing parcel id" });

    const cancelled = await parcelService.cancelParcel(
      String(id),
      String(user.id)
    );
    if (!cancelled)
      return res
        .status(404)
        .json({ status: "fail", message: "Parcel not found" });
    return res.json({ status: "success", data: cancelled });
  } catch (err: any) {
    console.error("cancelParcelHandler error:", err);
    return res
      .status(400)
      .json({
        status: "fail",
        message: err?.message || "Could not cancel parcel",
      });
  }
}

/**
 * Stats (simple aggregated view)
 */
export async function getStats(req: Request, res: Response) {
  try {
    if (typeof (parcelService as any).getStats === "function") {
      const stats = await (parcelService as any).getStats();
      return res.json({ status: "success", data: stats });
    }

    const listResult = await parcelService.listParcels({
      filters: {},
      page: 1,
      limit: 100000,
      sort: { createdAt: -1 as any },
    } as any);

    const items: any[] = Array.isArray(listResult?.items)
      ? listResult.items
      : [];
    const total: number =
      typeof listResult?.total === "number" ? listResult.total : items.length;

    const delivered = items.filter(
      (p: any) => p?.status === "delivered"
    ).length;
    const inTransit = items.filter(
      (p: any) => p?.status && p.status !== "delivered"
    ).length;

    const monthlyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      monthlyMap[key] = 0;
    }

    items.forEach((p: any) => {
      if (!p?.createdAt) return;
      const d = new Date(p.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (monthlyMap[key] !== undefined) monthlyMap[key] = monthlyMap[key]! + 1;
    });

    const monthly = Object.keys(monthlyMap)
      .sort()
      .map((k) => ({ month: k, count: monthlyMap[k] }));

    return res.json({
      status: "success",
      data: { total, delivered, inTransit, monthly },
    });
  } catch (err) {
    console.error("getStats failed:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}
