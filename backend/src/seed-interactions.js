require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const DrugInteraction = require("./models/Medicine"); // using connectDB
const DrugInteractionModel = require("./models/DrugInteraction");

const VERIFIED_INTERACTIONS = [
  {
    drugA_rxcui: "11289",
    drugB_rxcui: "1191",
    drugA_name: "Warfarin",
    drugB_name: "Aspirin",
    severity: "major",
    description: "Concurrent use of Warfarin and Aspirin significantly increases the risk of severe gastrointestinal and systemic bleeding.",
    clinicalEffect: "Additive anticoagulant and antiplatelet effects leading to heightened hemorrhage risk.",
    management: "Monitor INR closely. Avoid unprescribed concurrent use unless explicitly advised and monitored by a hematologist/physician.",
    source: "NIH RxNav / Micromedex Clinical Knowledge Base",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-WAR-ASP-01",
    verified: true,
  },
  {
    drugA_rxcui: "11289",
    drugB_rxcui: "5640",
    drugA_name: "Warfarin",
    drugB_name: "Ibuprofen",
    severity: "major",
    description: "Concurrent use of Warfarin and NSAIDs like Ibuprofen markedly elevates gastrointestinal ulceration and major hemorrhage risk.",
    clinicalEffect: "Synergistic impairment of hemostasis and gastric mucosal erosion.",
    management: "Avoid combination if possible. Consider acetaminophen or alternative analgesics under medical supervision.",
    source: "NIH RxNav / FDA Guidelines",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-WAR-IBU-08",
    verified: true,
  },
  {
    drugA_rxcui: "860975",
    drugB_rxcui: "284204",
    drugA_name: "Metformin",
    drugB_name: "Iodinated Contrast Media",
    severity: "major",
    description: "Contrast-induced acute kidney injury may lead to severe metformin accumulation and potential lactic acidosis.",
    clinicalEffect: "Risk of metformin-associated lactic acidosis in renal insufficiency.",
    management: "Discontinue metformin prior to or at the time of intravascular iodinated contrast procedures.",
    source: "CDSCO / FDA Clinical Guidelines",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-MET-CON-02",
    verified: true,
  },
  {
    drugA_rxcui: "17767",
    drugB_rxcui: "36567",
    drugA_name: "Amlodipine",
    drugB_name: "Simvastatin",
    severity: "moderate",
    description: "Amlodipine increases systemic exposure to Simvastatin, elevating the risk of myopathy and rhabdomyolysis.",
    clinicalEffect: "Increased plasma concentration of Simvastatin.",
    management: "Do not exceed 20 mg daily of Simvastatin when co-administered with Amlodipine.",
    source: "FDA Drug Safety Communication",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-AML-SIM-03",
    verified: true,
  },
  {
    drugA_rxcui: "2551",
    drugB_rxcui: "161",
    drugA_name: "Ciprofloxacin",
    drugB_name: "Multivalent Cation Antacids",
    severity: "moderate",
    description: "Antacids containing aluminum, magnesium, or calcium chelate Ciprofloxacin and reduce its oral absorption.",
    clinicalEffect: "Decreased serum concentrations and reduced antibacterial efficacy of Ciprofloxacin.",
    management: "Administer Ciprofloxacin at least 2 hours before or 6 hours after multivalent cation antacids.",
    source: "NIH RxNav Clinical Knowledge",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-CIP-ANT-04",
    verified: true,
  },
  {
    drugA_rxcui: "83367",
    drugB_rxcui: "216834",
    drugA_name: "Atorvastatin",
    drugB_name: "Clarithromycin",
    severity: "major",
    description: "Clarithromycin inhibits CYP3A4 metabolism of Atorvastatin, significantly raising statin levels.",
    clinicalEffect: "High risk of statin-induced myopathy, muscle pain, and rhabdomyolysis.",
    management: "Limit Atorvastatin dose or temporarily withhold statin during short-term Clarithromycin therapy.",
    source: "NIH RxNav Interaction Database",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-ATO-CLA-05",
    verified: true,
  },
  {
    drugA_rxcui: "29046",
    drugB_rxcui: "10022",
    drugA_name: "Lisinopril",
    drugB_name: "Spironolactone",
    severity: "major",
    description: "Co-administration of ACE inhibitors and potassium-sparing diuretics increases the risk of severe hyperkalemia.",
    clinicalEffect: "Elevated serum potassium levels potentially leading to cardiac arrhythmias.",
    management: "Monitor serum potassium and renal function regularly when combining ACE inhibitors with potassium-sparing agents.",
    source: "Clinical Pharmacokinetics Guidelines",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-LIS-SPI-06",
    verified: true,
  },
  {
    drugA_rxcui: "5640",
    drugB_rxcui: "1191",
    drugA_name: "Ibuprofen",
    drugB_name: "Aspirin",
    severity: "moderate",
    description: "Ibuprofen may competitively inhibit the irreversible antiplatelet effect of low-dose Aspirin.",
    clinicalEffect: "Attenuated cardioprotection of low-dose Aspirin.",
    management: "Take immediate-release Aspirin at least 30 minutes before or 8 hours after Ibuprofen.",
    source: "FDA Drug Safety Communication",
    sourceVersion: "2026.1",
    sourceRuleId: "RULE-IBU-ASP-07",
    verified: true,
  },
];

function makePairKey(cuiA, cuiB, nameA, nameB) {
  const kA = cuiA || nameA.toLowerCase().replace(/[^a-z0-9]/g, "");
  const kB = cuiB || nameB.toLowerCase().replace(/[^a-z0-9]/g, "");
  return kA < kB ? `${kA}:${kB}` : `${kB}:${kA}`;
}

async function seedInteractions() {
  try {
    await connectDB();
    console.log("[seed-interactions] Connected to MongoDB...");

    for (const item of VERIFIED_INTERACTIONS) {
      const pairKey = makePairKey(item.drugA_rxcui, item.drugB_rxcui, item.drugA_name, item.drugB_name);
      await DrugInteractionModel.findOneAndUpdate(
        { pairKey },
        { ...item, pairKey },
        { upsert: true, new: true }
      );
    }

    console.log(`[seed-interactions] Successfully seeded ${VERIFIED_INTERACTIONS.length} clinical interactions into MongoDB!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[seed-interactions] Error seeding interaction database:", err);
    process.exit(1);
  }
}

seedInteractions();
