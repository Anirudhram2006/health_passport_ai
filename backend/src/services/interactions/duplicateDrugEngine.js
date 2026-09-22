const interactionEngine = require("./interactionEngine");

/**
 * Normalizes active ingredient string to canonical form (strips salts, converts aliases)
 */
function normalizeIngredientName(rawName) {
  if (!rawName || typeof rawName !== "string") return "";
  let name = rawName.toLowerCase().trim();

  // Strip common pharmaceutical salt suffixes and descriptors for canonical identity matching
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

class DuplicateDrugEngine {
  /**
   * Performs Duplicate Drug & Active Ingredient Overlap Analysis
   */
  async checkDuplicateDrugs(prescriptions = [], activePatientMeds = []) {
    try {
      let prescriptionsAnalyzedCount = 0;
      let failedPrescriptionsCount = 0;
      let totalExtractedMedsCount = 0;

      const verifiedMeds = [];
      const seenItemKeys = new Set();
      const unverifiedItems = [];

      // Helper to add medication item ensuring distinct normalized medication identities are merged across sources
      const addVerifiedItem = (normMed, source) => {
        const brand = (normMed.brandName || normMed.name || "").toLowerCase().trim();
        const generic = (normMed.genericName || "").toLowerCase().trim();
        const strength = (normMed.strength || "").toLowerCase().trim();
        const itemKey = `${brand}:${generic}:${strength}`;

        const existing = verifiedMeds.find((m) => {
          const mBrand = (m.brandName || m.name || "").toLowerCase().trim();
          const mGeneric = (m.genericName || "").toLowerCase().trim();
          const mStrength = (m.strength || "").toLowerCase().trim();
          return `${mBrand}:${mGeneric}:${mStrength}` === itemKey;
        });

        if (!existing) {
          verifiedMeds.push({
            ...normMed,
            sources: [source],
          });
        } else {
          const sources = existing.sources || [];
          if (!sources.some((s) => s.prescriptionId === source.prescriptionId && s.fileName === source.fileName)) {
            sources.push(source);
          }
          existing.sources = sources;
        }
      };

      // 1. Process active patient health record medications
      if (Array.isArray(activePatientMeds) && activePatientMeds.length > 0) {
        const patientSource = { prescriptionId: "patient_active", fileName: "Active Health Record" };
        for (const pMed of activePatientMeds) {
          totalExtractedMedsCount++;
          const norm = await interactionEngine.normalizeMedication(pMed, patientSource);
          if (norm) {
            if (norm.status === "VERIFIED" && !norm.requiresReview) {
              addVerifiedItem(norm, patientSource);
            } else {
              unverifiedItems.push({
                name: norm.name || pMed.name || "Unverified Medication",
                status: "MEDICINE_NEEDS_REVIEW",
                reason: "Duplicate check could not be completed for this medication because it could not be confidently verified.",
                sources: [patientSource],
              });
            }
          }
        }
      }

      // 2. Process uploaded prescriptions independently
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

        const rxMeds = Array.isArray(rx.medications)
          ? rx.medications
          : Array.isArray(rx.extractedData?.medications)
          ? rx.extractedData.medications
          : [];
        totalExtractedMedsCount += rxMeds.length;

        for (const medItem of rxMeds) {
          const norm = await interactionEngine.normalizeMedication(medItem, source);
          if (norm) {
            if (norm.status === "VERIFIED" && !norm.requiresReview) {
              addVerifiedItem(norm, source);
            } else {
              unverifiedItems.push({
                name: norm.name || medItem.brandName || medItem.medicineName || "Unverified Medication",
                status: "MEDICINE_NEEDS_REVIEW",
                reason: "Duplicate check could not be completed for this medication because it could not be confidently verified.",
                sources: [source],
              });
            }
          }
        }
      }

      const uniqueVerifiedMeds = verifiedMeds;

      // Prepare active ingredient set for each unique verified medication
      const medsWithSets = uniqueVerifiedMeds.map((med) => {
        const rawIngredients = [];
        const sourceList =
          Array.isArray(med.activeIngredients) && med.activeIngredients.length > 0
            ? med.activeIngredients
            : (med.genericName || med.name).split("+").map((s) => s.trim());

        for (const item of sourceList) {
          if (typeof item === "string" && item.includes("+")) {
            rawIngredients.push(...item.split("+").map((s) => s.trim()));
          } else if (typeof item === "string" && item.includes(" / ")) {
            rawIngredients.push(...item.split("/").map((s) => s.trim()));
          } else {
            rawIngredients.push(item);
          }
        }

        const canonicalSet = new Set();
        const displayIngredients = [];

        for (const rawIng of rawIngredients) {
          const canon = normalizeIngredientName(rawIng);
          if (canon) {
            canonicalSet.add(canon);
            const formatted = formatIngredientDisplay(canon);
            if (!displayIngredients.includes(formatted)) {
              displayIngredients.push(formatted);
            }
          }
        }

        return {
          ...med,
          canonicalSet,
          displayIngredients,
        };
      });

      // 3. Evaluate pairwise duplicates between all unique confirmed medications
      const duplicates = [];
      const seenPairKeys = new Set();
      let analyzedPairsCount = 0;

      for (let i = 0; i < medsWithSets.length; i++) {
        for (let j = i + 1; j < medsWithSets.length; j++) {
          analyzedPairsCount++;
          const medA = medsWithSets[i];
          const medB = medsWithSets[j];

          const setA = medA.canonicalSet;
          const setB = medB.canonicalSet;

          // Compute set intersection
          const sharedCanonical = [];
          for (const ing of setA) {
            if (setB.has(ing)) {
              sharedCanonical.push(ing);
            }
          }

          if (sharedCanonical.length > 0) {
            const sharedFormatted = sharedCanonical.map(formatIngredientDisplay);
            const isExactSameSet = setA.size === setB.size && sharedCanonical.length === setA.size;

            let duplicateType = "INGREDIENT_OVERLAP";
            let title = "Active Ingredient Overlap Detected";
            let explanation = `Active ingredient overlap detected. These medicines contain overlapping active ingredient(s): ${sharedFormatted.join(", ")}.`;

            if (isExactSameSet) {
              if (setA.size === 1) {
                duplicateType = "SAME_ACTIVE_INGREDIENT";
                title = "Potential Duplicate Active Ingredient Detected";
                explanation = `Potential duplicate active ingredient detected. Both medications contain ${sharedFormatted[0]}.`;
              } else {
                duplicateType = "SAME_COMBINATION";
                title = "Potential Duplicate Combination Detected";
                explanation = `Potential duplicate combination detected. Both medications contain the identical combination of active ingredients: ${sharedFormatted.join(", ")}.`;
              }
            }

            const pairKey =
              medA.name.toLowerCase() < medB.name.toLowerCase()
                ? `${medA.name.toLowerCase()}:${medB.name.toLowerCase()}`
                : `${medB.name.toLowerCase()}:${medA.name.toLowerCase()}`;

            if (!seenPairKeys.has(pairKey)) {
              seenPairKeys.add(pairKey);
              duplicates.push({
                duplicateType,
                title,
                sharedIngredients: sharedFormatted,
                medicationA: {
                  name: medA.name,
                  brandName: medA.brandName || medA.name,
                  genericName: medA.genericName,
                  strength: medA.strength || "Unspecified",
                  dosageForm: medA.dosageForm || "Tablet",
                  sources: medA.sources || [],
                },
                medicationB: {
                  name: medB.name,
                  brandName: medB.brandName || medB.name,
                  genericName: medB.genericName,
                  strength: medB.strength || "Unspecified",
                  dosageForm: medB.dosageForm || "Tablet",
                  sources: medB.sources || [],
                },
                strengthComparison: `${medA.strength || "Unspecified"} vs ${medB.strength || "Unspecified"}`,
                dosageFormComparison: `${medA.dosageForm || "Tablet"} vs ${medB.dosageForm || "Tablet"}`,
                explanation,
              });
            }
          }
        }
      }

      // 4. Group results by shared normalized active ingredient
      const ingredientMap = new Map(); // ingCanonical -> array of distinct medication identities
      for (const med of medsWithSets) {
        for (const ing of med.canonicalSet) {
          if (!ingredientMap.has(ing)) {
            ingredientMap.set(ing, []);
          }
          ingredientMap.get(ing).push(med);
        }
      }

      const duplicateGroups = [];
      for (const [ingCanonical, medList] of ingredientMap.entries()) {
        // Require at least 2 distinct medication identities sharing this ingredient
        if (medList.length >= 2) {
          const displayIng = formatIngredientDisplay(ingCanonical);

          const allSingleIngredient = medList.every((m) => m.canonicalSet.size === 1);
          const firstSetArray = Array.from(medList[0].canonicalSet).sort().join("|");
          const allIdenticalCombination = medList.length >= 2 && medList.every((m) => Array.from(m.canonicalSet).sort().join("|") === firstSetArray);

          let groupType = "INGREDIENT_OVERLAP";
          let title = "Active Ingredient Overlap Detected";
          let explanation = `Active ingredient overlap detected. Found ${medList.length} medications sharing ${displayIng}.`;

          if (allSingleIngredient) {
            groupType = "SAME_ACTIVE_INGREDIENT";
            title = "Potential Duplicate Active Ingredient Detected";
            explanation = `Potential duplicate active ingredient detected. Found ${medList.length} medications containing ${displayIng}.`;
          } else if (allIdenticalCombination) {
            groupType = "SAME_COMBINATION";
            title = "Potential Duplicate Combination Detected";
            explanation = `Potential duplicate combination detected. Found ${medList.length} medications containing identical active ingredient formula.`;
          }

          duplicateGroups.push({
            activeIngredient: displayIng,
            title,
            duplicateType: groupType,
            count: medList.length,
            explanation,
            medicines: medList.map((m) => ({
              name: m.name,
              brandName: m.brandName || m.name,
              genericName: m.genericName,
              activeIngredients: m.displayIngredients,
              strength: m.strength || "Unspecified",
              dosageForm: m.dosageForm || "Tablet",
              sources: m.sources || [],
            })),
          });
        }
      }

      // Determine overall status
      let status = "NO_DUPLICATES_FOUND";
      if (duplicateGroups.length > 0) {
        status = "DUPLICATES_FOUND";
      } else if (unverifiedItems.length > 0) {
        status = "MEDICINE_NEEDS_REVIEW";
      }

      return {
        status,
        prescriptionsAnalyzedCount,
        failedPrescriptionsCount,
        totalExtractedMedsCount,
        checkedMedicationsCount: uniqueVerifiedMeds.length,
        analyzedPairsCount,
        duplicatesCount: duplicateGroups.length,
        duplicateGroupsCount: duplicateGroups.length,
        duplicateGroups,
        duplicates,
        unverifiedItems,
        disclaimer: "Potential duplicate active ingredient detected. Please review with a qualified healthcare professional. Do not alter or stop taking prescribed medications without medical advice.",
      };
    } catch (err) {
      console.error("[duplicateDrugEngine] Error during duplicate drug check:", err);
      return {
        status: "SERVICE_UNAVAILABLE",
        prescriptionsAnalyzedCount: 0,
        failedPrescriptionsCount: 0,
        totalExtractedMedsCount: 0,
        checkedMedicationsCount: 0,
        analyzedPairsCount: 0,
        duplicatesCount: 0,
        duplicateGroupsCount: 0,
        duplicateGroups: [],
        duplicates: [],
        unverifiedItems: [],
        disclaimer: "Duplicate drug detection is temporarily unavailable. Please consult a healthcare professional.",
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
}

module.exports = new DuplicateDrugEngine();
