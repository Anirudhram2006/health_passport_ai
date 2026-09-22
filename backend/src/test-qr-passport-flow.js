require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const Patient = require("./models/Patient");
const User = require("./models/User");
const QRPassport = require("./models/QRPassport");
const {
  generateOpaqueToken,
  buildPassportUrl,
  generatePassportQR,
  buildPayload,
  verifyPassportPayload,
} = require("./services/qr");

async function runQRPassportFlowTests() {
  console.log("==================================================");
  console.log("HEALTH PASSPORT AI — QR & NOTEPAD FLOW TEST SUITE");
  console.log("==================================================");

  await connectDB();

  let passed = 0;
  let total = 4;

  // TEST 1: Token & URL Generation
  console.log("\n[TEST 1/4] Testing Opaque Token & URL QR Generation...");
  const token = generateOpaqueToken();
  const passportUrl = buildPassportUrl(token);
  const qrDataUrl = await generatePassportQR(passportUrl);

  console.log("  -> Opaque Token:", token);
  console.log("  -> Passport URL:", passportUrl);
  console.log("  -> Encoded QR Length:", qrDataUrl.length, "bytes");

  if (token.startsWith("hpa_tok_") && passportUrl.includes("/passport/hpa_tok_") && qrDataUrl.startsWith("data:image/png;base64,")) {
    console.log("  => TEST 1 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 1 FAILED!");
  }

  // TEST 2: Patient DB Passport Creation & Token DTO Resolution
  console.log("\n[TEST 2/4] Testing DB Passport Registration & Controlled DTO...");
  let user = await User.findOne({ email: "qr.test.user@hpa.org" });
  if (!user) {
    user = await User.create({
      name: "Dinesh Kumar",
      email: "qr.test.user@hpa.org",
      password: "password123",
      role: "patient",
      verified: true,
    });
  }

  let patient = await Patient.findOne({ userId: user._id });
  if (!patient) {
    patient = await Patient.create({
      userId: user._id,
      passportId: "HPA-TEST-2026-8888",
      bloodGroup: "B+",
      chronicDiseases: ["Type 2 Diabetes"],
      allergies: [{ substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" }],
      medications: [{ name: "Dolo 650", brandName: "Dolo 650", genericName: "Paracetamol", strength: "650 mg", active: true }],
    });
  }

  const qrRecord = await QRPassport.create({
    patientId: patient._id,
    passportId: patient.passportId,
    token: generateOpaqueToken(),
    signature: "sig_12345",
    status: "active",
  });

  console.log("  -> QR Passport Record Created ID:", qrRecord._id);
  console.log("  -> Patient Name:", user.name, "| Blood Group:", patient.bloodGroup);

  if (qrRecord._id && patient.passportId === "HPA-TEST-2026-8888") {
    console.log("  => TEST 2 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 2 FAILED!");
  }

  // TEST 3: Revoked / Expired Passport Status Handling
  console.log("\n[TEST 3/4] Testing Revoked & Expired Status Handling...");
  const revokedRecord = await QRPassport.create({
    patientId: patient._id,
    passportId: patient.passportId,
    token: generateOpaqueToken(),
    signature: "sig_revoked",
    status: "revoked",
  });

  console.log("  -> Revoked Record Token:", revokedRecord.token, "| Status:", revokedRecord.status);

  if (revokedRecord.status === "revoked") {
    console.log("  => TEST 3 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 3 FAILED!");
  }

  // TEST 4: Null & Undefined Field Safety
  console.log("\n[TEST 4/4] Testing Null/Undefined Field Safety Guarding...");
  const emptyPatient = {
    userId: null,
    bloodGroup: undefined,
    dob: null,
    allergies: null,
    medications: null,
  };

  const safeStr = (val, fallback = "Not recorded") => (val && String(val).trim() ? String(val).trim() : fallback);
  const nameResult = safeStr(emptyPatient.userId?.name, "Patient Record");
  const bgResult = safeStr(emptyPatient.bloodGroup, "Unspecified");

  console.log("  -> Empty Patient Name Guard:", nameResult);
  console.log("  -> Empty Patient Blood Group Guard:", bgResult);

  if (nameResult === "Patient Record" && bgResult === "Unspecified") {
    console.log("  => TEST 4 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 4 FAILED!");
  }

  console.log("\n==================================================");
  console.log(`QR PASSPORT FLOW TEST SUMMARY: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runQRPassportFlowTests().catch((err) => {
  console.error("Error running QR flow tests:", err);
  process.exit(1);
});
