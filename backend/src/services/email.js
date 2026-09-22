const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const config = process.env.SMTP_SERVICE === "gmail"
    ? { service: "gmail", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
    : {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      };
  transporter = nodemailer.createTransport(config);
  return transporter;
}

async function sendOtpEmail(to, otp) {
  if (!process.env.SMTP_USER && !process.env.SMTP_HOST) {
    console.warn(`[mail] SMTP not configured — OTP for ${to}: ${otp}`);
    return;
  }
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  try {
    await getTransporter().sendMail({
      from: `"Health Passport AI" <${fromAddress}>`,
      to,
      subject: "Your Health Passport AI verification code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
          <h2 style="color:#0b476e">Health Passport AI</h2>
          <p>Your one-time verification code is:</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0a9fe8;margin:16px 0">${otp}</div>
          <p>This code expires in ${process.env.OTP_EXPIRES_MIN || 10} minutes. Never share it with anyone.</p>
        </div>`,
    });
    console.log(`[mail] Sent OTP email to ${to} (OTP: ${otp})`);
  } catch (err) {
    console.warn(`[mail] SMTP send failed (${err.message}) — OTP for ${to}: ${otp}`);
  }
}

module.exports = { sendOtpEmail };
