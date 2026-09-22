const DrugConditionInteraction = require("../../models/DrugConditionInteraction");

// In-memory LRU cache for drug-condition pairs
const pairCache = new Map();
const MAX_CACHE_SIZE = 500;

function makeKey(drugName, conditionName) {
  const d = (drugName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const c = (conditionName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${d}:${c}`;
}

class DrugConditionProvider {
  /**
   * Queries clinical database for drug-condition interaction
   */
  async findInteraction(drug, condition) {
    if (!drug || !condition) return null;

    const drugQueryName = typeof drug === "string" ? drug : (drug.genericName || drug.name || "");
    const conditionQueryName = typeof condition === "string" ? condition : (condition.name || "");

    const pairKey = makeKey(drugQueryName, conditionQueryName);

    // 1. LRU Cache Check
    if (pairCache.has(pairKey)) {
      return pairCache.get(pairKey);
    }

    // 2. Query MongoDB Local Verified Drug-Condition Interaction Database
    let dbMatch = null;
    try {
      dbMatch = await DrugConditionInteraction.findOne({ pairKey }).lean();
      if (!dbMatch) {
        // Fallback regex search for drugName + conditionName
        const dReg = new RegExp(drugQueryName.replace(/[^a-zA-Z0-9]/g, ""), "i");
        const cReg = new RegExp(conditionQueryName.replace(/[^a-zA-Z0-9]/g, ""), "i");
        dbMatch = await DrugConditionInteraction.findOne({
          drugName: dReg,
          conditionName: cReg,
        }).lean();
      }
    } catch (e) {
      console.warn("[drugConditionProvider] MongoDB lookup error:", e.message);
    }

    if (dbMatch) {
      const result = {
        drug: {
          id: drug.rxCui || drug.name || drugQueryName,
          name: drug.name || drugQueryName,
          genericName: drug.genericName || dbMatch.drugName,
          rxCui: drug.rxCui || dbMatch.drugRxCui || "",
          sources: drug.sources || [],
        },
        condition: {
          id: condition.code || condition.name || conditionQueryName,
          name: condition.name || conditionQueryName,
          code: condition.code || "",
        },
        interactionFound: true,
        severity: dbMatch.severity || "Moderate",
        description: dbMatch.description,
        potentialClinicalEffect: dbMatch.clinicalEffect || "Potential risk of drug-disease exacerbation.",
        management: dbMatch.management || "Consult a physician to evaluate medication appropriateness.",
        source: dbMatch.source || "CDSCO / FDA Clinical Knowledge Base",
        sourceRuleId: dbMatch.sourceRuleId || "RULE-DC-01",
        confidence: "high",
        requiresReview: true,
      };

      if (pairCache.size >= MAX_CACHE_SIZE) {
        const first = pairCache.keys().next().value;
        pairCache.delete(first);
      }
      pairCache.set(pairKey, result);

      return result;
    }

    return null;
  }

  /**
   * Helper function to check drug-condition contraindications across arrays
   */
  async checkDrugConditionContraindications(medNames = [], chronicDiseases = []) {
    if (!Array.isArray(medNames) || !Array.isArray(chronicDiseases) || medNames.length === 0 || chronicDiseases.length === 0) {
      return [];
    }
    const results = [];
    for (const m of medNames) {
      const medObj = typeof m === "string" ? { name: m } : m;
      for (const c of chronicDiseases) {
        const condObj = typeof c === "string" ? { name: c } : c;
        const match = await this.findInteraction(medObj, condObj);
        if (match && match.interactionFound) {
          results.push(match);
        }
      }
    }
    return results;
  }
}

const providerInstance = new DrugConditionProvider();
providerInstance.checkDrugConditionContraindications = providerInstance.checkDrugConditionContraindications.bind(providerInstance);

module.exports = providerInstance;
module.exports.checkDrugConditionContraindications = providerInstance.checkDrugConditionContraindications;
