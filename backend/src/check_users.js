require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function checkUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}).select("+password +otp +otpExpires");
  console.log("Total users:", users.length);
  for (const u of users) {
    console.log({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      verified: u.verified,
      status: u.status,
      otp: u.otp,
      createdAt: u.createdAt,
    });
  }
  process.exit(0);
}

checkUsers();
