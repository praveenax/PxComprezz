// decodeAscii.js
const fs = require("fs");
const { PNG } = require("pngjs");

// read the PNG we just wrote
const png = PNG.sync.read(fs.readFileSync("output/ascii-out.png"));

// gather all channel values into a single array, ignoring any trailing zeros
const codes = [];
for (let p = 0; p < png.data.length; p += 4) {
  codes.push(png.data[p + 0]);
  codes.push(png.data[p + 1]);
  codes.push(png.data[p + 2]);
  codes.push(png.data[p + 3]);
}

// remove padding zeros (they were added to fill the last pixel)
while (codes.length && codes[codes.length - 1] === 0) {
  codes.pop();
}

// convert back to string
const chars = codes.map((c) => String.fromCharCode(c)).join("");
fs.writeFileSync("output/ascii-recovered.txt", chars, "utf-8");
console.log(
  `Recovered ${chars.length} characters to output/ascii-recovered.txt`,
);
