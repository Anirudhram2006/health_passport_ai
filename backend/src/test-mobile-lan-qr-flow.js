require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const Patient = require("./models/Patient");
const User = require("./models/User");
const QRPassport = require("./models/QRPassport");
const { buildPassportUrl, generateOpaqueToken } = require("./services/qr");

async function runMobileLANTests() {
  console.log("==================================================");
  console.log("HEALTH PASSPORT AI — MOBILE & LAN IP TEST SUITE");
  console.log("==================================================");

  await connectDB();

  let passed = 0;
  let total = 3;

  // TEST 1: Simulated Mobile Request Header Origin Resolution
  console.log("\n[TEST 1/3] Testing Dynamic LAN IP URL Generation...");
  const mockToken = generateOpaqueToken();

  const mockMobileReq = {
    get: (headerName) => {
      if (headerName === "origin") return "http://192.168.1.5:3000";
      if (headerName === "host") return "192.168.1.5:5000";
      return null;
    },
    protocol: "http",
  };

  const lanPassportUrl = buildPassportUrl(mockToken, mockMobileReq);
  console.log("  -> Simulated Mobile Request Origin: http://192.168.1.5:3000");
  console.log("  -> Generated LAN Passport URL:", lanPassportUrl);

  if (lanPassportUrl === `http://192.168.1.5:3000/passport/${mockToken}`) {
    console.log("  => TEST 1 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 1 FAILED! Expected http://192.168.1.5:3000/passport/" + mockToken);
  }

  // TEST 2: CORS Regex Origin Pattern Verification
  console.log("\n[TEST 2/3] Testing LAN Origin CORS Regex Matching...");
  const corsRegex = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

  const testOrigins = [
    "http://192.168.1.5:3000",
    "http://10.0.0.12:3000",
    "http://172.16.0.4:3000",
    "http://localhost:3000",
  ];

  const allMatched = testOrigins.every((orig) => corsRegex.test(orig));
  console.log("  -> Tested Origins:", testOrigins);
  console.log(`  -> CORS Pattern Match Result: ${allMatched ? "ALL MATCHED ✓" : "FAILED ✗"}`);

  if (allMatched) {
    console.log("  => TEST 2 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 2 FAILED!");
  }

  // TEST 3: DB Passport Registration with LAN Token
  console.log("\n[TEST 3/3] Testing Passport Record Registration with LAN Token...");
  let user = await User.findOne({ email: "lan.mobile.user@hpa.org" });
  if (!user) {
    user = await User.create({
      name: "LAN Mobile User",
      email: "lan.mobile.user@hpa.org",
      password: "password123",
      role: "patient",
      verified: true,
    });
  }

  let patient = await Patient.findOne({ userId: user._id });
  if (!patient) {
    patient = await Patient.create({
      userId: user._id,
      passportId: "HPA-LAN-2026-7777",
      bloodGroup: "A+",
    });
  }

  const qrRecord = await QRPassport.create({
    patientId: patient._id,
    passportId: patient.passportId,
    token: mockToken,
    signature: "sig_lan_test",
    status: "active",
  });

  console.log("  -> Created QR Passport Record ID:", qrRecord._id);
  console.log("  -> Registered Token:", qrRecord.token);

  if (qrRecord._id && qrRecord.token === mockToken) {
    console.log("  => TEST 3 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 3 FAILED!");
  }

  console.log("\n==================================================");
  console.log(`MOBILE LAN IP TEST SUMMARY: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runMobileLANTests().catch((err) => {
  console.error("Error running mobile LAN tests:", err);
  process.exit(1);
});
