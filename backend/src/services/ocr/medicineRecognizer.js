const handwritingRecognizer = require("./handwritingRecognizer");
const medicineMatcher = require("./medicineMatcher");
const { rankCandidates } = require("./confidence");
const { preprocessImageBuffer } = require("./preprocess");
const { analyzePrescriptionDocument } = require("../gemini");

class MedicineRecognizer {
  /**
   * Medicine-aware recognition pipeline
   */
  async processPrescriptionDocument(buffer, mimeType = "image/png", originalName = "") {
    const mainBuffer = await preprocessImageBuffer(buffer);

    let stage1OcrText = "";
    try {
      const res = await handwritingRecognizer.recognizeVisibleText(mainBuffer);
      stage1OcrText = res.rawText || "";
    } catch (e) {
      console.warn("[medicineRecognizer] Stage 1 OCR warning:", e.message);
    }

    let visionAnalysis = null;
    try {
      visionAnalysis = await analyzePrescriptionDocument(mainBuffer, mimeType, stage1OcrText);
    } catch (vErr) {
      console.warn("[medicineRecognizer] Stage 1 Gemini Vision warning:", vErr.message);
    }

    let rawMedsList = Array.isArray(visionAnalysis?.medications) ? [...visionAnalysis.medications] : [];

    const processedMedications = [];

    for (const rawMed of rawMedsList) {
      const queryTerm = rawMed.medicineName || rawMed.rawText || "";
      const candidates = await medicineMatcher.matchCandidates(queryTerm, rawMed.strength);
      const ranked = rankCandidates(candidates, queryTerm);

      const top = ranked.topCandidate;

      const rawLineText = rawMed.rawText || queryTerm;
      const confidenceScore = ranked.confidence || (rawMed.confidence ? parseFloat(rawMed.confidence.toFixed(2)) : 0.5);
      const isNeedsReview = ranked.status === "needs_review" || ranked.status === "unresolved" || Boolean(rawMed.needsReview) || confidenceScore < 0.80 || !top;

      processedMedications.push({
        rawText: rawLineText,
        brandName: top?.brandName || rawMed.medicineName || queryTerm,
        genericName: top?.genericName || "",
        activeIngredients: top?.activeIngredients || [],
        strength: top?.strength || rawMed.strength || "",
        dosageForm: top?.dosageForm || "Tablet",
        dose: rawMed.dosage || "1 tablet",
        frequency: rawMed.frequency || "OD",
        frequencyInterpreted: rawMed.frequencyInterpreted || "once daily",
        duration: rawMed.duration || "5 days",
        rxNormCui: top?.rxNormCui || "",
        confidence: confidenceScore,
        status: isNeedsReview ? "needs_review" : "verified",
        candidates: ranked.candidates && ranked.candidates.length > 0 ? ranked.candidates : candidates,
      });
    }

    const consolidatedMedications = [];
    const seenMedKeys = new Map();

    for (const med of processedMedications) {
      const normBrand = (med.brandName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const normGen = (med.genericName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const normStrength = (med.strength || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const key = `${normBrand}:${normGen}:${normStrength}`;

      if (!seenMedKeys.has(key)) {
        seenMedKeys.set(key, med);
        consolidatedMedications.push(med);
      } else {
        const existing = seenMedKeys.get(key);
        if (med.rawText && !existing.rawText.toLowerCase().includes(med.rawText.toLowerCase())) {
          existing.rawText = `${existing.rawText} / ${med.rawText}`;
        }
        if (med.confidence > existing.confidence) {
          existing.confidence = med.confidence;
          existing.status = med.status;
        }
        if ((!existing.candidates || existing.candidates.length === 0) && med.candidates) {
          existing.candidates = med.candidates;
        }
      }
    }

    const hasNeedsReview = consolidatedMedications.some((m) => m.status === "needs_review" || m.status === "unresolved");
    const overallConfidence = visionAnalysis?.overallConfidence || (hasNeedsReview ? 0.70 : 0.95);

    return {
      title: visionAnalysis?.title || originalName || "Prescription Report",
      type: "Prescription",
      patient: visionAnalysis?.patient || { name: null, age: null, gender: null, date: null },
      doctor: visionAnalysis?.doctor || { name: null, hospital: null, licenseNumber: null },
      medications: consolidatedMedications,
      diagnoses: visionAnalysis?.diagnoses || [],
      allergies: visionAnalysis?.allergies || [],
      generalInstructions: visionAnalysis?.generalInstructions || [],
      summary: visionAnalysis?.summary || "Handwritten prescription processed with medicine candidate verification.",
      overallConfidence,
      needsReview: hasNeedsReview,
      rawOcrText: stage1OcrText,
    };
  }
}

module.exports = new MedicineRecognizer();
