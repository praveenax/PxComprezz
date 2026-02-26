// encode.js
const fs = require("fs");
const { PNG } = require("pngjs");

// utility helpers are kept in a separate module
const {
  getFileSizeBytes,
  closestSquareDims,
  buildWordDictionary,
  applyDictionary,
} = require("./utils");

let rawData = fs.readFileSync("data/test.txt", "utf-8");

// Build and apply dictionary compression
const { dictionary, compressedText } = buildWordDictionary(rawData);

// Serialize dictionary
const dictionaryJson = JSON.stringify(dictionary);
const dictionaryBuffer = Buffer.from(dictionaryJson, "utf-8");

// Create compressed data buffer
const compressedBuffer = Buffer.from(compressedText, "utf-8");

// Format: [dictionaryLength(4)][dictionary][compressedData]
const dictionaryLenBuffer = Buffer.alloc(4);
dictionaryLenBuffer.writeUInt32BE(dictionaryBuffer.length, 0);

const payload = Buffer.concat([
  dictionaryLenBuffer,
  dictionaryBuffer,
  compressedBuffer,
]);

// Store original size for reference
const originalLen = Buffer.alloc(4);
originalLen.writeUInt32BE(rawData.length, 0);

const { width, height } = closestSquareDims(payload.length, 4);

const png = new PNG({ width, height });
png.data.fill(0);

let i = 0; // payload index
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2; // RGBA index
    png.data[idx + 0] = i < payload.length ? payload[i++] : 0; // R
    png.data[idx + 1] = i < payload.length ? payload[i++] : 0; // G
    png.data[idx + 2] = i < payload.length ? payload[i++] : 0; // B
    png.data[idx + 3] = i < payload.length ? payload[i++] : 0; // A
  }
}

fs.writeFileSync("output/out.png", PNG.sync.write(png));

console.log(`Original size: ${getFileSizeBytes("data/test.txt")} bytes`);
console.log(`Dictionary size: ${dictionaryBuffer.length} bytes`);
console.log(`Compressed text size: ${compressedBuffer.length} bytes`);
console.log(`Total payload size: ${payload.length} bytes`);
console.log(`Output image size: ${getFileSizeBytes("output/out.png")} bytes`);
console.log(
  `Compression ratio: ${((payload.length / getFileSizeBytes("data/test.txt")) * 100).toFixed(2)}%`,
);
console.log(`Dictionary entries: ${Object.keys(dictionary).length}`);
