// decode.js
const fs = require("fs");
const { PNG } = require("pngjs");
const { getFileSizeBytes, restoreDictionary } = require("./utils");

const png = PNG.sync.read(fs.readFileSync("output/out.png"));

const bytes = [];
for (let p = 0; p < png.data.length; p += 4) {
  bytes.push(
    png.data[p + 0],
    png.data[p + 1],
    png.data[p + 2],
    png.data[p + 3],
  ); // RGBA
}

const buf = Buffer.from(bytes);

// Read dictionary length
const dictionaryLen = buf.readUInt32BE(0);
const dictionaryBuffer = buf.subarray(4, 4 + dictionaryLen);
const dictionary = JSON.parse(dictionaryBuffer.toString("utf-8"));

// Read compressed text
const compressedText = buf.subarray(4 + dictionaryLen).toString("utf-8");

// Restore original text using dictionary
const recovered = restoreDictionary(compressedText, dictionary);

fs.writeFileSync("outputData/recovered.txt", recovered);

console.log(`Input image size: ${getFileSizeBytes("output/out.png")} bytes`);
console.log(
  `Output size: ${getFileSizeBytes("outputData/recovered.txt")} bytes`,
);
console.log(
  `Decompression complete. Dictionary had ${Object.keys(dictionary).length} entries.`,
);
