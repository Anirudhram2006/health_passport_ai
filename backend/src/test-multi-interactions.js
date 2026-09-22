const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "../.env") });

const { connectDB } = require("./config/db");
const interactionEngine = require("./services/interactions/interactionEngine");

async function runTests() {
  console.log("=== MODULE 5 ENHANCEMENT: MULTI-PRESCRIPTION INTERACTION ENGINE TEST SUITE ===");

  try {
    await connectDB();
  } catch (dbErr) {
    console.warn("MongoDB connection notice:", dbErr.message);
  }

  try {
    // 1. Single prescription with multiple medicines
    console.log("\n--- TEST 1: Single Prescription with Multiple Medicines ---");
    const res1 = await interactionEngine.checkMultiplePrescriptions([
      {
        prescriptionId: "p1",
        fileName: "prescription_01.jpg",
        medications: [
          { medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" },
          { medicineName: "Aspirin 81mg", genericName: "Aspirin", rxNormCui: "1191" },
        ],
      },
    ]);
    console.log("Status:", res1.status, "| Prescriptions Analyzed:", res1.prescriptionsAnalyzedCount);
    console.log("Extracted Meds:", res1.totalExtractedMedsCount, "| Unique Normalized:", res1.uniqueNormalizedMedsCount);
    if (res1.status !== "INTERACTION_FOUND" || res1.interactions.length === 0) {
      throw new Error("TEST 1 FAILED: Expected INTERACTION_FOUND for Warfarin + Aspirin");
    }
    console.log("✅ TEST 1 PASSED");

    // 2. Multiple prescriptions with one medicine each
    console.log("\n--- TEST 2: Multiple Prescriptions with One Medicine Each ---");
    const res2 = await interactionEngine.checkMultiplePrescriptions([
      { prescriptionId: "p1", fileName: "prescription_01.jpg", medications: [{ medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" }] },
      { prescriptionId: "p2", fileName: "prescription_02.pdf", medications: [{ medicineName: "Aspirin 81mg", genericName: "Aspirin", rxNormCui: "1191" }] },
    ]);
    console.log("Status:", res2.status, "| Analyzed Pairs:", res2.analyzedPairsCount);
    if (res2.status !== "INTERACTION_FOUND" || res2.analyzedPairsCount !== 1) {
      throw new Error("TEST 2 FAILED: Expected cross-prescription interaction between p1 and p2");
    }
    console.log("✅ TEST 2 PASSED");

    // 3. Cross-prescription interaction between medicines from different prescriptions
    console.log("\n--- TEST 3: Cross-Prescription Interaction (p1: Warfarin, p3: Ibuprofen) ---");
    const res3 = await interactionEngine.checkMultiplePrescriptions([
      { prescriptionId: "p1", fileName: "prescription_01.jpg", medications: [{ medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" }] },
      { prescriptionId: "p2", fileName: "prescription_02.jpg", medications: [{ medicineName: "Dolo 650", genericName: "Paracetamol", rxNormCui: "161" }] },
      { prescriptionId: "p3", fileName: "prescription_03.pdf", medications: [{ medicineName: "Ibuprofen 400mg", genericName: "Ibuprofen", rxNormCui: "5640" }] },
    ]);
    console.log("Status:", res3.status, "| Interactions Found:", res3.interactions.length);
    const warIbu = res3.interactions.find(
      (i) =>
        (i.drugA.name.toLowerCase().includes("warfarin") && i.drugB.name.toLowerCase().includes("ibuprofen")) ||
        (i.drugA.name.toLowerCase().includes("ibuprofen") && i.drugB.name.toLowerCase().includes("warfarin"))
    );
    if (!warIbu) {
      throw new Error("TEST 3 FAILED: Expected Warfarin (p1) ↔ Ibuprofen (p3) interaction");
    }
    console.log("Drug A Sources:", warIbu.drugA.sources);
    console.log("Drug B Sources:", warIbu.drugB.sources);
    console.log("✅ TEST 3 PASSED");

    // 4. Duplicate medicine across prescriptions (Brand vs Generic / Same Active Ingredient)
    console.log("\n--- TEST 4: Duplicate Medicine Deduplication (p1: Paracetamol, p2: Calpol) ---");
    const res4 = await interactionEngine.checkMultiplePrescriptions([
      { prescriptionId: "p1", fileName: "prescription_01.jpg", medications: [{ medicineName: "Paracetamol 500mg", genericName: "Paracetamol", rxNormCui: "161" }] },
      { prescriptionId: "p2", fileName: "prescription_02.jpg", medications: [{ medicineName: "Calpol 650", genericName: "Paracetamol", rxNormCui: "161" }] },
    ]);
    console.log("Extracted Meds:", res4.totalExtractedMedsCount, "| Unique Normalized Meds:", res4.uniqueNormalizedMedsCount);
    if (res4.uniqueNormalizedMedsCount !== 1) {
      throw new Error(`TEST 4 FAILED: Expected 1 unique normalized med for Paracetamol+Calpol, got ${res4.uniqueNormalizedMedsCount}`);
    }
    console.log("Accumulated Sources for Paracetamol:", res4.analyzedMeds[0].sources);
    if (res4.analyzedMeds[0].sources.length !== 2) {
      throw new Error("TEST 4 FAILED: Expected Paracetamol to accumulate sources from both p1 and p2");
    }
    console.log("✅ TEST 4 PASSED");

    // 5. Active patient health records + uploaded prescriptions combined
    console.log("\n--- TEST 5: Active Patient Health Records + Uploaded Prescriptions ---");
    const patientActiveMeds = [{ medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" }];
    const uploadedPrescs = [
      { prescriptionId: "rx1", fileName: "rx_new.jpg", medications: [{ medicineName: "Aspirin 81mg", genericName: "Aspirin", rxNormCui: "1191" }] },
    ];
    const res5 = await interactionEngine.checkMultiplePrescriptions(uploadedPrescs, patientActiveMeds);
    console.log("Status:", res5.status, "| Unique Meds:", res5.uniqueNormalizedMedsCount);
    if (res5.status !== "INTERACTION_FOUND") {
      throw new Error("TEST 5 FAILED: Expected interaction between active record Warfarin and uploaded Aspirin");
    }
    console.log("✅ TEST 5 PASSED");

    // 6. Unknown / Low-confidence OCR item with source tracking
    console.log("\n--- TEST 6: Unknown / Low-confidence OCR Item Source Attribution ---");
    const res6 = await interactionEngine.checkMultiplePrescriptions([
      { prescriptionId: "p1", fileName: "presc_good.jpg", medications: [{ medicineName: "Metformin 500mg", genericName: "Metformin", rxNormCui: "6809" }] },
      { prescriptionId: "p2", fileName: "presc_blurry.jpg", medications: [{ rawText: "Pan...", brandName: "Pan...", status: "needs_review", needsReview: true }] },
    ]);
    console.log("Status:", res6.status);
    console.log("Unverified Items Count:", res6.unverifiedItems.length);
    console.log("Unverified Item Source:", res6.unverifiedItems[0]?.sources);
    if (res6.status !== "MEDICINE_NEEDS_REVIEW" || res6.unverifiedItems[0]?.sources[0]?.fileName !== "presc_blurry.jpg") {
      throw new Error("TEST 6 FAILED: Expected MEDICINE_NEEDS_REVIEW with source presc_blurry.jpg");
    }
    console.log("✅ TEST 6 PASSED");

    // 7. Partial Failure Resilience (1 failed file out of 3)
    console.log("\n--- TEST 7: Partial Failure Resilience (1 failed file among 3) ---");
    const res7 = await interactionEngine.checkMultiplePrescriptions([
      { prescriptionId: "p1", fileName: "p1.jpg", medications: [{ medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" }] },
      { prescriptionId: "p2", fileName: "corrupted.jpg", processingStatus: "failed", error: "File unreadable" },
      { prescriptionId: "p3", fileName: "p3.jpg", medications: [{ medicineName: "Aspirin 81mg", genericName: "Aspirin", rxNormCui: "1191" }] },
    ]);
    console.log("Prescriptions Analyzed:", res7.prescriptionsAnalyzedCount, "| Failed:", res7.failedPrescriptionsCount);
    console.log("Status:", res7.status);
    if (res7.prescriptionsAnalyzedCount !== 2 || res7.failedPrescriptionsCount !== 1 || res7.status !== "INTERACTION_FOUND") {
      throw new Error("TEST 7 FAILED: Expected partial failure to allow 2 successful files to be analyzed");
    }
    console.log("✅ TEST 7 PASSED");

    // 8. Large Pair Combinations Formula N * (N - 1) / 2 Check
    console.log("\n--- TEST 8: Pair Combinations Formula N*(N-1)/2 (4 unique drugs => 6 pairs) ---");
    const res8 = await interactionEngine.checkMultiplePrescriptions([
      {
        prescriptionId: "p1",
        fileName: "p1.pdf",
        medications: [
          { medicineName: "Warfarin 5mg", genericName: "Warfarin", rxNormCui: "11289" },
          { medicineName: "Aspirin 81mg", genericName: "Aspirin", rxNormCui: "1191" },
          { medicineName: "Metformin 500mg", genericName: "Metformin", rxNormCui: "6809" },
          { medicineName: "Lisinopril 10mg", genericName: "Lisinopril", rxNormCui: "29046" },
        ],
      },
    ]);
    console.log("Unique Meds:", res8.uniqueNormalizedMedsCount, "| Analyzed Pairs:", res8.analyzedPairsCount);
    if (res8.uniqueNormalizedMedsCount !== 4 || res8.analyzedPairsCount !== 6) {
      throw new Error(`TEST 8 FAILED: Expected 6 analyzed pairs for 4 drugs, got ${res8.analyzedPairsCount}`);
    }
    console.log("✅ TEST 8 PASSED");

    console.log("\n==================================================");
    console.log("ALL MULTI-PRESCRIPTION INTERACTION ENGINE TESTS PASSED! 🎉");
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
