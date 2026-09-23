const http = require("http");

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      `http://localhost:5000${path}`,
      {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
          ...options.headers,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve({ status: res.statusCode, body: data });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runDoctorPortalTests() {
  console.log("=========================================");
  console.log("HEALTH PASSPORT AI — DOCTOR PORTAL QA GATE");
  console.log("=========================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, description) {
    total++;
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
    }
  }

  try {
    // 1. Standalone Doctor Registration Check
    console.log("1. Testing Registration Number Verification API...");
    const regCheck = await request("/api/doctor/verify-registration", {
      method: "POST",
      body: { registrationNumber: "169421" },
    });
    assert(regCheck.status === 200 && regCheck.body.verification?.verified === true, "Valid Reg No 169421 verified with Tamil Nadu Medical Council");
    assert(regCheck.body.verification?.registeredName === "Kamali V", "Correct doctor name parsed: Kamali V");

    // 2. Doctor Registration Flow
    console.log("\n2. Testing Doctor Account Registration...");
    const testEmail = `dr.test.${Date.now()}@tnmc.org.in`;
    const regRes = await request("/api/doctor/register", {
      method: "POST",
      body: {
        name: "Dr. Kamali V",
        email: testEmail,
        phone: "+91 94440 12821",
        password: "doctorpassword123",
        registrationNumber: "169421",
        registrationAuthority: "Tamil Nadu Medical Council",
        qualification: "MBBS",
        specialization: "General Medicine",
        hospital: "Rajiv Gandhi Government General Hospital",
        city: "Salem",
        state: "Tamil Nadu",
      },
    });

    assert(regRes.status === 201 && regRes.body.status === "SUCCESS", "Doctor account registered with 201 Created");
    assert(regRes.body.user?.role === "doctor", "Enforced role === 'doctor'");
    assert(regRes.body.user?.verification?.status === "VERIFIED", "Verification status set to VERIFIED");
    const doctorToken = regRes.body.token;

    // 3. Doctor Login
    console.log("\n3. Testing Doctor Login...");
    const loginRes = await request("/api/doctor/login", {
      method: "POST",
      body: { loginId: testEmail, password: "doctorpassword123" },
    });

    assert(loginRes.status === 200 && loginRes.body.token, "Doctor login successful with JWT token");
    assert(loginRes.body.user?.doctorProfile?.registrationNumber === "169421", "Doctor registration number attached to profile");

    const testPatientEmail = `test.patient.${Date.now()}@gmail.com`;
    await request("/api/auth/register", {
      method: "POST",
      body: { name: "Test Patient", email: testPatientEmail, password: "patientpassword123", role: "patient" },
    });

    const patientLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: testPatientEmail, password: "patientpassword123" },
    });
    const patientToken = patientLogin.body.token;

    const forbiddenScan = await request("/api/doctor/scan-qr", {
      method: "POST",
      body: { token: "HPA-2026-DEMO" },
      headers: { Authorization: `Bearer ${patientToken}` },
    });

    assert(forbiddenScan.status === 403, "Patient token rejected on Doctor QR Scan endpoint with 403 Forbidden");

    // 5. Doctor Patient QR Scan
    console.log("\n5. Testing Doctor QR Scan Authorization...");
    const scanRes = await request("/api/doctor/scan-qr", {
      method: "POST",
      body: { token: "HPA-2026-DEMO" },
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    assert(scanRes.status === 200 && scanRes.body.status === "SUCCESS", "Doctor QR scan authorized with 200 SUCCESS");
    assert(scanRes.body.passport?.accessTier === "TIER_1_EMERGENCY", "Returned Tier 1 Emergency Access DTO");
    assert(Boolean(scanRes.body.passport?.emergencySummary), "Included AI Emergency Summary");

    // 6. Access History Audit Trail
    console.log("\n6. Testing Access History Audit Log...");
    const historyRes = await request("/api/doctor/access-history", {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    assert(historyRes.status === 200 && historyRes.body.history?.length > 0, "Scan logged in Audit Trail for Doctor session");

    console.log(`\n=========================================`);
    console.log(`QA GATE PASSED: ${passed}/${total} TESTS SUCCESSFUL`);
    console.log(`=========================================\n`);
  } catch (err) {
    console.error("Test execution failed:", err.message);
  }
}

runDoctorPortalTests();
