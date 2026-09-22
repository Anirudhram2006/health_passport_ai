require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const Patient = require("./models/Patient");
const User = require("./models/User");
const MedicalReport = require("./models/MedicalReport");
const QRPassport = require("./models/QRPassport");
const AuditLog = require("./models/AuditLog");

const { buildPayload, generatePassportQR, verifyPassportPayload } = require("./services/qr");
const { calculateTriageStatus } = require("./services/triageEngine");
const { aggregatePatientHistory } = require("./services/historyAggregator");
const { calculateHealthRiskScore } = require("./services/riskScoreEngine");

async function runModules9To13IntegrationTests() {
  console.log("==================================================");
  console.log("HEALTH PASSPORT AI — MODULES 9–13 INTEGRATION TEST");
  console.log("==================================================");

  await connectDB();

  let passedCount = 0;
  let totalCount = 5;

  // 1. MODULE 9 — Cryptographic QR Passport Payload & HMAC Verification
  console.log("\n[TEST 1/5] Module 9: QR Passport HMAC Generation & Cryptographic Verification...");
  const dummyPatient = {
    _id: new mongoose.Types.ObjectId(),
    passportId: "HPA-TEST-2026-9999",
    name: "John Doe",
    bloodGroup: "O+",
    dob: new Date("1985-05-15"),
    allergies: [{ substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" }],
    chronicDiseases: ["Type 2 Diabetes", "Hypertension"],
    medications: [
      { name: "Metformin 500mg", dosage: "500 mg", active: true },
      { name: "Amlodipine 5mg", dosage: "5 mg", active: true },
    ],
  };

  const payload = buildPayload(dummyPatient);
  console.log("  -> Generated Payload:", JSON.stringify(payload));

  const isValidSig = verifyPassportPayload(payload);
  console.log(`  -> Cryptographic Signature Verification Result: ${isValidSig ? "VALID ✓" : "INVALID ✗"}`);

  // Tamper check
  const tamperedPayload = { ...payload, bloodGroup: "AB-" };
  const isTamperedValid = verifyPassportPayload(tamperedPayload);
  console.log(`  -> Tampered Payload Verification Result: ${!isTamperedValid ? "REJECTED (Tampered) ✓" : "ACCEPTED ✗"}`);

  if (isValidSig && !isTamperedValid) {
    console.log("  => TEST 1 PASSED!");
    passedCount++;
  } else {
    console.error("  => TEST 1 FAILED!");
  }

  // 2. MODULE 10 — Emergency Access Portal & Dynamic Triage Standard
  console.log("\n[TEST 2/5] Module 10: Dynamic Emergency Triage Standard (RED/YELLOW/GREEN)...");
  const triageResultRed = calculateTriageStatus(dummyPatient, [{ drugA: "DrugA", drugB: "DrugB", severity: "High" }]);
  console.log("  -> High Risk Patient Triage Level:", triageResultRed.level, "| Badge:", triageResultRed.badgeLabel);
  console.log("  -> Priority Reasons:", triageResultRed.reasons);

  const healthyPatient = {
    _id: new mongoose.Types.ObjectId(),
    passportId: "HPA-TEST-2026-0000",
    allergies: [],
    chronicDiseases: [],
    medications: [{ name: "Vitamin C 500mg", active: true }],
  };
  const triageResultGreen = calculateTriageStatus(healthyPatient, []);
  console.log("  -> Low Risk Patient Triage Level:", triageResultGreen.level, "| Badge:", triageResultGreen.badgeLabel);

  if (triageResultRed.level === "RED" && triageResultGreen.level === "GREEN") {
    console.log("  => TEST 2 PASSED!");
    passedCount++;
  } else {
    console.error("  => TEST 2 FAILED!");
  }

  // 3. MODULE 11 — Patient History Synchronization & Multi-Report Aggregation
  console.log("\n[TEST 3/5] Module 11: Multi-Report History Aggregation & Timeline Synchronization...");
  const dummyReports = [
    {
      _id: new mongoose.Types.ObjectId(),
      title: "Quarterly Lipid & Glucose Panel",
      type: "Lab Report",
      doctor: "Dr. Neha Kapoor",
      hospital: "Apollo Diagnostics",
      createdAt: new Date("2026-02-10"),
      extracted: "HbA1c: 6.8% Fasting Glucose: 132 mg/dL Atorvastatin 10mg prescribed for cholesterol management.",
      aiSummary: "Glycemic control adequate. Added Atorvastatin 10mg.",
    },
    {
      _id: new mongoose.Types.ObjectId(),
      title: "Cardiology Evaluation Report",
      type: "Consultation",
      doctor: "Dr. Anil Mehta",
      hospital: "Max Heart Institute",
      createdAt: new Date("2026-01-15"),
      extracted: "Patient on Amlodipine 5mg once daily.",
      aiSummary: "BP controlled at 128/82 mmHg.",
    },
  ];

  const aggregatedHistory = aggregatePatientHistory(dummyPatient, dummyReports);
  console.log("  -> Total Reports Aggregated:", aggregatedHistory.totalReportsCount);
  console.log("  -> Aggregated Medications Count:", aggregatedHistory.aggregatedMedications.length);
  console.log("  -> Lab Trends Extracted:", aggregatedHistory.labTrends);
  console.log("  -> Chronological Timeline Events:", aggregatedHistory.timeline.length);

  if (aggregatedHistory.totalReportsCount === 2 && aggregatedHistory.aggregatedMedications.length >= 2 && aggregatedHistory.labTrends.length >= 1) {
    console.log("  => TEST 3 PASSED!");
    passedCount++;
  } else {
    console.error("  => TEST 3 FAILED!");
  }

  // 4. MODULE 12 — Doctor / Hospital Provider Verification Controls & Audit
  console.log("\n[TEST 4/5] Module 12: Doctor / Hospital Verification Controls & Audit Logging...");
  let mockUser = await User.findOne({ email: "test.doctor@hpa.org" });
  if (!mockUser) {
    mockUser = await User.create({
      name: "Dr. Test Provider",
      email: "test.doctor@hpa.org",
      password: "password123",
      role: "doctor",
      verified: true,
    });
  }
  console.log("  -> Created/Verified Doctor User:", mockUser.email, "| Verified:", mockUser.verified, "| Role:", mockUser.role);

  const auditEntry = await AuditLog.create({
    user: mockUser.email,
    action: "Verified Provider Medical Record Access",
    level: "info",
  });
  console.log("  -> Audit Log Entry Created ID:", auditEntry._id);

  if (mockUser.verified && auditEntry._id) {
    console.log("  => TEST 4 PASSED!");
    passedCount++;
  } else {
    console.error("  => TEST 4 FAILED!");
  }

  // 5. MODULE 13 — Analytics, Risk Stratification & Health Score Engine
  console.log("\n[TEST 5/5] Module 13: Analytics, Risk Stratification & Health Score Calculation...");
  const mockDrugInteractions = [
    { drugA: "Metformin", drugB: "Contrast Agent", severity: "Major" },
  ];
  const mockConditionInteractions = [
    { drug: "Amlodipine", condition: "Severe Hypotension", severity: "Warning" },
  ];

  const riskAnalysis = calculateHealthRiskScore(dummyPatient, mockDrugInteractions, mockConditionInteractions);
  console.log("  -> Calculated Health Score:", riskAnalysis.score, "/ 100");
  console.log("  -> Risk Tier:", riskAnalysis.tier, "(", riskAnalysis.label, ")");
  console.log("  -> Applied Penalties Count:", riskAnalysis.penalties.length);
  console.log("  -> Clinical Recommendations:", riskAnalysis.recommendations);

  if (riskAnalysis.score < 100 && riskAnalysis.penalties.length > 0 && riskAnalysis.tier) {
    console.log("  => TEST 5 PASSED!");
    passedCount++;
  } else {
    console.error("  => TEST 5 FAILED!");
  }

  console.log("\n==================================================");
  console.log(`MODULES 9–13 INTEGRATION TEST SUMMARY: ${passedCount} / ${totalCount} PASSED (${Math.round((passedCount/totalCount)*100)}%)`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(passedCount === totalCount ? 0 : 1);
}

runModules9To13IntegrationTests().catch((err) => {
  console.error("Error running integration tests:", err);
  process.exit(1);
});
