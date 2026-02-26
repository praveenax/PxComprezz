const fs = require("fs");

function getFileSizeBytes(filePath) {
  return fs.statSync(filePath).size;
}

function closestSquareDims(payloadLength, bytesPerPixel = 3) {
  const pixelsNeeded = Math.ceil(payloadLength / bytesPerPixel);
  const side = Math.ceil(Math.sqrt(pixelsNeeded)); // smallest square that fits
  const width = side;
  const height = Math.ceil(pixelsNeeded / width);
  return { pixelsNeeded, width, height };
}

module.exports = {
  getFileSizeBytes,
  closestSquareDims,
};
