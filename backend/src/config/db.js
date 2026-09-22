const mongoose = require("mongoose");
const { seedData } = require("../seed");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/healthpassport";
  try {
    await mongoose.connect(uri);
    if (process.env.SEED_DEMO_DATA === "true") {
      await seedData();
    }
  } catch (err) {
    console.error("[db] Primary MongoDB connection error:", err.message);
    if (uri !== "mongodb://localhost:27017/healthpassport") {
      try {
        console.log("[db] Attempting fallback to local MongoDB (mongodb://localhost:27017/healthpassport)...");
        await mongoose.connect("mongodb://localhost:27017/healthpassport");
        console.log("[db] Connected to local MongoDB");
        if (process.env.SEED_DEMO_DATA === "true") {
          await seedData();
        }
        return;
      } catch (localErr) {
        console.error("[db] Local MongoDB fallback connection error:", localErr.message);
      }
    }
  }
}

module.exports = { connectDB };
