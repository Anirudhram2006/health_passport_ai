require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const interactionEngine = require("./services/interactions/interactionEngine");

async function runTests() {
  console.log("=== ANALYZE ALL MULTI-MODULE INTEGRATION TEST SUITE ===");
  await connectDB();

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ TEST ${total} PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ TEST ${total} FAILED: ${message}`);
    }
  }

  // TEST 1: Cross-Prescription Multi-Module Check (Dolo 650 + Paracetamol 500)
  console.log("\n--- TEST 1: Multi-Module Analysis (Dolo 650 & Paracetamol 500) ---");
  const prescriptions1 = [
    {
      prescriptionId: "rx_01",
      fileName: "Prescription_A.pdf",
      medications: [{ name: "Dolo 650", strength: "650 mg" }],
    },
    {
      prescriptionId: "rx_02",
      fileName: "Prescription_B.jpg",
      medications: [{ name: "Paracetamol 500", strength: "500 mg" }],
    },
  ];

  const res1 = await interactionEngine.checkMultiplePrescriptions(prescriptions1, []);

  assert(res1.prescriptionsAnalyzedCount === 2, "Analyzed 2 uploaded prescriptions");
  assert(res1.uniqueNormalizedMedsCount === 1, "Deduplicated 2 Paracetamol prescriptions into 1 unique active ingredient (Paracetamol)");
  assert(res1.status === "NO_INTERACTION_FOUND", "Module 5 returned NO_INTERACTION_FOUND for Paracetamol alone");
  assert(
    res1.duplicateDetection &&
      res1.duplicateDetection.duplicatesCount > 0 &&
      res1.duplicateDetection.duplicates.some((d) => d.duplicateType === "SAME_ACTIVE_INGREDIENT"),
    "Module 7 detected SAME_ACTIVE_INGREDIENT duplicate (Paracetamol) across prescriptions"
  );
  assert(
    res1.genericAlternatives &&
      res1.genericAlternatives.medications.length >= 1 &&
      res1.genericAlternatives.medications.some((m) => m.status === "ALTERNATIVES_FOUND"),
    "Module 8 returned generic alternative suggestions for confirmed medications"
  );
  assert(
    res1.disclaimer && !res1.disclaimer.includes("Potential drug interaction detected."),
    "Disclaimer correctly shows informational safety text when status is NO_INTERACTION_FOUND"
  );

  // TEST 2: Combination Medicine Multi-Module Check (Azemar P + Dolo 650)
  console.log("\n--- TEST 2: Combination Medicine Duplicate & Generic Analysis (Azemar P & Dolo 650) ---");
  const prescriptions2 = [
    {
      prescriptionId: "rx_03",
      fileName: "Prescription_C.pdf",
      medications: [{ name: "Azemar P" }, { name: "Dolo 650" }],
    },
  ];

  const res2 = await interactionEngine.checkMultiplePrescriptions(prescriptions2, []);

  assert(
    res2.duplicateDetection &&
      res2.duplicateDetection.duplicates.some((d) => d.duplicateType === "INGREDIENT_OVERLAP" && d.sharedIngredients.includes("Paracetamol")),
    "Module 7 detected INGREDIENT_OVERLAP (Paracetamol) between Azemar P and Dolo 650"
  );
  const azemarAlt = res2.genericAlternatives.medications.find((m) => m.medication?.name === "Azemar P");
  assert(
    azemarAlt &&
      azemarAlt.alternatives.every((a) => a.genericName.includes("Aceclofenac") && a.genericName.includes("Paracetamol")),
    "Module 8 Azemar P generic alternatives strictly match complete combination (Aceclofenac + Paracetamol)"
  );

  // TEST 3: Active Health Record + Uploaded Prescription Integration
  console.log("\n--- TEST 3: Active Health Record + Uploaded Prescription ---");
  const activeMeds = [{ name: "Dolo 650", active: true }];
  const rxUpload = [{ prescriptionId: "rx_04", fileName: "New_Prescription.pdf", medications: [{ name: "Paracetamol 500", strength: "500 mg" }] }];

  const res3 = await interactionEngine.checkMultiplePrescriptions(rxUpload, activeMeds);
  console.log("TEST 3 RESULT:", JSON.stringify(res3.duplicateDetection, null, 2));

  assert(
    res3.duplicateDetection &&
      res3.duplicateDetection.duplicateGroups.some((g) =>
        g.medicines.some((m) => m.sources.some((s) => s.prescriptionId === "patient_active"))
      ),
    "Module 7 detected duplicate active ingredient between Active Health Record and new uploaded prescription"
  );

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================\n");

  await mongoose.disconnect();
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failure:", err);
  process.exit(1);
});
