const interactionEngine = require("./interactionEngine");
const Medicine = require("../../models/Medicine");

/**
 * Normalizes active ingredient string to canonical form (strips salts, converts aliases)
 */
function normalizeIngredientName(rawName) {
  if (!rawName || typeof rawName !== "string") return "";
  let name = rawName.toLowerCase().trim();

  // Strip common pharmaceutical salt suffixes and descriptors
  name = name
    .replace(/\b(hydrochloride|hcl|sodium|potassium|trihydrate|calcium|besylate|dihydrochloride|maleate|succinate|tartrate|acetate|fumarate|phosphate|sulfate|hydrate|monohydrate)\b/gi, "")
    .trim();

  // Canonical alias mapping
  const ALIASES = {
    "acetaminophen": "paracetamol",
    "pcm": "paracetamol",
    "apap": "paracetamol",
    "amoxycillin": "amoxicillin",
    "amoxyclav": "amoxicillin",
    "fexofenadine hcl": "fexofenadine",
  };

  const clean = name.replace(/[^a-z0-9]/g, "");
  if (ALIASES[name]) return ALIASES[name];
  if (ALIASES[clean]) return ALIASES[clean];

  return name.replace(/\s+/g, " ").trim();
}

/**
 * Capitalizes ingredient string for clean user-facing display
 */
