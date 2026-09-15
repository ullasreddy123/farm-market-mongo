const mongoose = require("mongoose");

// Temporary OTP session store (2Factor also manages OTP server-side via sessionId,
// we keep a local record to map phone -> sessionId -> purpose)
const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    sessionId: { type: String, required: true },
    purpose: { type: String, enum: ["register", "reset-password"], required: true },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete expired OTP docs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
