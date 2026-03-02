const fs = require("fs");
const { PNG } = require("pngjs");

// utility helpers are kept in a separate module
const {
  getFileSizeBytes,
  closestSquareDims,
  buildWordDictionary,
  applyDictionary,
  compressZstd,
} = require("./utils");

let rawData = fs.readFileSync("data/test.txt", "utf-8");

// convert each character of the string into its ASCII code
const asciiCodes = [];
for (let i = 0; i < rawData.length; i++) {
  asciiCodes.push(rawData.charCodeAt(i));
}

// asciiCodes now holds one number per character.  We can treat it as our
// payload and write the values directly into the RGBA channels of a PNG.

// const payload = Buffer.from(asciiCodes);
const payload = asciiCodes;

// figure out how big the image needs to be (4 bytes per pixel for RGBA)
const { width, height } = closestSquareDims(payload.length, 4);

const png = new PNG({ width, height });
png.data.fill(0);

let j = 0; // index into payload
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2; // position of this pixel's R channel
    png.data[idx + 0] = j < payload.length ? payload[j++] : 0; // R
    png.data[idx + 1] = j < payload.length ? payload[j++] : 0; // G
    png.data[idx + 2] = j < payload.length ? payload[j++] : 0; // B
    png.data[idx + 3] = j < payload.length ? payload[j++] : 0; // A
  }
}

fs.writeFileSync("output/ascii-out.png", PNG.sync.write(png));

console.log(`Source text length: ${rawData.length} characters`);
console.log(`ASCII payload size: ${payload.length} bytes`);
console.log(`Image dimensions: ${width}x${height}`);
console.log(
  `Output image size: ${getFileSizeBytes("output/ascii-out.png")} bytes`,
);
//add compression ratio console.log
console.log(
  `Compression ratio: ${(payload.length / getFileSizeBytes("output/ascii-out.png")).toFixed(2)}%`,
);
