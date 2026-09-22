const interactionProvider = require("./interactionProvider");
const Medicine = require("../../models/Medicine");
const medicineMatcher = require("../ocr/medicineMatcher");
const { lookupRxNorm } = require("../ocr/rxNormService");

class InteractionEngine {
  /**
   * Normalizes input medicine object to ensure generic name and RxCUI are resolved
   */
  async normalizeMedication(rawMed, defaultSource = null) {
    if (!rawMed) return null;

    const rawName = rawMed.name || rawMed.brandName || rawMed.medicineName || "";
    if (!rawName || typeof rawName !== "string") return null;

    const source = rawMed.source || defaultSource || { prescriptionId: "unknown", fileName: "Prescription Document" };

    let brandCandidate = rawMed.brandName || rawName;
    let genericName = rawMed.genericName || "";
    let activeIngredients = Array.isArray(rawMed.activeIngredients) ? [...rawMed.activeIngredients] : [];
    let rxCui = rawMed.rxNormCui || rawMed.rxCui || "";

    // Handle parenthetical display names, e.g., "Montair LC (Montelukast + Levocetirizine)" or "Pan 40 (Pantoprazole)"
    const parenMatch = rawName.match(/^(.*?)\s*\((.*?)\)$/);
    if (parenMatch) {
      brandCandidate = parenMatch[1].trim();
      if (!genericName) {
        genericName = parenMatch[2].trim();
      }
    }

    // If activeIngredients is empty, construct from genericName if it contains "+"
    if (activeIngredients.length === 0 && genericName) {
      activeIngredients = genericName.split("+").map((s) => s.trim()).filter(Boolean);
    }

    // 1. Perform multi-tier database candidate lookup using medicineMatcher
    let candidates = [];
    let dbErrorOccurred = false;
    try {
      candidates = await medicineMatcher.matchCandidates(brandCandidate || rawName, rawMed.strength);
    } catch (err) {
      dbErrorOccurred = true;
      console.error("[interactionEngine] Candidate lookup DB error:", err.message);
    }
    const topMatch = candidates && candidates.length > 0 ? candidates[0] : null;

    const hasExplicitReviewRequest = Boolean(rawMed.needsReview || rawMed.status === "needs_review" || rawMed.status === "unresolved");

    // Determine if candidate match is authoritative/high-trust
    // If input explicitly requested review (e.g. truncated "Pan..."), require exact_brand or brand_strength_exact match to override
    const isHighTrustDB = topMatch && (
      (hasExplicitReviewRequest
        ? (topMatch.matchType === "exact_brand" || topMatch.matchType === "brand_strength_exact")
        : (topMatch.matchType === "exact_brand" || topMatch.matchType === "brand_strength_exact" || topMatch.matchType === "alias_exact" || topMatch.confidence >= 0.80)
      )
    );

    if (isHighTrustDB) {
      const finalBrand = topMatch.brandName || brandCandidate;
      const finalGeneric = topMatch.genericName || genericName || finalBrand;
      const finalIngredients = topMatch.activeIngredients?.length > 0
        ? topMatch.activeIngredients
        : (activeIngredients.length > 0 ? activeIngredients : [finalGeneric]);

      return {
        originalText: rawName,
        name: rawName,
        brandName: finalBrand,
        genericName: finalGeneric,
        activeIngredients: finalIngredients,
        strength: topMatch.strength || rawMed.strength || "",
        rxCui: topMatch.rxNormCui || rxCui || "",
        status: "VERIFIED",
        normalizationStatus: "confirmed",
        requiresReview: false,
        confidence: topMatch.confidence || 0.95,
        matchMethod: topMatch.matchType || "exact_database_match",
        sources: [source],
      };
    }

    // 2. Check if medicine was already confirmed (e.g., from active health record or user-verified report)
    const isAlreadyVerified = Boolean(
      (!hasExplicitReviewRequest && genericName && genericName.length > 2) ||
      rawMed.status === "verified" ||
      rawMed.status === "verified_by_user" ||
      rawMed.normalizationStatus === "confirmed"
    );

    if (isAlreadyVerified && genericName) {
      return {
        originalText: rawName,
        name: rawName,
        brandName: brandCandidate,
        genericName: genericName,
        activeIngredients: activeIngredients.length > 0 ? activeIngredients : [genericName],
        strength: rawMed.strength || "",
        rxCui: rxCui || "",
        status: "VERIFIED",
        normalizationStatus: "confirmed",
        requiresReview: false,
        confidence: rawMed.confidence || 0.95,
        matchMethod: "user_confirmed_record",
        sources: [source],
      };
    }

    // 3. Fallback: if rawMed explicitly requested review without an exact DB match
    if (hasExplicitReviewRequest) {
      return {
        name: rawName,
        status: "MEDICINE_NEEDS_REVIEW",
        normalizationStatus: "requires_review",
        requiresReview: true,
        reason: "Medicine identification requires review before interaction checking.",
        sources: [source],
      };
    }

    // 4. Fallback: Query RxNorm API if RxCUI / genericName is still missing
    if (!rxCui && (genericName || brandCandidate)) {
      const rxRes = await lookupRxNorm(genericName || brandCandidate);
      if (rxRes && rxRes.rxcui) {
        rxCui = rxRes.rxcui;
        if (!genericName) genericName = rxRes.genericName;
      }
    }

    if (!genericName && !rxCui) {
      return {
        name: rawName,
        status: "MEDICINE_UNKNOWN",
        normalizationStatus: "unresolved",
        requiresReview: true,
        reason: "Unable to confidently normalize medication.",
        sources: [source],
        dbError: dbErrorOccurred,
      };
    }

    return {
      originalText: rawName,
      name: rawName,
      brandName: brandCandidate,
      genericName: genericName || brandCandidate,
      activeIngredients: activeIngredients.length > 0 ? activeIngredients : [genericName || brandCandidate],
      strength: rawMed.strength || "",
      rxCui: rxCui || "",
      status: "VERIFIED",
      normalizationStatus: "confirmed",
      requiresReview: false,
      confidence: rawMed.confidence || 0.85,
      matchMethod: "rxnorm_fallback",
      sources: [source],
    };
  }

