require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const User = require("./models/User");

async function checkUserOtp() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = "310624205056@eec.srmrmp.edu.in";
  const user = await User.findOne({ email }).select("+otp +otpExpires");
  if (user) {
    console.log(`[db] User found: ${user.email}`);
    console.log(`[db] Active OTP: ${user.otp}`);
    console.log(`[db] Expires at: ${user.otpExpires}`);
    console.log(`[db] Verified: ${user.verified}`);
  } else {
    console.log(`[db] User not found for ${email}`);
  }
  process.exit(0);
}

checkUserOtp();
