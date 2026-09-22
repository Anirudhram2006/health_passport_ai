const KNOWN_CONDITIONS = [
  {
    name: "Type 2 Diabetes",
    code: "T2DM",
    aliases: ["t2dm", "type 2 diabetes", "type ii diabetes", "diabetes mellitus", "diabetes", "type 2 dm", "dm2"],
  },
  {
    name: "Hypertension",
    code: "HTN",
    aliases: ["htn", "hypertension", "high bp", "high blood pressure", "essential hypertension", "bp"],
  },
  {
    name: "Chronic Kidney Disease",
    code: "CKD",
    aliases: ["ckd", "chronic kidney disease", "renal failure", "kidney failure", "renal impairment", "chronic renal disease"],
  },
  {
    name: "Peptic Ulcer Disease",
    code: "PUD",
    aliases: ["pud", "peptic ulcer disease", "peptic ulcer", "gastric ulcer", "stomach ulcer", "duodenal ulcer"],
  },
  {
    name: "Asthma",
    code: "ASTHMA",
    aliases: ["asthma", "bronchial asthma", "reactive airway disease"],
  },
  {
    name: "Hyperkalemia",
    code: "HYPERKAL",
    aliases: ["hyperkalemia", "high potassium", "elevated potassium"],
  },
];

class ConditionNormalizer {
  /**
   * Normalizes raw condition text into standardized clinical condition or flags for review
   */
  normalizeCondition(rawInput) {
    if (!rawInput) return null;

    const rawStr = typeof rawInput === "string" ? rawInput.trim() : rawInput.name || rawInput.title || "";
    if (!rawStr) return null;

    // Check if rawInput is explicitly flagged as unverified/needs review
    if (typeof rawInput === "object" && (rawInput.needsReview || rawInput.status === "needs_review" || rawStr.includes("?"))) {
      return {
        name: rawStr,
        rawName: rawStr,
        status: "CONDITION_NEEDS_REVIEW",
        reason: "Condition text is unverified or marked for review.",
      };
    }

    const cleanNorm = rawStr.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const cond of KNOWN_CONDITIONS) {
      const nameNorm = cond.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (nameNorm === cleanNorm) {
        return {
          name: cond.name,
          rawName: rawStr,
          code: cond.code,
          status: "CONFIRMED",
        };
      }

      for (const alias of cond.aliases) {
        const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (aliasNorm === cleanNorm || cleanNorm.includes(aliasNorm) || aliasNorm.includes(cleanNorm)) {
          return {
            name: cond.name,
            rawName: rawStr,
            code: cond.code,
            status: "CONFIRMED",
          };
        }
      }
    }

    // If condition cannot be confidently matched to standardized taxonomy:
    // If text is clean and > 3 chars, treat as confirmed custom condition name
    if (cleanNorm.length >= 4 && !rawStr.includes("?") && !rawStr.toLowerCase().includes("possible") && !rawStr.toLowerCase().includes("issue")) {
      return {
        name: rawStr,
        rawName: rawStr,
        code: cleanNorm.toUpperCase(),
        status: "CONFIRMED",
      };
    }

    return {
      name: rawStr,
      rawName: rawStr,
      status: "CONDITION_NEEDS_REVIEW",
      reason: "Condition identity could not be safely established.",
    };
  }
}

module.exports = new ConditionNormalizer();
