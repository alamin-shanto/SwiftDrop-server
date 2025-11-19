// src/controllers/parcels.controller.ts
import type { Request, Response } from "express";
import * as parcelService from "../services/parcel.service";
import {
  parsePagination,
  buildPaginationResult,
} from "../utilities/pagination";

export async function createParcelHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res
        .status(401)
        .json({ status: "fail", message: "Not authenticated" });
    }

    const { receiverId, origin, destination, weight, price, note } = req.body;
    if (!receiverId || !origin || !destination) {
      return res
        .status(400)
        .json({ status: "fail", message: "Missing required parcel fields" });
    }

    // Normalize senderId to string
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
    console.error(err);
    return res.status(400).json({
      status: "fail",
      message: err?.message || "Could not create parcel",
    });
  }
}

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
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function listParcelsHandler(req: Request, res: Response) {
  try {
    const { page, limit, sort } = parsePagination(req.query);
    // build role-restricted filters
    const user = (req as any).user;
    const filters: any = { ...req.query };

    // If not admin, restrict to own parcels
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
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function updateStatusHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res
        .status(401)
        .json({ status: "fail", message: "Not authenticated" });
    }

    const { id } = req.params; // parcel id
    if (!id) {
      return res
        .status(400)
        .json({ status: "fail", message: "Missing parcel id" });
    }

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
    console.error(err);
    return res.status(400).json({
      status: "fail",
      message: err?.message || "Could not update status",
    });
  }
}

export async function cancelParcelHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res
        .status(401)
        .json({ status: "fail", message: "Not authenticated" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ status: "fail", message: "Missing parcel id" });
    }

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
    console.error(err);
    return res.status(400).json({
      status: "fail",
      message: err?.message || "Could not cancel parcel",
    });
  }
}
