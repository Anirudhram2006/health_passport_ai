const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Patient = require("../models/Patient");
const MedicalReport = require("../models/MedicalReport");
const AuditLog = require("../models/AuditLog");
const interactionEngine = require("../services/interactions/interactionEngine");
const drugConditionEngine = require("../services/interactions/drugConditionEngine");
const duplicateDrugEngine = require("../services/interactions/duplicateDrugEngine");
const genericAlternativeEngine = require("../services/interactions/genericAlternativeEngine");

// POST /api/interactions/check — Perform single or multi-prescription drug-drug interaction check securely
router.post("/check", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const activePatientMeds = patient.medications ? patient.medications.filter((m) => m.active !== false) : [];
    let prescriptionsToAnalyze = [];

    // Option A: Client provides database MedicalReport IDs
    if (Array.isArray(req.body.prescriptionIds) && req.body.prescriptionIds.length > 0) {
      const dbReports = await MedicalReport.find({
        _id: { $in: req.body.prescriptionIds },
        patientId: patient._id, // Enforce patient ownership security
      });

      prescriptionsToAnalyze = dbReports.map((r) => ({
        prescriptionId: String(r._id),
        fileName: r.fileName || r.title || "Prescription Report",
        medications: r.reviewedData?.medications || r.extractedEntities?.medications || r.extractedData?.medications || [],
      }));
    }
    // Option B: Client provides structured prescriptions array directly
    else if (Array.isArray(req.body.prescriptions) && req.body.prescriptions.length > 0) {
      prescriptionsToAnalyze = req.body.prescriptions.map((p, idx) => ({
        prescriptionId: String(p.prescriptionId || p.id || `rx-${idx + 1}`),
        fileName: p.fileName || p.name || `Prescription #${idx + 1}`,
        medications: Array.isArray(p.medications) ? p.medications : [],
      }));
    }
    // Option C: Fallback single prescription medication array
    else if (Array.isArray(req.body.medications) || Array.isArray(req.body.prescriptionMedications)) {
      const meds = req.body.medications || req.body.prescriptionMedications;
      prescriptionsToAnalyze = [
        {
          prescriptionId: "current_batch",
          fileName: "Uploaded Prescription",
          medications: meds,
        },
      ];
    }

    const result = await interactionEngine.checkMultiplePrescriptions(prescriptionsToAnalyze, activePatientMeds);

    await AuditLog.create({
      user: req.user.email,
      action: `Executed Multi-Prescription Drug Interaction Check (${result.prescriptionsAnalyzedCount} prescriptions, ${result.analyzedPairsCount} pairs, status: ${result.status})`,
      targetId: patient._id,
    }).catch(() => {});

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interactions/check-drug-condition — Module 6 Drug-Condition Interaction Check
router.post("/check-drug-condition", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    // 1. Gather patient's active confirmed medications
    const medications = Array.isArray(req.body.medications) && req.body.medications.length > 0
      ? req.body.medications
      : (patient.medications ? patient.medications.filter((m) => m.active !== false) : []);

    // 2. Gather patient's confirmed conditions (from profile chronicDiseases + medical reports)
    const reportDiagnoses = [];
    const reports = await MedicalReport.find({ patientId: patient._id });
    for (const r of reports) {
      const diagList = r.reviewedData?.diagnoses || r.extractedEntities?.diagnoses || r.extractedData?.diagnoses || [];
      if (Array.isArray(diagList)) {
        for (const d of diagList) {
          const name = typeof d === "string" ? d : d.name || d.title;
          if (name && !reportDiagnoses.includes(name)) {
            reportDiagnoses.push(name);
          }
        }
      }
    }

    const rawConditions = Array.isArray(req.body.conditions) && req.body.conditions.length > 0
      ? req.body.conditions
      : [...(patient.chronicDiseases || []), ...reportDiagnoses];

    const result = await drugConditionEngine.checkDrugConditionInteractions(medications, rawConditions);

    await AuditLog.create({
      user: req.user.email,
      action: `Executed Module 6 Drug-Condition Interaction Check (${result.confirmedMedicationsCount} meds, ${result.confirmedConditionsCount} conditions, ${result.analyzedPairsCount} pairs, status: ${result.status})`,
      targetId: patient._id,
    }).catch(() => {});

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interactions/check-duplicates — Module 7 Duplicate Drug Detection Endpoint
router.post("/check-duplicates", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const activePatientMeds = patient.medications ? patient.medications.filter((m) => m.active !== false) : [];
    let prescriptionsToAnalyze = [];

    if (Array.isArray(req.body.prescriptionIds) && req.body.prescriptionIds.length > 0) {
      const dbReports = await MedicalReport.find({
        _id: { $in: req.body.prescriptionIds },
        patientId: patient._id,
      });

      prescriptionsToAnalyze = dbReports.map((r) => ({
        prescriptionId: String(r._id),
        fileName: r.fileName || r.title || "Prescription Report",
        medications: r.reviewedData?.medications || r.extractedEntities?.medications || r.extractedData?.medications || [],
      }));
    } else if (Array.isArray(req.body.prescriptions) && req.body.prescriptions.length > 0) {
      prescriptionsToAnalyze = req.body.prescriptions.map((p, idx) => ({
        prescriptionId: String(p.prescriptionId || p.id || `rx-${idx + 1}`),
        fileName: p.fileName || p.name || `Prescription #${idx + 1}`,
        medications: Array.isArray(p.medications) ? p.medications : [],
      }));
    } else if (Array.isArray(req.body.medications) || Array.isArray(req.body.prescriptionMedications)) {
      const meds = req.body.medications || req.body.prescriptionMedications;
      prescriptionsToAnalyze = [
        {
          prescriptionId: "current_batch",
          fileName: "Uploaded Prescription",
          medications: meds,
        },
      ];
    }

    const result = await duplicateDrugEngine.checkDuplicateDrugs(prescriptionsToAnalyze, activePatientMeds);

    await AuditLog.create({
      user: req.user.email,
      action: `Executed Module 7 Duplicate Drug Check (${result.checkedMedicationsCount} meds, ${result.duplicatesCount} duplicates, status: ${result.status})`,
      targetId: patient._id,
    }).catch(() => {});

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/interactions/generic-alternatives — Module 8 Generic Alternative Suggestion Endpoint
router.post("/generic-alternatives", protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    let targetMedication = null;

    // Option A: Client provides medicationId within patient profile
    if (req.body.medicationId) {
      const med = patient.medications.id(req.body.medicationId);
      if (!med) return res.status(404).json({ message: "Medication not found in patient profile" });
      targetMedication = med.toObject();
    }
    // Option B: Client provides medication object directly
    else if (req.body.medication) {
      targetMedication = req.body.medication;
    }
    // Option C: Search by medication name
    else if (req.body.name || req.body.brandName) {
      const searchName = (req.body.name || req.body.brandName).toLowerCase();
      const med = patient.medications.find((m) => m.name.toLowerCase().includes(searchName) || (m.brandName && m.brandName.toLowerCase().includes(searchName)));
      targetMedication = med ? med.toObject() : { name: req.body.name || req.body.brandName };
    }

    if (!targetMedication) {
      return res.status(400).json({ message: "Medication parameter required (medicationId, medication object, or name)" });
    }

    const result = await genericAlternativeEngine.findGenericAlternatives(targetMedication);

    await AuditLog.create({
      user: req.user.email,
      action: `Executed Module 8 Generic Alternatives Lookup for ${result.medication?.name || 'Medication'} (found: ${result.alternatives?.length || 0})`,
      targetId: patient._id,
    }).catch(() => {});

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
