/**
 * RxNorm & RxCUI Standardization Layer.
 * Queries NIH RxNorm REST API (or fallback dictionary) to resolve
 * standardized RxCUI codes, concept names, and active ingredients.
 */

const RXNORM_FALLBACK_MAP = {
  metformin: { rxcui: "860975", rxNormName: "Metformin", genericName: "Metformin" },
  amoxicillin: { rxcui: "308191", rxNormName: "Amoxicillin", genericName: "Amoxicillin" },
  paracetamol: { rxcui: "161", rxNormName: "Acetaminophen / Paracetamol", genericName: "Paracetamol" },
  pantoprazole: { rxcui: "284204", rxNormName: "Pantoprazole", genericName: "Pantoprazole" },
  cefixime: { rxcui: "104052", rxNormName: "Cefixime", genericName: "Cefixime" },
  azithromycin: { rxcui: "18631", rxNormName: "Azithromycin", genericName: "Azithromycin" },
  amlodipine: { rxcui: "17767", rxNormName: "Amlodipine", genericName: "Amlodipine" },
  atorvastatin: { rxcui: "83367", rxNormName: "Atorvastatin", genericName: "Atorvastatin" },
  cetirizine: { rxcui: "20610", rxNormName: "Cetirizine", genericName: "Cetirizine" },
  telmisartan: { rxcui: "214199", rxNormName: "Telmisartan", genericName: "Telmisartan" },
};

async function lookupRxNorm(term) {
  if (!term || typeof term !== "string") return null;
  const cleanTerm = term.trim().toLowerCase();

  // Fast local lookup
  if (RXNORM_FALLBACK_MAP[cleanTerm]) {
    return RXNORM_FALLBACK_MAP[cleanTerm];
  }

  // Live NIH RxNorm API lookup
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(cleanTerm)}&maxEntries=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      const candidate = data?.approximateGroup?.candidate?.[0];
      if (candidate && candidate.rxcui) {
        return {
          rxcui: candidate.rxcui,
          rxNormName: candidate.name || term,
          genericName: candidate.name || term,
        };
      }
    }
  } catch (err) {
    console.warn(`[rxNormService] RxNorm REST lookup timeout/fallback for "${term}":`, err.message);
  }

  return null;
}

module.exports = { lookupRxNorm };
