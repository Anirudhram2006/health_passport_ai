const mongoose = require("mongoose");

const allergySchema = new mongoose.Schema(
  {
    substance: { type: String, required: true },
    severity: { type: String, enum: ["Mild", "Moderate", "Severe"], default: "Mild" },
    reaction: String,
  },
  { _id: true }
);

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brandName: String,
    genericName: String,
    activeIngredients: [String],
    rxNormCui: String,
    dosage: String,
    frequency: String,
    prescribedBy: String,
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true },
    status: { type: String, default: "verified" },
    normalizationStatus: { type: String, default: "confirmed" },
    requiresReview: { type: Boolean, default: false },
    addedFromReportId: String,
  },
  { _id: true }
);

const patientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    passportId: { type: String, unique: true, required: true },
    bloodGroup: String,
    dob: Date,
    height: String,
    weight: String,
    allergies: [allergySchema],
    chronicDiseases: [String],
    emergencyContacts: [
      {
        name: String,
        relation: String,
        phone: String,
      },
    ],
    medications: [medicationSchema],
    healthScore: { type: Number, default: 80 },
    qrSecret: { type: String, select: false },
  },
  { timestamps: true }
);

patientSchema.index({ passportId: "text", "userId": 1 });

module.exports = mongoose.model("Patient", patientSchema);
