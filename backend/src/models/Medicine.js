const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true },
    normalizedBrandName: { type: String, required: true, index: true },
    genericName: { type: String, required: true },
    normalizedGenericName: { type: String, required: true, index: true },
    activeIngredients: [{ type: String, index: true }],
    strength: String,
    dosageForm: String, // e.g. Tablet, Capsule, Syrup, Injection, Ointment
    manufacturer: String,
    aliases: [{ type: String, index: true }],
    rxNormCui: { type: String, index: true },
    source: {
      type: String,
      default: "Verified Catalogue",
      enum: [
        "CDSCO",
        "PMBI Jan Aushadhi",
        "RxNorm",
        "Verified Catalogue",
        "Community Dataset",
      ],
    },
    sourceVersion: { type: String, default: "1.0" },
    verified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

medicineSchema.index({ brandName: "text", genericName: "text", aliases: "text" });

module.exports = mongoose.model("Medicine", medicineSchema);
