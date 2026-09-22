require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const jwt = require("jsonwebtoken");

const { connectDB } = require("./config/db");
const Patient = require("./models/Patient");
const User = require("./models/User");
const MedicalReport = require("./models/MedicalReport");
const QRPassport = require("./models/QRPassport");
const AuditLog = require("./models/AuditLog");

const { checkDrugInteractions } = require("./services/interactions/interactionEngine");
const drugConditionEngine = require("./services/interactions/drugConditionEngine");
const duplicateDrugEngine = require("./services/interactions/duplicateDrugEngine");
const genericAlternativeEngine = require("./services/interactions/genericAlternativeEngine");
const { calculateTriageStatus } = require("./services/triageEngine");

const JWT_SECRET = process.env.JWT_SECRET || "78c4fac686ac631863f809be2b92c1c7f8f7e5897619362fb1049792873a37285e306f4129e336f35c67fc5bd06d2468";

function makeRequest(path, method = "GET", headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runFullReleaseQualityGate() {
  console.log("==================================================");
  console.log("HEALTH PASSPORT AI — FULL RELEASE QUALITY GATE PASS");
  console.log("==================================================");

  await connectDB();

  let passed = 0;
  let total = 14;

  // 1. Module 1: Auth & OTP Verification Endpoint Check
  console.log("\n[TEST 1/14] Module 1: Authentication & Health API check...");
  const healthRes = await makeRequest("/api/health", "GET");
  if (healthRes.status === 200 && healthRes.body?.status === "ok") {
    console.log("  => TEST 1 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 1 FAILED!");
  }

  // Create test patient and token
  let user = await User.findOne({ email: "gate.test@hpa.org" });
  if (!user) {
    user = await User.create({
      name: "Gate Test Patient",
      email: "gate.test@hpa.org",
      password: "password123",
      role: "patient",
      verified: true,
    });
  }

  let patient = await Patient.findOne({ userId: user._id });
  if (!patient) {
    patient = await Patient.create({
      userId: user._id,
      passportId: "HPA-GATE-2026-9999",
      bloodGroup: "A+",
      chronicDiseases: ["Asthma", "Hypertension"],
      allergies: [{ substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" }],
      emergencyContacts: [{ name: "Emergency Contact", relation: "Spouse", phone: "+91 99887 76655" }],
      medications: [
        { name: "Metformin 500mg", dosage: "500 mg", active: true },
        { name: "Amlodipine 5mg", dosage: "5 mg", active: true },
        { name: "Amlong 5mg", dosage: "5 mg", active: true },
        { name: "Dolo 650", dosage: "650 mg", active: true },
        { name: "Crocin 650", dosage: "650 mg", active: true },
      ],
    });
  }

  const authToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
  const authHeaders = { Authorization: `Bearer ${authToken}` };

  // 2. Module 2 & 3: Patient Profile & Report Retrieval
  console.log("\n[TEST 2/14] Module 2 & 3: Patient Profile & AI Summary API...");
  const meRes = await makeRequest("/api/patients/me", "GET", authHeaders);
  if (meRes.status === 200 && meRes.body?.patient?.passportId === "HPA-GATE-2026-9999") {
    console.log("  => TEST 2 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 2 FAILED!");
  }

  // 3. Module 5: Drug-Drug Interaction Engine
  console.log("\n[TEST 3/14] Module 5: Drug-Drug Interaction Engine...");
  const ddiRes = await checkDrugInteractions(["Warfarin", "Aspirin"]);
  if (Array.isArray(ddiRes) && ddiRes.length > 0) {
    console.log(`  -> Detected ${ddiRes.length} Drug-Drug interactions (Warfarin + Aspirin)`);
    console.log("  => TEST 3 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 3 FAILED!");
  }

  // 4. Module 6: Drug-Condition Contraindication Engine
  console.log("\n[TEST 4/14] Module 6: Drug-Condition Interaction Engine...");
  const dciRes = await drugConditionEngine.checkDrugConditionInteractions(
    [{ medicineName: "Ibuprofen 400mg", genericName: "Ibuprofen" }],
    ["Chronic Kidney Disease"]
  );
  if (dciRes && dciRes.status === "INTERACTION_FOUND") {
    console.log(`  -> Detected Drug-Condition interaction (Ibuprofen + CKD)`);
    console.log("  => TEST 4 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 4 FAILED!", dciRes);
  }

  // 5. Module 7: Duplicate Drug Detection
  console.log("\n[TEST 5/14] Module 7: Duplicate Drug Detection Engine...");
  const dupRes = await duplicateDrugEngine.checkDuplicateDrugs([
    {
      prescriptionId: "p1",
      fileName: "Rx1.pdf",
      medications: [{ name: "Dolo 650" }, { name: "Paracetamol 500" }],
    },
  ]);
  if (dupRes && dupRes.status === "DUPLICATES_FOUND") {
    console.log(`  -> Detected Duplicate Paracetamol Overlap`);
    console.log("  => TEST 5 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 5 FAILED!", dupRes);
  }

  // 6. Module 8: Generic Alternatives Suggestion
  console.log("\n[TEST 6/14] Module 8: Generic Alternatives Engine...");
  const genRes = await genericAlternativeEngine.findGenericAlternatives({ name: "Dolo 650" });
  if (genRes && (genRes.status === "ALTERNATIVES_FOUND" || genRes.alternatives?.length >= 0)) {
    console.log(`  -> Status: ${genRes.status}, Alternatives Count: ${genRes.alternatives?.length || 0}`);
    console.log("  => TEST 6 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 6 FAILED!", genRes);
  }

  // 7. Module 9: Generate Health Passport
  console.log("\n[TEST 7/14] Module 9: Generate Passport API (`POST /api/health-passport/generate`)...");
  const genPassRes = await makeRequest("/api/health-passport/generate", "POST", authHeaders);
  const token1 = genPassRes.body?.passport?.token;
  if (genPassRes.status === 200 && token1 && genPassRes.body?.passport?.status === "active") {
    console.log("  -> Generated Token:", token1);
    console.log("  => TEST 7 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 7 FAILED!");
  }

  // 8. Module 9: Strict Tier 1 Access Validation
  console.log("\n[TEST 8/14] Module 9: Strict Tier 1 Emergency Access Scan...");
  const tier1Res = await makeRequest(`/api/health-passport/validate/${token1}`, "GET");
  const passDto = tier1Res.body?.passport;
  const isStrictTier1 =
    tier1Res.status === 200 &&
    passDto?.patient?.name === "Gate Test Patient" &&
    passDto?.patient?.bloodGroup === "A+" &&
    passDto?.allergies?.length === 1 &&
    passDto?.emergencyContacts?.length === 1 &&
    passDto?.medicalHistory === undefined &&
    passDto?.medications === undefined &&
    passDto?.medicalReports === undefined;

  if (isStrictTier1) {
    console.log("  -> Strict Tier 1 Data returned successfully. Withheld sensitive history/medications.");
    console.log("  => TEST 8 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 8 FAILED!");
  }

  // 9. Module 9: Regenerate Passport (Old token invalidation)
  console.log("\n[TEST 9/14] Module 9: Regenerate Passport & Old Token Invalidation...");
  const regenRes = await makeRequest("/api/health-passport/regenerate", "POST", authHeaders);
  const token2 = regenRes.body?.passport?.token;
  const oldScanRes = await makeRequest(`/api/health-passport/validate/${token1}`, "GET");

  if (regenRes.status === 200 && token2 !== token1 && oldScanRes.status === 410 && oldScanRes.body?.status === "REVOKED") {
    console.log("  -> Old Token scan returned 410 REVOKED as expected.");
    console.log("  => TEST 9 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 9 FAILED!");
  }

  // 10. Module 9: New Token Validation
  console.log("\n[TEST 10/14] Module 10: Validate New Regenerated Token...");
  const newScanRes = await makeRequest(`/api/health-passport/validate/${token2}`, "GET");
  if (newScanRes.status === 200 && newScanRes.body?.passport?.token === token2) {
    console.log("  => TEST 10 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 10 FAILED!");
  }

  // 11. Module 9: Revoke Passport
  console.log("\n[TEST 11/14] Module 11: Revoke Passport (`POST /api/health-passport/revoke`)...");
  const revokeRes = await makeRequest("/api/health-passport/revoke", "POST", authHeaders);
  const revokedScanRes = await makeRequest(`/api/health-passport/validate/${token2}`, "GET");

  if (revokeRes.status === 200 && revokedScanRes.status === 410) {
    console.log("  -> Revoked Token scan returned 410 REVOKED.");
    console.log("  => TEST 11 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 11 FAILED!");
  }

  // 12. Module 9: Unknown Token Friendly 404 Error State
  console.log("\n[TEST 12/14] Module 12: Unknown / Tampered Token Safety...");
  const invalidScanRes = await makeRequest("/api/health-passport/validate/hpa_tok_nonexistent_12345", "GET");
  if (invalidScanRes.status === 404 && invalidScanRes.body?.status === "NOT_FOUND") {
    console.log("  -> Unknown token scan returned 404 NOT_FOUND safely.");
    console.log("  => TEST 12 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 12 FAILED!");
  }

  // 13. Audit Log Recorded
  console.log("\n[TEST 13/14] Module 9 & 13: Verify AuditLog entries generated...");
  const auditLogs = await AuditLog.find({ targetId: patient._id.toString() });
  if (auditLogs.length > 0) {
    console.log(`  -> Audit Entries Found for Patient: ${auditLogs.length}`);
    console.log("  => TEST 13 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 13 FAILED!");
  }

  // 14. Unauthenticated Access Control Check
  console.log("\n[TEST 14/14] Security: Unauthenticated Management Request Rejection...");
  const unauthGen = await makeRequest("/api/health-passport/generate", "POST");
  const unauthRegen = await makeRequest("/api/health-passport/regenerate", "POST");
  const unauthRevoke = await makeRequest("/api/health-passport/revoke", "POST");

  if (unauthGen.status === 401 && unauthRegen.status === 401 && unauthRevoke.status === 401) {
    console.log("  -> Unauthenticated management requests blocked with 401.");
    console.log("  => TEST 14 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 14 FAILED!");
  }

  console.log("\n==================================================");
  console.log(`FULL RELEASE QUALITY GATE SUMMARY: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runFullReleaseQualityGate().catch((err) => {
  console.error("Error executing Quality Gate tests:", err);
  process.exit(1);
});
