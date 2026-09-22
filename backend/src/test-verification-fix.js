require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const interactionEngine = require("./services/interactions/interactionEngine");

async function runVerificationTests() {
  console.log("==================================================");
  console.log("RUNNING MEDICINE VERIFICATION & NORMALIZATION TESTS");
  console.log("==================================================\n");

  await connectDB();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, description) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ TEST ${totalTests} PASSED: ${description}`);
      passedTests++;
    } else {
      console.error(`  ❌ TEST ${totalTests} FAILED: ${description}`);
    }
  }

  // 1. Exact Brand Match (Pan 40)
  const test1 = await interactionEngine.normalizeMedication({ name: "Pan 40" });
  assert(
    test1 && test1.status === "VERIFIED" && test1.requiresReview === false && test1.genericName === "Pantoprazole",
    "Pan 40 normalized to Pantoprazole without review flag"
  );

  // 2. Brand + Strength Match (Cetzine 10)
  const test2 = await interactionEngine.normalizeMedication({ name: "Cetzine 10" });
  assert(
    test2 && test2.status === "VERIFIED" && test2.requiresReview === false && test2.genericName === "Cetirizine",
    "Cetzine 10 normalized to Cetirizine without review flag"
  );

  // 3. Brand + Strength Match (Torez 10)
  const test3 = await interactionEngine.normalizeMedication({ name: "Torez 10" });
  assert(
    test3 && test3.status === "VERIFIED" && test3.requiresReview === false && test3.genericName === "Torsemide",
    "Torez 10 normalized to Torsemide without review flag"
  );

  // 4. Combination Medicine (Montair LC)
  const test4 = await interactionEngine.normalizeMedication({ name: "Montair LC" });
  assert(
    test4 && test4.status === "VERIFIED" && test4.requiresReview === false && test4.activeIngredients.length >= 2,
    "Montair LC normalized to Montelukast + Levocetirizine combination without review flag"
  );

  // 5. Combination Medicine (Azemar P)
  const test5 = await interactionEngine.normalizeMedication({ name: "Azemar P" });
  assert(
    test5 && test5.status === "VERIFIED" && test5.requiresReview === false && test5.genericName.includes("Aceclofenac"),
    "Azemar P normalized to Aceclofenac + Paracetamol without review flag"
  );

  // 6. Parenthetical Display Format String ("Montair LC (Montelukast + Levocetirizine)")
  const test6 = await interactionEngine.normalizeMedication({ name: "Montair LC (Montelukast + Levocetirizine)" });
  assert(
    test6 && test6.status === "VERIFIED" && test6.requiresReview === false && test6.brandName === "Montair LC",
    "Display string with parentheses 'Montair LC (Montelukast + Levocetirizine)' correctly parsed as verified"
  );

  // 7. Parenthetical Display Format String ("Pan 40 (Pantoprazole)")
  const test7 = await interactionEngine.normalizeMedication({ name: "Pan 40 (Pantoprazole)" });
  assert(
    test7 && test7.status === "VERIFIED" && test7.requiresReview === false && test7.genericName === "Pantoprazole",
    "Display string 'Pan 40 (Pantoprazole)' correctly parsed as verified"
  );

  // 8. Verified Alias Match ("zifi 200")
  const test8 = await interactionEngine.normalizeMedication({ name: "zifi 200" });
  assert(
    test8 && test8.status === "VERIFIED" && test8.requiresReview === false && test8.genericName === "Cefixime",
    "Alias 'zifi 200' normalized to Cefixime without review flag"
  );

  // 9. Unknown / Unmapped Medicine ("UnmappedMedicationXyz99") -> SHOULD REQUIRE REVIEW
  const test9 = await interactionEngine.normalizeMedication({ name: "UnmappedMedicationXyz99" });
  assert(
    test9 && (test9.status === "MEDICINE_UNKNOWN" || test9.status === "MEDICINE_NEEDS_REVIEW") && test9.requiresReview === true,
    "Unmapped medicine 'UnmappedMedicationXyz99' correctly flagged as requiring review"
  );

  // 10. Existing Confirmed Medication from Active Health Record
  const activeMed = {
    name: "Cetzine 10 (Cetirizine)",
    genericName: "Cetirizine",
    activeIngredients: ["Cetirizine Hydrochloride"],
    status: "verified",
    normalizationStatus: "confirmed",
  };
  const test10 = await interactionEngine.normalizeMedication(activeMed);
  assert(
    test10 && test10.status === "VERIFIED" && test10.requiresReview === false,
    "Existing confirmed medication record retains confirmed status"
  );

  // 11. Multi-Prescription Interaction Check with 5 target medicines
  const regressionPrescriptions = [
    {
      prescriptionId: "rx_001",
      fileName: "Prescription_1.pdf",
      medications: [{ name: "Montair LC" }, { name: "Torez 10" }],
    },
    {
      prescriptionId: "rx_002",
      fileName: "Prescription_2.pdf",
      medications: [{ name: "Cetzine 10" }, { name: "Pan 40" }, { name: "Azemar P" }],
    },
  ];

  const checkResult = await interactionEngine.checkMultiplePrescriptions(regressionPrescriptions, []);
  assert(
    checkResult && checkResult.uniqueNormalizedMedsCount === 5,
    `Multi-prescription check successfully normalized all 5 medicines (found ${checkResult.uniqueNormalizedMedsCount}/5)`
  );

  const trueUnverified = (checkResult.unverifiedItems || []).filter((u) => u.requiresReview === true);
  assert(
    trueUnverified.length === 0,
    `No valid database-matched medicines were incorrectly flagged as unverified (unverified count: ${trueUnverified.length})`
  );

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==================================================\n");

  await mongoose.disconnect();
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerificationTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
