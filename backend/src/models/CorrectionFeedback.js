const mongoose = require("mongoose");

const correctionFeedbackSchema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "MedicalReport" },
    rawOcrText: { type: String, required: true },
    predictedMedicine: String,
    correctedMedicine: { type: String, required: true },
    user: String,
    modelVersion: { type: String, default: "gemini-1.5-flash-v2" },
    sourceDatasetReference: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CorrectionFeedback", correctionFeedbackSchema);