  /**
   * Main Entrypoint for Multi-Prescription Drug–Drug Interaction Checking
   */
  async checkMultiplePrescriptions(prescriptions = [], activePatientMeds = []) {
    try {
      let prescriptionsAnalyzedCount = 0;
      let failedPrescriptionsCount = 0;
      let totalExtractedMedsCount = 0;

      const normalizedVerifiedMap = new Map(); // key -> normalized drug object with accumulated sources
      const unverifiedItems = [];

      // Process active patient health record medications if provided
      if (Array.isArray(activePatientMeds) && activePatientMeds.length > 0) {
        const patientSource = { prescriptionId: "patient_active", fileName: "Active Health Record" };
        for (const pMed of activePatientMeds) {
          totalExtractedMedsCount++;
          const norm = await this.normalizeMedication(pMed, patientSource);
          if (norm) {
            if (norm.status === "VERIFIED") {
              this.addOrMergeNormalized(normalizedVerifiedMap, norm);
            } else {
              unverifiedItems.push(norm);
            }
          }
        }
      }

      // Process each uploaded prescription independently
      for (const rx of prescriptions) {
        if (rx.error || rx.processingStatus === "failed") {
          failedPrescriptionsCount++;
          continue;
        }
        prescriptionsAnalyzedCount++;

        const source = {
          prescriptionId: String(rx.prescriptionId || rx.id || rx._id || `rx-${Date.now()}`),
          fileName: rx.fileName || rx.title || "Uploaded Prescription",
        };

        const rxMeds = Array.isArray(rx.medications) ? rx.medications : Array.isArray(rx.extractedData?.medications) ? rx.extractedData.medications : [];
        totalExtractedMedsCount += rxMeds.length;

        for (const medItem of rxMeds) {
          const norm = await this.normalizeMedication(medItem, source);
          if (norm) {
            if (norm.status === "VERIFIED") {
              this.addOrMergeNormalized(normalizedVerifiedMap, norm);
            } else {
              unverifiedItems.push(norm);
            }
          }
        }
      }

      const uniqueVerifiedMeds = Array.from(normalizedVerifiedMap.values());

      // Evaluate all unique medication pairs (N * (N - 1) / 2)
      const uniquePairs = [];
      const seenPairKeys = new Set();

      for (let i = 0; i < uniqueVerifiedMeds.length; i++) {
        for (let j = i + 1; j < uniqueVerifiedMeds.length; j++) {
          const med1 = uniqueVerifiedMeds[i];
          const med2 = uniqueVerifiedMeds[j];

          const key = med1.genericName.toLowerCase() < med2.genericName.toLowerCase()
            ? `${med1.genericName.toLowerCase()}:${med2.genericName.toLowerCase()}`
            : `${med2.genericName.toLowerCase()}:${med1.genericName.toLowerCase()}`;

          if (!seenPairKeys.has(key)) {
            seenPairKeys.add(key);
            uniquePairs.push([med1, med2]);
          }
        }
      }

      const interactionResults = [];
      for (const [drugA, drugB] of uniquePairs) {
        const result = await interactionProvider.findInteraction(drugA, drugB);
        if (result && result.interactionFound) {
          // Attach source tracking metadata to interaction result
          result.drugA.sources = drugA.sources || [];
          result.drugB.sources = drugB.sources || [];
          interactionResults.push(result);
        }
      }

      // Determine overall status for Module 5
      let status = "NO_INTERACTION_FOUND";
      if (interactionResults.length > 0) {
        status = "INTERACTION_FOUND";
      } else if (unverifiedItems.some((u) => u.status === "MEDICINE_NEEDS_REVIEW")) {
        status = "MEDICINE_NEEDS_REVIEW";
      } else if (unverifiedItems.some((u) => u.status === "MEDICINE_UNKNOWN")) {
        status = "MEDICINE_UNKNOWN";
      }

      // 4. Module 7: Duplicate Drug & Active Ingredient Overlap Detection
      let duplicateDetection = {
        status: "NO_DUPLICATES_FOUND",
        duplicatesCount: 0,
        checkedMedicationsCount: uniqueVerifiedMeds.length,
        duplicates: [],
        ingredientOverlaps: [],
        groups: [],
        unverifiedItems: [],
      };
      try {
        const duplicateDrugEngine = require("./duplicateDrugEngine");
        duplicateDetection = await duplicateDrugEngine.checkDuplicateDrugs(prescriptions, activePatientMeds);
      } catch (dupErr) {
        console.error("[interactionEngine] Module 7 execution error:", dupErr.message);
        duplicateDetection = {
          status: "SERVICE_UNAVAILABLE",
          duplicatesCount: 0,
          checkedMedicationsCount: uniqueVerifiedMeds.length,
          duplicates: [],
          ingredientOverlaps: [],
          groups: [],
          unverifiedItems: [],
          message: "Duplicate drug detection service is temporarily unavailable.",
        };
      }

      // 5. Module 8: Generic Alternative Suggestion for Confirmed Medications
      let genericAlternatives = {
        status: "NO_VALIDATED_ALTERNATIVE",
        medicationsCount: uniqueVerifiedMeds.length,
        medications: [],
      };
      try {
        const genericAlternativeEngine = require("./genericAlternativeEngine");
        const altMedResults = [];
        for (const med of uniqueVerifiedMeds) {
          const altRes = await genericAlternativeEngine.findGenericAlternatives(med);
          if (altRes) {
            altMedResults.push(altRes);
          }
        }
        const hasAlternatives = altMedResults.some((a) => a.status === "ALTERNATIVES_FOUND" && a.alternatives.length > 0);
        genericAlternatives = {
          status: hasAlternatives ? "ALTERNATIVES_FOUND" : "NO_VALIDATED_ALTERNATIVE",
          medicationsCount: altMedResults.length,
          medications: altMedResults,
        };
      } catch (genErr) {
        console.error("[interactionEngine] Module 8 execution error:", genErr.message);
        genericAlternatives = {
          status: "SERVICE_UNAVAILABLE",
          medicationsCount: 0,
          medications: [],
          message: "Generic alternative suggestion service is temporarily unavailable.",
        };
      }

      const disclaimer = interactionResults.length > 0
        ? "Potential drug interaction detected. Please consult a qualified healthcare professional. No automated medication changes have been made."
        : "Medication safety results are provided for clinical decision support only. Please consult a qualified healthcare professional. No automated medication changes have been made.";

      return {
        status,
        prescriptionsAnalyzedCount,
        failedPrescriptionsCount,
        totalExtractedMedsCount,
        uniqueNormalizedMedsCount: uniqueVerifiedMeds.length,
        checkedMedicationsCount: uniqueVerifiedMeds.length,
        analyzedPairsCount: uniquePairs.length,
        interactions: interactionResults,
        unverifiedItems,
        analyzedMeds: uniqueVerifiedMeds,
        duplicateDetection,
        genericAlternatives,
        disclaimer,
      };
    } catch (err) {
      console.error("[interactionEngine] Error during multi-prescription interaction check:", err);
      return {
        status: "SERVICE_UNAVAILABLE",
        prescriptionsAnalyzedCount: 0,
        failedPrescriptionsCount: 0,
        totalExtractedMedsCount: 0,
        uniqueNormalizedMedsCount: 0,
        checkedMedicationsCount: 0,
        analyzedPairsCount: 0,
        interactions: [],
        unverifiedItems: [],
        analyzedMeds: [],
        disclaimer: "Interaction checking is temporarily unavailable. Please consult a healthcare professional and verify prescriptions independently.",
      };
    }
  }

