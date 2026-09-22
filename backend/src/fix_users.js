require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Patient = require("./models/Patient");
const crypto = require("crypto");

async function fixUserAccounts() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const userEmails = [
    "310624205056@eec.srmrmp.edu.in",
    "dineshkumarsara07@gmail.com",
    "dk0910653@gmail.com",
    "dineshkumarsdk031@gmail.com",
    "dkfreefire12345@gmail.com",
    "vinothvinothr664@gmail.com"
  ];

  for (const email of userEmails) {
    const user = await User.findOne({ email });
    if (user) {
      user.password = "password123";
      user.verified = true;
      user.status = "active";
      await user.save();
      console.log(`Updated user ${email} password to 'password123' and verified: true`);

      // Ensure Patient record exists
      let patient = await Patient.findOne({ userId: user._id });
      if (!patient) {
        patient = await Patient.create({
          userId: user._id,
          passportId: `P-${crypto.randomInt(100000, 999999)}`,
          bloodGroup: "O+",
          healthScore: 85,
        });
        console.log(`Created Patient record for ${email}: ${patient.passportId}`);
      }
    }
  }

  process.exit(0);
}

fixUserAccounts();
