const router = require("express").Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary, deleteFile } = require("../config/cloudinary");
const { protect } = require("../middleware/auth");
const MedicalReport = require("../models/MedicalReport");
const Patient = require("../models/Patient");
const AuditLog = require("../models/AuditLog");
const Medicine = require("../models/Medicine");
const CorrectionFeedback = require("../models/CorrectionFeedback");
const OCRService = require("../services/prescriptionParser");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "health-passport",
    resource_type: "auto",
    public_id: `report-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "-").slice(0, 80)}`,
    allowed_formats: ["pdf", "jpg", "jpeg", "png"],
  }),
});

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okType = ALLOWED_TYPES.includes(file.mimetype);
    const okExt = /\.(pdf|jpe?g|png)$/i.test(file.originalname);
    if (!okType || !okExt) {
      return cb(new Error("Unsupported file type. Allowed: PDF, JPG, JPEG, PNG (max 10 MB)"));
    }
    cb(null, true);
  },
});

// POST /api/uploads/report — upload to Cloudinary + Preprocessing + 2-Stage Vision OCR + Medicine Matching
router.post("/report", protect, (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Maximum size is 10 MB." });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    let extraction = null;
    let rawText = "";

    try {
      extraction = await OCRService.processPrescription(req.file.path, req.file.mimetype, req.file.originalname);
      rawText = extraction.rawOcrText || "";
    } catch (pipelineErr) {
      console.error("[uploads] Vision OCR extraction warning:", pipelineErr.message);
      extraction = {
        title: req.file.originalname,
        type: "Prescription",
        summary: "Automated analysis was limited. Please review manually.",
        overallConfidence: 0.30,
        needsReview: true,
        medications: [],
        diagnoses: [],
        rawOcrText: "",
      };
    }

    const VALID_TYPES = ["Lab Report", "Prescription", "Imaging", "Discharge Summary", "Vaccination"];
    const reportType = VALID_TYPES.includes(extraction?.type) ? extraction.type : "Prescription";

    const report = await MedicalReport.create({
      patientId: patient._id,
      title: extraction?.title || req.file.originalname,
      type: reportType,
      reportUrl: req.file.path,
      fileUrl: req.file.path,
      publicId: req.file.filename,
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024).toFixed(0)} KB`,
      rawText,
      aiSummary: extraction?.summary || "",
      extractionStatus: "pending_review",
      overallConfidence: extraction?.overallConfidence || 0.8,
      needsReview: Boolean(extraction?.needsReview),
      extractedData: extraction,
      extractedEntities: {
        diagnoses: Array.isArray(extraction?.diagnoses) ? extraction.diagnoses : [],
        medications: Array.isArray(extraction?.medications) ? extraction.medications : [],
        allergies: Array.isArray(extraction?.allergies) ? extraction.allergies : [],
        labValues: Array.isArray(extraction?.labValues) ? extraction.labValues : [],
      },
    });

    // Auto-sync verified normalized medications (confidence >= 0.80) to patient's active Medications tab
    const autoVerifiedMeds = (extraction?.medications || [])
      .filter((m) => m.status === "verified" && (m.confidence || 0.8) >= 0.80 && (m.brandName || m.genericName || m.medicineName))
      .map((m) => {
        const brand = m.brandName || m.medicineName || "";
        const gen = m.genericName || "";
        const displayName = gen && gen.toLowerCase() !== brand.toLowerCase() ? `${brand} (${gen})` : brand;
        return {
          name: displayName,
          brandName: brand,
          genericName: gen,
          activeIngredients: Array.isArray(m.activeIngredients) ? m.activeIngredients : (gen ? [gen] : []),
          rxNormCui: m.rxNormCui || "",
          dosage: m.dose || m.strength || "As prescribed",
          frequency: m.frequencyInterpreted || m.frequency || "Daily",
          active: true,
          status: "verified",
          normalizationStatus: "confirmed",
          requiresReview: false,
          addedFromReportId: report._id,
        };
      });

    if (autoVerifiedMeds.length > 0) {
      const existingNames = new Set(patient.medications.map((m) => m.name.toLowerCase()));
      let updated = false;
      for (const av of autoVerifiedMeds) {
        if (!existingNames.has(av.name.toLowerCase())) {
          patient.medications.push(av);
          updated = true;
        }
      }
      if (updated) await patient.save();
    }

    await AuditLog.create({
      user: req.user.email,
      action: `Uploaded report ${report.title}`,
      targetId: patient._id,
    });

    res.status(201).json({
      report,
      rawText,
      extraction,
      aiSummary: extraction?.summary || "",
      storage: {
        secure_url: req.file.path,
        public_id: req.file.filename,
        originalname: req.file.originalname,
      },
    });
  } catch (err) {
    if (req.file && req.file.filename) {
      await deleteFile(req.file.filename).catch(() => {});
    }
    next(err);
  }
});

// PUT /api/uploads/reports/:id/confirm — User confirms & saves verified extracted data + logs feedback
router.put("/reports/:id/confirm", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const report = await MedicalReport.findOne({ _id: req.params.id, patientId: patient._id });
    if (!report) return res.status(404).json({ message: "Report not found or access denied" });

    const confirmedData = req.body;
    report.extractionStatus = "reviewed";
    report.needsReview = false;
    report.reviewedData = confirmedData;
    report.reviewedAt = new Date();

    if (confirmedData.title) report.title = confirmedData.title;
    if (confirmedData.summary) report.aiSummary = confirmedData.summary;

    if (Array.isArray(confirmedData.medications)) {
      report.extractedEntities.medications = confirmedData.medications;

      // Log feedback for opt-in evaluation if predicted != corrected
      const origMeds = report.extractedData?.medications || [];
      for (let i = 0; i < confirmedData.medications.length; i++) {
        const confMed = confirmedData.medications[i];
        const origMed = origMeds[i];

        const predicted = origMed?.brandName || origMed?.medicineName || "";
        const corrected = confMed.brandName || confMed.medicineName || "";

        if (corrected && predicted && corrected.toLowerCase() !== predicted.toLowerCase()) {
          await CorrectionFeedback.create({
            reportId: report._id,
            rawOcrText: confMed.rawText || origMed?.rawText || "",
            predictedMedicine: predicted,
            correctedMedicine: corrected,
            user: req.user.email,
          }).catch(() => {});
        }
      }

      // Sync confirmed medications into patient active medications
      const newMeds = confirmedData.medications
        .filter((m) => (m.brandName || m.medicineName) && (m.brandName || m.medicineName).trim())
        .map((m) => {
          const brand = m.brandName || m.medicineName || "";
          const gen = m.genericName || "";
          const displayName = gen && gen.toLowerCase() !== brand.toLowerCase() ? `${brand} (${gen})` : brand;
          return {
            name: displayName,
            brandName: brand,
            genericName: gen,
            activeIngredients: Array.isArray(m.activeIngredients) ? m.activeIngredients : (gen ? [gen] : []),
            rxNormCui: m.rxNormCui || "",
            dosage: m.dose || m.strength || "As prescribed",
            frequency: m.frequencyInterpreted || m.frequency || "Daily",
            active: true,
            status: "verified",
            normalizationStatus: "confirmed",
            requiresReview: false,
            addedFromReportId: report._id,
          };
        });

      if (newMeds.length > 0) {
        const existingNames = new Set(patient.medications.map((m) => m.name.toLowerCase()));
        for (const nm of newMeds) {
          if (!existingNames.has(nm.name.toLowerCase())) {
            patient.medications.push(nm);
          }
        }
        await patient.save();
      }
    }

    if (Array.isArray(confirmedData.diagnoses)) {
      report.extractedEntities.diagnoses = confirmedData.diagnoses;
    }

    await report.save();

    await AuditLog.create({
      user: req.user.email,
      action: `Verified & confirmed extraction for report ${report.title}`,
      targetId: patient._id,
    });

    res.json({ message: "Extraction verified and saved successfully", report });
  } catch (err) {
    next(err);
  }
});

// GET /api/uploads/medicines/search — Search Indian & Global medicine database by brand or generic name
router.get("/medicines/search", protect, async (req, res, next) => {
  try {
    const q = req.query.q || "";
    if (!q || q.length < 2) return res.json({ medicines: [] });

    const regex = new RegExp(q.replace(/[^a-zA-Z0-9]/g, ""), "i");
    const medicines = await Medicine.find({
      $or: [
        { brandName: regex },
        { normalizedBrandName: regex },
        { genericName: regex },
        { normalizedGenericName: regex },
        { aliases: regex },
      ],
    })
      .limit(10)
      .lean();

    res.json({ medicines });
  } catch (err) {
    next(err);
  }
});

// GET /api/uploads/reports — list own reports
router.get("/reports", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });
    const reports = await MedicalReport.find({ patientId: patient._id }).sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/uploads/reports/:id — remove from Cloudinary + MongoDB
router.delete("/reports/:id", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const report = await MedicalReport.findOne({ _id: req.params.id, patientId: patient._id });
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.publicId) {
      await deleteFile(report.publicId);
    }

    await report.deleteOne();

    await AuditLog.create({
      user: req.user.email,
      action: `Deleted report ${report.title}`,
      targetId: patient._id,
    });

    res.json({ message: "Report deleted", publicId: report.publicId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
