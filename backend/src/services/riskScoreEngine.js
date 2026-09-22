/**
 * Analytics, Risk Stratification & Health Score Engine (Module 13)
 * Calculates dynamic Health Score (0-100), Risk Tier, and clinical safety recommendations.
 */

function calculateHealthRiskScore(patient, drugInteractions = [], conditionInteractions = []) {
  let score = 100;
  const penalties = [];
  const recommendations = [];

  if (!patient) {
    return {
      score: 80,
      tier: "LOW",
      label: "Low Risk",
      penalties: [],
      recommendations: ["Complete patient profile for accurate risk calculation."],
    };
  }

  // 1. Evaluate Drug-Drug Interactions
  const majorDrugInteractions = drugInteractions.filter(
    (i) => i.severity === "Major" || i.severity === "High" || i.severity === "Severe"
  );
  const moderateDrugInteractions = drugInteractions.filter((i) => i.severity === "Moderate");

  if (majorDrugInteractions.length > 0) {
    const penalty = majorDrugInteractions.length * 15;
    score -= penalty;
    penalties.push({
      category: "Drug-Drug Interaction",
      impact: `-${penalty}`,
      reason: `${majorDrugInteractions.length} Major drug-drug interaction(s) detected`,
    });
    recommendations.push(
      `Consult physician to substitute or adjust dosing for major interacting pairs: ${majorDrugInteractions
        .map((i) => `${i.drugA} + ${i.drugB}`)
        .join(", ")}`
    );
  }

  if (moderateDrugInteractions.length > 0) {
    const penalty = moderateDrugInteractions.length * 8;
    score -= penalty;
    penalties.push({
      category: "Drug-Drug Interaction",
      impact: `-${penalty}`,
      reason: `${moderateDrugInteractions.length} Moderate drug-drug interaction(s) detected`,
    });
  }

  // 2. Evaluate Drug-Condition Contraindications
  const severeConditionInteractions = conditionInteractions.filter(
    (c) => c.severity === "Severe" || c.type === "Contraindicated"
  );
  const warningConditionInteractions = conditionInteractions.filter(
    (c) => c.severity === "Warning" || c.severity === "Moderate"
  );

  if (severeConditionInteractions.length > 0) {
    const penalty = severeConditionInteractions.length * 15;
    score -= penalty;
    penalties.push({
      category: "Drug-Condition Contraindication",
      impact: `-${penalty}`,
      reason: `${severeConditionInteractions.length} Severe drug-condition contraindication(s)`,
    });
    recommendations.push(
      `Review contraindicated medications against chronic conditions: ${severeConditionInteractions
        .map((c) => `${c.drug} contraindicated in ${c.condition}`)
        .join(", ")}`
    );
  }

  if (warningConditionInteractions.length > 0) {
    const penalty = warningConditionInteractions.length * 8;
    score -= penalty;
    penalties.push({
      category: "Drug-Condition Warning",
      impact: `-${penalty}`,
      reason: `${warningConditionInteractions.length} Drug-condition warning(s)`,
    });
  }

  // 3. Polypharmacy Penalty
  const activeMeds = (patient.medications || []).filter((m) => m.active !== false);
  if (activeMeds.length > 8) {
    score -= 20;
    penalties.push({ category: "Polypharmacy", impact: "-20", reason: "Severe polypharmacy (>8 active medications)" });
    recommendations.push("High pill burden detected. Conduct medication reconciliation to prune redundant prescriptions.");
  } else if (activeMeds.length > 5) {
    score -= 10;
    penalties.push({ category: "Polypharmacy", impact: "-10", reason: "Moderate polypharmacy (>5 active medications)" });
    recommendations.push("Schedule periodic medication reviews to check for unnecessary duplicate therapy.");
  }

  // 4. Allergy Risk
  const severeAllergies = (patient.allergies || []).filter((a) => a.severity === "Severe");
  if (severeAllergies.length > 0) {
    const penalty = severeAllergies.length * 5;
    score -= penalty;
    penalties.push({
      category: "Allergy Exposure",
      impact: `-${penalty}`,
      reason: `${severeAllergies.length} Severe allergy reaction risk recorded`,
    });
    recommendations.push(`Ensure MedicAlert bracelet or digital QR passport is updated for severe allergies (${severeAllergies.map(a => a.substance).join(", ")}).`);
  }

  // 5. Chronic Disease Risk
  const chronicCount = (patient.chronicDiseases || []).length;
  if (chronicCount > 0) {
    const penalty = Math.min(chronicCount * 5, 20);
    score -= penalty;
    penalties.push({
      category: "Chronic Disease Burden",
      impact: `-${penalty}`,
      reason: `${chronicCount} chronic condition(s) under management`,
    });
  }

  // Clamp score between 10 and 100
  score = Math.max(10, Math.min(100, Math.round(score)));

  // Risk Stratification Tiers
  let tier = "LOW";
  let label = "Low Risk";
  let color = "emerald";

  if (score < 40) {
    tier = "CRITICAL";
    label = "Critical Risk";
    color = "rose";
  } else if (score < 60) {
    tier = "HIGH";
    label = "High Risk";
    color = "orange";
  } else if (score < 80) {
    tier = "MODERATE";
    label = "Moderate Risk";
    color = "amber";
  }

  if (recommendations.length === 0) {
    recommendations.push("Maintain current healthy regimen and regular check-ups.");
  }

  return {
    score,
    tier,
    label,
    color,
    penalties,
    recommendations,
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = { calculateHealthRiskScore };
