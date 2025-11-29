import { Schema, model, Document, Types } from "mongoose";

export interface IStatusLog {
  status: string;
  timestamp: Date;
  updatedBy?: Types.ObjectId;
  note?: string;
}

export interface IParcel extends Document {
  trackingId: string;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  origin: string;
  destination: string;
  weight?: number;
  price?: number;
  status: string;
  statusLogs: IStatusLog[];
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StatusLogSchema = new Schema<IStatusLog>({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  note: { type: String },
});

const ParcelSchema = new Schema<IParcel>(
  {
    trackingId: { type: String, required: true, unique: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    weight: { type: Number },
    price: { type: Number },
    status: { type: String, default: "Created", index: true },
    statusLogs: { type: [StatusLogSchema], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "parcels" }
);

export default model<IParcel>("Parcel", ParcelSchema);
