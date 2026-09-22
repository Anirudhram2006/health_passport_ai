const router = require("express").Router();
const { protect } = require("../middleware/auth");
const MedicalReport = require("../models/MedicalReport");
const Patient = require("../models/Patient");
const AuditLog = require("../models/AuditLog");
const { generateInsights } = require("../services/gemini");

// GET /api/ai/summary — build AI summary for the logged-in patient
router.get("/summary", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const reports = await MedicalReport.find({ patientId: patient._id })
      .select("title type aiSummary createdAt extractedEntities")
      .sort({ createdAt: -1 })
      .lean();

    const timeline = reports.map((r) => ({
      id: r._id,
      date: r.createdAt,
      type: r.type,
      title: r.title,
      description: r.aiSummary || "",
      severity: r.type === "Lab Report" ? "info" : "success",
    }));

    let insights = [];
    try {
      insights = await generateInsights(timeline);
    } catch {
      insights = [];
    }

    await AuditLog.create({ user: req.user.email, action: "Generated AI medical summary" });

    res.json({ patient, timeline, insights });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/summary/pdf — server-side PDF export (simple placeholder metadata)
router.get("/summary/pdf", protect, async (req, res) => {
  res.json({ message: "Client-side PDF generation is used for summaries.", hint: "POST the summary data to generate." });
});

module.exports = router;
