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

const allowedOrigins = (
  process.env.CLIENT_ORIGIN || "http://localhost:3000,http://localhost:3001,http://localhost:3002"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json());

app.get("/", (req, res) => res.send("Shikshaa CRM Backend is running ✅"));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/students", studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/payments", paymentRoutes);

const MONGO_URI = process.env.MONGO_URI;

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  if (!MONGO_URI) throw new Error("MONGO_URI is not set");
  await mongoose.connect(MONGO_URI);
  isConnected = true;
  console.log("MongoDB connected");
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    res.status(500).json({ error: "Database connection failed" });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Shikshaa CRM API running on port ${PORT}`)))
    .catch((err) => {
      console.error("Failed to start server:", err.message);
      process.exit(1);
    });
}

module.exports = app;
