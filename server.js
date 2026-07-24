require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const studentRoutes = require("./routes/studentRoutes");
const staffRoutes = require("./routes/staffRoutes");
const exportRoutes = require("./routes/exportRoutes");
const otpRoutes = require("./routes/otpRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// CORS
const allowedOrigins = (
  process.env.CLIENT_ORIGIN ||
  "https://shikshaafrontend.vercel.app"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked Origin:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Connection (cached across invocations — required for serverless)
// Without this cache, every cold start (and sometimes every request) opens a
// brand new connection, which is slow enough to trip Vercel's function
// timeout and surface as a 504 on the frontend.
let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000, // fail fast instead of hanging until Vercel times out
    });
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    // NOTE: never call process.exit() here — in a serverless function that
    // kills the whole container instead of just failing the request.
    throw err;
  }
}

// Ensure a DB connection exists before handling any request.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ error: "Database connection failed" });
  }
});

// Health Check
app.get("/", (req, res) => {
  res.send("Shikshaa CRM Backend is running ✅");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/payments", paymentRoutes);

// Start a real HTTP server only for local development (`npm start` / `npm run dev`).
// On Vercel, this file is just `require`d by api/index.js and Vercel's runtime
// calls the exported `app` directly — app.listen() is neither needed nor wanted there.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server:", err.message);
      process.exit(1); // OK to exit here — this only runs in local/plain Node, never inside a Vercel function
    });
}

module.exports = app;