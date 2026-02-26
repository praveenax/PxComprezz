// read-test.js
const fs = require("fs");
const { PNG } = require("pngjs");

// utility helpers are kept in a separate module
const { getFileSizeBytes, closestSquareDims } = require("./utils");

const data = fs.readFileSync("data/test.txt"); // raw bytes
const len = Buffer.alloc(4);
len.writeUInt32BE(data.length, 0);

const payload = Buffer.concat([len, data]);

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

console.log(`Input size: ${getFileSizeBytes("data/test.txt")} bytes`);
console.log(`Output size: ${getFileSizeBytes("output/out.png")} bytes`);