function formatIngredientDisplay(ing) {
  if (!ing) return "";
  return ing
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Helper to normalize strength strings for comparison (e.g. "650 mg" -> "650")
 */
function normalizeStrength(str) {
  if (!str) return "";
  const match = String(str).match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : str.toLowerCase().trim();
}

class GenericAlternativeEngine {
  /**
   * Identifies & ranks validated generic alternatives for a confirmed medication
   */
  async findGenericAlternatives(rawMedication, defaultSource = null) {
    if (!rawMedication) {
      return {
        status: "MEDICINE_UNVERIFIED",
        requiresReview: true,
        message: "Medicine verification required before generic alternatives can be determined.",
        medication: { name: "Unknown Medication" },
        alternatives: [],
        disclaimer: "This information is for clinical decision support only and does not replace medical advice.",
      };
    }

    const source = rawMedication.source || defaultSource || { prescriptionId: "unknown", fileName: "Prescription Document" };

    // 1. Normalize target medication using interactionEngine
    const targetNorm = await interactionEngine.normalizeMedication(rawMedication, source);

    if (targetNorm?.dbError) {
      return {
        status: "DATABASE_UNAVAILABLE",
        requiresReview: true,
        message: "Medicine database is temporarily unavailable. Unable to query generic alternatives.",
        medication: {
          name: rawMedication.name || rawMedication.brandName || "Medication",
        },
        alternatives: [],
        disclaimer: "This information is for clinical decision support only and does not replace medical advice.",
      };
    }

    if (!targetNorm || targetNorm.status !== "VERIFIED" || targetNorm.requiresReview) {
      return {
        status: "MEDICINE_UNVERIFIED",
        requiresReview: true,
        message: "Medicine verification required before generic alternatives can be determined.",
        medication: {
          name: rawMedication.name || rawMedication.brandName || "Unverified Medication",
          status: "needs_review",
        },
        alternatives: [],
        disclaimer: "This information is for clinical decision support only and does not replace medical advice.",
      };
    }

    // Prepare target active ingredients canonical set
    const rawTargetIngredients = [];
    const targetSourceList =
      Array.isArray(targetNorm.activeIngredients) && targetNorm.activeIngredients.length > 0
        ? targetNorm.activeIngredients
        : (targetNorm.genericName || targetNorm.name).split("+").map((s) => s.trim());

    for (const item of targetSourceList) {
      if (typeof item === "string" && item.includes("+")) {
        rawTargetIngredients.push(...item.split("+").map((s) => s.trim()));
      } else if (typeof item === "string" && item.includes(" / ")) {
        rawTargetIngredients.push(...item.split("/").map((s) => s.trim()));
      } else {
        rawTargetIngredients.push(item);
      }
    }

    const targetCanonicalSet = new Set();
    const targetDisplayIngredients = [];
    for (const rawIng of rawTargetIngredients) {
      const canon = normalizeIngredientName(rawIng);
      if (canon) {
        targetCanonicalSet.add(canon);
        const formatted = formatIngredientDisplay(canon);
        if (!targetDisplayIngredients.includes(formatted)) {
          targetDisplayIngredients.push(formatted);
        }
      }
    }

    const targetBrand = (targetNorm.brandName || targetNorm.name || "").toLowerCase().trim();
    const targetStrength = targetNorm.strength || rawMedication.strength || "";
    const targetDosageForm = (targetNorm.dosageForm || rawMedication.dosageForm || "Tablet").toLowerCase().trim();

    // 2. Query MongoDB Medicine database for verified candidates
    let candidateMedicines = [];
    try {
      candidateMedicines = await Medicine.find({ verified: true }).lean();
    } catch (err) {
      console.error("[genericAlternativeEngine] Database error during lookup:", err.message);
      return {
        status: "DATABASE_UNAVAILABLE",
        requiresReview: true,
        message: "Medicine database is temporarily unavailable. Unable to query generic alternatives.",
        medication: {
          name: targetNorm.name,
          brandName: targetNorm.brandName,
          genericName: targetNorm.genericName,
          activeIngredients: targetDisplayIngredients,
          strength: targetStrength,
          dosageForm: targetNorm.dosageForm || "Tablet",
        },
        alternatives: [],
        disclaimer: "This information is for clinical decision support only and does not replace medical advice.",
      };
    }

    const alternatives = [];

    // 3. Search and rank candidates matching the active ingredient set
    for (const cand of candidateMedicines) {
      const candBrand = (cand.brandName || "").toLowerCase().trim();
      const candStrength = cand.strength || "";
      const candForm = (cand.dosageForm || "Tablet").toLowerCase().trim();

      // Don't suggest the exact same brand + strength + form product to itself
      if (candBrand === targetBrand && normalizeStrength(candStrength) === normalizeStrength(targetStrength) && candForm === targetDosageForm) {
        continue;
      }

      // Extract candidate active ingredient set
      const candRawIngredients = [];
      const candSourceList =
        Array.isArray(cand.activeIngredients) && cand.activeIngredients.length > 0
          ? cand.activeIngredients
          : (cand.genericName || cand.brandName).split("+").map((s) => s.trim());

      for (const item of candSourceList) {
        if (typeof item === "string" && item.includes("+")) {
          candRawIngredients.push(...item.split("+").map((s) => s.trim()));
        } else if (typeof item === "string" && item.includes(" / ")) {
          candRawIngredients.push(...item.split("/").map((s) => s.trim()));
        } else {
          candRawIngredients.push(item);
        }
      }

      const candCanonicalSet = new Set();
      const candDisplayIngredients = [];
      for (const rawIng of candRawIngredients) {
        const canon = normalizeIngredientName(rawIng);
        if (canon) {
          candCanonicalSet.add(canon);
          const formatted = formatIngredientDisplay(canon);
          if (!candDisplayIngredients.includes(formatted)) {
            candDisplayIngredients.push(formatted);
          }
        }
      }

      // Combination Medicine Rule: Must match the complete active ingredient set
      const isSetEqual =
        targetCanonicalSet.size === candCanonicalSet.size &&
        Array.from(targetCanonicalSet).every((ing) => candCanonicalSet.has(ing));

      if (!isSetEqual) {
        // Skip candidate if active ingredient set is not identical (e.g. Paracetamol alone for Aceclofenac + Paracetamol)
        continue;
      }

      // Evaluate strength and dosage form matching
      const isStrengthEqual = normalizeStrength(candStrength) === normalizeStrength(targetStrength);
      const isDosageFormEqual = candForm === targetDosageForm || candForm.includes(targetDosageForm) || targetDosageForm.includes(candForm);

      const isGeneric =
        cand.source === "PMBI Jan Aushadhi" ||
        (cand.manufacturer && cand.manufacturer.toLowerCase().includes("jan aushadhi")) ||
        (cand.manufacturer && cand.manufacturer.toLowerCase().includes("generic")) ||
        candBrand === (cand.genericName || "").toLowerCase().trim() ||
        candBrand.startsWith("paracetamol") ||
        candBrand.startsWith("aceclofenac");

      let matchType = "EXACT_GENERIC_EQUIVALENT";
      let matchScore = 0.98;
      let explanation = `Exact generic match with same active ingredient (${cand.genericName}), strength (${candStrength || 'Unspecified'}), and dosage form (${cand.dosageForm || 'Tablet'}).`;

      if (isSetEqual && targetCanonicalSet.size > 1 && isStrengthEqual && isDosageFormEqual) {
        matchType = "COMBINATION_EQUIVALENT";
        matchScore = 0.98;
        explanation = `Validated combination generic match with identical multi-ingredient formula (${cand.genericName}), strength (${candStrength}), and dosage form (${cand.dosageForm}).`;
      } else if (isDosageFormEqual && !isStrengthEqual) {
        matchType = "SAME_ACTIVE_INGREDIENT_DIFFERENT_STRENGTH";
        matchScore = 0.82;
        explanation = `Same active ingredient (${cand.genericName}) and dosage form (${cand.dosageForm}), but different strength (${candStrength} vs prescribed ${targetStrength || 'Unspecified'}).`;
      } else if (!isDosageFormEqual) {
        matchType = "SAME_ACTIVE_INGREDIENT_DIFFERENT_DOSAGE_FORM";
        matchScore = 0.75;
        explanation = `Same active ingredient (${cand.genericName}), but different dosage form (${cand.dosageForm} vs prescribed ${targetNorm.dosageForm || 'Tablet'}).`;
      }

      alternatives.push({
        name: cand.brandName,
        brandName: cand.brandName,
        genericName: cand.genericName,
        activeIngredients: candDisplayIngredients,
        strength: candStrength || "Unspecified",
        dosageForm: cand.dosageForm || "Tablet",
        manufacturer: cand.manufacturer || "CDSCO Listed Manufacturer",
        isGeneric,
        matchType,
        matchScore,
        source: cand.source || "Verified Catalogue",
        verified: cand.verified !== false,
        explanation,
      });
    }

    // 4. Rank alternatives
    alternatives.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.isGeneric !== a.isGeneric) return (b.isGeneric ? 1 : 0) - (a.isGeneric ? 1 : 0);
      return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
    });

    const isCombination = targetCanonicalSet.size > 1;

    if (alternatives.length === 0) {
      return {
        status: "NO_VALIDATED_ALTERNATIVE",
        requiresReview: false,
        message: isCombination
          ? "No validated generic equivalent found for the complete combination."
          : "No validated generic alternative found in the available medicine database.",
        medication: {
          name: targetNorm.name,
          brandName: targetNorm.brandName || targetNorm.name,
          genericName: targetNorm.genericName,
          activeIngredients: targetDisplayIngredients,
          strength: targetStrength,
          dosageForm: targetNorm.dosageForm || "Tablet",
          sources: targetNorm.sources || [source],
        },
        alternatives: [],
        disclaimer: "This information is for clinical decision support only and does not replace medical advice.",
      };
    }

    return {
      status: "ALTERNATIVES_FOUND",
      requiresReview: false,
      message: "Possible generic alternatives based on the same active ingredient. Discuss generic substitution with your doctor or pharmacist.",
      medication: {
        name: targetNorm.name,
        brandName: targetNorm.brandName || targetNorm.name,
        genericName: targetNorm.genericName,
        activeIngredients: targetDisplayIngredients,
        strength: targetStrength,
        dosageForm: targetNorm.dosageForm || "Tablet",
        sources: targetNorm.sources || [source],
      },
      alternatives,
      disclaimer: "This information is for clinical decision support only and does not replace medical advice. Do not stop, start, or replace prescribed medications without consulting a qualified healthcare professional.",
    };
  }
}

module.exports = new GenericAlternativeEngine();
