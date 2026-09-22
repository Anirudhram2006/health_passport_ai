const mongoose = require("mongoose");

const qrPassportSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    passportId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, sparse: true },
    signature: { type: String, required: true },
    version: { type: String, default: "2.0" },
    status: { type: String, enum: ["active", "revoked", "suspended", "expired"], default: "active" },
    expiresAt: { type: Date },
    lastScannedAt: { type: Date },
    scanCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

qrPassportSchema.pre("save", function (next) {
  if (this.token && !this.tokenHash) {
    this.tokenHash = this.token;
  }
  next();
});

module.exports = mongoose.model("QRPassport", qrPassportSchema);
