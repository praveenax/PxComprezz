// decode.js
const fs = require("fs");
const { PNG } = require("pngjs");
const { getFileSizeBytes, closestSquareDims } = require("./utils");
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
const dataLen = buf.readUInt32BE(0);
const recovered = buf.subarray(4, 4 + dataLen);

fs.writeFileSync("outputData/recovered.txt", recovered);

console.log(`Input size: ${getFileSizeBytes("output/out.png")} bytes`);
console.log(
  `Output size: ${getFileSizeBytes("outputData/recovered.txt")} bytes`,
);
