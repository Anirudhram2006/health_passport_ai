const router = require("express").Router();
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const QRPassport = require("../models/QRPassport");
const AuditLog = require("../models/AuditLog");
const { protect } = require("../middleware/auth");
const {
  generateOpaqueToken,
  buildPassportUrl,
  generatePassportQR,
  buildPayload,
} = require("../services/qr");
const { calculateTriageStatus } = require("../services/triageEngine");
const { checkDrugInteractions } = require("../services/interactions/interactionEngine");

const safeStr = (val, fallback = "Not recorded") => (val && String(val).trim() ? String(val).trim() : fallback);

// Helper: Get or Create Active Passport for a patient
async function getActivePassportForPatient(patient, req) {
  let qrRecord = await QRPassport.findOne({ patientId: patient._id, status: "active" }).sort({ createdAt: -1 });

  // Check if expired
  if (qrRecord && qrRecord.expiresAt && qrRecord.expiresAt < new Date()) {
    qrRecord.status = "expired";
    await qrRecord.save();
    qrRecord = null;
  }

  if (!qrRecord) {
    const newToken = generateOpaqueToken();
    const payload = buildPayload(patient, newToken, req);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    qrRecord = await QRPassport.create({
      patientId: patient._id,
      passportId: patient.passportId,
      token: newToken,
      signature: payload.sig,
      version: payload.v || "2.0",
      status: "active",
      expiresAt,
    });
  }

  const passportUrl = buildPassportUrl(qrRecord.token, req);
  const qrDataUrl = await generatePassportQR(passportUrl, req);

  return {
    qrRecord,
    passportUrl,
    qrDataUrl,
  };
}

