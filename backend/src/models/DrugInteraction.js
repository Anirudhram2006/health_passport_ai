const mongoose = require("mongoose");

const drugInteractionSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, unique: true, index: true }, // e.g. "11289:1191" (sorted RxCUIs) or "aspirin:warfarin"
    drugA_rxcui: { type: String, index: true },
    drugB_rxcui: { type: String, index: true },
    drugA_name: { type: String, required: true },
    drugB_name: { type: String, required: true },
    severity: {
      type: String,
      enum: ["minor", "moderate", "major", "severe", "contraindicated", "unknown"],
      default: "moderate",
    },
    description: { type: String, required: true },
    clinicalEffect: String,
    management: String,
    source: { type: String, default: "NIH RxNav Drug Interaction Database" },
    sourceVersion: { type: String, default: "2026.1" },
    sourceRuleId: String,
    verified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DrugInteraction", drugInteractionSchema);
