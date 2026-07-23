// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const studentRoutes = require("./routes/studentRoutes");
// const staffRoutes = require("./routes/staffRoutes");
// const exportRoutes = require("./routes/exportRoutes");
// const otpRoutes = require("./routes/otpRoutes");
// const paymentRoutes = require("./routes/paymentRoutes");

// const app = express();

// // Accept a comma-separated list in CLIENT_ORIGIN (e.g. "http://localhost:3000,http://localhost:3001").
// // Falls back to the common CRA dev ports so things still work if the frontend
// // happens to start on 3001+ because 3000 was already taken.
// const allowedOrigins = (
//   process.env.CLIENT_ORIGIN || "http://localhost:3000,http://localhost:3001,http://localhost:3002"
// )
//   .split(",")
//   .map((o) => o.trim());

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // allow non-browser requests (curl, Postman) with no origin header
//       if (!origin || allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }
//       return callback(new Error(`CORS blocked for origin: ${origin}`));
//     },
//   })
// );
// app.use(express.json());

// app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// app.use("/api/students", studentRoutes);
// app.use("/api/staff", staffRoutes);
// app.use("/api/export", exportRoutes);
// app.use("/api/otp", otpRoutes);
// app.use("/api/payments", paymentRoutes);

// const PORT = process.env.PORT || 5000;
// const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://grocery:grocery%402o26@cluster0.keoaycs.mongodb.net/shikshaa?retryWrites=true&w=majority";

// app.get('/', (req, res) => {
//   res.send('Shikshaa CRM Backend is running ✅');
// });

// // Cache the Mongo connection across serverless invocations so a cold start
// // doesn't re-connect (and doesn't hang) on every request.
// let isConnected = false;
// async function connectToDatabase() {
//   if (isConnected) return;
//   await mongoose.connect(MONGO_URI);
//   isConnected = true;
//   console.log("MongoDB connected");
// }

// // Ensure a DB connection exists before handling any request (works both
// // locally and on Vercel's serverless functions).
// app.use(async (req, res, next) => {
//   try {
//     await connectToDatabase();
//     next();
//   } catch (err) {
//     console.error("MongoDB connection error:", err.message);
//     res.status(500).json({ error: "Database connection failed" });
//   }
// });

// // Only bind a persistent listener when running locally / on a traditional
// // Node host. On Vercel, the exported `app` is used directly as the handler.
// if (require.main === module) {
//   connectToDatabase()
//     .then(() => {
//       app.listen(PORT, () => console.log(`Shikshaa CRM API running on port ${PORT}`));
//     })
//     .catch((err) => {
//       console.error("MongoDB connection error:", err.message);
//       process.exit(1);
//     });
// }

// module.exports = app;
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

// Accept a comma-separated list in CLIENT_ORIGIN (e.g. "https://your-frontend.vercel.app").
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

// --- Connection caching for serverless (Vercel reuses warm instances) ---
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  if (!MONGO_URI) throw new Error("MONGO_URI is not set");
  await mongoose.connect(MONGO_URI);
  isConnected = true;
  console.log("MongoDB connected");
}

// Make sure every request has a DB connection before hitting the routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Only call app.listen() when run directly (local `node server.js` / `npm run dev`).
// On Vercel this file is imported as a module, never executed directly — Vercel
// calls the exported `app` per-request instead.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  console.log("MONGO_URI loaded:", MONGO_URI ? "yes" : "NO - .env not found or not read");
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Shikshaa CRM API running on port ${PORT}`)))
    .catch((err) => {
      console.error("Failed to start server:", err.message);
      process.exit(1);
    });
}

module.exports = app;