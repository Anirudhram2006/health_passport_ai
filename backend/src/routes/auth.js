const router = require("express").Router();
const crypto = require("crypto");
const User = require("../models/User");
const Patient = require("../models/Patient");
const AuditLog = require("../models/AuditLog");
const { signToken } = require("../middleware/auth");
const { sendOtpEmail } = require("../services/email");

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function mockPassportId() {
  return `P-${crypto.randomInt(100000, 999999)}`;
}

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, bloodGroup = "A+", phone } = req.body;
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    const user = await User.create({ name, email, password, role: "patient", phone, verified: false });
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await Patient.create({ userId: user._id, passportId: mockPassportId(), bloodGroup });
    await sendOtpEmail(email, otp);
    res.status(201).json({
      message: "Account created. Verify your email with the OTP.",
      email,
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select("+otp +otpExpires");
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (!user.otp || user.otpExpires < new Date() || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    await AuditLog.create({ user: user.email, action: "Email verified via OTP", level: "info" });
    res.json({ message: "Email verified" });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? String(email).trim().toLowerCase() : "";
    const user = await User.findOne({ email: cleanEmail }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      await AuditLog.create({ user: cleanEmail || "unknown", action: "Failed login attempt", ip: req.ip, level: "danger" });
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account suspended. Contact support." });
    }
    const token = signToken(user);
    await AuditLog.create({ user: user.email, action: `Login (${user.role})`, ip: req.ip });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/request-otp
router.post("/request-otp", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Account not found" });
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendOtpEmail(email, otp);
    res.json({ message: "OTP sent", otp: process.env.NODE_ENV === "development" ? otp : undefined });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select("+otp +otpExpires");
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (!user.otp || user.otpExpires < new Date() || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    await AuditLog.create({ user: user.email, action: "Password reset", ip: req.ip });
    res.json({ message: "Password updated. You can now sign in." });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-provider — Module 12 Provider Verification
router.post("/verify-provider", async (req, res, next) => {
  try {
    const { email, licenseNumber, role = "doctor" } = req.body;
    if (!email || !licenseNumber) {
      return res.status(400).json({ message: "Email and medical license number are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Account not found." });

    user.role = role;
    user.verified = true;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      user: user.email,
      action: `Provider Verified: ${role.toUpperCase()} — License: ${licenseNumber}`,
      level: "info",
    });

    res.json({
      message: "Provider medical credentials verified successfully.",
      user: { id: user._id, name: user.name, email: user.email, role: user.role, verified: true },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

