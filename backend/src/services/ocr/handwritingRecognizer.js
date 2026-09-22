const Tesseract = require("tesseract.js");
const path = require("path");
const os = require("os");
const fs = require("fs");

/**
 * Stage 1: General Handwriting & Document Text Recognition.
 * Clean, pluggable architecture designed to support fine-tuned models
 * trained on datasets such as RxHandBD or Doctor Handwriting Recognition.
 */
class HandwritingRecognizer {
  constructor(modelPath = null) {
    this.modelPath = modelPath;
  }

  /**
   * Recognizes visible text from image buffer without drug-name guessing.
   * @param {Buffer} imageBuffer
   * @returns {Promise<{ rawText: string, lines: string[], confidence: number }>}
   */
  async recognizeVisibleText(imageBuffer) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
      return { rawText: "", lines: [], confidence: 0 };
    }

    const tempFile = path.join(
      os.tmpdir(),
      `hw_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
    );
    fs.writeFileSync(tempFile, imageBuffer);

    try {
      const { data } = await Tesseract.recognize(tempFile, "eng", {
        logger: () => {},
      });

      const rawText = (data.text || "").trim();
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const confidence = typeof data.confidence === "number" ? data.confidence / 100 : 0.8;

      return { rawText, lines, confidence };
    } catch (err) {
      console.warn("[handwritingRecognizer] Visual recognition warning:", err.message);
      return { rawText: "", lines: [], confidence: 0 };
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }
    }
  }
}

module.exports = new HandwritingRecognizer();
