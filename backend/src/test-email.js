require("dotenv").config({ path: __dirname + "/../.env" });
const nodemailer = require("nodemailer");

async function testGmail() {
  console.log("Testing Gmail SMTP...");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "dk0910653@gmail.com",
      pass: "rkfejxpoqrnittvz",
    },
  });

  try {
    await transporter.verify();
    console.log("✅ Gmail Transporter verified successfully!");

    const info = await transporter.sendMail({
      from: `"Health Passport AI" <dk0910653@gmail.com>`,
      to: "dineshkumarsdk031@gmail.com",
      subject: "Your Health Passport AI verification code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
          <h2 style="color:#0b476e">Health Passport AI</h2>
          <p>Your one-time verification code is:</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0a9fe8;margin:16px 0">948215</div>
          <p>This code expires in 10 minutes.</p>
        </div>`,
    });

    console.log("🎉 SUCCESS! Email delivered directly to inbox! MessageID:", info.messageId);
  } catch (err) {
    console.error("❌ Gmail test failed:", err);
  }
}

testGmail();
