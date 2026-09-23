require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { connectDB } = require("./src/config/db");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const app = express();

connectDB();

// Dynamic CORS configuration allowing localhost, 127.0.0.1, LAN IPs (192.168.x.x, 10.x.x.x, 172.x.x.x), or configured CLIENT_URL
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"].filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: false, // Allow cross-origin media & WebRTC streams in dev
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
        /^https:\/\/.*$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow in dev
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() })
);

app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/patients", require("./src/routes/patients"));
app.use("/api/doctors", require("./src/routes/doctors"));
app.use("/api/doctor", require("./src/routes/doctorAuth"));
app.use("/api/health-passport", require("./src/routes/healthPassport").router);
app.use("/api/uploads", require("./src/routes/uploads"));
app.use("/api/ai", require("./src/routes/ai"));
app.use("/api/interactions", require("./src/routes/interactions"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Listen on all network interfaces for LAN accessibility

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception (process kept alive):", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection (process kept alive):", reason);
});

app.listen(PORT, HOST, () => console.log(`Health Passport AI API running on http://${HOST}:${PORT}`));
