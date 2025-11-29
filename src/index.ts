// src/index.ts
import app from "./app";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined. Set MONGO_URI in your environment.");
  process.exit(1);
}

async function start() {
  try {
    // 1) connect to MongoDB
    await mongoose.connect(MONGO_URI!, {} as mongoose.ConnectOptions);
    console.log("MongoDB connected");

    const User = (await import("./models/User.model")).default;
    const Parcel = (await import("./models/Parcel.model")).default;

    // 3) runtime information (helpful for debugging)
    console.log("Mongoose model names:", mongoose.modelNames());
    // safe listing of existing collections
    try {
      if (!mongoose.connection.db) {
        console.warn(
          "mongoose.connection.db is not available yet — skipping listCollections()"
        );
      } else {
        const existing = await mongoose.connection.db
          .listCollections()
          .toArray();
        console.log(
          "Existing collections in DB:",
          existing.map((c) => c.name)
        );
      }
    } catch (e) {
      console.warn("Could not list collections:", e);
    }

    console.log("User model collection:", User.collection?.name);
    console.log("Parcel model collection:", Parcel.collection?.name);

    try {
      await User.syncIndexes();
      console.log("User indexes synced");
    } catch (e) {
      console.warn("Failed to sync User indexes:", (e as Error).message || e);
    }

    try {
      await Parcel.syncIndexes();
      console.log("Parcel indexes synced");
    } catch (e) {
      console.warn("Failed to sync Parcel indexes:", (e as Error).message || e);
    }

    // 5) start the server only after DB + indexes ready
    const server = app.listen(PORT, () => {
      console.log(
        `Server listening on http://localhost:${PORT} (env=${
          process.env.NODE_ENV || "dev"
        })`
      );
    });

    // graceful shutdown
    const shutdown = async () => {
      console.log("Shutting down...");
      try {
        await mongoose.disconnect();
      } catch (e) {
        console.warn("Error disconnecting mongoose:", e);
      }
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("Failed to connect to MongoDB or start app:", err);
    process.exit(1);
  }
}

start();
