/**
 * Emergency Dynamic Triage Standard Engine (Module 10)
 * Evaluates patient emergency profile and assigns clinical triage urgency.
 */

function calculateTriageStatus(patient, activeInteractions = []) {
  const reasons = [];
  const recommendations = [];
  let score = 0; // Higher = higher urgency

  if (!patient) {
    return {
      level: "GREEN",
      badgeLabel: "STANDARD CARE",
      priorityScore: 0,
      reasons: ["No prior medical risk factors detected"],
      recommendations: ["Standard clinical evaluation"],
    };
  }

  // 1. Evaluate Allergies
  const allergies = patient.allergies || [];
  const severeAllergies = allergies.filter(
    (a) =>
      a.severity === "Severe" ||
      (a.reaction && /anaphylax|airway|shock|angioedema/i.test(a.reaction))
  );
  if (severeAllergies.length > 0) {
    score += 40;
    const names = severeAllergies.map((a) => a.substance).join(", ");
    reasons.push(`CRITICAL ALLERGY ALERT: Severe reaction risk for ${names}`);
    recommendations.push(`AVOID administering ${names} or related drug classes immediately.`);
  } else if (allergies.length > 0) {
    score += 15;
    reasons.push(`Known allergies recorded (${allergies.length})`);
  }

  // 2. Evaluate Chronic Diseases & High Risk Conditions
  const chronic = patient.chronicDiseases || [];
  const criticalChronic = chronic.filter((c) =>
    /heart failure|ckd|kidney failure|stroke|epilepsy|copd|cardiopulmonary|infarction|coronary/i.test(
      c
    )
  );
  if (criticalChronic.length > 0) {
    score += 30;
    reasons.push(`Critical chronic conditions: ${criticalChronic.join(", ")}`);
    recommendations.push("Monitor vitals & cardiac output closely.");
  } else if (chronic.length > 0) {
    score += 15;
    reasons.push(`Chronic conditions present: ${chronic.join(", ")}`);
  }

  // 3. Evaluate Active Medications & Polypharmacy
  const activeMeds = (patient.medications || []).filter((m) => m.active !== false);
  if (activeMeds.length >= 6) {
    score += 25;
    reasons.push(`High Polypharmacy Risk: ${activeMeds.length} active medications`);
    recommendations.push("Verify drug-drug interaction risk before administering new meds.");
  } else if (activeMeds.length >= 3) {
    score += 10;
    reasons.push(`Active medications: ${activeMeds.length}`);
  }

  // 4. Evaluate Active Drug Interactions
  const highSeverityInteractions = activeInteractions.filter(
    (i) => i.severity === "High" || i.severity === "Major" || i.severity === "Contraindicated"
  );
  if (highSeverityInteractions.length > 0) {
    score += 35;
    reasons.push(`Active Severe Drug Interactions detected (${highSeverityInteractions.length})`);
    recommendations.push("Review current medication list for active contraindications.");
  }

  // 5. Blood Group Alert
  if (!patient.bloodGroup || patient.bloodGroup === "Unspecified") {
    reasons.push("Blood group unspecified — blood typing required prior to transfusion");
  }

  // Assign Triage Level
  let level = "GREEN";
  let badgeLabel = "STANDARD CARE";

  if (score >= 40 || severeAllergies.length > 0 || criticalChronic.length > 0) {
    level = "RED";
    badgeLabel = "IMMEDIATE / CRITICAL";
  } else if (score >= 20 || chronic.length > 0 || activeMeds.length >= 4) {
    level = "YELLOW";
    badgeLabel = "URGENT EVALUATION";
  }

  return {
    level,
    badgeLabel,
    priorityScore: score,
    reasons,
    recommendations: recommendations.length > 0 ? recommendations : ["Standard clinical care"],
  };
}

module.exports = { calculateTriageStatus };
