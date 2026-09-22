const DrugInteraction = require("../../models/DrugInteraction");

// In-memory pair LRU cache (caches interaction knowledge, NOT sensitive patient records)
const pairCache = new Map();
const MAX_CACHE_SIZE = 500;

function getCache(pairKey) {
  return pairCache.get(pairKey) || null;
}

function setCache(pairKey, value) {
  if (pairCache.size >= MAX_CACHE_SIZE) {
    const firstKey = pairCache.keys().next().value;
    pairCache.delete(firstKey);
  }
  pairCache.set(pairKey, value);
}

function makePairKey(rxCuiA, rxCuiB, nameA, nameB) {
  const kA = rxCuiA || (nameA ? nameA.toLowerCase().replace(/[^a-z0-9]/g, "") : "");
  const kB = rxCuiB || (nameB ? nameB.toLowerCase().replace(/[^a-z0-9]/g, "") : "");
  return kA < kB ? `${kA}:${kB}` : `${kB}:${kA}`;
}

class InteractionProvider {
  /**
   * Queries authoritative sources for interaction between two drugs
   */
  async findInteraction(drugA, drugB) {
    const pairKey = makePairKey(drugA.rxCui, drugB.rxCui, drugA.name, drugB.name);

    // 1. Check LRU Cache
    const cached = getCache(pairKey);
    if (cached) {
      return cached;
    }

    // 2. Query MongoDB Local Verified Interaction Database
    let dbMatch = null;
    try {
      dbMatch = await DrugInteraction.findOne({ pairKey }).lean();
      if (!dbMatch && (drugA.rxCui || drugB.rxCui)) {
        dbMatch = await DrugInteraction.findOne({
          $or: [
            { drugA_rxcui: drugA.rxCui, drugB_rxcui: drugB.rxCui },
            { drugA_rxcui: drugB.rxCui, drugB_rxcui: drugA.rxCui },
          ],
        }).lean();
      }
    } catch (e) {
      console.warn("[interactionProvider] MongoDB lookup warning:", e.message);
    }

    if (dbMatch) {
      const result = {
        drugA: { name: drugA.name, genericName: drugA.genericName || dbMatch.drugA_name, rxCui: drugA.rxCui || dbMatch.drugA_rxcui || "" },
        drugB: { name: drugB.name, genericName: drugB.genericName || dbMatch.drugB_name, rxCui: drugB.rxCui || dbMatch.drugB_rxcui || "" },
        interactionFound: true,
        severity: dbMatch.severity || "moderate",
        description: dbMatch.description,
        clinicalEffect: dbMatch.clinicalEffect || "Potential risk of adverse interaction.",
        management: dbMatch.management || "Consult a healthcare professional for clinical monitoring.",
        source: dbMatch.source || "NIH RxNav Drug Interaction Database",
        sourceRuleId: dbMatch.sourceRuleId || "LOCAL-RULE",
        confidence: "high",
        requiresReview: true,
      };

      setCache(pairKey, result);
      return result;
    }

    // 3. Query NIH RxNav Interaction REST API if RxCUIs exist
    if (drugA.rxCui && drugB.rxCui) {
      try {
        const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(drugA.rxCui + "+" + drugB.rxCui)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          const fullTypeArr = data?.fullInteractionTypeGroup?.[0]?.fullInteractionType;
          if (Array.isArray(fullTypeArr) && fullTypeArr.length > 0) {
            const item = fullTypeArr[0];
            const pairInfo = item.interactionPair?.[0];

            const severityRaw = item.comment || pairInfo?.severity || "moderate";
            const severity = ["major", "severe", "contraindicated"].some((s) => severityRaw.toLowerCase().includes(s))
              ? "major"
              : "moderate";

            const result = {
              drugA: { name: drugA.name, genericName: drugA.genericName || item.minConcept?.[0]?.name || "", rxCui: drugA.rxCui },
              drugB: { name: drugB.name, genericName: drugB.genericName || item.minConcept?.[1]?.name || "", rxCui: drugB.rxCui },
              interactionFound: true,
              severity,
              description: pairInfo?.description || "Potential interaction documented in RxNav database.",
              clinicalEffect: "Clinical effect documented in NIH RxNav database.",
              management: "Please consult a physician or pharmacist to review this combination.",
              source: "NIH RxNav Drug Interaction API",
              sourceRuleId: `RXNAV-${drugA.rxCui}-${drugB.rxCui}`,
              confidence: "high",
              requiresReview: true,
            };

            setCache(pairKey, result);
            return result;
          }
        }
      } catch (apiErr) {
        console.warn(`[interactionProvider] NIH RxNav API timeout/error for ${drugA.rxCui}+${drugB.rxCui}:`, apiErr.message);
      }
    }

    // 4. No Interaction Found in database/API
    const noInteractionResult = {
      drugA: { name: drugA.name, genericName: drugA.genericName || "", rxCui: drugA.rxCui || "" },
      drugB: { name: drugB.name, genericName: drugB.genericName || "", rxCui: drugB.rxCui || "" },
      interactionFound: false,
      severity: "none",
      description: "No known interaction found in the configured interaction database.",
      source: "Configured Clinical Interaction Database",
      requiresReview: false,
    };

    setCache(pairKey, noInteractionResult);
    return noInteractionResult;
  }
}

module.exports = new InteractionProvider();
