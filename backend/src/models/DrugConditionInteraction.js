const mongoose = require("mongoose");

const drugConditionSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, unique: true, index: true }, // e.g. "ibuprofen:chronic kidney disease"
    drugName: { type: String, required: true, index: true },
    drugRxCui: String,
    conditionName: { type: String, required: true, index: true },
    conditionCode: String,
    severity: {
      type: String,
      enum: ["Low", "Moderate", "High", "Contraindicated"],
      default: "Moderate",
    },
    description: { type: String, required: true },
    clinicalEffect: String,
    management: String,
    source: { type: String, default: "CDSCO / FDA Clinical Guidelines" },
    sourceRuleId: String,
    verified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

drugConditionSchema.index({ drugName: 1, conditionName: 1 });

module.exports = mongoose.model("DrugConditionInteraction", drugConditionSchema);
