const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "../.env") });

const { connectDB } = require("./config/db");
const medicineMatcher = require("./services/ocr/medicineMatcher");
const medicineRecognizer = require("./services/ocr/medicineRecognizer");

async function runTests() {
  console.log("=== MODULE 5: MEDICINE NORMALIZATION PIPELINE TEST SUITE ===");

  try {
    await connectDB();
  } catch (dbErr) {
    console.warn("MongoDB connection notice:", dbErr.message);
  }

  try {
    const testCases = [
      { raw: "Montair LC", expectedGeneric: "Montelukast + Levocetirizine" },
      { raw: "Cefix 200", expectedGeneric: "Cefixime" },
      { raw: "Torez 10", expectedGeneric: "Torsemide" },
      { raw: "Cetzine 10", expectedGeneric: "Cetirizine" },
      { raw: "Pan-DSR", expectedGeneric: "Pantoprazole + Domperidone" },
      { raw: "Azemar P", expectedGeneric: "Aceclofenac + Paracetamol" },
      { raw: "Buosan Forte", expectedGeneric: "Hyoscine Butylbromide + Paracetamol" },
    ];

    console.log("\n--- TEST 1: Indian Commercial Brand Normalization ---");
    for (const tc of testCases) {
      const candidates = await medicineMatcher.matchCandidates(tc.raw);
      if (!candidates || candidates.length === 0) {
        throw new Error(`TEST FAILED: No candidates returned for "${tc.raw}"`);
      }
      const top = candidates[0];
      console.log(`Query: "${tc.raw}" -> Brand: "${top.brandName}", Generic: "${top.genericName}", Conf: ${top.confidence}, Match: ${top.matchType}`);
      if (top.genericName !== tc.expectedGeneric || top.confidence < 0.80) {
        throw new Error(`TEST FAILED for "${tc.raw}": Expected generic "${tc.expectedGeneric}", got "${top.genericName}" (conf: ${top.confidence})`);
      }
    }
    console.log("✅ TEST 1 PASSED: All Indian commercial brands resolved to correct generic composition with >= 0.80 confidence!");

    // Test 2: OCR Cleaning & Prefix Stripping
    console.log("\n--- TEST 2: OCR Prefix Stripping (Tab. Cefix 200, Cap. Pan-DSR, T. Azemar P) ---");
    const prefixTests = [
      { raw: "Tab. Cefix 200", expectedGeneric: "Cefixime" },
      { raw: "Cap. Pan-DSR", expectedGeneric: "Pantoprazole + Domperidone" },
      { raw: "T. Azemar P", expectedGeneric: "Aceclofenac + Paracetamol" },
    ];
    for (const pt of prefixTests) {
      const candidates = await medicineMatcher.matchCandidates(pt.raw);
      const top = candidates[0];
      console.log(`Query: "${pt.raw}" -> Generic: "${top?.genericName}", Conf: ${top?.confidence}`);
      if (top?.genericName !== pt.expectedGeneric || top.confidence < 0.80) {
        throw new Error(`TEST 2 FAILED for "${pt.raw}": Expected "${pt.expectedGeneric}"`);
      }
    }
    console.log("✅ TEST 2 PASSED: Prefix stripping works seamlessly!");

    console.log("\n==================================================");
    console.log("ALL MEDICINE NORMALIZATION TESTS PASSED SUCCESSFULLY! 🎉");
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
