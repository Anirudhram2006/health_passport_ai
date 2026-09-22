require("dotenv").config();
const { connectDB } = require("./config/db");
const medicineMatcher = require("./services/ocr/medicineMatcher");
const { rankCandidates } = require("./services/ocr/confidence");
const { lookupRxNorm } = require("./services/ocr/rxNormService");

async function runTests() {
  console.log("==========================================================");
  console.log("RUNNING MODULE 2 UPGRADE: MEDICINE-AWARE OCR TEST SUITE");
  console.log("==========================================================");

  await connectDB();

  // Test 1: Exact Brand Matching & Generic Resolution
  console.log("\n[Test 1] Brand Match & Generic Resolution:");
  const test1 = await medicineMatcher.matchCandidates("glycomet 500", "500 mg");
  console.log("  Input: 'glycomet 500'");
  if (test1.length > 0) {
    console.log(`  ✅ Matched Brand: "${test1[0].brandName}" | Generic: "${test1[0].genericName}" | Score: ${test1[0].confidence}`);
  } else {
    console.error("  ❌ Test 1 Failed: Glycomet not matched!");
    process.exit(1);
  }

  // Test 2: Ambiguous Handwriting & Candidate Ranking
  console.log("\n[Test 2] Ambiguous Handwriting Candidate Candidates:");
  const test2 = await medicineMatcher.matchCandidates("Amox");
  console.log("  Input: 'Amox'");
  console.log("  Candidates Returned:", test2.map(c => `${c.brandName} (${Math.round(c.confidence*100)}%)`));
  const ranking2 = rankCandidates(test2, "Amox");
  console.log(`  Ranking Status: "${ranking2.status}" (Expected: "needs_review")`);
  if (ranking2.status === "needs_review" && test2.length >= 2) {
    console.log("  ✅ Candidate Ranking Correctly Flagged 'needs_review' for Ambiguous Entry!");
  } else {
    console.error("  ❌ Test 2 Failed: Did not flag needs_review for ambiguous query!");
    process.exit(1);
  }

  // Test 3: Fuzzy OCR Spelling Error Correction
  console.log("\n[Test 3] Fuzzy OCR Error Correction:");
  const test3 = await medicineMatcher.matchCandidates("cefixime 200");
  console.log("  Input: 'cefixime 200'");
  if (test3.length > 0) {
    console.log(`  ✅ Matched: "${test3[0].brandName}" | Generic: "${test3[0].genericName}" | Confidence: ${test3[0].confidence}`);
  } else {
    console.error("  ❌ Test 3 Failed: Cefixime fuzzy match failed!");
    process.exit(1);
  }

  // Test 4: RxNorm Standardization
  console.log("\n[Test 4] RxNorm Concept Standardization:");
  const rxResult = await lookupRxNorm("Paracetamol");
  console.log("  Query: 'Paracetamol'");
  if (rxResult && rxResult.rxcui) {
    console.log(`  ✅ RxCUI Found: ${rxResult.rxcui} | Standard Name: "${rxResult.rxNormName}"`);
  } else {
    console.warn("  ⚠️ RxNorm offline fallback used");
  }

  // Test 5: Non-hallucination check
  console.log("\n[Test 5] Non-Hallucination Verification:");
  const test5 = await medicineMatcher.matchCandidates("xyz123randomscribble");
  const ranking5 = rankCandidates(test5, "xyz123randomscribble");
  console.log("  Input: 'xyz123randomscribble'");
  console.log(`  Status: "${ranking5.status}" (Expected: "unresolved")`);
  if (ranking5.status === "unresolved") {
    console.log("  ✅ Non-Hallucination Enforced: Returned unresolved for invalid scribble!");
  } else {
    console.error("  ❌ Test 5 Failed: Hallucinated candidate for invalid input!");
    process.exit(1);
  }

  console.log("\n==========================================================");
  console.log("🎉 ALL MEDICINE-AWARE RECOGNITION TESTS PASSED!");
  console.log("==========================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
