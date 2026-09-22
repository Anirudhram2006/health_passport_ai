const drugConditionProvider = require("./drugConditionProvider");
const interactionEngine = require("./interactionEngine");
const conditionNormalizer = require("./conditionNormalizer");

class DrugConditionEngine {
  /**
   * Main Entrypoint for Drug–Condition Interaction Checking
   */
  async checkDrugConditionInteractions(patientMeds = [], patientConditions = []) {
    try {
      const confirmedMeds = [];
      const unverifiedMedicines = [];

      const confirmedConditions = [];
      const unverifiedConditions = [];

      // 1. Normalize Patient Medications (Reuse Module 2/5 normalization)
      for (const rawMed of patientMeds) {
        const normMed = await interactionEngine.normalizeMedication(rawMed);
        if (normMed) {
          if (normMed.status === "VERIFIED") {
            // Deduplicate medicines by generic name / RxCUI
            const existing = confirmedMeds.find(
              (m) =>
                (normMed.rxCui && m.rxCui === normMed.rxCui) ||
                m.genericName.toLowerCase() === normMed.genericName.toLowerCase()
            );
            if (!existing) {
              confirmedMeds.push(normMed);
            } else if (normMed.sources) {
              for (const s of normMed.sources) {
                if (!existing.sources.some((ex) => ex.fileName === s.fileName)) {
                  existing.sources.push(s);
                }
              }
            }
          } else {
            unverifiedMedicines.push(normMed);
          }
        }
      }

      // 2. Normalize Patient Conditions
      for (const rawCond of patientConditions) {
        const normCond = conditionNormalizer.normalizeCondition(rawCond);
        if (normCond) {
          if (normCond.status === "CONFIRMED") {
            const existing = confirmedConditions.find(
              (c) => c.name.toLowerCase() === normCond.name.toLowerCase()
            );
            if (!existing) {
              confirmedConditions.push(normCond);
            }
          } else {
            unverifiedConditions.push(normCond);
          }
        }
      }

      // 3. Evaluate All Unique Confirmed Pairs (M medicines * C conditions)
      const interactionResults = [];
      let analyzedPairsCount = 0;

      for (const drug of confirmedMeds) {
        for (const condition of confirmedConditions) {
          analyzedPairsCount++;
          const result = await drugConditionProvider.findInteraction(drug, condition);
          if (result && result.interactionFound) {
            interactionResults.push(result);
          }
        }
      }

      // 4. Determine overall status
      let status = "NO_INTERACTION_FOUND";
      if (interactionResults.length > 0) {
        status = "INTERACTION_FOUND";
      } else if (unverifiedMedicines.length > 0) {
        status = "MEDICINE_NEEDS_REVIEW";
      } else if (unverifiedConditions.length > 0) {
        status = "CONDITION_NEEDS_REVIEW";
      }

      return {
        status,
        confirmedMedicationsCount: confirmedMeds.length,
        confirmedConditionsCount: confirmedConditions.length,
        analyzedPairsCount,
        interactions: interactionResults,
        confirmedMedications: confirmedMeds,
        confirmedConditions,
        unverifiedMedicines,
        unverifiedConditions,
        disclaimer: "Potential drug-condition interaction detected. Please consult a qualified healthcare professional. No automated medication or dosage changes have been made.",
      };
    } catch (err) {
      console.error("[drugConditionEngine] Error evaluating drug-condition interactions:", err);
      return {
        status: "SERVICE_UNAVAILABLE",
        confirmedMedicationsCount: 0,
        confirmedConditionsCount: 0,
        analyzedPairsCount: 0,
        interactions: [],
        confirmedMedications: [],
        confirmedConditions: [],
        unverifiedMedicines: [],
        unverifiedConditions: [],
        disclaimer: "Drug-condition interaction analysis is temporarily unavailable. Please consult a healthcare professional independently.",
      };
    }
  }
}

module.exports = new DrugConditionEngine();
