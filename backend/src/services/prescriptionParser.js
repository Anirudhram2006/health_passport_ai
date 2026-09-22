const medicineRecognizer = require("./ocr/medicineRecognizer");
const { fetchBuffer } = require("./ocr");

class OCRService {
  async processPrescription(bufferOrPath, mimeType = "", originalName = "") {
    const rawBuffer = await fetchBuffer(bufferOrPath);
    return await medicineRecognizer.processPrescriptionDocument(rawBuffer, mimeType, originalName);
  }
}

module.exports = new OCRService();
