const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctor: String,
    specialty: String,
    date: { type: Date, required: true },
    time: String,
    location: String,
    status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
