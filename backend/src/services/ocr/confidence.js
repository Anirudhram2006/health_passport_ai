/**
 * Signal-based Candidate Ranking & Confidence Score Calculator
 */

function calculateCandidateScore(candidate, rawOcr, context = {}) {
  const ocrSim = candidate.confidence || 0.5;
  const brandMatch =
    candidate.matchType === "exact_brand" || candidate.matchType === "brand_strength_exact"
      ? 1.0
      : candidate.matchType === "alias_exact"
      ? 0.96
      : candidate.matchType?.includes("prefix")
      ? 0.88
      : 0.75;

  let strengthMatch = 0.5;
  if (context.strength && candidate.strength) {
    const cleanContext = context.strength.replace(/[^0-9]/g, "");
    const cleanCand = candidate.strength.replace(/[^0-9]/g, "");
    if (cleanContext && cleanCand && cleanCand.includes(cleanContext)) {
      strengthMatch = 1.0;
    } else {
      strengthMatch = 0.4;
    }
  }

  let dosageMatch = 0.5;
  if (context.dosageForm && candidate.dosageForm) {
    dosageMatch = candidate.dosageForm.toLowerCase() === context.dosageForm.toLowerCase() ? 1.0 : 0.5;
  }

  // Weighted signal calculation
  const compositeScore = ocrSim * 0.50 + brandMatch * 0.30 + strengthMatch * 0.12 + dosageMatch * 0.08;
  const roundedConfidence = parseFloat(compositeScore.toFixed(2));

  return {
    ...candidate,
    confidence: roundedConfidence,
    confidenceLabel: "Extraction/Matching Confidence",
  };
}

/**
 * Ranks candidates and sets item status
 * Assigns 'verified' automatically for strong brand/alias/strength matches
 * Reserves 'needs_review' as a last resort
 */
function rankCandidates(candidates, rawText) {
  if (!candidates || !candidates.length) {
    return {
      status: "unresolved",
      topCandidate: null,
      confidence: 0,
      candidates: [],
    };
  }

  const ranked = candidates
    .map((c) => calculateCandidateScore(c, rawText))
    .sort((a, b) => b.confidence - a.confidence);

  const top = ranked[0];
  const secondConf = ranked[1] ? ranked[1].confidence : 0;

  // Exact brand, brand+strength, or alias exact matches are automatically verified
  const isHighTrustMatch =
    top.matchType === "exact_brand" ||
    top.matchType === "brand_strength_exact" ||
    top.matchType === "alias_exact" ||
    (top.confidence >= 0.80 && top.confidence - secondConf >= 0.08);

  const status = top.confidence < 0.35 ? "unresolved" : isHighTrustMatch ? "verified" : "needs_review";

  return {
    status,
    topCandidate: top,
    confidence: top.confidence,
    candidates: ranked,
  };
}

module.exports = { calculateCandidateScore, rankCandidates };
