const { verifyAndFetchDoctor } = require("./doctorScraper");

/**
 * DoctorVerificationProvider Abstraction
 * Normalizes doctor registration number verification against official State Medical Councils & NMC database.
 */
class DoctorVerificationProvider {
  /**
   * Verifies a doctor's registration number
   * @param {Object} params
   * @param {string} params.registrationNumber
   * @param {string} [params.registrationAuthority]
   * @param {string} [params.doctorName]
   * @param {string} [params.state]
   * @returns {Promise<{ verified: boolean, status: string, registrationNumber: string, registeredName: string, authority: string, source: string, details?: Object, message?: string }>}
   */
  static async verifyDoctorRegistration({
    registrationNumber,
    registrationAuthority = "Tamil Nadu Medical Council",
    doctorName,
    state = "Tamil Nadu",
  }) {
    if (!registrationNumber || typeof registrationNumber !== "string") {
      return {
        verified: false,
        status: "REJECTED",
        registrationNumber: "",
        registeredName: "",
        authority: registrationAuthority,
        source: "Input Validation",
        message: "Registration number is required.",
      };
    }

    try {
      const result = await verifyAndFetchDoctor(registrationNumber);

      if (result.verified) {
        return {
          verified: true,
          status: "VERIFIED",
          registrationNumber: result.registrationNumber || registrationNumber,
          registeredName: result.name || doctorName || "Verified Medical Practitioner",
          authority: result.stateMedicalCouncil || registrationAuthority,
          source: result.source || "Tamil Nadu Medical Council (Official NMC IMR Database)",
          details: {
            fatherOrHusbandName: result.fatherOrHusbandName,
            dob: result.dob,
            dateOfReg: result.dateOfReg,
            yearOfInfo: result.yearOfInfo,
            qualification: result.qualification,
            qualificationYear: result.qualificationYear,
            universityName: result.universityName,
            additionalQualifications: result.additionalQualifications || [],
            permanentAddress: result.permanentAddress,
            city: result.city,
            state: result.state,
            nmcVerifiedStatus: result.nmcVerifiedStatus,
          },
        };
      }

      return {
        verified: false,
        status: "REJECTED",
        registrationNumber,
        registeredName: doctorName || "",
        authority: registrationAuthority,
        source: "State Medical Council Verification Registry",
        message: result.message || "Medical registration number could not be verified.",
      };
    } catch (err) {
      console.error("[DoctorVerificationProvider] Error verifying doctor:", err.message);
      return {
        verified: false,
        status: "UNAVAILABLE",
        registrationNumber,
        registeredName: doctorName || "",
        authority: registrationAuthority,
        source: "Verification Service Offline",
        message: "Verification provider service is temporarily unavailable.",
      };
    }
  }
}

module.exports = DoctorVerificationProvider;
