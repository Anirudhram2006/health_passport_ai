require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const genericAlternativeEngine = require("./services/interactions/genericAlternativeEngine");

async function runTests() {
  console.log("=== MODULE 8: GENERIC ALTERNATIVE SUGGESTION TEST SUITE ===");
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

  // TEST 1: Dolo 650 -> Exact Generic Equivalent (Paracetamol 650 mg)
  console.log("\n--- TEST 1: Exact Generic Equivalent (Dolo 650) ---");
  const res1 = await genericAlternativeEngine.findGenericAlternatives({ name: "Dolo 650" });
  assert(
    res1.status === "ALTERNATIVES_FOUND" &&
      res1.alternatives.some((a) => a.matchType === "EXACT_GENERIC_EQUIVALENT" && a.strength.includes("650")),
    "Dolo 650 found exact generic equivalent Paracetamol 650 mg"
  );

  // TEST 2: Different Paracetamol Brand -> Active Ingredient Based Search
  console.log("\n--- TEST 2: Different Paracetamol Brand Generic Search ---");
  const res2 = await genericAlternativeEngine.findGenericAlternatives({ name: "Crocin Advance", strength: "500 mg" });
  assert(
    res2.status === "ALTERNATIVES_FOUND" &&
      res2.alternatives.some((a) => a.genericName === "Paracetamol" && a.isGeneric),
    "Crocin Advance found generic Paracetamol alternatives based on active ingredient"
  );

  // TEST 3: Paracetamol 500 mg vs Paracetamol 650 mg -> Different Strength
  console.log("\n--- TEST 3: Strength Matching (Paracetamol 500 mg) ---");
  const res3 = await genericAlternativeEngine.findGenericAlternatives({ name: "Crocin Advance", strength: "500 mg", dosageForm: "Tablet" });
  const alt650 = res3.alternatives.find((a) => a.brandName === "Dolo 650" || a.strength.includes("650"));
  assert(
    alt650 && alt650.matchType === "SAME_ACTIVE_INGREDIENT_DIFFERENT_STRENGTH",
    "Paracetamol 650 mg correctly classified as SAME_ACTIVE_INGREDIENT_DIFFERENT_STRENGTH for a 500 mg target"
  );

  // TEST 4: Tablet vs Syrup -> Different Dosage Form
  console.log("\n--- TEST 4: Dosage Form Matching (Paracetamol Syrup) ---");
  const res4 = await genericAlternativeEngine.findGenericAlternatives({ name: "Crocin Advance", strength: "500 mg", dosageForm: "Tablet" });
  const sypAlt = res4.alternatives.find((a) => a.dosageForm === "Syrup" || a.brandName.includes("Syrup"));
  assert(
    sypAlt && sypAlt.matchType === "SAME_ACTIVE_INGREDIENT_DIFFERENT_DOSAGE_FORM",
    "Paracetamol Syrup correctly classified as SAME_ACTIVE_INGREDIENT_DIFFERENT_DOSAGE_FORM for a Tablet target"
  );

  // TEST 5: Combination Medicine Complete Combination Search (Azemar P -> Aceclofenac + Paracetamol)
  console.log("\n--- TEST 5: Combination Medicine Complete Formula Matching (Azemar P) ---");
  const res5 = await genericAlternativeEngine.findGenericAlternatives({ name: "Azemar P" });
  assert(
    res5.status === "ALTERNATIVES_FOUND" &&
      res5.alternatives.every((a) => a.genericName.includes("Aceclofenac") && a.genericName.includes("Paracetamol")) &&
      !res5.alternatives.some((a) => a.genericName === "Paracetamol"),
    "Azemar P alternatives strictly match complete combination (Aceclofenac + Paracetamol); single Paracetamol excluded"
  );

  // TEST 6: Unknown / Unverified Medicine -> MEDICINE_UNVERIFIED
  console.log("\n--- TEST 6: Unverified Medicine Isolation ---");
  const res6 = await genericAlternativeEngine.findGenericAlternatives({ name: "UnmappedMed999", status: "needs_review", needsReview: true });
  assert(
    res6.status === "MEDICINE_UNVERIFIED" && res6.requiresReview === true && res6.alternatives.length === 0,
    "Unverified medicine correctly returns MEDICINE_UNVERIFIED with 0 suggestions"
  );

  // TEST 7: Database Unavailable State Simulation
  console.log("\n--- TEST 7: Database Unavailable Distinction ---");
  const originalFind = mongoose.model("Medicine").find;
  mongoose.model("Medicine").find = function () {
    throw new Error("DB Connection Interrupted");
  };
  const res7 = await genericAlternativeEngine.findGenericAlternatives({ name: "Dolo 650" });
  mongoose.model("Medicine").find = originalFind; // Restore
  assert(
    res7.status === "DATABASE_UNAVAILABLE" && res7.requiresReview === true,
    "DB query error returns DATABASE_UNAVAILABLE status (distinct from NO_VALIDATED_ALTERNATIVE)"
  );

  // TEST 8: Existing Confirmed Medication Status Preservation
  console.log("\n--- TEST 8: Confirmed Medication Status Preservation ---");
  const res8 = await genericAlternativeEngine.findGenericAlternatives({
    name: "Pan 40 (Pantoprazole)",
    genericName: "Pantoprazole",
    status: "verified",
    normalizationStatus: "confirmed",
  });
  assert(
    res8.status === "ALTERNATIVES_FOUND" && res8.requiresReview === false,
    "Existing confirmed medication status is preserved throughout generic alternatives search"
  );

  // TEST 9: Multiple Prescriptions Independent Alternatives Lookup
  console.log("\n--- TEST 9: Independent Alternatives Lookup for Multiple Medicines ---");
  const meds = [{ name: "Dolo 650" }, { name: "Pan 40" }, { name: "Cetzine 10" }];
  const results = await Promise.all(meds.map((m) => genericAlternativeEngine.findGenericAlternatives(m)));
  assert(
    results.length === 3 && results.every((r) => r.status === "ALTERNATIVES_FOUND"),
    "Generic alternatives generated independently for all 3 confirmed medicines"
  );

  // TEST 10: Non-Prescriptive Safety Disclaimer Included
  console.log("\n--- TEST 10: Clinical Safety Disclaimer & Non-Prescriptive Language ---");
  assert(
    res1.disclaimer && res1.disclaimer.includes("clinical decision support") && !res1.message.includes("replace"),
    "Clinical safety disclaimer present and non-prescriptive decision support language enforced"
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