  /**
   * Helper to merge duplicate normalized drug entries while accumulating source file metadata
   */
  addOrMergeNormalized(map, norm) {
    const key = (norm.rxCui ? `rxcui:${norm.rxCui}` : `gen:${norm.genericName.toLowerCase()}`).trim();
    if (!map.has(key)) {
      map.set(key, { ...norm, sources: [...(norm.sources || [])] });
    } else {
      const existing = map.get(key);
      const sources = existing.sources || [];
      for (const s of norm.sources || []) {
        if (!sources.some((ex) => ex.prescriptionId === s.prescriptionId && ex.fileName === s.fileName)) {
          sources.push(s);
        }
      }
      existing.sources = sources;
    }
  }

  /**
   * Backward-compatible single check wrapper
   */
  async checkInteractions(patientMeds = [], prescriptionMeds = []) {
    const rxWrapper = [
      {
        prescriptionId: "single_upload",
        fileName: "Uploaded Prescription",
        medications: prescriptionMeds,
      },
    ];
    return this.checkMultiplePrescriptions(rxWrapper, patientMeds);
  }

  /**
   * Simple array helper for checking drug-drug interactions between medicine names
   */
  async checkDrugInteractions(medNames = []) {
    if (!Array.isArray(medNames) || medNames.length < 2) return [];
    const meds = medNames.map((name) => (typeof name === "string" ? { name, active: true } : name));
    const result = await this.checkMultiplePrescriptions([], meds);
    return result?.interactions || [];
  }
}

const engineInstance = new InteractionEngine();
engineInstance.checkDrugInteractions = engineInstance.checkDrugInteractions.bind(engineInstance);

module.exports = engineInstance;
module.exports.checkDrugInteractions = engineInstance.checkDrugInteractions;


