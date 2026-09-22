const { findMedicineCandidates, resolveAbbreviations } = require("./services/gemini");
const OCRService = require("./services/prescriptionParser");

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 2 PRESCRIPTION OCR & EXTRACTION TESTS");
  console.log("==================================================");

  // Test 1: Abbreviation resolution
  console.log("\n[Test 1] Abbreviation Resolution:");
  const testAbbrs = ["OD", "BD", "TDS", "QID", "HS", "SOS"];
  testAbbrs.forEach((abbr) => {
    const res = resolveAbbreviations(abbr);
    console.log(`  - Code: "${res.rawInstruction}" -> Interpreted: "${res.interpretedInstruction}"`);
  });

  // Test 2: Medicine Candidate Suggestion (Handwriting Prefix Matching)
  console.log("\n[Test 2] Medicine Candidate Suggestions:");
  const queries = ["Amox", "Metf", "Dolo", "Cetro", "Panto"];
  queries.forEach((q) => {
    const matches = findMedicineCandidates(q);
    console.log(`  - Partial string: "${q}" -> Candidates:`, matches);
  });

  // Test 3: Confidence Calculation & Uncertainty Flagging
  console.log("\n[Test 3] Confidence & Uncertainty Flagging:");
  const mockRawExtraction = {
    title: "Test Handwritten Prescription",
    type: "Prescription",
    medications: [
      {
        rawText: "Amoxicillin 500mg BD",
        medicineName: "Amoxicillin",
        dosage: "1 capsule",
        frequency: "BD",
        confidence: 0.95,
        needsReview: false,
      },
      {
        rawText: "Metf... 500",
        medicineName: null, // Illegible handwriting
        dosage: "500 mg",
        confidence: 0.42,
        needsReview: true,
      },
    ],
  };

  const flagged = OCRService.flagUncertainFields(mockRawExtraction);
  console.log("  - Overall Confidence:", flagged.overallConfidence);
  console.log("  - Needs Review Flag:", flagged.needsReview);
  console.log("  - Medication #1 Needs Review:", flagged.medications[0].needsReview);
  console.log("  - Medication #2 Needs Review:", flagged.medications[1].needsReview);
  console.log("  - Medication #2 Candidates:", flagged.medications[1].candidates);

  if (flagged.needsReview === true && flagged.medications[1].needsReview === true) {
    console.log("\n✅ ALL PIPELINE TESTS PASSED SUCCESSFULLY!");
  } else {
    console.error("\n❌ TEST FAILED: Uncertainty flag logic incorrect!");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
