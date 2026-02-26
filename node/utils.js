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

// Extract and count word frequencies with case variants
function countWords(text) {
  const wordRegex = /\b\w+\b/g;
  const words = text.match(wordRegex) || [];
  const frequency = {};
  const variants = {};

  words.forEach((word) => {
    const lower = word.toLowerCase();
    frequency[lower] = (frequency[lower] || 0) + 1;

    // Track case variants
    if (!variants[lower]) {
      variants[lower] = new Set();
    }
    variants[lower].add(word);
  });

  return { frequency, variants };
}

// Build dictionary mapping words to token IDs with efficient case handling
function buildWordDictionary(text, minFrequency = 2) {
  const { frequency, variants } = countWords(text);

  // Calculate compression savings for each word
  const candidates = Object.entries(frequency)
    .filter(([word, count]) => count >= minFrequency && word.length > 2)
    .map(([word, count]) => {
      const tokenLength = 1;
      const savings = (word.length - tokenLength) * count;

      // Find most common variant for this word
      const variantArray = Array.from(variants[word]);
      const mostCommon = variantArray.reduce((a, b) => a, variantArray[0]);

      return { word, count, savings, tokenLength, mostCommon };
    })
    .sort((a, b) => b.savings - a.savings);

  // Select words that provide positive savings
  const profitableWords = candidates
    .filter((w) => w.savings > 0)
    .slice(0, 2560);

  // Create dictionary with variable-length encoding
  const dictionary = {};
  const wordToToken = {};

  profitableWords.forEach(({ word, mostCommon }, index) => {
    const token =
      index < 128
        ? String.fromCharCode(0x80 + index)
        : `\x7f${String.fromCharCode(index - 128)}`;

    // Store most common variant
    dictionary[token] = mostCommon;
    wordToToken[word] = token;
  });

  // Apply dictionary to text
  let compressedText = text;

  profitableWords.forEach(({ word }) => {
    const token = wordToToken[word];
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    compressedText = compressedText.replace(regex, token);
  });

  // Apply run-length encoding for repeated characters
  compressedText = applyRunLengthEncoding(compressedText);

  return { dictionary, compressedText };
}

// Run-length encoding for repeated characters (3+ occurrences)
function applyRunLengthEncoding(text) {
  let result = "";
  let i = 0;

  while (i < text.length) {
    let char = text[i];
    let count = 1;

    while (i + count < text.length && text[i + count] === char && count < 255) {
      count++;
    }

    // Use RLE for sequences of 3+ characters (marker: 0x7E + count + char)
    if (count >= 3 && char !== "\x7e" && char !== "\x7f") {
      result += `\x7e${String.fromCharCode(count)}${char}`;
    } else {
      result += char.repeat(count);
    }

    i += count;
  }

  return result;
}

// Decompress run-length encoded text
function decompressRunLengthEncoding(text) {
  let result = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "\x7e" && i + 2 < text.length) {
      // RLE marker found
      const count = text.charCodeAt(i + 1);
      const char = text[i + 2];
      result += char.repeat(count);
      i += 3;
    } else {
      result += text[i];
      i++;
    }
  }

  return result;
}

// Restore original text using dictionary with context-aware case restoration
function restoreDictionary(compressedText, dictionary) {
  // Decompress run-length encoding first
  let decompressed = decompressRunLengthEncoding(compressedText);

  // Replace tokens back with words
  let restored = decompressed;

  Object.entries(dictionary).forEach(([token, baseWord]) => {
    let result = "";
    let i = 0;

    while (i < restored.length) {
      if (restored.substr(i, token.length) === token) {
        // Found a token - apply context-aware casing
        let replacement = baseWord;

        // Check if this token is at sentence start (after . ! ? or start of text)
        let isSentenceStart =
          i === 0 || (i >= 2 && /[.!?]\s/.test(restored.substr(i - 2, 2)));

        if (isSentenceStart) {
          // Capitalize first letter
          replacement =
            baseWord.charAt(0).toUpperCase() + baseWord.slice(1).toLowerCase();
        } else {
          // Use lowercase
          replacement = baseWord.toLowerCase();
        }

        result += replacement;
        i += token.length;
      } else {
        result += restored[i];
        i++;
      }
    }
    restored = result;
  });

  return restored;
}

// Zstd helpers (require lazily so module load doesn't fail if package missing)
let zstd;
function requireZstd() {
  if (!zstd) {
    try {
      zstd = require("node-zstandard");
    } catch (e) {
      throw new Error("node-zstandard is not installed");
    }
  }
  return zstd;
}

function compressZstd(buffer, level = 3) {
  const z = requireZstd();
  const tmp = require("os").tmpdir();
  const path = require("path");
  const inFile = path.join(tmp, `pxc_in_${Date.now()}.tmp`);
  const outFile = path.join(tmp, `pxc_out_${Date.now()}.zst`);
  fs.writeFileSync(inFile, buffer);
  return new Promise((resolve, reject) => {
    z.compress(inFile, outFile, level, (err) => {
      if (err) return reject(err);
      const data = fs.readFileSync(outFile);
      try {
        fs.unlinkSync(inFile);
      } catch {}
      try {
        fs.unlinkSync(outFile);
      } catch {}
      resolve(data);
    });
  });
}

function decompressZstd(buffer) {
  const z = requireZstd();
  const tmp = require("os").tmpdir();
  const path = require("path");
  const inFile = path.join(tmp, `pxc_in_${Date.now()}.zst`);
  const outFile = path.join(tmp, `pxc_out_${Date.now()}.tmp`);
  fs.writeFileSync(inFile, buffer);
  return new Promise((resolve, reject) => {
    z.decompress(inFile, outFile, (err) => {
      if (err) return reject(err);
      const data = fs.readFileSync(outFile);
      try {
        fs.unlinkSync(inFile);
      } catch {}
      try {
        fs.unlinkSync(outFile);
      } catch {}
      resolve(data);
    });
  });
}

module.exports = {
  getFileSizeBytes,
  closestSquareDims,
  buildWordDictionary,
  countWords,
  restoreDictionary,
  applyRunLengthEncoding,
  decompressRunLengthEncoding,
  compressZstd,
  decompressZstd,
};
