const sharp = require("sharp");

/**
 * Preprocesses an image buffer to optimize it for handwritten OCR & Vision reading.
 * Performs:
 * - Auto-rotation based on EXIF data (fixes sideways/upside-down phone photos)
 * - Contrast & brightness normalization
 * - Mild sharpening to clarify handwriting strokes
 * - Noise reduction / background cleanup
 * - Convert to PNG buffer
 *
 * @param {Buffer} inputBuffer
 * @returns {Promise<Buffer>}
 */
async function preprocessImage(inputBuffer) {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
    return inputBuffer;
  }

  try {
    const metadata = await sharp(inputBuffer).metadata();

    // If it's a PDF, Sharp might not process directly without pdfium, return original
    if (metadata.format === "pdf") {
      return inputBuffer;
    }

    const processedBuffer = await sharp(inputBuffer)
      .rotate() // Auto-orient based on EXIF
      .grayscale() // Remove color artifacts
      .linear(1.1, -10) // Mild contrast boost: scale 1.1, shift -10
      .sharpen({ sigma: 1.2 }) // Clarify stroke edges
      .png({ quality: 90 })
      .toBuffer();

    console.log(`[imagePreprocessor] Preprocessed ${metadata.format} image (${inputBuffer.length} -> ${processedBuffer.length} bytes)`);
    return processedBuffer;
  } catch (err) {
    console.warn("[imagePreprocessor] Preprocessing warning, using original buffer:", err.message);
    return inputBuffer;
  }
}

module.exports = { preprocessImage };
