require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const Patient = require("./models/Patient");
const User = require("./models/User");
const QRPassport = require("./models/QRPassport");
const {
  getLanIp,
  buildPassportUrl,
  generatePassportQR,
  generateOpaqueToken,
} = require("./services/qr");

function makeHttpRequest(url, method = "GET", headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
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

async function runLanQrVerificationTests() {
  console.log("==================================================");
  console.log("HEALTH PASSPORT AI — MOBILE LAN QR VERIFICATION");
  console.log("==================================================");

  await connectDB();

  let passed = 0;
  let total = 6;

  // TEST 1: Active LAN IP Detection
  console.log("\n[TEST 1/6] Active LAN IPv4 Address Detection...");
  const lanIp = getLanIp();
  console.log("  -> Detected Active LAN IP:", lanIp);
  if (lanIp && lanIp !== "localhost" && lanIp !== "127.0.0.1") {
    console.log("  => TEST 1 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 1 FAILED!");
  }

  // TEST 2: Scannable QR URL Construction (No localhost)
  console.log("\n[TEST 2/6] Scannable QR URL Construction (No localhost)...");
  const sampleToken = generateOpaqueToken();
  const passportUrl = buildPassportUrl(sampleToken);
  console.log("  -> Generated QR Target URL:", passportUrl);

  const containsLocalhost = passportUrl.includes("localhost") || passportUrl.includes("127.0.0.1");
  const containsLanIp = passportUrl.includes(lanIp);

  if (!containsLocalhost && containsLanIp && passportUrl.includes("/passport/hpa_tok_")) {
    console.log("  => TEST 2 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 2 FAILED!");
  }

  // TEST 3: Backend Accessibility on LAN IP (Port 5000)
  console.log(`\n[TEST 3/6] Testing Backend Accessibility on LAN IP (http://${lanIp}:5000/api/health)...`);
  try {
    const healthRes = await makeHttpRequest(`http://${lanIp}:5000/api/health`);
    console.log("  -> Response Status Code:", healthRes.status);
    console.log("  -> Response Payload:", healthRes.body);
    if (healthRes.status === 200 && healthRes.body?.status === "ok") {
      console.log("  => TEST 3 PASSED!");
      passed++;
    } else {
      console.error("  => TEST 3 FAILED!");
    }
  } catch (err) {
    console.error("  => TEST 3 FAILED (Connection Error):", err.message);
  }

  // TEST 4: Frontend Accessibility on LAN IP (Port 3000)
  console.log(`\n[TEST 4/6] Testing Frontend Accessibility on LAN IP (http://${lanIp}:3000/health-passport)...`);
  try {
    const frontendRes = await makeHttpRequest(`http://${lanIp}:3000/health-passport`);
    console.log("  -> Response Status Code:", frontendRes.status);
    if (frontendRes.status === 200) {
      console.log("  => TEST 4 PASSED!");
      passed++;
    } else {
      console.error("  => TEST 4 FAILED!");
    }
  } catch (err) {
    console.error("  => TEST 4 FAILED (Connection Error):", err.message);
  }

  // TEST 5: Create Active Passport & Validate Scan over LAN URL
  console.log("\n[TEST 5/6] Registering DB Passport & Testing Public Tier 1 Scan over LAN...");
  let user = await User.findOne({ email: "lan.test@hpa.org" });
  if (!user) {
    user = await User.create({
      name: "Mobile LAN Tester",
      email: "lan.test@hpa.org",
      password: "password123",
      role: "patient",
      verified: true,
    });
  }

  let patient = await Patient.findOne({ userId: user._id });
  if (!patient) {
    patient = await Patient.create({
      userId: user._id,
      passportId: "HPA-LAN-2026-" + Math.floor(1000 + Math.random() * 9000),
      bloodGroup: "O+",
      allergies: [{ substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" }],
      emergencyContacts: [{ name: "Spouse Contact", relation: "Spouse", phone: "+91 98888 77777" }],
    });
  }

  const activeToken = generateOpaqueToken();
  const qrRecord = await QRPassport.create({
    patientId: patient._id,
    passportId: patient.passportId,
    token: activeToken,
    signature: "sig_lan_test",
    status: "active",
  });

  const lanScanUrl = `http://${lanIp}:5000/api/patients/passport/${activeToken}`;
  const scanRes = await makeHttpRequest(lanScanUrl);
  console.log("  -> LAN Scan URL:", lanScanUrl);
  console.log("  -> Response Status Code:", scanRes.status);
  console.log("  -> Returned Patient Name:", scanRes.body?.passport?.patient?.name);
  console.log("  -> Returned Access Tier:", scanRes.body?.passport?.accessTier);

  if (scanRes.status === 200 && scanRes.body?.passport?.patient?.name === "Mobile LAN Tester") {
    console.log("  => TEST 5 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 5 FAILED!");
  }

  // TEST 6: Encoded QR Image Generation (Data URL verification)
  console.log("\n[TEST 6/6] Generating High-Resolution QR Data URL with LAN URL...");
  const lanPassportUrl = `http://${lanIp}:3000/passport/${activeToken}`;
  const qrDataUrl = await generatePassportQR(lanPassportUrl);
  console.log("  -> LAN Passport Target URL:", lanPassportUrl);
  console.log("  -> QR Data URL Length:", qrDataUrl.length, "bytes");

  if (qrDataUrl.startsWith("data:image/png;base64,") && qrDataUrl.length > 1000) {
    console.log("  => TEST 6 PASSED!");
    passed++;
  } else {
    console.error("  => TEST 6 FAILED!");
  }

  console.log("\n==================================================");
  console.log(`MOBILE LAN VERIFICATION SUMMARY: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runLanQrVerificationTests().catch((err) => {
  console.error("Error executing LAN verification tests:", err);
  process.exit(1);
});
