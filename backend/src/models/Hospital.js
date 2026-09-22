const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: String,
    address: String,
    beds: Number,
    doctors: Number,
    verified: { type: Boolean, default: false },
    license: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hospital", hospitalSchema);
