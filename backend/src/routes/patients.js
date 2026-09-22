const router = require("express").Router();
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalReport = require("../models/MedicalReport");
const Appointment = require("../models/Appointment");
const AuditLog = require("../models/AuditLog");
const QRPassport = require("../models/QRPassport");
const { protect } = require("../middleware/auth");
const { requireVerifiedProvider } = require("../middleware/providerAuth");
const {
  buildPayload,
  generatePassportQR,
  verifyPassportPayload,
  generateOpaqueToken,
  buildPassportUrl,
} = require("../services/qr");
const { calculateTriageStatus } = require("../services/triageEngine");
const { aggregatePatientHistory } = require("../services/historyAggregator");
const { calculateHealthRiskScore } = require("../services/riskScoreEngine");
const { checkDrugInteractions } = require("../services/interactions/interactionEngine");
const { checkDrugConditionContraindications } = require("../services/interactions/drugConditionProvider");

const safeStr = (val, fallback = "Not recorded") => (val && String(val).trim() ? String(val).trim() : fallback);

// GET /api/patients/me — own profile + health score & triage evaluation
router.get("/me", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const [reports, appointments] = await Promise.all([
      MedicalReport.find({ patientId: patient._id }).sort({ createdAt: -1 }),
      Appointment.find({ patientId: patient._id }).sort({ date: -1 }),
    ]);

    const medNames = (patient.medications || []).filter((m) => m.active !== false).map((m) => m.name || m.brandName || m.genericName);
    const drugInteractions = medNames.length > 1 ? await checkDrugInteractions(medNames) : [];
    const conditionInteractions = medNames.length > 0 && patient.chronicDiseases?.length > 0
      ? await checkDrugConditionContraindications(medNames, patient.chronicDiseases)
      : [];

    const riskAnalysis = calculateHealthRiskScore(patient, drugInteractions, conditionInteractions);
    const triageStatus = calculateTriageStatus(patient, drugInteractions);

    if (patient.healthScore !== riskAnalysis.score) {
      patient.healthScore = riskAnalysis.score;
      await patient.save();
    }

    res.json({
      user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role },
      patient,
      reports,
      appointments,
      riskAnalysis,
      triageStatus,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/me/history — Module 11 Aggregated Patient History
router.get("/me/history", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const reports = await MedicalReport.find({ patientId: patient._id }).sort({ createdAt: -1 });
    const aggregated = aggregatePatientHistory(patient, reports);

    res.json({ history: aggregated });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/me/risk-analysis — Module 13 Risk Stratification & Score Breakdown
router.get("/me/risk-analysis", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const medNames = (patient.medications || []).filter((m) => m.active !== false).map((m) => m.name || m.brandName || m.genericName);
    const drugInteractions = medNames.length > 1 ? await checkDrugInteractions(medNames) : [];
    const conditionInteractions = medNames.length > 0 && patient.chronicDiseases?.length > 0
      ? await checkDrugConditionContraindications(medNames, patient.chronicDiseases)
      : [];

    const riskAnalysis = calculateHealthRiskScore(patient, drugInteractions, conditionInteractions);

    res.json({ riskAnalysis, drugInteractions, conditionInteractions });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/passport/me — Module 9 Authenticated patient passport details
router.get("/passport/me", protect, async (req, res, next) => {
  const { router: hpRouter } = require("./healthPassport");
  req.url = "/me";
  return hpRouter.handle(req, res, next);
});

// POST /api/patients/passport/generate — Module 9 Authenticated patient generate passport
router.post("/passport/generate", protect, async (req, res, next) => {
  const { router: hpRouter } = require("./healthPassport");
  req.url = "/generate";
  return hpRouter.handle(req, res, next);
});

// POST /api/patients/passport/regenerate — Module 9 Authenticated patient regenerate QR
router.post("/passport/regenerate", protect, async (req, res, next) => {
  const { router: hpRouter } = require("./healthPassport");
  req.url = "/regenerate";
  return hpRouter.handle(req, res, next);
});

// POST /api/patients/passport/revoke — Module 9 Authenticated patient revoke passport
router.post("/passport/revoke", protect, async (req, res, next) => {
  const { router: hpRouter } = require("./healthPassport");
  req.url = "/revoke";
  return hpRouter.handle(req, res, next);
});

// GET /api/patients/:id/qr — Legacy/ID based QR Code URL endpoint
router.get("/:id/qr", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id).populate("userId", "name");
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (req.user.role === "patient" && !patient.userId.equals(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let qrRecord = await QRPassport.findOne({ patientId: patient._id, status: "active" });
    if (!qrRecord) {
      const newToken = generateOpaqueToken();
      const payload = buildPayload(patient, newToken);
      qrRecord = await QRPassport.create({
        patientId: patient._id,
        passportId: patient.passportId,
        token: newToken,
        signature: payload.sig,
        version: payload.v || "2.0",
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    const passportUrl = buildPassportUrl(qrRecord.token, req);
    const qrDataUrl = await generatePassportQR(passportUrl, req);

    res.json({
      qr: qrDataUrl,
      url: passportUrl,
      token: qrRecord.token,
      passportId: patient.passportId,
      status: qrRecord.status,
      expiresAt: qrRecord.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/passport/:token — Public/Emergency Health Passport DTO Endpoint (STRICT TIER 1 ACCESS ONLY)
router.get("/passport/:token", async (req, res, next) => {
  const { validateTokenAndReturnTier1 } = require("./healthPassport");
  return validateTokenAndReturnTier1(req, res, next);
});

// POST /api/patients/scan — Legacy/direct QR payload scanner fallback
router.post("/scan", async (req, res, next) => {
  try {
    const { payload } = req.body;
    let tokenOrId = payload;

    if (typeof payload === "string" && payload.startsWith("http")) {
      const parts = payload.split("/passport/");
      if (parts.length > 1) {
        tokenOrId = parts[1].split("?")[0].trim();
      }
    } else if (typeof payload === "string" && payload.startsWith("{")) {
      try {
        const parsed = JSON.parse(payload);
        tokenOrId = parsed.token || parsed.id || payload;
      } catch (e) {
        tokenOrId = payload;
      }
    }

    // Forward to passport token resolution logic
    req.params.token = tokenOrId;
    return router.handle(req, res, next);
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/provider/lookup — Module 12 Verified Doctor Search
router.get("/provider/lookup", protect, requireVerifiedProvider, async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Query string of at least 2 characters is required" });
    }

    const patients = await Patient.find({
      $or: [{ passportId: new RegExp(query, "i") }, { bloodGroup: new RegExp(query, "i") }],
    })
      .populate("userId", "name email phone")
      .limit(10);

    await AuditLog.create({
      user: req.user.email,
      action: `Provider Lookup Query: '${query}' — ${patients.length} records returned`,
      ip: req.ip,
      level: "info",
    });

    res.json({ patients });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/patients/me — update own profile
router.patch("/me", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });
    const allowed = ["bloodGroup", "height", "weight", "allergies", "emergencyContacts", "chronicDiseases", "medications"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) patient[key] = req.body[key];
    }
    await patient.save();
    await AuditLog.create({ user: req.user.email, action: `Updated own profile ${patient.passportId}` });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/patients/:id — update patient profile
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (req.user.role === "patient" && !patient.userId.equals(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const allowed = ["bloodGroup", "height", "weight", "allergies", "emergencyContacts", "chronicDiseases", "medications"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) patient[key] = req.body[key];
    }
    await patient.save();
    await AuditLog.create({ user: req.user.email, action: `Updated patient profile ${patient.passportId}` });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients/me/sample — seed sample medical history
router.post("/me/sample", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    patient.healthScore = 82;
    patient.chronicDiseases = ["Type 2 Diabetes", "Stage 1 Hypertension"];
    patient.allergies = [
      { substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis risk — avoid beta-lactams" },
      { substance: "Dust Mites", severity: "Mild", reaction: "Nasal congestion" },
    ];
    patient.medications = [
      { name: "Metformin 500mg", dosage: "500 mg", frequency: "Twice daily after meals", prescribedBy: "Dr. Neha Kapoor", startDate: new Date("2026-01-10"), active: true },
      { name: "Amlodipine 5mg", dosage: "5 mg", frequency: "Once daily in the morning", prescribedBy: "Dr. Anil Mehta", startDate: new Date("2025-11-02"), active: true },
    ];
    await patient.save();

    const reportCount = await MedicalReport.countDocuments({ patientId: patient._id });
    if (reportCount === 0) {
      await MedicalReport.create([
        {
          patientId: patient._id,
          title: "HbA1c & Glucose Panel",
          type: "Lab Report",
          doctor: "Dr. Neha Kapoor",
          hospital: "Apollo Diagnostics",
          fileUrl: "",
          fileSize: "412 KB",
          extracted: "HbA1c: 6.9% (Target < 7.0%)\nFasting Glucose: 128 mg/dL\nPost-prandial Glucose: 178 mg/dL\nLipid Profile: LDL 98, HDL 46, Triglycerides 142",
          aiSummary: "Glycemic control is adequate. HbA1c improved to 6.9% over the last quarter. Lipid profile within normal limits for diabetic management.",
        },
        {
          patientId: patient._id,
          title: "Cardiac Stress Test",
          type: "Imaging",
          doctor: "Dr. Anil Mehta",
          hospital: "Max Heart Institute",
          fileUrl: "",
          fileSize: "2.1 MB",
          extracted: "Treadmill test: Completed 8 minutes, Bruce protocol. No ST changes. Negative for inducible ischemia.",
          aiSummary: "Stress test negative for ischemia. Excellent exercise tolerance. Continue lifestyle modifications and regular BP monitoring.",
        },
      ]);
    }

    await AuditLog.create({ user: req.user.email, action: `Populated sample medical records for ${patient.passportId}` });
    res.json({ message: "Sample records populated successfully!" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
