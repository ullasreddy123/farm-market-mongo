const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Otp = require("../models/Otp");
const generateToken = require("../utils/generateToken");
const { sendOtp, verifyOtp } = require("../services/otpService");

const OTP_TTL_MINUTES = 10;

// ------------------------------------------------------------------
// @route   POST /api/auth/send-otp
// @desc    Send OTP to a phone number for registration or password reset
// @body    { phone, purpose: "register" | "reset-password" }
// ------------------------------------------------------------------
router.post("/send-otp", async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: "Enter a valid 10-digit Indian phone number" });
    }
    if (!["register", "reset-password"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid purpose" });
    }

    const existingUser = await User.findOne({ phone });
    if (purpose === "register" && existingUser) {
      return res.status(400).json({ message: "Phone number already registered" });
    }
    if (purpose === "reset-password" && !existingUser) {
      return res.status(404).json({ message: "No account found with this phone number" });
    }

    const sessionId = await sendOtp(phone);

    await Otp.create({
      phone,
      sessionId,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message || "Failed to send OTP" });
  }
});

// ------------------------------------------------------------------
// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for a phone number + purpose
// @body    { phone, otp, purpose }
// ------------------------------------------------------------------
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, purpose } = req.body;
    const record = await Otp.findOne({ phone, purpose }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(400).json({ message: "No OTP request found. Please request a new OTP." });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    const isValid = await verifyOtp(record.sessionId, otp);
    if (!isValid) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    record.verified = true;
    await record.save();

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message || "Failed to verify OTP" });
  }
});

// ------------------------------------------------------------------
// @route   POST /api/auth/register
// @desc    Register farmer or trader (OTP must already be verified)
// @body    { username, phone, email, password, role, address? }
// ------------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { username, phone, email, password, role, address } = req.body;

    if (!username || !phone || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!["farmer", "trader"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (role === "trader" && !address) {
      return res.status(400).json({ message: "Address is required for traders" });
    }

    const otpRecord = await Otp.findOne({ phone, purpose: "register", verified: true }).sort({
      createdAt: -1,
    });
    if (!otpRecord) {
      return res.status(400).json({ message: "Please verify your phone number with OTP first" });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const user = await User.create({
      username,
      phone,
      email: email || null,
      password,
      role,
      address: role === "trader" ? address : undefined,
      isPhoneVerified: true,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ------------------------------------------------------------------
// @route   POST /api/auth/login
// @desc    Login with phone + password
// @body    { phone, password, role }
// ------------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { phone, password, role } = req.body;
    const user = await User.findOne({ phone, role });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    res.json({
      _id: user._id,
      username: user.username,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Login failed" });
  }
});

// ------------------------------------------------------------------
// @route   POST /api/auth/reset-password
// @desc    Reset password after OTP verification
// @body    { phone, newPassword }
// ------------------------------------------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { phone, newPassword } = req.body;

    const otpRecord = await Otp.findOne({
      phone,
      purpose: "reset-password",
      verified: true,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: "Please verify your phone number with OTP first" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password reset successful. Please log in." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Password reset failed" });
  }
});

module.exports = router;
