require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const duplicateDrugEngine = require("./services/interactions/duplicateDrugEngine");

async function runTests() {
  console.log("=== MODULE 7: DUPLICATE DRUG DETECTION TEST SUITE ===");
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

  // TEST 1: Dolo 650 + Paracetamol 500 -> SAME_ACTIVE_INGREDIENT
  console.log("\n--- TEST 1: Same Active Ingredient (Dolo 650 vs Paracetamol 500) ---");
  const res1 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Dolo 650" }, { name: "Paracetamol 500" }],
    },
  ]);
  assert(
    res1.status === "DUPLICATES_FOUND" &&
      res1.duplicates.some((d) => d.duplicateType === "SAME_ACTIVE_INGREDIENT" && d.sharedIngredients.includes("Paracetamol")),
    "Dolo 650 and Paracetamol 500 classified as SAME_ACTIVE_INGREDIENT (Paracetamol)"
  );

  // TEST 2: Dolo 650 + Azemar P -> INGREDIENT_OVERLAP (Paracetamol)
  console.log("\n--- TEST 2: Ingredient Overlap (Dolo 650 vs Azemar P) ---");
  const res2 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Dolo 650" }, { name: "Azemar P" }],
    },
  ]);
  assert(
    res2.status === "DUPLICATES_FOUND" &&
      res2.duplicates.some((d) => d.duplicateType === "INGREDIENT_OVERLAP" && d.sharedIngredients.includes("Paracetamol")),
    "Dolo 650 and Azemar P classified as INGREDIENT_OVERLAP (Paracetamol)"
  );

  // TEST 3: Azemar P + Aceclo P Generic -> SAME_COMBINATION
  console.log("\n--- TEST 3: Same Combination (Azemar P vs Aceclofenac + Paracetamol) ---");
  const res3 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Azemar P" }, { name: "Aceclofenac + Paracetamol Generic" }],
    },
  ]);
  assert(
    res3.status === "DUPLICATES_FOUND" &&
      res3.duplicateGroups.some((g) => g.duplicateType === "SAME_COMBINATION"),
    "Azemar P and Aceclofenac + Paracetamol Generic classified as SAME_COMBINATION"
  );

  // TEST 4: Paracetamol 500 + Paracetamol 650 -> SAME_ACTIVE_INGREDIENT with strength comparison
  console.log("\n--- TEST 4: Same Active Ingredient, Different Strengths (Paracetamol 500 vs 650) ---");
  const res4 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Paracetamol 500", strength: "500 mg" }, { name: "Dolo 650", strength: "650 mg" }],
    },
  ]);
  const pair4 = res4.duplicates.find((d) => d.duplicateType === "SAME_ACTIVE_INGREDIENT");
  assert(
    pair4 && pair4.strengthComparison.includes("500") && pair4.strengthComparison.includes("650"),
    "Same active ingredient detected and strengths (500 mg vs 650 mg) preserved in comparison"
  );

  // TEST 5: Montair LC + Cetzine 10 -> NO FALSE DUPLICATE
  console.log("\n--- TEST 5: No False Positives (Montair LC vs Cetzine 10) ---");
  const res5 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Montair LC" }, { name: "Cetzine 10" }],
    },
  ]);
  assert(
    res5.duplicates.length === 0,
    "Montair LC (Levocetirizine) and Cetzine 10 (Cetirizine) NOT falsely classified as duplicate"
  );

  // TEST 6: Three Paracetamol Brands -> Grouped under Paracetamol
  console.log("\n--- TEST 6: Grouping by Active Ingredient (Dolo 650, Crocin Advance, Paracetamol Syrup) ---");
  const res6 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Dolo 650" }, { name: "Crocin Advance" }, { name: "Paracetamol Syrup" }],
    },
  ]);
  const pcmGroup = res6.duplicateGroups.find((g) => g.activeIngredient.toLowerCase().includes("paracetamol"));
  assert(
    pcmGroup && pcmGroup.medicines.length === 3,
    "3 Paracetamol-containing medicines successfully grouped under Paracetamol"
  );

  // TEST 7: Cross-Prescription Duplicate Detection with Source Tracking
  console.log("\n--- TEST 7: Cross-Prescription Duplicate Detection ---");
  const res7 = await duplicateDrugEngine.checkDuplicateDrugs([
    { prescriptionId: "p1", fileName: "Prescription_A.pdf", medications: [{ name: "Dolo 650" }] },
    { prescriptionId: "p2", fileName: "Prescription_B.pdf", medications: [{ name: "Paracetamol 500" }] },
  ]);
  assert(
    res7.status === "DUPLICATES_FOUND" && res7.duplicates.length === 1,
    "Duplicate detected across 2 separate uploaded prescriptions"
  );

  // TEST 8: Unknown / Unverified Medicine -> Requires Review, No False Duplicate
  console.log("\n--- TEST 8: Unverified Medicine Isolation ---");
  const res8 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Dolo 650" }, { name: "UnknownRx999", status: "needs_review", needsReview: true }],
    },
  ]);
  assert(
    res8.unverifiedItems.length === 1 && res8.duplicates.length === 0,
    "Unverified medicine safely excluded from duplicate matching and reported under unverifiedItems"
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
