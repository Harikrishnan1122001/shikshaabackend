const express = require("express");
const router = express.Router();

// In-memory OTP store: phone -> { code, expiresAt }
// NOTE: This is a simulated OTP flow for demo purposes since no SMS gateway
// (e.g. Twilio, MSG91) is configured. In production, replace the "send" step
// with a real SMS/WhatsApp API call and NEVER return the code in the response.
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit code
}

// POST /api/otp/send  { phone }
router.post("/send", (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.trim().length < 6) {
    return res.status(400).json({ error: "A valid phone number is required" });
  }
  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });

  // Simulated delivery: in production, send `code` via SMS provider here
  // and do not include it in the API response.
  res.json({
    success: true,
    message: "OTP sent (simulated — no SMS gateway configured)",
    demoOtp: code,
  });
});

// POST /api/otp/verify  { phone, otp }
router.post("/verify", (req, res) => {
  const { phone, otp } = req.body;
  const entry = otpStore.get(phone);

  if (!entry) {
    return res.status(400).json({ verified: false, error: "No OTP was requested for this number" });
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ verified: false, error: "OTP has expired, request a new one" });
  }
  if (entry.code !== String(otp)) {
    return res.status(400).json({ verified: false, error: "Incorrect OTP" });
  }

  otpStore.delete(phone);
  res.json({ verified: true, message: "Phone number verified" });
});

module.exports = router;
