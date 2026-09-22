const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    action: { type: String, required: true },
    targetId: String,
    ip: String,
    level: { type: String, enum: ["info", "warning", "danger"], default: "info" },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditSchema);
