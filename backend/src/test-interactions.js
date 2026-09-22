const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "../.env") });

const { connectDB } = require("./config/db");
const interactionEngine = require("./services/interactions/interactionEngine");

async function runTests() {
  console.log("=== MODULE 5: DRUG-DRUG INTERACTION ENGINE AUTOMATED VERIFICATION ===");

  try {
    await connectDB();
  } catch (dbErr) {
    console.warn("MongoDB connection notice:", dbErr.message);
  }

  try {
    // 1. Test Known Interaction Pair: Warfarin + Aspirin
    console.log("\n--- TEST 1: Known Interaction Pair (Warfarin + Aspirin) ---");
    const res1 = await interactionEngine.checkInteractions(
      [{ medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" }],
      [{ medicineName: "Aspirin 81mg", genericName: "Aspirin", rxNormCui: "1191" }]
    );
    console.log("Status:", res1.status);
    console.log("Checked Meds:", res1.checkedMedicationsCount, "| Analyzed Pairs:", res1.analyzedPairsCount);
    console.log("Interactions Count:", res1.interactions.length);
    if (res1.interactions.length > 0) {
      console.log("Found Interaction:", res1.interactions[0].drugA.name, "+", res1.interactions[0].drugB.name);
      console.log("Severity:", res1.interactions[0].severity);
      console.log("Description:", res1.interactions[0].description);
    }
    if (res1.status !== "INTERACTION_FOUND" || res1.interactions.length === 0) {
      throw new Error(`TEST 1 FAILED: Expected INTERACTION_FOUND for Warfarin + Aspirin, got ${res1.status}`);
    }
    console.log("✅ TEST 1 PASSED");

    // 2. Test No Interaction Pair: Metformin + Paracetamol
    console.log("\n--- TEST 2: No Known Interaction Pair (Metformin + Paracetamol) ---");
    const res2 = await interactionEngine.checkInteractions(
      [{ medicineName: "Metformin 500mg", genericName: "Metformin", rxNormCui: "6809" }],
      [{ medicineName: "Dolo 650", genericName: "Paracetamol", rxNormCui: "161" }]
    );
    console.log("Status:", res2.status);
    console.log("Checked Meds:", res2.checkedMedicationsCount, "| Analyzed Pairs:", res2.analyzedPairsCount);
    console.log("Interactions Count:", res2.interactions.length);
    if (res2.status !== "NO_INTERACTION_FOUND") {
      throw new Error(`TEST 2 FAILED: Expected NO_INTERACTION_FOUND, got ${res2.status}`);
    }
    console.log("✅ TEST 2 PASSED");

    // 3. Test Unknown Medicine: FakeDrugX123 + Metformin
    console.log("\n--- TEST 3: Unknown Medicine (FakeDrugX123) ---");
    const res3 = await interactionEngine.checkInteractions(
      [{ medicineName: "FakeDrugX123", brandName: "FakeDrugX123" }],
      [{ medicineName: "Metformin 500mg", genericName: "Metformin", rxNormCui: "6809" }]
    );
    console.log("Status:", res3.status);
    console.log("Unverified Items:", res3.unverifiedItems);
    if (res3.status !== "MEDICINE_UNKNOWN") {
      throw new Error(`TEST 3 FAILED: Expected MEDICINE_UNKNOWN, got ${res3.status}`);
    }
    console.log("✅ TEST 3 PASSED");

    // 4. Test Needs Review Medicine: Ambiguous OCR line
    console.log("\n--- TEST 4: Medicine Needs Review (Ambiguous handwriting) ---");
    const res4 = await interactionEngine.checkInteractions(
      [{ rawText: "Pan...", brandName: "Pan...", status: "needs_review", needsReview: true }],
      [{ medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" }]
    );
    console.log("Status:", res4.status);
    if (res4.status !== "MEDICINE_NEEDS_REVIEW") {
      throw new Error(`TEST 4 FAILED: Expected MEDICINE_NEEDS_REVIEW, got ${res4.status}`);
    }
    console.log("✅ TEST 4 PASSED");

    // 5. Test Pair Deduplication: 3 drugs = 3 unique pairs (A-B, A-C, B-C)
    console.log("\n--- TEST 5: Pair Deduplication (3 drugs => 3 unique pairs) ---");
    const res5 = await interactionEngine.checkInteractions(
      [
        { medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" },
        { medicineName: "Aspirin 81mg", genericName: "Aspirin", rxNormCui: "1191" },
      ],
      [{ medicineName: "Lisinopril 10mg", genericName: "Lisinopril", rxNormCui: "29046" }]
    );
    console.log("Checked Meds:", res5.checkedMedicationsCount, "| Analyzed Pairs:", res5.analyzedPairsCount);
    if (res5.analyzedPairsCount !== 3) {
      throw new Error(`TEST 5 FAILED: Expected 3 analyzed pairs for 3 drugs, got ${res5.analyzedPairsCount}`);
    }
    console.log("✅ TEST 5 PASSED");

    console.log("\n==================================================");
    console.log("ALL 5 DRUG-DRUG INTERACTION ENGINE TESTS PASSED SUCCESSFULLY! 🎉");
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