// GET /api/health-passport or GET /api/patients/passport/me
router.get("/me", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate("userId", "name email");
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const { qrRecord, passportUrl, qrDataUrl } = await getActivePassportForPatient(patient, req);

    res.json({
      status: "SUCCESS",
      passport: {
        token: qrRecord.token,
        passportId: patient.passportId,
        status: qrRecord.status,
        issuedAt: qrRecord.createdAt,
        expiresAt: qrRecord.expiresAt,
        scanCount: qrRecord.scanCount || 0,
        lastScannedAt: qrRecord.lastScannedAt,
        qr: qrDataUrl,
        url: passportUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Alias for GET /api/health-passport
router.get("/", protect, async (req, res, next) => {
  req.url = "/me";
  return router.handle(req, res, next);
});

// POST /api/health-passport/generate or POST /api/patients/passport/generate
router.get("/generate", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate("userId", "name email");
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const { qrRecord, passportUrl, qrDataUrl } = await getActivePassportForPatient(patient, req);

    res.json({
      status: "SUCCESS",
      passport: {
        token: qrRecord.token,
        passportId: patient.passportId,
        status: qrRecord.status,
        issuedAt: qrRecord.createdAt,
        expiresAt: qrRecord.expiresAt,
        qr: qrDataUrl,
        url: passportUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});
router.post("/generate", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate("userId", "name email");
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const { qrRecord, passportUrl, qrDataUrl } = await getActivePassportForPatient(patient, req);

    res.json({
      status: "SUCCESS",
      passport: {
        token: qrRecord.token,
        passportId: patient.passportId,
        status: qrRecord.status,
        issuedAt: qrRecord.createdAt,
        expiresAt: qrRecord.expiresAt,
        qr: qrDataUrl,
        url: passportUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/health-passport/regenerate or POST /api/patients/passport/regenerate
router.post("/regenerate", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate("userId", "name email");
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    // Revoke all existing active passports
    await QRPassport.updateMany(
      { patientId: patient._id, status: "active" },
      { $set: { status: "revoked", revokedAt: new Date() } }
    );

    // Create a new passport token
    const newToken = generateOpaqueToken();
    const payload = buildPayload(patient, newToken, req);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    const newRecord = await QRPassport.create({
      patientId: patient._id,
      passportId: patient.passportId,
      token: newToken,
      signature: payload.sig,
      version: payload.v || "2.0",
      status: "active",
      expiresAt,
    });

    const passportUrl = buildPassportUrl(newRecord.token, req);
    const qrDataUrl = await generatePassportQR(passportUrl, req);

    await AuditLog.create({
      user: req.user.email,
      action: "QR_HEALTH_PASSPORT_REGENERATED",
      targetId: patient._id.toString(),
      ip: req.ip || "127.0.0.1",
      level: "info",
    });

    res.json({
      status: "SUCCESS",
      message: "Health Passport regenerated successfully. Previous QR has been invalidated.",
      passport: {
        token: newRecord.token,
        passportId: patient.passportId,
        status: newRecord.status,
        issuedAt: newRecord.createdAt,
        expiresAt: newRecord.expiresAt,
        qr: qrDataUrl,
        url: passportUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/health-passport/revoke or POST /api/patients/passport/revoke
router.post("/revoke", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    await QRPassport.updateMany(
      { patientId: patient._id, status: "active" },
      { $set: { status: "revoked", revokedAt: new Date() } }
    );

    await AuditLog.create({
      user: req.user.email,
      action: "QR_HEALTH_PASSPORT_REVOKED",
      targetId: patient._id.toString(),
      ip: req.ip || "127.0.0.1",
      level: "warning",
    });

    res.json({
      status: "SUCCESS",
      message: "Health Passport revoked successfully.",
      passportStatus: "revoked",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/health-passport/validate/:token OR /api/patients/passport/:token
// ENFORCES STRICT TIER 1 ACCESS ONLY
async function validateTokenAndReturnTier1(req, res, next) {
  try {
    const tokenInput = String(req.params.token || "").trim();
    if (!tokenInput) {
      return res.status(400).json({ status: "INVALID_TOKEN", message: "Passport token is required." });
    }

    const cleanToken = tokenInput.replace(/[^a-zA-Z0-9_\-]/g, "");

    // 1. Look up in QRPassport collection
    let qrRecord = await QRPassport.findOne({
      $or: [
        { token: tokenInput },
        { passportId: tokenInput },
        ...(cleanToken ? [{ passportId: { $regex: new RegExp(`^${cleanToken}$`, "i") } }] : []),
      ],
    }).sort({ createdAt: -1 });

    let patient = null;

    if (qrRecord) {
      if (qrRecord.status === "revoked") {
        return res.status(410).json({ status: "REVOKED", message: "This Health Passport has been revoked." });
      }
      if (qrRecord.status === "expired" || (qrRecord.expiresAt && qrRecord.expiresAt < new Date())) {
        return res.status(410).json({ status: "EXPIRED", message: "Health Passport expired" });
      }

      qrRecord.scanCount = (qrRecord.scanCount || 0) + 1;
      qrRecord.lastScannedAt = new Date();
      await qrRecord.save();

      patient = await Patient.findById(qrRecord.patientId).populate("userId", "name email");
    }

    if (!patient) {
      patient = await Patient.findOne({
        $or: [
          { passportId: tokenInput },
          ...(cleanToken ? [{ passportId: { $regex: new RegExp(`^${cleanToken}$`, "i") } }] : []),
        ],
      }).populate("userId", "name email");
    }

    if (!patient && mongoose.Types.ObjectId.isValid(tokenInput)) {
      patient = await Patient.findById(tokenInput).populate("userId", "name email");
      if (!patient) {
        patient = await Patient.findOne({ userId: tokenInput }).populate("userId", "name email");
      }
    }

    if (!patient && (tokenInput.toUpperCase() === "DEMO" || tokenInput === "HPA-2026-DEMO")) {
      // Demo fallback Tier 1 object
      const demoTier1Dto = {
        token: tokenInput,
        passportId: "HPA-2026-DEMO",
        status: "active",
        scannedAt: new Date().toISOString(),
        accessTier: "TIER_1_EMERGENCY",
        patient: {
          name: "Aarav Sharma",
          bloodGroup: "B+",
        },
        allergies: [
          { substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis risk — avoid beta-lactams" },
          { substance: "Peanuts", severity: "Moderate", reaction: "Hives, swelling" },
        ],
        emergencyContacts: [
          { name: "Priya Sharma", relation: "Spouse", phone: "+91 98100 11223" },
          { name: "Ramesh Sharma", relation: "Father", phone: "+91 98990 55443" },
        ],
        triage: {
          level: "YELLOW",
          badgeLabel: "URGENT / MONITORING",
          reasons: ["CRITICAL ALLERGY ALERT: Severe reaction risk for Penicillin"],
        },
      };

      return res.json({
        status: "SUCCESS",
        passport: demoTier1Dto,
      });
    }

    if (!patient) {
      return res.status(404).json({ status: "NOT_FOUND", message: "Health Passport not found" });
    }

    // Calculate Triage status for emergency view
    const medNames = (patient.medications || []).filter((m) => m.active !== false).map((m) => m.name || m.brandName || m.genericName);
    const drugInteractions = medNames.length > 1 ? await checkDrugInteractions(medNames) : [];
    const triage = calculateTriageStatus(patient, drugInteractions);

    // Audit Log Event
    await AuditLog.create({
      user: "Public / Emergency QR Viewer",
      action: `QR_HEALTH_PASSPORT_VIEW (Token: ${tokenInput}, PatientId: ${patient.passportId})`,
      targetId: patient._id.toString(),
      ip: req.ip || "127.0.0.1",
      level: triage.level === "RED" ? "danger" : "info",
      meta: { triageLevel: triage.level, accessTier: "TIER_1_EMERGENCY" },
    });

    // STRICT TIER 1 DTO RESTRICTION:
    // EXPOSE ONLY: Patient Name, Blood Group, Allergies, Emergency Contacts, Triage Status
    // STRICTLY WITHHOLD: Full medical history, medications, medical reports, AI summaries, lab results, appointments, address, phone, email, credentials.
    const tier1PassportDto = {
      token: qrRecord ? qrRecord.token : tokenInput,
      passportId: patient.passportId,
      status: qrRecord ? qrRecord.status : "active",
      scannedAt: new Date().toISOString(),
      accessTier: "TIER_1_EMERGENCY",
      issuedAt: qrRecord ? qrRecord.createdAt : null,
      expiresAt: qrRecord ? qrRecord.expiresAt : null,
      patient: {
        name: safeStr(patient.userId?.name, "Patient Record"),
        bloodGroup: safeStr(patient.bloodGroup, "Unspecified"),
      },
      allergies: (patient.allergies || []).map((a) => ({
        substance: safeStr(a.substance, "Unknown Substance"),
        severity: safeStr(a.severity, "Mild"),
        reaction: safeStr(a.reaction, "No reaction description."),
      })),
      emergencyContacts: (patient.emergencyContacts || []).map((c) => ({
        name: safeStr(c.name, "Emergency Contact"),
        relation: safeStr(c.relation, "Contact"),
        phone: safeStr(c.phone, "Not recorded"),
      })),
      triage: {
        level: triage.level,
        badgeLabel: triage.badgeLabel,
        reasons: triage.reasons || [],
      },
    };

    res.json({
      status: "SUCCESS",
      passport: tier1PassportDto,
    });
  } catch (err) {
    next(err);
  }
}

router.get("/validate/:token", validateTokenAndReturnTier1);
router.get("/:token", validateTokenAndReturnTier1);

module.exports = {
  router,
  validateTokenAndReturnTier1,
  getActivePassportForPatient,
};
