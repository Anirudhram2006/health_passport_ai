const Medicine = require("../../models/Medicine");
const { lookupRxNorm } = require("./rxNormService");

/**
 * Calculates Levenshtein similarity score between 0.0 and 1.0
 */
function levenshteinSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return parseFloat((1.0 - distance / maxLen).toFixed(2));
}

/**
 * Cleans OCR query and extracts strength numbers & prefixes
 */
function cleanOcrQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") {
    return { cleanedQuery: "", extractedStrength: "", normalizedQuery: "" };
  }

  let text = rawQuery.trim();

  // Strip common prescription prefixes
  text = text.replace(/^(tab\.?|cap\.?|inj\.?|syrup\.?|syp\.?|t\.?|c\.?|dr\.?)\s+/i, "");

  // Extract strength numbers (e.g. 200, 10mg, 500/125)
  const strengthMatch = text.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|%)?)/i);
  let extractedStrength = "";
  if (strengthMatch) {
    extractedStrength = strengthMatch[1].trim();
  }

  // Clean brand term by removing trailing punctuation & numbers if appropriate
  let cleanedQuery = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
  const normalizedQuery = cleanedQuery.replace(/[^a-z0-9]/g, "");

  // Query without numbers for pure brand matching (e.g. "cefix 200" -> "cefix")
  const brandOnlyQuery = cleanedQuery.replace(/\d+\s*(mg|g|mcg|ml)?/gi, "").replace(/[^a-z0-9]/g, "").trim();

  return {
    rawQuery,
    cleanedQuery,
    normalizedQuery,
    brandOnlyQuery,
    extractedStrength,
  };
}

/**
 * Multi-layered fuzzy medicine matcher against MongoDB Medicine database & RxNorm
 */
class MedicineMatcher {
  /**
   * Finds and ranks candidate matches for a raw text string
   */
  async matchCandidates(rawQuery, contextStrength = null) {
    if (!rawQuery || typeof rawQuery !== "string") return [];

    const { cleanedQuery, normalizedQuery, brandOnlyQuery, extractedStrength } = cleanOcrQuery(rawQuery);
    if (normalizedQuery.length < 2 && brandOnlyQuery.length < 2) return [];

    const targetStrength = contextStrength || extractedStrength;

    // Query database medicines
    const allMedicines = await Medicine.find({}).lean();
    const scoredCandidates = [];

    for (const med of allMedicines) {
      let maxSimilarity = 0;
      let matchType = "fuzzy";

      const brandNorm = med.normalizedBrandName || med.brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const genericNorm = med.normalizedGenericName || med.genericName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const brandWordsNorm = med.brandName.toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1. Exact Brand match (with or without numbers)
      if (brandNorm === normalizedQuery || brandNorm === brandOnlyQuery || brandWordsNorm === normalizedQuery) {
        maxSimilarity = 0.98;
        matchType = "exact_brand";
      } else if (brandNorm.startsWith(normalizedQuery) || normalizedQuery.startsWith(brandNorm) || (brandOnlyQuery && brandNorm.startsWith(brandOnlyQuery))) {
        maxSimilarity = 0.88;
        matchType = "brand_prefix";
      }

      // 2. Known Alias match
      if (Array.isArray(med.aliases)) {
        for (const alias of med.aliases) {
          const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (aliasNorm === normalizedQuery || aliasNorm === brandOnlyQuery || normalizedQuery.includes(aliasNorm)) {
            maxSimilarity = Math.max(maxSimilarity, 0.96);
            matchType = "alias_exact";
          } else if (aliasNorm.startsWith(normalizedQuery) || (brandOnlyQuery && aliasNorm.startsWith(brandOnlyQuery))) {
            maxSimilarity = Math.max(maxSimilarity, 0.85);
            matchType = "alias_prefix";
          }
        }
      }

      // 3. Generic & Composition match
      if (genericNorm === normalizedQuery || genericNorm === brandOnlyQuery || genericNorm.includes(brandOnlyQuery)) {
        maxSimilarity = Math.max(maxSimilarity, 0.88);
        matchType = "generic_match";
      }

      // 4. Levenshtein Fuzzy match (controlled fuzzy matching)
      const levBrandFull = levenshteinSimilarity(normalizedQuery, brandNorm);
      const levBrandOnly = brandOnlyQuery ? levenshteinSimilarity(brandOnlyQuery, brandNorm) : 0;
      const levGeneric = levenshteinSimilarity(normalizedQuery, genericNorm);
      const bestLev = Math.max(levBrandFull, levBrandOnly, levGeneric);

      if (bestLev >= 0.65 && bestLev > maxSimilarity) {
        maxSimilarity = bestLev;
        matchType = "levenshtein_fuzzy";
      }

      // 5. Strength Match Bonus
      let strengthBonus = 0;
      if (targetStrength && med.strength && maxSimilarity > 0) {
        const cleanTarget = targetStrength.replace(/[^0-9]/g, "");
        const cleanMedStrength = med.strength.replace(/[^0-9]/g, "");
        if (cleanTarget && cleanMedStrength && cleanMedStrength.includes(cleanTarget)) {
          strengthBonus = 0.08;
          if (matchType === "exact_brand" || matchType === "alias_exact") {
            matchType = "brand_strength_exact";
          }
        }
      }

      const finalConfidence = Math.min(0.99, parseFloat((maxSimilarity + strengthBonus).toFixed(2)));

      if (finalConfidence >= 0.50) {
        scoredCandidates.push({
          name: `${med.brandName} (${med.strength || med.dosageForm || ""})`.trim(),
          brandName: med.brandName,
          genericName: med.genericName,
          activeIngredients: med.activeIngredients || [],
          strength: med.strength || targetStrength || "",
          dosageForm: med.dosageForm,
          manufacturer: med.manufacturer,
          rxNormCui: med.rxNormCui || "",
          source: med.source || "CDSCO Catalogue",
          confidence: finalConfidence,
          matchType,
        });
      }
    }

    // Sort candidates by confidence descending
    scoredCandidates.sort((a, b) => b.confidence - a.confidence);

    // Deduplicate duplicate entries resolving to the same brand + generic
    const uniqueCandidates = [];
    const seenCandidateKeys = new Set();
    for (const cand of scoredCandidates) {
      const key = `${cand.brandName.toLowerCase()}:${cand.genericName.toLowerCase()}`;
      if (!seenCandidateKeys.has(key)) {
        seenCandidateKeys.add(key);
        uniqueCandidates.push(cand);
      }
    }

    const topCandidates = uniqueCandidates.slice(0, 5);

    // Attempt online RxNorm lookup if top candidate is missing RxCUI
    if (topCandidates.length > 0 && !topCandidates[0].rxNormCui) {
      const rxResult = await lookupRxNorm(topCandidates[0].genericName || topCandidates[0].brandName);
      if (rxResult && rxResult.rxcui) {
        topCandidates[0].rxNormCui = rxResult.rxcui;
      }
    }

    return topCandidates;
  }
}

module.exports = new MedicineMatcher();
