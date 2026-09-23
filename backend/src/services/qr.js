const QRCode = require("qrcode");
const crypto = require("crypto");
const os = require("os");

const QR_SECRET = process.env.JWT_SECRET || "hpa-secure-qr-secret-key-2026";
const APP_BASE_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getLanIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (e) {
    // Fallthrough
  }
  return "localhost";
}

function generateOpaqueToken() {
  return "hpa_tok_" + crypto.randomBytes(16).toString("hex");
}

function buildPassportUrl(token, req = null) {
  // Priority 1: Configured APP_URL or NEXT_PUBLIC_APP_URL if explicitly set to LAN URL
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return `${envUrl.replace(/\/$/, "")}/passport/${token}`;
  }

  // Priority 2: Use request origin / host if request comes from LAN IP
  if (req) {
    const origin = req.get("origin") || req.get("referer");
    if (origin) {
      try {
        const urlObj = new URL(origin);
        if (!urlObj.hostname.includes("localhost") && !urlObj.hostname.includes("127.0.0.1")) {
          return `${urlObj.origin}/passport/${token}`;
        }
      } catch (e) {
        // Fallthrough
      }
    }
    const host = req.get("host");
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      const protocol = req.protocol || "http";
      const frontendHost = host.replace(/:5000$/, ":3000");
      return `${protocol}://${frontendHost}/passport/${token}`;
    }
  }

  // Priority 3: Auto-detect active LAN IP for scannable QR generation
  const lanIp = getLanIp();
  if (lanIp && lanIp !== "localhost") {
    return `http://${lanIp}:3000/passport/${token}`;
  }

  return `${APP_BASE_URL}/passport/${token}`;
}

function generateSignature(passportId, bloodGroup, issuedAt) {
  const data = `${passportId}:${bloodGroup || "NA"}:${issuedAt}`;
  return crypto.createHmac("sha256", QR_SECRET).update(data).digest("hex").substring(0, 16);
}

function buildPayload(patient, token = null, req = null) {
  const actualToken = token || generateOpaqueToken();
  const issuedAt = new Date().toISOString();
  const signature = generateSignature(patient.passportId, patient.bloodGroup, issuedAt);
  const passportUrl = buildPassportUrl(actualToken, req);

  return {
    v: "2.0",
    type: "hpa:passport",
    token: actualToken,
    url: passportUrl,
    id: patient.passportId,
    bloodGroup: patient.bloodGroup || "NA",
    issuedAt,
    sig: signature,
  };
}

function verifyPassportPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (!payload.sig || !payload.issuedAt || !payload.id) return false;

  const expected = generateSignature(payload.id, payload.bloodGroup, payload.issuedAt);
  try {
    return crypto.timingSafeEqual(Buffer.from(payload.sig), Buffer.from(expected));
  } catch (e) {
    return false;
  }
}

async function generatePassportQR(urlOrPayload, req = null) {
  let targetUrl = "";
  if (typeof urlOrPayload === "string") {
    targetUrl = urlOrPayload.startsWith("http") ? urlOrPayload : buildPassportUrl(urlOrPayload, req);
  } else {
    targetUrl = urlOrPayload.url || buildPassportUrl(urlOrPayload.token || urlOrPayload.id, req);
  }

  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
    color: { dark: "#0b476e", light: "#ffffff" },
  });
}

module.exports = {
  generateOpaqueToken,
  buildPassportUrl,
  generatePassportQR,
  buildPayload,
  generateSignature,
  verifyPassportPayload,
  getLanIp,
};
