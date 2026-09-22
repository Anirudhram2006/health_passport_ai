const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "../.env") });

const { connectDB } = require("./config/db");
const drugConditionEngine = require("./services/interactions/drugConditionEngine");
const conditionNormalizer = require("./services/interactions/conditionNormalizer");

async function runTests() {
  console.log("=== MODULE 6: DRUG-CONDITION INTERACTION ENGINE TEST SUITE ===");

  try {
    await connectDB();
  } catch (dbErr) {
    console.warn("MongoDB connection notice:", dbErr.message);
  }

  try {
    // 1. Condition Normalization Test
    console.log("\n--- TEST 1: Condition Normalization (T2DM, High BP, CKD, PUD) ---");
    const cond1 = conditionNormalizer.normalizeCondition("T2DM");
    const cond2 = conditionNormalizer.normalizeCondition("High BP");
    const cond3 = conditionNormalizer.normalizeCondition("CKD");
    const cond4 = conditionNormalizer.normalizeCondition("Kidny issue?");

    console.log("T2DM ->", cond1.name, "(Status:", cond1.status, ")");
    console.log("High BP ->", cond2.name, "(Status:", cond2.status, ")");
    console.log("CKD ->", cond3.name, "(Status:", cond3.status, ")");
    console.log("Kidny issue? ->", cond4.name, "(Status:", cond4.status, ")");

    if (cond1.name !== "Type 2 Diabetes" || cond2.name !== "Hypertension" || cond3.name !== "Chronic Kidney Disease") {
      throw new Error("TEST 1 FAILED: Condition normalization failed for standardized terms");
    }
    if (cond4.status !== "CONDITION_NEEDS_REVIEW") {
      throw new Error("TEST 1 FAILED: Ambiguous text with '?' should be marked CONDITION_NEEDS_REVIEW");
    }
    console.log("✅ TEST 1 PASSED");

    // 2. One Medicine + One Condition (Ibuprofen + CKD)
    console.log("\n--- TEST 2: One Medicine + One Condition (Ibuprofen + CKD) ---");
    const res2 = await drugConditionEngine.checkDrugConditionInteractions(
      [{ medicineName: "Ibuprofen 400mg", genericName: "Ibuprofen", rxNormCui: "5640" }],
      ["Chronic Kidney Disease"]
    );
    console.log("Status:", res2.status, "| Interactions:", res2.interactions.length);
    if (res2.status !== "INTERACTION_FOUND" || res2.interactions.length === 0) {
      throw new Error("TEST 2 FAILED: Expected INTERACTION_FOUND for Ibuprofen + CKD");
    }
    console.log("Severity:", res2.interactions[0].severity);
    console.log("Source:", res2.interactions[0].source);
    console.log("✅ TEST 2 PASSED");

    // 3. Multiple Medicines + Multiple Conditions (M * C Pair Combinations)
    console.log("\n--- TEST 3: Multiple Meds + Multiple Conditions (3 Meds * 2 Conditions = 6 Pairs) ---");
    const res3 = await drugConditionEngine.checkDrugConditionInteractions(
      [
        { medicineName: "Ibuprofen 400mg", genericName: "Ibuprofen", rxNormCui: "5640" },
        { medicineName: "Metformin 500mg", genericName: "Metformin", rxNormCui: "6809" },
        { medicineName: "Paracetamol 500mg", genericName: "Paracetamol", rxNormCui: "161" },
      ],
      ["Chronic Kidney Disease", "Type 2 Diabetes"]
    );
    console.log("Confirmed Meds:", res3.confirmedMedicationsCount, "| Confirmed Conditions:", res3.confirmedConditionsCount);
    console.log("Analyzed Pairs:", res3.analyzedPairsCount, "| Interactions Found:", res3.interactions.length);
    if (res3.analyzedPairsCount !== 6 || res3.interactions.length < 2) {
      throw new Error(`TEST 3 FAILED: Expected 6 analyzed pairs and >= 2 interactions, got ${res3.analyzedPairsCount} pairs & ${res3.interactions.length} interactions`);
    }
    console.log("✅ TEST 3 PASSED");

    // 4. Exclude Unverified Medicines & Conditions from Interaction Engine
    console.log("\n--- TEST 4: Exclude Unverified Items from Interaction Engine ---");
    const res4 = await drugConditionEngine.checkDrugConditionInteractions(
      [
        { rawText: "Pan...", brandName: "Pan...", status: "needs_review", needsReview: true },
        { medicineName: "Metformin 500mg", genericName: "Metformin", rxNormCui: "6809" },
      ],
      ["Kidny issue?"]
    );
    console.log("Status:", res4.status);
    console.log("Unverified Meds:", res4.unverifiedMedicines.length);
    console.log("Unverified Conditions:", res4.unverifiedConditions.length);
    if (res4.unverifiedMedicines.length !== 1 || res4.unverifiedConditions.length !== 1) {
      throw new Error("TEST 4 FAILED: Expected unverified items to be separated from analysis");
    }
    console.log("✅ TEST 4 PASSED");

    // 5. No Interaction Found (Paracetamol + Asthma)
    console.log("\n--- TEST 5: No Interaction Found (Paracetamol + Asthma) ---");
    const res5 = await drugConditionEngine.checkDrugConditionInteractions(
      [{ medicineName: "Dolo 650", genericName: "Paracetamol", rxNormCui: "161" }],
      ["Asthma"]
    );
    console.log("Status:", res5.status, "| Interactions:", res5.interactions.length);
    if (res5.status !== "NO_INTERACTION_FOUND" || res5.interactions.length !== 0) {
      throw new Error("TEST 5 FAILED: Expected NO_INTERACTION_FOUND for Paracetamol + Asthma");
    }
    console.log("✅ TEST 5 PASSED");

    console.log("\n==================================================");
    console.log("ALL MODULE 6 DRUG-CONDITION INTERACTION TESTS PASSED! 🎉");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ TEST FAILURE:", err);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runTests();
