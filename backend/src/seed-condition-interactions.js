require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const DrugConditionInteraction = require("./models/DrugConditionInteraction");

function makeKey(d, c) {
  const cleanD = (d || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanC = (c || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${cleanD}:${cleanC}`;
}

const VERIFIED_CONDITION_INTERACTION_DATA = [
  {
    drugName: "Ibuprofen",
    drugRxCui: "5640",
    conditionName: "Chronic Kidney Disease",
    conditionCode: "CKD",
    severity: "High",
    description: "Inhibition of renal vasodilatory prostaglandins by Ibuprofen decreases renal blood flow, causing acute deterioration of renal function in patients with chronic kidney disease.",
    clinicalEffect: "Decreased glomerular filtration rate (GFR), sodium and water retention, acceleration of renal decline.",
    management: "Avoid NSAIDs in patients with Stage 3-5 CKD or acute renal impairment. Use acetaminophen or non-nephrotoxic analgesics under physician supervision.",
    source: "CDSCO / FDA Clinical Guidelines & KDOQI Guidelines",
    sourceRuleId: "RULE-IBU-CKD-01",
    verified: true,
  },
  {
    drugName: "Metformin",
    drugRxCui: "6809",
    conditionName: "Chronic Kidney Disease",
    conditionCode: "CKD",
    severity: "High",
    description: "Impaired renal elimination of Metformin in severe chronic kidney disease significantly increases systemic drug accumulation and risk of fatal lactic acidosis.",
    clinicalEffect: "Risk of Metformin-associated lactic acidosis (MALA).",
    management: "Contraindicated if eGFR is < 30 mL/min/1.73m2. Dose adjustment recommended if eGFR is between 30-45 mL/min/1.73m2.",
    source: "FDA Black Box Warning & CDSCO Guidelines",
    sourceRuleId: "RULE-MET-CKD-02",
    verified: true,
  },
  {
    drugName: "Warfarin",
    drugRxCui: "11289",
    conditionName: "Peptic Ulcer Disease",
    conditionCode: "PUD",
    severity: "High",
    description: "Warfarin anticoagulation in patients with active peptic ulcer disease markedly escalates the probability of severe, life-threatening gastrointestinal hemorrhage.",
    clinicalEffect: "Severe upper gastrointestinal bleeding and hematemesis.",
    management: "Active GI ulceration is a relative contraindication. Heal active ulcers and consider co-prescribing PPI therapy prior to anticoagulation.",
    source: "ACCP Evidence-Based Clinical Practice Guidelines",
    sourceRuleId: "RULE-WAR-PUD-03",
    verified: true,
  },
  {
    drugName: "Ibuprofen",
    drugRxCui: "5640",
    conditionName: "Peptic Ulcer Disease",
    conditionCode: "PUD",
    severity: "High",
    description: "Nonsteroidal anti-inflammatory drugs like Ibuprofen cause direct gastric mucosal injury and systemic prostaglandin depletion, exacerbating peptic ulcer disease.",
    clinicalEffect: "Gastric erosion, ulcer recurrence, perforation, and GI hemorrhage.",
    management: "Avoid unbuffered NSAIDs. Co-administer a proton-pump inhibitor (PPI) if NSAID therapy is unavoidable.",
    source: "ACG Clinical Guideline",
    sourceRuleId: "RULE-IBU-PUD-04",
    verified: true,
  },
  {
    drugName: "Propranolol",
    drugRxCui: "8787",
    conditionName: "Asthma",
    conditionCode: "ASTHMA",
    severity: "High",
    description: "Non-selective beta-blockade by Propranolol blocks pulmonary beta-2 adrenergic receptors, triggering severe bronchospasm and refractory asthma attacks.",
    clinicalEffect: "Acute bronchospasm, airway resistance, life-threatening dyspnea.",
    management: "Contraindicated in asthma or reactive airway disease. Use cardioselective beta-1 blockers with extreme caution if mandatory.",
    source: "GINA / FDA Guidelines",
    sourceRuleId: "RULE-PRO-AST-05",
    verified: true,
  },
  {
    drugName: "Pseudoephedrine",
    drugRxCui: "8843",
    conditionName: "Hypertension",
    conditionCode: "HTN",
    severity: "Moderate",
    description: "Alpha-1 adrenergic agonist stimulation by Pseudoephedrine causes systemic arterial vasoconstriction, elevating blood pressure in hypertensive patients.",
    clinicalEffect: "Acute spike in systolic and diastolic blood pressure.",
    management: "Avoid oral decongestants in patients with uncontrolled or severe hypertension. Use topical saline or non-sympathomimetic alternatives.",
    source: "AHA / ACC Guidelines",
    sourceRuleId: "RULE-PSE-HTN-06",
    verified: true,
  },
  {
    drugName: "Spironolactone",
    drugRxCui: "9997",
    conditionName: "Hyperkalemia",
    conditionCode: "HYPERKAL",
    severity: "High",
    description: "Potassium-sparing aldosterone antagonist effect of Spironolactone suppresses renal potassium excretion, worsening pre-existing hyperkalemia.",
    clinicalEffect: "Severe hyperkalemia, muscle weakness, cardiac conduction abnormalities, ventricular arrhythmias.",
    management: "Contraindicated if baseline serum potassium is > 5.0 mEq/L. Monitor serum electrolytes frequently.",
    source: "KDIGO Clinical Practice Guidelines",
    sourceRuleId: "RULE-SPI-HYP-07",
    verified: true,
  },
];

async function seedConditionInteractions() {
  try {
    await connectDB();
    console.log("[seed-condition-interactions] Connected to MongoDB...");

    for (const item of VERIFIED_CONDITION_INTERACTION_DATA) {
      const pairKey = makeKey(item.drugName, item.conditionName);
      await DrugConditionInteraction.findOneAndUpdate(
        { pairKey },
        { ...item, pairKey },
        { upsert: true, new: true }
      );
    }

    console.log(`[seed-condition-interactions] Successfully seeded ${VERIFIED_CONDITION_INTERACTION_DATA.length} clinical Drug-Condition interactions into MongoDB!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[seed-condition-interactions] Error seeding database:", err);
    process.exit(1);
  }
}

seedConditionInteractions();
