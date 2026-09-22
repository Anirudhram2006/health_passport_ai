require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const duplicateDrugEngine = require("./services/interactions/duplicateDrugEngine");

async function runTests() {
  console.log("=== MODULE 7: DUPLICATE RESULT GROUPING & PARACETAMOL+DOLO TEST SUITE ===");
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

  // TEST 1: Paracetamol 500 mg + Dolo 650 mg -> SAME_ACTIVE_INGREDIENT Group
  console.log("\n--- TEST 1: Paracetamol 500 mg + Dolo 650 mg ---");
  const res1 = await duplicateDrugEngine.checkDuplicateDrugs([
    { prescriptionId: "rx1", fileName: "P1.pdf", medications: [{ name: "Paracetamol 500", strength: "500 mg" }] },
    { prescriptionId: "rx2", fileName: "P2.pdf", medications: [{ name: "Dolo 650", strength: "650 mg" }] },
  ]);

  assert(res1.status === "DUPLICATES_FOUND", "Status returns DUPLICATES_FOUND for Paracetamol 500 + Dolo 650");
  assert(res1.duplicateGroups.length === 1, "Exactly 1 Active Ingredient Group generated (Paracetamol)");
  const group1 = res1.duplicateGroups[0];
  assert(
    group1 &&
      group1.activeIngredient === "Paracetamol" &&
      group1.duplicateType === "SAME_ACTIVE_INGREDIENT" &&
      group1.count === 2,
    "Paracetamol group correctly classified as SAME_ACTIVE_INGREDIENT containing 2 medicines"
  );
  assert(
    group1.medicines.some((m) => m.name.includes("Paracetamol")) && group1.medicines.some((m) => m.name.includes("Dolo")),
    "Paracetamol group lists both Paracetamol 500 and Dolo 650 as members"
  );

  // TEST 2: Combination Medicine Overlap (Azemar P + Dolo 650)
  console.log("\n--- TEST 2: Combination Medicine Overlap (Azemar P + Dolo 650) ---");
  const res2 = await duplicateDrugEngine.checkDuplicateDrugs([
    { prescriptionId: "rx1", fileName: "P1.pdf", medications: [{ name: "Azemar P" }] },
    { prescriptionId: "rx2", fileName: "P2.pdf", medications: [{ name: "Dolo 650" }] },
  ]);

  assert(res2.duplicateGroups.length === 1, "Exactly 1 Active Ingredient Group generated (Paracetamol)");
  const group2 = res2.duplicateGroups[0];
  assert(
    group2 && group2.activeIngredient === "Paracetamol" && group2.duplicateType === "INGREDIENT_OVERLAP",
    "Azemar P + Dolo 650 correctly classified as INGREDIENT_OVERLAP for Paracetamol"
  );

  // TEST 3: Two Combination Medicines (Azemar P + Aceclofenac + Paracetamol Generic)
  console.log("\n--- TEST 3: Identical Combination Medicines ---");
  const res3 = await duplicateDrugEngine.checkDuplicateDrugs([
    { prescriptionId: "rx1", fileName: "P1.pdf", medications: [{ name: "Azemar P" }] },
    { prescriptionId: "rx2", fileName: "P2.pdf", medications: [{ name: "Aceclofenac + Paracetamol Generic" }] },
  ]);

  assert(
    res3.duplicateGroups.some((g) => g.duplicateType === "SAME_COMBINATION"),
    "Identical multi-ingredient combination medicines correctly classified as SAME_COMBINATION"
  );

  // TEST 4: Same Medicine in Multiple Source Records (Active Record + Prescription) -> Merged Identity
  console.log("\n--- TEST 4: Same Medicine in Multiple Sources (Dolo 650 in Health Record & Upload) ---");
  const res4 = await duplicateDrugEngine.checkDuplicateDrugs(
    [{ prescriptionId: "rx1", fileName: "Upload.pdf", medications: [{ name: "Dolo 650" }] }],
    [{ name: "Dolo 650", active: true }]
  );

  assert(
    res4.status === "NO_DUPLICATES_FOUND" && res4.duplicateGroups.length === 0,
    "Same medicine in Active Health Record + Upload merged into 1 identity without generating false Dolo ↔ Dolo duplicate"
  );
  assert(res4.checkedMedicationsCount === 1, "Deduplicated into 1 confirmed medication identity");

  // TEST 5: Single Medication -> No Duplicate Warning
  console.log("\n--- TEST 5: Single Medication Isolation ---");
  const res5 = await duplicateDrugEngine.checkDuplicateDrugs([
    { prescriptionId: "rx1", fileName: "P1.pdf", medications: [{ name: "Dolo 650" }] },
  ]);

  assert(
    res5.status === "NO_DUPLICATES_FOUND" && res5.duplicateGroups.length === 0,
    "Single medication alone generates 0 duplicate groups"
  );

  // TEST 6: Complex 4-Medicine Test Scenario (Paracetamol, Dolo 650, Azemar P, Buosan Forte)
  console.log("\n--- TEST 6: Complex 4-Medicine Scenario (Paracetamol 500, Dolo 650, Azemar P, Buosan Forte) ---");
  const res6 = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "rx1",
      fileName: "MultiPrescription.pdf",
      medications: [
        { name: "Paracetamol 500", strength: "500 mg" },
        { name: "Dolo 650", strength: "650 mg" },
        { name: "Azemar P", strength: "100 mg / 325 mg" },
        { name: "Buosan Forte", strength: "10 mg / 500 mg" },
      ],
    },
  ]);

  assert(res6.duplicateGroups.length === 1, "Exactly 1 active ingredient group (Paracetamol) generated instead of 19 redundant pairs");
  const group6 = res6.duplicateGroups[0];
  assert(
    group6 && group6.activeIngredient === "Paracetamol" && group6.count === 4,
    "Paracetamol group correctly contains all 4 member medications"
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
