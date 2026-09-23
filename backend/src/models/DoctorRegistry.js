const mongoose = require("mongoose");

const doctorRegistrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fatherOrHusbandName: { type: String, trim: true },
    dob: { type: String },
    registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    dateOfReg: { type: String },
    yearOfInfo: { type: String },
    uprnNo: { type: String, default: "N/A" },
    stateMedicalCouncil: { type: String, required: true, default: "Tamil Nadu Medical Council" },
    qualification: { type: String, required: true },
    qualificationYear: { type: String },
    universityName: { type: String },
    additionalQualifications: [
      {
        qualification: { type: String },
        qualificationYear: { type: String },
        universityName: { type: String },
      },
    ],
    permanentAddress: { type: String },
    city: { type: String },
    state: { type: String, default: "Tamil Nadu" },
    isVerifiedNmc: { type: Boolean, default: true },
    nmcVerifiedStatus: { type: String, default: "Verified Active — Tamil Nadu Medical Council (IMR)" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorRegistry", doctorRegistrySchema);
