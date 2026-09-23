require("dotenv").config();
const mongoose = require("mongoose");
const DoctorRegistry = require("./models/DoctorRegistry");
const User = require("./models/User");
const { connectDB } = require("./config/db");

const officialDoctors = [
  {
    name: "Kamali V",
    fatherOrHusbandName: "Vallison P",
    dob: "1998-12-11 00:00:00",
    registrationNumber: "169421",
    dateOfReg: "09-09-2022",
    yearOfInfo: "2022",
    uprnNo: "N/A",
    stateMedicalCouncil: "Tamil Nadu Medical Council",
    qualification: "MBBS",
    qualificationYear: "2022",
    universityName: "The Tamilnadu Dr.M.G.R.Medical University",
    additionalQualifications: [],
    permanentAddress: "2/72, East Street, East rajapalayam post, Salem, Tamil Nadu, India-636116",
    city: "Salem",
    state: "Tamil Nadu",
    email: "dr.kamali@tnmc.org.in",
    isVerifiedNmc: true,
  },
  {
    name: "Kathiravan, Subramanian",
    fatherOrHusbandName: "Subramanian",
    dob: "1986-05-13 00:00:00",
    registrationNumber: "90253",
    dateOfReg: "26-05-2010",
    yearOfInfo: "2010",
    uprnNo: "N/A",
    stateMedicalCouncil: "Tamil Nadu Medical Council",
    qualification: "MBBS",
    qualificationYear: "2010",
    universityName: "The Tamilnadu Dr.M.G.R.Medical University",
    additionalQualifications: [
      {
        qualification: "M.D.(General Medicine)",
        qualificationYear: "2014",
        universityName: "The Tamilnadu Dr.M.G.R.Medical University",
      },
    ],
    permanentAddress: "3/86, Akkanur. tittagudi taluk, Cuddalore, Tamil Nadu, India-606106",
    city: "Cuddalore",
    state: "Tamil Nadu",
    email: "dr.kathiravan@tnmc.org.in",
    isVerifiedNmc: true,
  },
];

async function seedDoctorRegistry() {
  try {
    await connectDB();
    console.log("[doctor-seed] Connected to MongoDB");

    for (const docData of officialDoctors) {
      // 1. Upsert in DoctorRegistry
      const record = await DoctorRegistry.findOneAndUpdate(
        { registrationNumber: docData.registrationNumber },
        docData,
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`[doctor-seed] Seeded Doctor Registry: ${record.name} [Reg No: ${record.registrationNumber}] (${record.stateMedicalCouncil})`);

      // 2. Create User account if missing for doctor login
      if (docData.email) {
        let user = await User.findOne({ email: docData.email });
        if (!user) {
          user = await User.create({
            name: `Dr. ${docData.name}`,
            email: docData.email,
            password: "doctorpassword123",
            role: "doctor",
            verified: true,
            status: "active",
          });
          console.log(`[doctor-seed] Created Doctor User Account: ${docData.email} (Password: doctorpassword123)`);
        }
      }
    }

    console.log("[doctor-seed] Doctor Registry Seeding Completed Successfully!");
  } catch (err) {
    console.error("[doctor-seed] Error seeding doctor registry:", err.message);
  }
}

seedDoctorRegistry();
