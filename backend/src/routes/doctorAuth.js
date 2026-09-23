const router = require("express").Router();
const User = require("../models/User");
const QRPassport = require("../models/QRPassport");
const Patient = require("../models/Patient");
const AuditLog = require("../models/AuditLog");
const { protect, signToken } = require("../middleware/auth");
const DoctorVerificationProvider = require("../services/DoctorVerificationProvider");
const { validateTokenAndReturnTier1 } = require("./healthPassport");

// Middleware: Enforce Doctor Role & Verification
async function requireVerifiedDoctor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: "UNAUTHORIZED", message: "Authentication required." });
  }

  if (req.user.role !== "doctor" && req.user.role !== "admin") {
    return res.status(403).json({ status: "FORBIDDEN", message: "Access restricted to doctors only." });
  }

  const userDoc = await User.findById(req.user._id);
  if (!userDoc || userDoc.verification?.status !== "VERIFIED") {
    return res.status(403).json({
      status: "UNVERIFIED_DOCTOR",
      message: "Your doctor account registration is pending or unverified. Patient access is disabled.",
      verificationStatus: userDoc?.verification?.status || "PENDING",
    });
  }

  next();
}

// POST /api/doctor/verify-registration — Pre-registration check
router.post("/verify-registration", async (req, res, next) => {
  try {
    const { registrationNumber, registrationAuthority, doctorName, state } = req.body;
    if (!registrationNumber) {
      return res.status(400).json({ status: "ERROR", message: "Medical registration number is required." });
    }

    const verificationResult = await DoctorVerificationProvider.verifyDoctorRegistration({
      registrationNumber,
      registrationAuthority,
      doctorName,
      state,
    });

    res.json({ status: "SUCCESS", verification: verificationResult });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctor/register — Register new doctor account
router.post("/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      registrationNumber,
      registrationAuthority = "Tamil Nadu Medical Council",
      qualification,
      specialization,
      hospital,
      clinic,
      city,
      state = "Tamil Nadu",
    } = req.body;

    if (!name || !email || !password || !registrationNumber) {
      return res.status(400).json({
        status: "ERROR",
        message: "Full name, email, password, and medical registration number are required.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ status: "ERROR", message: "User account with this email already exists." });
    }

    // MANDATORY Medical Registration Number Verification
    const verificationResult = await DoctorVerificationProvider.verifyDoctorRegistration({
      registrationNumber,
      registrationAuthority,
      doctorName: name,
      state,
    });

    const isVerified = verificationResult.verified && verificationResult.status === "VERIFIED";

    const newDoctor = await User.create({
      name: `Dr. ${name.replace(/^Dr\.\s*/i, "")}`,
      email: email.toLowerCase().trim(),
      phone: phone || "",
      password,
      role: "doctor", // STRICTLY FORCE DOCTOR ROLE
      verified: isVerified,
      status: "active",
      doctorProfile: {
        fullName: name,
        registrationNumber: verificationResult.registrationNumber || registrationNumber,
        registrationAuthority: verificationResult.authority || registrationAuthority,
        qualification: qualification || verificationResult.details?.qualification || "MBBS",
        specialization: specialization || "General Medicine",
        hospital: hospital || "Medical Center",
        clinic: clinic || "",
        city: city || verificationResult.details?.city || "Chennai",
        state: state || "Tamil Nadu",
      },
      verification: {
        status: verificationResult.status,
        verifiedAt: isVerified ? new Date() : null,
        verificationSource: verificationResult.source,
        verificationReference: `NMC-REF-${Date.now()}`,
        lastCheckedAt: new Date(),
      },
    });

    await AuditLog.create({
      user: newDoctor.email,
      action: `DOCTOR_REGISTRATION (${verificationResult.status})`,
      ip: req.ip || "127.0.0.1",
      level: isVerified ? "info" : "warning",
    });

    const token = signToken(newDoctor);

    res.status(201).json({
      status: "SUCCESS",
      message: isVerified
        ? "Doctor account successfully registered and verified with Medical Council!"
        : "Doctor account registered. Verification status: " + verificationResult.status,
      token,
      user: {
        id: newDoctor._id,
        name: newDoctor.name,
        email: newDoctor.email,
        role: newDoctor.role,
        verified: newDoctor.verified,
        doctorProfile: newDoctor.doctorProfile,
        verification: newDoctor.verification,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctor/login — Doctor Login
router.post("/login", async (req, res, next) => {
  try {
    const { loginId, email, password } = req.body;
    const identifier = (loginId || email || "").toLowerCase().trim();

    if (!identifier || !password) {
      return res.status(400).json({ status: "ERROR", message: "Email / Registration ID and password are required." });
    }

    // Look up user by email or registration number
    let user = await User.findOne({
      $or: [{ email: identifier }, { "doctorProfile.registrationNumber": identifier.toUpperCase() }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({ status: "ERROR", message: "Invalid credentials or account not found." });
    }

    if (user.role !== "doctor" && user.role !== "admin") {
      return res.status(403).json({ status: "ERROR", message: "Account is not registered as a Doctor." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ status: "ERROR", message: "Invalid password." });
    }

    const token = signToken(user);

    await AuditLog.create({
      user: user.email,
      action: "DOCTOR_LOGIN_SUCCESS",
      ip: req.ip || "127.0.0.1",
      level: "info",
    });

    res.json({
      status: "SUCCESS",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        doctorProfile: user.doctorProfile,
        verification: user.verification,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctor/me — Get Doctor Profile
router.get("/me", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "doctor" && req.user.role !== "admin") {
      return res.status(403).json({ status: "ERROR", message: "Forbidden — Doctor access only." });
    }

    const userDoc = await User.findById(req.user._id);
    res.json({
      status: "SUCCESS",
      user: {
        id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        verified: userDoc.verified,
        doctorProfile: userDoc.doctorProfile,
        verification: userDoc.verification,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctor/profile — Get Doctor Profile alias
router.get("/profile", protect, async (req, res, next) => {
  req.url = "/me";
  return router.handle(req, res, next);
});

// POST /api/doctor/scan-qr — Doctor QR Scanning & Patient Verification
router.post("/scan-qr", protect, requireVerifiedDoctor, async (req, res, next) => {
  try {
    const { token, payload } = req.body;
    const tokenOrPayload = token || payload;

    if (!tokenOrPayload) {
      return res.status(400).json({ status: "ERROR", message: "QR token or payload string is required." });
    }

    let tokenInput = String(tokenOrPayload).trim();
    if (tokenInput.startsWith("http")) {
      const parts = tokenInput.split("/passport/");
      if (parts.length > 1) tokenInput = parts[1].split("?")[0].trim();
    }

    // Forward to Tier 1 validation logic
    req.params.token = tokenInput;

    // Log Doctor Access Event
    await AuditLog.create({
      user: req.user.email,
      action: `DOCTOR_PATIENT_QR_SCAN (Doctor: ${req.user.name}, Token: ${tokenInput})`,
      targetId: req.user._id.toString(),
      ip: req.ip || "127.0.0.1",
      level: "info",
      meta: { doctorId: req.user._id, scanToken: tokenInput, accessTier: "TIER_1_EMERGENCY" },
    });

    return validateTokenAndReturnTier1(req, res, next);
  } catch (err) {
    next(err);
  }
});

// GET /api/doctor/access-history — Recent patient scans by Doctor
router.get("/access-history", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "doctor" && req.user.role !== "admin") {
      return res.status(403).json({ status: "ERROR", message: "Doctor role required." });
    }

    const history = await AuditLog.find({
      user: req.user.email,
      action: { $regex: /DOCTOR_PATIENT_QR_SCAN/i },
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ status: "SUCCESS", count: history.length, history });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctor/logout — Logout
router.post("/logout", (req, res) => {
  res.json({ status: "SUCCESS", message: "Doctor session ended successfully." });
});

module.exports = router;
