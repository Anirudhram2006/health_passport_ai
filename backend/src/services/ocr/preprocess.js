const sharp = require("sharp");

/**
 * Preprocesses input image buffer for handwriting recognition.
 * - Auto-rotation via EXIF.
 * - Grayscale & contrast enhancement.
 * - Edge sharpening for handwritten strokes.
 * - Returns normalized PNG buffer.
 */
async function preprocessImageBuffer(inputBuffer) {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
    return inputBuffer;
  }

  try {
    const metadata = await sharp(inputBuffer).metadata();
    if (metadata.format === "pdf") {
      return inputBuffer;
    }

    return await sharp(inputBuffer)
      .rotate()
      .grayscale()
      .linear(1.1, -10)
      .sharpen({ sigma: 1.2 })
      .png({ quality: 90 })
      .toBuffer();
  } catch (err) {
    console.warn("[preprocess] Sharp normalization warning:", err.message);
    return inputBuffer;
  }
}

/**
 * Line detection helper: Segments document image into horizontal line strips.
 */
async function segmentPrescriptionLines(inputBuffer) {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) return [];

  try {
    const metadata = await sharp(inputBuffer).metadata();
    if (!metadata.height || !metadata.width) return [];

    const height = metadata.height;
    const width = metadata.width;
    const lineCount = 5; // Split into 5 horizontal zones (header, line 1, line 2, line 3, footer)
    const lineHeight = Math.floor(height / lineCount);
    const lineCrops = [];

    for (let i = 0; i < lineCount; i++) {
      const top = i * lineHeight;
      const cropHeight = Math.min(lineHeight, height - top);
      if (cropHeight < 20) continue;

      const cropBuffer = await sharp(inputBuffer)
        .extract({ left: 0, top, width, height: cropHeight })
        .png()
        .toBuffer();

      lineCrops.push({
        lineIndex: i + 1,
        cropBuffer,
      });
    }

    return lineCrops;
  } catch (err) {
    console.warn("[preprocess] Line segmentation warning:", err.message);
    return [];
  }
}

module.exports = { preprocessImageBuffer, segmentPrescriptionLines };
