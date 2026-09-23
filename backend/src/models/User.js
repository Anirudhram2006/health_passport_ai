const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, "Password is required"], select: false },
    role: { type: String, enum: ["patient", "doctor", "admin"], default: "patient" },
    phone: { type: String },
    verified: { type: Boolean, default: false },
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    avatar: { type: String },
    doctorProfile: {
      fullName: { type: String },
      registrationNumber: { type: String },
      registrationAuthority: { type: String, default: "Tamil Nadu Medical Council" },
      qualification: { type: String },
      specialization: { type: String },
      hospital: { type: String },
      clinic: { type: String },
      city: { type: String },
      state: { type: String, default: "Tamil Nadu" },
    },
    verification: {
      status: { type: String, enum: ["VERIFIED", "PENDING", "REJECTED", "UNAVAILABLE"], default: "PENDING" },
      verifiedAt: { type: Date },
      verificationSource: { type: String },
      verificationReference: { type: String },
      lastCheckedAt: { type: Date },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
