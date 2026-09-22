const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    title: String,
    type: {
      type: String,
      enum: ["Lab Report", "Prescription", "Imaging", "Discharge Summary", "Vaccination"],
      default: "Lab Report",
    },
    doctor: String,
    hospital: String,
    fileUrl: String,
    reportUrl: { type: String, required: true },
    publicId: String,
    fileName: String,
    fileSize: String,
    rawText: String,
    aiSummary: String,
    extractionStatus: {
      type: String,
      enum: ["pending_review", "reviewed", "failed"],
      default: "pending_review",
    },
    overallConfidence: { type: Number, default: 1.0 },
    needsReview: { type: Boolean, default: false },
    extractedData: mongoose.Schema.Types.Mixed,
    reviewedData: mongoose.Schema.Types.Mixed,
    reviewedAt: Date,
    extractedEntities: {
      diagnoses: [mongoose.Schema.Types.Mixed],
      medications: [mongoose.Schema.Types.Mixed],
      allergies: [mongoose.Schema.Types.Mixed],
      labValues: [mongoose.Schema.Types.Mixed],
    },
  },
  { timestamps: true }
);

reportSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model("MedicalReport", reportSchema);
