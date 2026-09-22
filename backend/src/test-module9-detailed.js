require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const { connectDB } = require("./config/db");
const Patient = require("./models/Patient");
const User = require("./models/User");
const QRPassport = require("./models/QRPassport");
const AuditLog = require("./models/AuditLog");
const jwt = require("jsonwebtoken");

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

async function testModule9Requirements() {
  console.log("==================================================");
  console.log("MODULE 9: SECURE QR HEALTH PASSPORT - DETAILED TEST");
  console.log("==================================================");

  await connectDB();

  // Create test patient user
  let user = await User.findOne({ email: "mod9.test@hpa.org" });
  if (!user) {
    user = await User.create({
      name: "Module9 Patient",
      email: "mod9.test@hpa.org",
      password: "password123",
      role: "patient",
      verified: true,
    });
  }

  let patient = await Patient.findOne({ userId: user._id });
  if (!patient) {
    patient = await Patient.create({
      userId: user._id,
      passportId: "HPA-MOD9-2026-1001",
      bloodGroup: "O+",
      allergies: [{ substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" }],
      emergencyContacts: [{ name: "Emergency Contact", relation: "Spouse", phone: "+91 99999 88888" }],
      medicalHistory: [{ title: "Diabetes", description: "Type 2" }],
      medications: [{ name: "Metformin", active: true }],
    });
  }

  const authToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
  const authHeaders = { Authorization: `Bearer ${authToken}` };

  let passed = 0;
  let total = 8;

  // 1. Generate / Get Passport
  console.log("\n[TEST 1/8] Authenticated Patient retrieves / generates Passport...");
  const meRes = await makeRequest("/api/health-passport/me", "GET", authHeaders);
  console.log("  -> Status:", meRes.status);
  console.log("  -> Token:", meRes.body?.passport?.token);
  console.log("  -> Passport Status:", meRes.body?.passport?.status);
  console.log("  -> QR Length:", meRes.body?.passport?.qr?.length);

  const initialToken = meRes.body?.passport?.token;
  if (meRes.status === 200 && initialToken && meRes.body?.passport?.status === "active") {
    console.log("  => TEST 1 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 1 FAILED!", meRes.body);
  }

  // 2. Validate QR Payload Security (No raw medical data or secrets)
  console.log("\n[TEST 2/8] Verifying QR Code URL contains NO raw medical JSON or sensitive data...");
  const qrUrl = meRes.body?.passport?.url || "";
  console.log("  -> QR Target URL:", qrUrl);

  const containsRawData = qrUrl.includes("Penicillin") || qrUrl.includes("Diabetes") || qrUrl.includes("Metformin") || qrUrl.includes("password");
  const isOpaqueUrl = qrUrl.includes("/passport/hpa_tok_");

  if (isOpaqueUrl && !containsRawData) {
    console.log("  => TEST 2 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 2 FAILED!");
  }

  // 3. Public Tier 1 Validation Check
  console.log("\n[TEST 3/8] Validating Public QR Scan returns STRICT TIER 1 Data ONLY...");
  const tier1Res = await makeRequest(`/api/health-passport/validate/${initialToken}`, "GET");
  console.log("  -> Status:", tier1Res.status);
  const passportDto = tier1Res.body?.passport || {};
  console.log("  -> Patient Name:", passportDto.patient?.name);
  console.log("  -> Blood Group:", passportDto.patient?.bloodGroup);
  console.log("  -> Allergies:", passportDto.allergies?.length);
  console.log("  -> Emergency Contacts:", passportDto.emergencyContacts?.length);
  console.log("  -> Medical History Exposed?:", passportDto.medicalHistory !== undefined);
  console.log("  -> Medications Exposed?:", passportDto.medications !== undefined);
  console.log("  -> Reports Exposed?:", passportDto.medicalReports !== undefined);

  const isTier1Strict =
    tier1Res.status === 200 &&
    passportDto.patient?.name === "Module9 Patient" &&
    passportDto.patient?.bloodGroup === "O+" &&
    passportDto.allergies?.length === 1 &&
    passportDto.emergencyContacts?.length === 1 &&
    passportDto.medicalHistory === undefined &&
    passportDto.medications === undefined &&
    passportDto.medicalReports === undefined;

  if (isTier1Strict) {
    console.log("  => TEST 3 PASSED! (Strict Tier 1 Access Enforced)");
    passed++;
  } else {
    console.error("  => TEST 3 FAILED! Sensitive data was exposed or invalid response.");
  }

  // 4. Regenerate QR Passport
  console.log("\n[TEST 4/8] Patient Regenerates QR Passport (Invalidates Previous)...");
  const regenRes = await makeRequest("/api/health-passport/regenerate", "POST", authHeaders);
  const newToken = regenRes.body?.passport?.token;
  console.log("  -> Status:", regenRes.status);
  console.log("  -> Old Token:", initialToken);
  console.log("  -> New Token:", newToken);

  if (regenRes.status === 200 && newToken && newToken !== initialToken) {
    console.log("  => TEST 4 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 4 FAILED!", regenRes.body);
  }

  // 5. Verify Old Token is Revoked/Invalid
  console.log("\n[TEST 5/8] Verifying Old Token Scan is REJECTED (HTTP 410 REVOKED)...");
  const oldScanRes = await makeRequest(`/api/health-passport/validate/${initialToken}`, "GET");
  console.log("  -> Status Code:", oldScanRes.status);
  console.log("  -> Response Status:", oldScanRes.body?.status);

  if (oldScanRes.status === 410 && oldScanRes.body?.status === "REVOKED") {
    console.log("  => TEST 5 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 5 FAILED!", oldScanRes.body);
  }

  // 6. Verify New Token is Active
  console.log("\n[TEST 6/8] Verifying New Token Scan returns Tier 1 Data...");
  const newScanRes = await makeRequest(`/api/health-passport/validate/${newToken}`, "GET");
  console.log("  -> Status Code:", newScanRes.status);
  console.log("  -> Response Status:", newScanRes.body?.status);

  if (newScanRes.status === 200 && newScanRes.body?.passport?.token === newToken) {
    console.log("  => TEST 6 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 6 FAILED!", newScanRes.body);
  }

  // 7. Revoke Current Passport
  console.log("\n[TEST 7/8] Patient Revokes Current Passport...");
  const revokeRes = await makeRequest("/api/health-passport/revoke", "POST", authHeaders);
  console.log("  -> Status Code:", revokeRes.status);
  console.log("  -> Response Message:", revokeRes.body?.message);

  const revokedScanRes = await makeRequest(`/api/health-passport/validate/${newToken}`, "GET");
  console.log("  -> Scanned Revoked Passport Status Code:", revokedScanRes.status);

  if (revokeRes.status === 200 && revokedScanRes.status === 410) {
    console.log("  => TEST 7 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 7 FAILED!");
  }

  // 8. Invalid / Tampered / Unknown Token Handling
  console.log("\n[TEST 8/8] Testing Unknown / Tampered Token Handling...");
  const invalidScanRes = await makeRequest("/api/health-passport/validate/hpa_tok_invalid_random_9999", "GET");
  console.log("  -> Status Code:", invalidScanRes.status);
  console.log("  -> Response Status:", invalidScanRes.body?.status);

  if (invalidScanRes.status === 404 && invalidScanRes.body?.status === "NOT_FOUND") {
    console.log("  => TEST 8 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 8 FAILED!");
  }

  console.log("\n==================================================");
  console.log(`MODULE 9 DETAILED TEST SUMMARY: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

testModule9Requirements().catch((err) => {
  console.error("Error executing Module 9 detailed tests:", err);
  process.exit(1);
});
